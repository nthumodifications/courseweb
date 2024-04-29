"use client";
import { LoginError } from "@/types/headless_ais";
import { toast } from "@/components/ui/use-toast";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';
import { signInToCCXP } from '@/lib/headless_ais';
import { signInEeclassOauth } from '@/lib/elearning';
import useDictionary from "@/dictionaries/useDictionary";

const headlessAISContext = createContext<ReturnType<typeof useHeadlessAISProvider>>({
    ais: {
        enabled: false,
        ACIXSTORE: undefined
    },
    oauth: {
        enabled: false,
        elearnCookie: undefined,
        eeclassCookie: undefined
    },
    loading: true,
    error: undefined,
    initializing: true,
    setAISCredentials: async () => false,
    getACIXSTORE: async () => undefined,
    getOauthCookies: async () => undefined
});

type HeadlessAISStorage = { enabled: false } | {
    enabled: true,
    studentid: string,
    password: string,
    ACIXSTORE?: string,
    lastUpdated: number,
    elearnCookie?: string,
    eeclassCookie?: string,
    oauthLastUpdated?: number
}
const useHeadlessAISProvider = () => {
    const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>("headless_ais", { enabled: false });
    const [initializing, setInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<LoginError | undefined>(undefined);
    const dict = useDictionary();

    useEffect(() => {
        setInitializing(false)
    }, []);

    //Headless AIS
    const setAISCredentials = async (username?: string, password?: string) => {
        // return;
        if (!username || !password) {
            setHeadlessAIS({
                enabled: false
            });
            return;
        }
        setLoading(true);
        return await signInToCCXP(username, password)
            .then((res) => {
                if ('error' in res) throw new Error(res.error.message);
                setHeadlessAIS({
                    enabled: true,
                    studentid: username,
                    password: password,
                    ACIXSTORE: res.ACIXSTORE,
                    lastUpdated: Date.now()
                });
                setLoading(false);
                setError(undefined);
                return true;
            })
            .catch(err => {
                toast({
                    title: "代理登入失敗",
                    description: dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ?? "請檢查學號密碼是否正確",
                })
                setHeadlessAIS({
                    enabled: false
                });
                setLoading(false);
                setError(err);
                return false;
            })
    }


    /**
     *
     * @param force force update ACIXSTORE
     * @returns ACIXSTORE or null if error, undefined if not enabled
     */
    const getACIXSTORE = async (force = false) => {
        if (!headlessAIS.enabled) return undefined;
        if (error && !force) {

            setLoading(false);
            throw error;
        }
        if (headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now() && !force) {
            setLoading(false);
            return headlessAIS.ACIXSTORE!;
        }
        setLoading(true);
        //fetch /api/ais_headless to get ACIXSTORE
        return await signInToCCXP(headlessAIS.studentid, headlessAIS.password)
            .then((res) => {
                if ('error' in res) throw new Error(res.error.message);
                setHeadlessAIS({
                    ...headlessAIS,
                    ACIXSTORE: res.ACIXSTORE,
                    lastUpdated: Date.now()
                });
                setLoading(false);
                setError(undefined);
                return res.ACIXSTORE;
            })
            .catch(err => {
                toast({
                    title: "代理登入失敗",
                    description: dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ?? "請檢查學號密碼是否正確",
                })
                setHeadlessAIS({
                    enabled: false
                });
                setLoading(false);
                setError(err);
                throw err as LoginError;
            })
    }

    /**
     * @param force force update eeclassCookie
     * @returns eeclassCookie or null if error, undefined if not enabled
     */
    const getOauthCookies = async (force = false) => {
        if (!headlessAIS.enabled) return undefined;
        if (error && !force) {
            setLoading(false);
            throw error;
        }
        if (headlessAIS.oauthLastUpdated !== null && headlessAIS.oauthLastUpdated! + 15 * 60 * 1000 > Date.now() && !force) {
            setLoading(false);
            return { elearn: headlessAIS.elearnCookie!, eeclass: headlessAIS.eeclassCookie! };
        }
        setLoading(true);

        //fetch /api/ais_headless to get eeclass cookies
        return await signInEeclassOauth(headlessAIS.studentid, headlessAIS.password).then((res) => {
            setHeadlessAIS({
                ...headlessAIS,
                elearnCookie: "",
                eeclassCookie: res.cookie,
                oauthLastUpdated: Date.now()
            });
            setLoading(false);
            setError(undefined);
            return { elearn: "", eeclass: res.cookie };
        }).catch(err => {
            toast({
                title: "代理登入失敗",
                description: dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ?? "請檢查學號密碼是否正確",
            })
            setHeadlessAIS({
                ...headlessAIS,
                elearnCookie: undefined,
                eeclassCookie: undefined,
            });
            setLoading(false);
            setError(err);
            throw err as LoginError;
        });
    }

    const ais = {
        ACIXSTORE: headlessAIS.enabled ? headlessAIS.ACIXSTORE : undefined,
        enabled: headlessAIS.enabled,
    }

    const oauth = {
        elearnCookie: headlessAIS.enabled ? headlessAIS.elearnCookie : undefined,
        eeclassCookie: headlessAIS.enabled ? headlessAIS.eeclassCookie : undefined,
        enabled: headlessAIS.enabled,
    }

    return {
        ais,
        oauth,
        loading,
        error,
        setAISCredentials,
        getACIXSTORE,
        getOauthCookies,
        initializing,
    };
}


const useHeadlessAIS = () => useContext(headlessAISContext);

const HeadlessAISProvider: FC<PropsWithChildren> = ({ children }) => {
    const headlessAIS = useHeadlessAISProvider();

    return (
        <headlessAISContext.Provider value={headlessAIS}>
            {children}
        </headlessAISContext.Provider>
    );
};

export { useHeadlessAIS, HeadlessAISProvider };