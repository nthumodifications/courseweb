import { Database } from '@/types/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase_server = createClient<Database>(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");

export default supabase_server;
