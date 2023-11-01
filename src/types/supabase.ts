export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  next_auth: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          oauth_token: string | null
          oauth_token_secret: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string | null
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          oauth_token?: string | null
          oauth_token_secret?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId?: string | null
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          oauth_token?: string | null
          oauth_token_secret?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_userId_fkey"
            columns: ["userId"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          expires: string
          id: string
          sessionToken: string
          userId: string | null
        }
        Insert: {
          expires: string
          id?: string
          sessionToken: string
          userId?: string | null
        }
        Update: {
          expires?: string
          id?: string
          sessionToken?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_userId_fkey"
            columns: ["userId"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          email: string | null
          emailVerified: string | null
          id: string
          image: string | null
          name: string | null
        }
        Insert: {
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Update: {
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          expires: string
          identifier: string | null
          token: string
        }
        Insert: {
          expires: string
          identifier?: string | null
          token: string
        }
        Update: {
          expires?: string
          identifier?: string | null
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: {
          p_usename: string
        }
        Returns: {
          username: string
          password: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
      cds_courses: {
        Row: {
          class: number | null
          course: number | null
          credits: number | null
          department: string | null
          id: number
          name_en: string | null
          name_zh: string | null
          teacher_en: string[] | null
          teacher_zh: string[] | null
        }
        Insert: {
          class?: number | null
          course?: number | null
          credits?: number | null
          department?: string | null
          id?: number
          name_en?: string | null
          name_zh?: string | null
          teacher_en?: string[] | null
          teacher_zh?: string[] | null
        }
        Update: {
          class?: number | null
          course?: number | null
          credits?: number | null
          department?: string | null
          id?: number
          name_en?: string | null
          name_zh?: string | null
          teacher_en?: string[] | null
          teacher_zh?: string[] | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          capacity: number | null
          class: string | null
          compulsory_for: string[] | null
          course: string | null
          credits: number | null
          cross_discipline: string[] | null
          department: string | null
          elective_for: string[] | null
          first_specialization: string[] | null
          ge_target: string | null
          ge_type: string | null
          id: number
          language: string | null
          name_en: string
          name_zh: string
          no_extra_selection: boolean | null
          raw_1_2_specialization: string | null
          raw_cross_discipline: string | null
          raw_extra_selection: string | null
          raw_id: string | null
          raw_teacher_en: string | null
          raw_teacher_zh: string | null
          raw_time: string | null
          raw_venue: string | null
          reserve: number | null
          second_specialization: string[] | null
          semester: string | null
          teacher_en: string[] | null
          teacher_zh: string[] | null
          times: string[] | null
          venues: string[] | null
          停開註記: string | null
          備註: string | null
          必選修說明: string | null
          擋修說明: string | null
          課程限制說明: string | null
          multilang_search: string | null
          time_slots: unknown | null
        }
        Insert: {
          capacity?: number | null
          class?: string | null
          compulsory_for?: string[] | null
          course?: string | null
          credits?: number | null
          cross_discipline?: string[] | null
          department?: string | null
          elective_for?: string[] | null
          first_specialization?: string[] | null
          ge_target?: string | null
          ge_type?: string | null
          id: number
          language?: string | null
          name_en: string
          name_zh: string
          no_extra_selection?: boolean | null
          raw_1_2_specialization?: string | null
          raw_cross_discipline?: string | null
          raw_extra_selection?: string | null
          raw_id?: string | null
          raw_teacher_en?: string | null
          raw_teacher_zh?: string | null
          raw_time?: string | null
          raw_venue?: string | null
          reserve?: number | null
          second_specialization?: string[] | null
          semester?: string | null
          teacher_en?: string[] | null
          teacher_zh?: string[] | null
          times?: string[] | null
          venues?: string[] | null
          停開註記?: string | null
          備註?: string | null
          必選修說明?: string | null
          擋修說明?: string | null
          課程限制說明?: string | null
        }
        Update: {
          capacity?: number | null
          class?: string | null
          compulsory_for?: string[] | null
          course?: string | null
          credits?: number | null
          cross_discipline?: string[] | null
          department?: string | null
          elective_for?: string[] | null
          first_specialization?: string[] | null
          ge_target?: string | null
          ge_type?: string | null
          id?: number
          language?: string | null
          name_en?: string
          name_zh?: string
          no_extra_selection?: boolean | null
          raw_1_2_specialization?: string | null
          raw_cross_discipline?: string | null
          raw_extra_selection?: string | null
          raw_id?: string | null
          raw_teacher_en?: string | null
          raw_teacher_zh?: string | null
          raw_time?: string | null
          raw_venue?: string | null
          reserve?: number | null
          second_specialization?: string[] | null
          semester?: string | null
          teacher_en?: string[] | null
          teacher_zh?: string[] | null
          times?: string[] | null
          venues?: string[] | null
          停開註記?: string | null
          備註?: string | null
          必選修說明?: string | null
          擋修說明?: string | null
          課程限制說明?: string | null
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
      users: {
        Row: {
          email: string | null
          id: string
          image: string | null
          name: string | null
        }
        Insert: {
          email?: string | null
          id: string
          image?: string | null
          name?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
      distinct_venues: {
        Row: {
          venue: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      multilang_search: {
        Args: {
          "": unknown
        }
        Returns: string
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buckets_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: unknown
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
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
