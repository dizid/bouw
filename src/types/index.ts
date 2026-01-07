export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      session_photos: {
        Row: {
          id: string
          session_id: string
          storage_path: string
          original_filename: string | null
          file_size: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          storage_path: string
          original_filename?: string | null
          file_size?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          storage_path?: string
          original_filename?: string | null
          file_size?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_photos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "job_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sessions: {
        Row: {
          bewoner_naam: string | null
          bewoner_telefoon: string | null
          binnen_opruimen_min: number | null
          buiten_balkon_min: number | null
          created_at: string | null
          diversen_min: number | null
          glasbreuk_aantal: number | null
          glasbreuk_min: number | null
          glasbreuk_opmerkingen: string | null
          house_number: number
          id: string
          worker_id: string | null
          zonnescherm_terugplaatsen: boolean | null
          zonnescherm_verwijderd_min: number | null
        }
        Insert: {
          bewoner_naam?: string | null
          bewoner_telefoon?: string | null
          binnen_opruimen_min?: number | null
          buiten_balkon_min?: number | null
          created_at?: string | null
          diversen_min?: number | null
          glasbreuk_aantal?: number | null
          glasbreuk_min?: number | null
          glasbreuk_opmerkingen?: string | null
          house_number: number
          id?: string
          worker_id?: string | null
          zonnescherm_terugplaatsen?: boolean | null
          zonnescherm_verwijderd_min?: number | null
        }
        Update: {
          bewoner_naam?: string | null
          bewoner_telefoon?: string | null
          binnen_opruimen_min?: number | null
          buiten_balkon_min?: number | null
          created_at?: string | null
          diversen_min?: number | null
          glasbreuk_aantal?: number | null
          glasbreuk_min?: number | null
          glasbreuk_opmerkingen?: string | null
          house_number?: number
          id?: string
          worker_id?: string | null
          zonnescherm_terugplaatsen?: boolean | null
          zonnescherm_verwijderd_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
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
}

// Convenience types
export type Worker = Database['public']['Tables']['workers']['Row']
export type WorkerInsert = Database['public']['Tables']['workers']['Insert']
export type JobSession = Database['public']['Tables']['job_sessions']['Row']
export type JobSessionInsert = Database['public']['Tables']['job_sessions']['Insert']
export type SessionPhoto = Database['public']['Tables']['session_photos']['Row']
export type SessionPhotoInsert = Database['public']['Tables']['session_photos']['Insert']

// Local photo type for capture workflow (before upload)
export interface CapturedPhoto {
  id: string
  file: File
  previewUrl: string
  uploadProgress?: number
  storagePath?: string
  error?: string
}
