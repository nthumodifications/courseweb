"use client";;
import {HeadlessAISStorage, LoginError, UserJWT} from '@/types/headless_ais';
import { toast } from "@/components/ui/use-toast";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';
import useDictionary from "@/dictionaries/useDictionary";
import { useCookies } from "react-cookie";
import {fetchRefreshUserSession, fetchSignInToCCXP} from '@/helpers/headless_ais';
import { decodeJwt } from 'jose';
const headlessAISContext = createContext<ReturnType<typeof useHeadlessAISProvider>>({
    user: undefined,
    ais: {
        enabled: false,
        ACIXSTORE: undefined
    },
    loading: true,
    error: undefined,
    initializing: true,
    setAISCredentials: async () => false,
    getACIXSTORE: async () => undefined,
});



const useHeadlessAISProvider = () => {
    const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>("headless_ais", { enabled: false });
    const [initializing, setInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<LoginError | undefined>(undefined);
    const [cookies, setCookies, removeCookies, updateCookies] = useCookies(['accessToken']);
    const dict = useDictionary();

    useEffect(() => { setInitializing(false) }, []);
    
    // Check if cookies.accessToken exists, if so, check if it's valid, else call getACIXSTORE(true)
    useEffect(() => {
        if(!cookies.accessToken) {
            getACIXSTORE(true)
        }
        else if(cookies.accessToken){
            const { exp } = decodeJwt(cookies.accessToken ?? '') as { exp: number };
            if (Date.now() >= exp * 1000) {
                getACIXSTORE(true)
            }
        }
    }, [cookies.accessToken]);

    //Headless AIS
    const setAISCredentials = async (username?: string, password?: string) => {
        // return;
        if(!username || !password) {
            setHeadlessAIS({
                enabled: false
            });
            removeCookies('accessToken', { path: '/', sameSite: 'strict', secure: true });
            return ;
        }
        setLoading(true);
        return await fetchSignInToCCXP(username, password)
            .then((res) => {
                if(!res) throw new Error("太多人在使用代理登入，請稍後再試");
                if('error' in res) throw new Error(res.error.message); 
                setHeadlessAIS({
                    enabled: true,
                    studentid: username,
                    password: res.encryptedPassword,
                    encrypted: true,
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
                    description: dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ?? "目前認證服务降级，请稍后再试，敬請見諒",
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
        if(!headlessAIS.enabled) return undefined;
        if(error && !force) {
            
            setLoading(false);
            throw error;
        }
        if(headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now() && !force ) {
            setLoading(false);
            return headlessAIS.ACIXSTORE!;
        }
        setLoading(true);

        // legacy support, if encrypted password is not set, set it
        if(!headlessAIS.encrypted) {
            // use signInToCCXP to get encrypted password
            return await fetchSignInToCCXP(headlessAIS.studentid, headlessAIS.password)
                .then((res) => {
                    if('error' in res) throw new Error(res.error.message); 
                    setHeadlessAIS({
                        enabled: true,
                        studentid: headlessAIS.studentid,
                        password: res.encryptedPassword,
                        encrypted: true,
                        ACIXSTORE: res.ACIXSTORE,
                        lastUpdated: Date.now()
                    });
                    setLoading(false);
                    setError(undefined);
                    return res.ACIXSTORE;
                })
        }
        
        return await fetchRefreshUserSession(headlessAIS.studentid, headlessAIS.password)
        .then((res) => {
            if('error' in res) throw new Error(res.error.message); 
            setHeadlessAIS({
                enabled: true,
                studentid: headlessAIS.studentid,
                password: headlessAIS.password,
                encrypted: true,
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
                description: dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ?? "目前認證服务降级，请稍后再试，敬請見諒",
            })
            setLoading(false);
            setError(err);
            throw err as LoginError;
        })
    }



    const ais = {
        ACIXSTORE: headlessAIS.enabled ? headlessAIS.ACIXSTORE : undefined,
        enabled: headlessAIS.enabled,
    }
    
    return {
        user: cookies.accessToken ? decodeJwt(cookies.accessToken) as UserJWT | null : undefined ,
        ais,
        loading,
        error,
        setAISCredentials,
        getACIXSTORE,
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