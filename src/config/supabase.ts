import {Json, Database} from '@/types/supabase';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "");

export type CourseDefinition = Database['public']['Tables']['courses']['Row'];

export default supabase;