import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import "server-only";

const supabase_server = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

export default supabase_server;
