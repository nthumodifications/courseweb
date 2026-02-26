// Shared configuration for CoursWeb applications

// Core configuration files
export * from "./constants";

// Re-export supabase types only (the supabase client instance uses process.env
// which is not available in Vite; each app creates its own client)
export type {
  CourseDefinition,
  CourseSyllabusDefinition,
  CourseScoreDefinition,
  CourseDatesDefinition,
  CourseJoinWithSyllabus,
  CourseSyllabusView,
  AlertDefinition,
  BusScheduleDefinition,
  CdsCourseDefinition,
  SubmissionDefinition,
  CdsTermDefinition,
  CdsCountDefinition,
  CourseCommentsDefinition,
} from "./supabase";
