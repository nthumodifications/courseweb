import { Database } from '@/types/supabase';
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from 'next-auth';

const getSupabaseServer = async () => {
    const data = await getServerSession();
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

export default getSupabaseServer;