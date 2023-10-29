import { Database } from '@/types/supabase';
import { createClient } from "@supabase/supabase-js";
import { useSession } from 'next-auth/react';

const useSupabaseClient = () => {
    const { data, status } = useSession();
    const supabaseAccessToken = data?.supabaseAccessToken;

    const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", 
        process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "",
        {
          global: {
            headers: {
              Authorization: supabaseAccessToken? `Bearer ${supabaseAccessToken}`: ""
            }
          }
        }
        );
    return supabase;
}

export default useSupabaseClient;