import {Json, Database} from '@/types/supabase';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");

export type CourseDefinition = Database['public']['Tables']['courses']['Row'];
export type CourseSyllabusDefinition = Database['public']['Tables']['course_syllabus']['Row'];
export type CourseScoreDefinition = Database['public']['Tables']['course_scores']['Row'];
export type CourseDatesDefinition = Database['public']['Tables']['course_dates']['Row'];
export type CourseJoinWithSyllabus = CourseDefinition & { course_syllabus: CourseSyllabusDefinition, course_scores: CourseScoreDefinition | null, course_dates: CourseDatesDefinition[] };
export type CourseSyllabusView = CourseDefinition & { brief: string | null, keywords: string | null };
export type AlertDefinition = Database['public']['Tables']['alerts']['Row'];
export type BusScheduleDefinition = Database['public']['Tables']['bus_schedule']['Row'];
export type CdsCourseDefinition = Database['public']['Tables']['cds_courses']['Row'];
export type SubmissionDefinition = Database['public']['Tables']['cds_submissions']['Row'];
export type CdsTermDefinition = Database['public']['Tables']['cds_terms']['Row'];
export type CdsCountDefinition = Database['public']['Tables']['cds_counts']['Row'];
export type CourseCommentsDefinition = Database['public']['Tables']['course_comments']['Row'];
export default supabase;