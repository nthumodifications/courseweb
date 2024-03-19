"use client";
import {LoginError} from "@/types/headless_ais";
import {toast} from "@/components/ui/use-toast";
import {FC, PropsWithChildren, createContext, useContext, useEffect, useState} from "react";
import {useLocalStorage} from 'usehooks-ts';

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
    const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>("headless_ais", {enabled: false});
    const [initializing, setInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<LoginError | undefined>(undefined);

    useEffect(() => {
        setInitializing(false)
    }, []);


    //input: studentid, password
    //output: ACIXSTORE | Error
    const fetchACIXSTORE = async (studentid: string, password: string) => {
        const form = new FormData();
        form.append("studentid", studentid);
        form.append("password", password);
        return await fetch("/api/ais_headless/login", {
            method: "POST",
            body: form
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    return res.body.ACIXSTORE as string;
                } else {
                    throw res.body.code as LoginError;
                }
            })
    }

    //input: studentid, password
    //output: ACIXSTORE | Error
    const fetchElearnCookie = async (studentid: string, password: string) => {
        const form = new FormData();
        form.append("studentid", studentid);
        form.append("password", password);
        return await fetch("/api/ais_headless/elearn", {
            method: "POST",
            body: form
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    return res.cookie as string;
                } else {
                    throw res.body.code as LoginError;
                }
            })
    }

    const fetchEeclassCookie = async (studentid: string, password: string) => {
        const form = new FormData();
        form.append("studentid", studentid);
        form.append("password", password);
        return await fetch("/api/ais_headless/eeclass", {
            method: "POST",
            body: form
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    return res.cookie as string;
                } else {
                    throw res.body.code as LoginError;
                }
            })
    }

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
        return await fetchACIXSTORE(username, password)
            .then(acixstore => {
                setHeadlessAIS({
                    enabled: true,
                    studentid: username,
                    password: password,
                    ACIXSTORE: acixstore,
                    lastUpdated: Date.now()
                });
                setLoading(false);
                setError(undefined);
                return true;
            })
            .catch(err => {
                toast({
                    title: "代理登入失敗",
                    description: err ?? "請檢查學號密碼是否正確",
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
        return await fetchACIXSTORE(headlessAIS.studentid, headlessAIS.password)
            .then(acixstore => {
                setHeadlessAIS({
                    ...headlessAIS,
                    ACIXSTORE: acixstore,
                    lastUpdated: Date.now()
                });
                setLoading(false);
                setError(undefined);
                return acixstore;
            })
            .catch(err => {
                toast({
                    title: "代理登入失敗",
                    description: err ?? "請檢查學號密碼是否正確",
                })
                setHeadlessAIS({
                    ...headlessAIS,
                    ACIXSTORE: undefined
                });

                setLoading(false);
                setError(err);
                throw err as LoginError;
            })
    }

    /**
     * @param force force update ACIXSTORE
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
            console.log(JSON.stringify({elearn: headlessAIS.elearnCookie!, eeclass: headlessAIS.eeclassCookie!}))
            return {elearn: headlessAIS.elearnCookie!, eeclass: headlessAIS.eeclassCookie!};
        }
        setLoading(true);

        //fetch /api/ais_headless to get elearn & eeclass cookies
        return await fetchEeclassCookie(headlessAIS.studentid, headlessAIS.password).then((eeclassCookie) => {
            setHeadlessAIS({
                ...headlessAIS,
                elearnCookie: "",
                eeclassCookie: eeclassCookie,
                oauthLastUpdated: Date.now()
            });
            setLoading(false);
            setError(undefined);
            return {elearn: "", eeclass: eeclassCookie};
        }).catch(err => {
            toast({
                title: "代理登入失敗",
                description: err ?? "請檢查學號密碼是否正確",
            })
            setHeadlessAIS({
                ...headlessAIS,
                elearnCookie: undefined,
                eeclassCookie: undefined
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

const HeadlessAISProvider: FC<PropsWithChildren> = ({children}) => {
    const headlessAIS = useHeadlessAISProvider();

    return (
        <headlessAISContext.Provider value={headlessAIS}>
            {children}
        </headlessAISContext.Provider>
    );
};

export {useHeadlessAIS, HeadlessAISProvider};