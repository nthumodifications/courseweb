import {Json, Database} from '@/types/supabase';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "");

export type CourseDefinition = Database['public']['Tables']['courses']['Row'];
export type AlertDefinition = Database['public']['Tables']['alerts']['Row'];
export type BusScheduleDefinition = Database['public']['Tables']['bus_schedule']['Row'];
export type CdsCourseDefinition = Database['public']['Tables']['cds_courses']['Row'];
export default supabase;