'use client';
import { Database } from '@/types/supabase';
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { useSession } from 'next-auth/react';
import { useContext, useRef } from 'react';
import {createContext, useState, FC, PropsWithChildren} from 'react';

export const supabaseContext = createContext<SupabaseClient<Database>>({} as any);

const { Provider } = supabaseContext;

export const SupabaseProvider: FC<PropsWithChildren> = ({ children }) =>{
  const supabases = useSupabaseProvider();

  return <Provider value={supabases}>
    {children}
  </Provider>
}

const useSupabaseProvider = () => {
    const { data, status } = useSession();
    const supabaseAccessToken = data?.supabaseAccessToken;
    const supabaseRef = useRef(createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", 
      process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "",
      {
        global: {
          headers: {
            Authorization: supabaseAccessToken? `Bearer ${supabaseAccessToken}`: ""
          }
        }
      }
    ));
    return supabaseRef.current;
}

const useSupabaseClient = () => useContext(supabaseContext);

export default useSupabaseClient;