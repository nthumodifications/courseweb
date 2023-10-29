import {Database} from '@/types/supabase';

export type CourseDefinition = Database['public']['Tables']['courses']['Row'];
export type AlertDefinition = Database['public']['Tables']['alerts']['Row'];
export type BusScheduleDefinition = Database['public']['Tables']['bus_schedule']['Row'];