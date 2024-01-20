"use client";
import { LoginError } from "@/types/headless_ais";
import { toast } from "@/components/ui/use-toast";
import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from 'usehooks-ts';

const headlessAISContext = createContext<ReturnType<typeof useHeadlessAISProvider>>({
    ais: {
        enabled: false,
        ACIXSTORE: undefined
    },
    loading: true,
    error: undefined,
    initializing: true,
    setAISCredentials: () => {},
    getACIXSTORE: async () => undefined,
});

type HeadlessAISStorage = { enabled: false } | {
    enabled: true, 
    studentid: string, 
    password: string, 
    ACIXSTORE?: string, 
    lastUpdated: number,
}
const useHeadlessAISProvider = () => {
    const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>("headless_ais", { enabled: false });
    const [initializing, setInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<LoginError | undefined>(undefined);

    useEffect(() => { setInitializing(false) }, []);

    
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
            if(res.success) {
                return res.body.ACIXSTORE as string;
            } else {
                throw res.body.code as LoginError;
            }
        })
    }

    //Headless AIS
    const setAISCredentials = (username?: string, password?: string) => {
        // return;
        if(!username || !password) {
            setHeadlessAIS({
                enabled: false
            });
            return ;
        }
        setLoading(true);
        fetchACIXSTORE(username, password)
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



    const ais = {
        ACIXSTORE: headlessAIS.enabled ? headlessAIS.ACIXSTORE : undefined,
        enabled: headlessAIS.enabled,
    }
    
    return {
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