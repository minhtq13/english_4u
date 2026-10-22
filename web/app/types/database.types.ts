// Generated from the Supabase schema (project learning-english), trimmed to the parts the app uses.
// Regenerate after changing migrations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: { email: string }
        Insert: { email: string }
        Update: { email?: string }
        Relationships: []
      }
      attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          lesson_id: string
          score: Json
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          writing: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id: string
          score?: Json
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          writing?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          score?: Json
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          writing?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          category: Database["public"]["Enums"]["error_category"]
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string | null
          note: string
          occurrences: number
          status: Database["public"]["Enums"]["error_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["error_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string | null
          note: string
          occurrences?: number
          status?: Database["public"]["Enums"]["error_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["error_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string | null
          note?: string
          occurrences?: number
          status?: Database["public"]["Enums"]["error_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          attempt_id: string
          body: string
          created_at: string
          error_tags: string[]
          id: string
          teacher_id: string
        }
        Insert: {
          attempt_id: string
          body: string
          created_at?: string
          error_tags?: string[]
          id?: string
          teacher_id?: string
        }
        Update: {
          attempt_id?: string
          body?: string
          created_at?: string
          error_tags?: string[]
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "admin"
      attempt_status: "in_progress" | "submitted" | "graded"
      error_category: "grammar" | "vocabulary" | "naturalness" | "clarity" | "logic" | "cohesion"
      error_status: "open" | "improving" | "fixed"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
