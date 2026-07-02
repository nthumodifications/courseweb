import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url) throw new Error("SUPABASE_URL env var is not set");
if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is not set");

const supabase = createClient(url, key);

export default supabase;
