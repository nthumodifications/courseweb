export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: number
          severity: string
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: number
          severity: string
          start_date: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: number
          severity?: string
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      bus_schedule: {
        Row: {
          days: string
          id: number
          route_name: string
          schedule: string[]
          vehicle: string
        }
        Insert: {
          days?: string
          id?: number
          route_name: string
          schedule: string[]
          vehicle: string
        }
        Update: {
          days?: string
          id?: number
          route_name?: string
          schedule?: string[]
          vehicle?: string
        }
        Relationships: []
      }
      cds_counts: {
        Row: {
          code: string
          count: number
        }
        Insert: {
          code: string
          count?: number
        }
        Update: {
          code?: string
          count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cds_counts_code_fkey"
            columns: ["code"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["raw_id"]
          }
        ]
      }
      cds_courses: {
        Row: {
          class: string
          course: string
          credits: number
          cross_discipline: string[] | null
          department: string
          first_specialization: string[] | null
          id: number
          language: string
          name_en: string
          name_zh: string
          note: string | null
          raw_id: string
          second_specialization: string[] | null
          semester: string
          teacher_zh: string[]
          times: string[]
          venues: string[]
          cds_time_slots: unknown | null
        }
        Insert: {
          class: string
          course: string
          credits: number
          cross_discipline?: string[] | null
          department: string
          first_specialization?: string[] | null
          id: number
          language: string
          name_en: string
          name_zh: string
          note?: string | null
          raw_id: string
          second_specialization?: string[] | null
          semester: string
          teacher_zh?: string[]
          times?: string[]
          venues?: string[]
        }
        Update: {
          class?: string
          course?: string
          credits?: number
          cross_discipline?: string[] | null
          department?: string
          first_specialization?: string[] | null
          id?: number
          language?: string
          name_en?: string
          name_zh?: string
          note?: string | null
          raw_id?: string
          second_specialization?: string[] | null
          semester?: string
          teacher_zh?: string[]
          times?: string[]
          venues?: string[]
        }
        Relationships: []
      }
      cds_saves: {
        Row: {
          created_at: string
          id: number
          selection: string[]
          term: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          selection: string[]
          term: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          selection?: string[]
          term?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cds_submissions: {
        Row: {
          created_at: string
          email: string
          id: number
          name_en: string | null
          name_zh: string
          selections: string[]
          term: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          name_en?: string | null
          name_zh: string
          selections: string[]
          term: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          name_en?: string | null
          name_zh?: string
          selections?: string[]
          term?: string
          user_id?: string
        }
        Relationships: []
      }
      course_students: {
        Row: {
          course: string
          email: string | null
          id: number
          name_en: string | null
          name_zh: string | null
          user_id: string
        }
        Insert: {
          course: string
          email?: string | null
          id?: number
          name_en?: string | null
          name_zh?: string | null
          user_id: string
        }
        Update: {
          course?: string
          email?: string | null
          id?: number
          name_en?: string | null
          name_zh?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_students_course_fkey"
            columns: ["course"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["raw_id"]
          }
        ]
      }
      course_syllabus: {
        Row: {
          brief: string | null
          content: string | null
          has_file: boolean
          keywords: string[] | null
          raw_id: string
        }
        Insert: {
          brief?: string | null
          content?: string | null
          has_file: boolean
          keywords?: string[] | null
          raw_id: string
        }
        Update: {
          brief?: string | null
          content?: string | null
          has_file?: boolean
          keywords?: string[] | null
          raw_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_syllabus_raw_id_fkey"
            columns: ["raw_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["raw_id"]
          }
        ]
      }
      courses: {
        Row: {
          capacity: number | null
          class: string
          closed_mark: string | null
          compulsory_for: string[] | null
          course: string
          credits: number
          cross_discipline: string[] | null
          department: string
          elective_for: string[] | null
          first_specialization: string[] | null
          ge_target: string | null
          ge_type: string | null
          language: string
          name_en: string
          name_zh: string
          no_extra_selection: boolean | null
          note: string | null
          prerequisites: string | null
          raw_id: string
          reserve: number | null
          restrictions: string | null
          second_specialization: string[] | null
          semester: string
          tags: string[]
          teacher_en: string[] | null
          teacher_zh: string[]
          times: string[]
          venues: string[]
          time_slots: unknown | null
        }
        Insert: {
          capacity?: number | null
          class: string
          closed_mark?: string | null
          compulsory_for?: string[] | null
          course: string
          credits?: number
          cross_discipline?: string[] | null
          department: string
          elective_for?: string[] | null
          first_specialization?: string[] | null
          ge_target?: string | null
          ge_type?: string | null
          language: string
          name_en: string
          name_zh: string
          no_extra_selection?: boolean | null
          note?: string | null
          prerequisites?: string | null
          raw_id: string
          reserve?: number | null
          restrictions?: string | null
          second_specialization?: string[] | null
          semester: string
          tags?: string[]
          teacher_en?: string[] | null
          teacher_zh: string[]
          times: string[]
          venues: string[]
        }
        Update: {
          capacity?: number | null
          class?: string
          closed_mark?: string | null
          compulsory_for?: string[] | null
          course?: string
          credits?: number
          cross_discipline?: string[] | null
          department?: string
          elective_for?: string[] | null
          first_specialization?: string[] | null
          ge_target?: string | null
          ge_type?: string | null
          language?: string
          name_en?: string
          name_zh?: string
          no_extra_selection?: boolean | null
          note?: string | null
          prerequisites?: string | null
          raw_id?: string
          reserve?: number | null
          restrictions?: string | null
          second_specialization?: string[] | null
          semester?: string
          tags?: string[]
          teacher_en?: string[] | null
          teacher_zh?: string[]
          times?: string[]
          venues?: string[]
        }
        Relationships: []
      }
      delay_reports: {
        Row: {
          created_at: string
          id: number
          other_problem: string | null
          problem: string
          route: string
          time: string
        }
        Insert: {
          created_at?: string
          id?: number
          other_problem?: string | null
          problem: string
          route: string
          time: string
        }
        Update: {
          created_at?: string
          id?: number
          other_problem?: string | null
          problem?: string
          route?: string
          time?: string
        }
        Relationships: []
      }
    }
    Views: {
      distinct_classes: {
        Row: {
          class: string | null
        }
        Relationships: []
      }
      distinct_cross_discipline: {
        Row: {
          discipline: string | null
        }
        Relationships: []
      }
      distinct_first_specialization: {
        Row: {
          unique_first_specialization: string | null
        }
        Relationships: []
      }
      distinct_second_specialization: {
        Row: {
          unique_second_specialization: string | null
        }
        Relationships: []
      }
      distinct_semesters: {
        Row: {
          semester: string | null
        }
        Relationships: []
      }
      distinct_venues: {
        Row: {
          venue: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cds_time_slots: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      search_cds_courses: {
        Args: {
          keyword: string
        }
        Returns: {
          class: string
          course: string
          credits: number
          cross_discipline: string[] | null
          department: string
          first_specialization: string[] | null
          id: number
          language: string
          name_en: string
          name_zh: string
          note: string | null
          raw_id: string
          second_specialization: string[] | null
          semester: string
          teacher_zh: string[]
          times: string[]
          venues: string[]
        }[]
      }
      search_courses: {
        Args: {
          keyword: string
        }
        Returns: {
          capacity: number | null
          class: string
          closed_mark: string | null
          compulsory_for: string[] | null
          course: string
          credits: number
          cross_discipline: string[] | null
          department: string
          elective_for: string[] | null
          first_specialization: string[] | null
          ge_target: string | null
          ge_type: string | null
          language: string
          name_en: string
          name_zh: string
          no_extra_selection: boolean | null
          note: string | null
          prerequisites: string | null
          raw_id: string
          reserve: number | null
          restrictions: string | null
          second_specialization: string[] | null
          semester: string
          tags: string[]
          teacher_en: string[] | null
          teacher_zh: string[]
          times: string[]
          venues: string[]
        }[]
      }
      search_courses_with_syllabus: {
        Args: {
          keyword: string
        }
        Returns: {
          raw_id: string
          semester: string
          department: string
          course: string
          class: string
          name_en: string
          name_zh: string
          credits: number
          capacity: number
          reserve: number
          language: string
          ge_target: string
          ge_type: string
          note: string
          closed_mark: string
          prerequisites: string
          restrictions: string
          no_extra_selection: boolean
          cross_discipline: string[]
          teacher_en: string[]
          teacher_zh: string[]
          first_specialization: string[]
          second_specialization: string[]
          times: string[]
          compulsory_for: string[]
          elective_for: string[]
          tags: string[]
          venues: string[]
          time_slots: string[]
          brief: string
          keywords: string[]
        }[]
      }
      split_times: {
        Args: {
          times_arr: string[]
        }
        Returns: unknown
      }
      time_slots: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
