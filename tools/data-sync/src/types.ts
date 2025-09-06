export interface Department {
  code: string;
  name_zh: string;
  name_en: string;
}

export interface Course {
  capacity: number | null;
  course: string;
  department: string;
  semester: string;
  class: string;
  name_en: string;
  name_zh: string;
  teacher_en: string[] | null;
  teacher_zh: string[];
  credits: number;
  reserve: number;
  ge_type: string;
  ge_target?: string;
  language: string;
  compulsory_for: string[];
  elective_for: string[];
  venues: string[];
  times: string[];
  first_specialization: string[];
  second_specialization: string[];
  cross_discipline: string[];
  tags: string[];
  no_extra_selection: boolean;
  note: string;
  closed_mark: string;
  prerequisites: string;
  restrictions: string;
  raw_id: string;
  enrolled: number;
  updated_at: string;
}

export interface SyncEnvironment {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALGOLIA_APP_ID: string;
  ALGOLIA_API_KEY: string;
}

export interface SyncResult {
  success: boolean;
  error?: Error;
  stats?: {
    coursesScraped?: number;
    syllabusDownloaded?: number;
    algoliaRecordsUpdated?: number;
  };
}
