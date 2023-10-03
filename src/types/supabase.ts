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
      courses: {
        Row: {
          capacity: number | null
          class: string | null
          course: string | null
          credits: number | null
          department: string | null
          ge_target: string | null
          ge_type: string | null
          id: number
          language: string | null
          name_en: string | null
          name_zh: string | null
          raw_id: string | null
          raw_teacher_en: string | null
          raw_teacher_zh: string | null
          raw_time: string | null
          reserve: number | null
          semester: string | null
          teacher_en: Json | null
          teacher_zh: Json | null
          time: Json | null
          venue: string | null
          不可加簽說明: string | null
          停開註記: string | null
          備註: string | null
          學分學程對應: string | null
          必選修說明: string | null
          擋修說明: string | null
          第一二專長對應: string | null
          課程限制說明: string | null
        }
        Insert: {
          capacity?: number | null
          class?: string | null
          course?: string | null
          credits?: number | null
          department?: string | null
          ge_target?: string | null
          ge_type?: string | null
          id: number
          language?: string | null
          name_en?: string | null
          name_zh?: string | null
          raw_id?: string | null
          raw_teacher_en?: string | null
          raw_teacher_zh?: string | null
          raw_time?: string | null
          reserve?: number | null
          semester?: string | null
          teacher_en?: Json | null
          teacher_zh?: Json | null
          time?: Json | null
          venue?: string | null
          不可加簽說明?: string | null
          停開註記?: string | null
          備註?: string | null
          學分學程對應?: string | null
          必選修說明?: string | null
          擋修說明?: string | null
          第一二專長對應?: string | null
          課程限制說明?: string | null
        }
        Update: {
          capacity?: number | null
          class?: string | null
          course?: string | null
          credits?: number | null
          department?: string | null
          ge_target?: string | null
          ge_type?: string | null
          id?: number
          language?: string | null
          name_en?: string | null
          name_zh?: string | null
          raw_id?: string | null
          raw_teacher_en?: string | null
          raw_teacher_zh?: string | null
          raw_time?: string | null
          reserve?: number | null
          semester?: string | null
          teacher_en?: Json | null
          teacher_zh?: Json | null
          time?: Json | null
          venue?: string | null
          不可加簽說明?: string | null
          停開註記?: string | null
          備註?: string | null
          學分學程對應?: string | null
          必選修說明?: string | null
          擋修說明?: string | null
          第一二專長對應?: string | null
          課程限制說明?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
