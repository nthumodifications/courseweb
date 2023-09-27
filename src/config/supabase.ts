import {Json, Database} from '@/types/supabase';
import { createClient } from "@supabase/supabase-js";


const supabase = createClient<Database>("http://68.183.187.217:8000", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNjk1Mzk4NDAwLAogICJleHAiOiAxODUzMjUxMjAwCn0.IldZY_FwoLs6cXpVyas9fR_F3uLDWSXu70s3Uyvn-dI" ?? "");

export type CourseDefinition = Database['public']['Tables']['courses']['Row'];

export default supabase;