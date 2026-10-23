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
            foreignKeyName: "attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "error_log_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
      classes: {
        Row: { course_id: string; created_at: string; id: string; join_code: string; name: string }
        Insert: { course_id: string; created_at?: string; id?: string; join_code?: string; name: string }
        Update: { course_id?: string; created_at?: string; id?: string; join_code?: string; name?: string }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teachers: {
        Row: { class_id: string; created_at: string; teacher_id: string }
        Insert: { class_id: string; created_at?: string; teacher_id: string }
        Update: { class_id?: string; created_at?: string; teacher_id?: string }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_results: {
        Row: { attempt_id: string; answers: Json; graded_at: string }
        Insert: { attempt_id: string; answers?: Json; graded_at?: string }
        Update: { attempt_id?: string; answers?: Json; graded_at?: string }
        Relationships: [
          {
            foreignKeyName: "attempt_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_templates: {
        Row: { body: string; created_at: string; id: string; teacher_id: string }
        Insert: { body: string; created_at?: string; id?: string; teacher_id?: string }
        Update: { body?: string; created_at?: string; id?: string; teacher_id?: string }
        Relationships: []
      }
      class_lesson_students: {
        Row: { class_id: string; created_at: string; lesson_id: string; student_id: string }
        Insert: { class_id: string; created_at?: string; lesson_id: string; student_id: string }
        Update: { class_id?: string; created_at?: string; lesson_id?: string; student_id?: string }
        Relationships: []
      }
      class_lessons: {
        Row: { class_id: string; closed: boolean; due_at: string | null; for_all: boolean; shuffle: boolean; lesson_id: string; show_results: boolean; unlocked_at: string; unlocked_by: string | null }
        Insert: { class_id: string; closed?: boolean; due_at?: string | null; for_all?: boolean; shuffle?: boolean; lesson_id: string; show_results?: boolean; unlocked_at?: string; unlocked_by?: string | null }
        Update: { class_id?: string; closed?: boolean; due_at?: string | null; for_all?: boolean; shuffle?: boolean; lesson_id?: string; show_results?: boolean; unlocked_at?: string; unlocked_by?: string | null }
        Relationships: [
          {
            foreignKeyName: "class_lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string
          grade: number | null
          id: string
          is_published: boolean
          kind: Database["public"]["Enums"]["course_kind"]
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          description?: string
          grade?: number | null
          id: string
          is_published?: boolean
          kind: Database["public"]["Enums"]["course_kind"]
          name: string
          position: number
        }
        Update: {
          created_at?: string
          description?: string
          grade?: number | null
          id?: string
          is_published?: boolean
          kind?: Database["public"]["Enums"]["course_kind"]
          name?: string
          position?: number
        }
        Relationships: []
      }
      lesson_sections: {
        Row: {
          body: string | null
          hint: string | null
          id: string
          lesson_id: string
          placeholder: string | null
          position: number
          score_key: string | null
          short_input: boolean
          time_label: string | null
          title: string
          type: Database["public"]["Enums"]["section_type"]
        }
        Insert: {
          body?: string | null
          hint?: string | null
          id?: string
          lesson_id: string
          placeholder?: string | null
          position: number
          score_key?: string | null
          short_input?: boolean
          time_label?: string | null
          title: string
          type: Database["public"]["Enums"]["section_type"]
        }
        Update: {
          body?: string | null
          hint?: string | null
          id?: string
          lesson_id?: string
          placeholder?: string | null
          position?: number
          score_key?: string | null
          short_input?: boolean
          time_label?: string | null
          title?: string
          type?: Database["public"]["Enums"]["section_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sections_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          heading: string
          id: string
          is_published: boolean
          label: string
          phase_id: number
          position: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          heading: string
          id: string
          is_published?: boolean
          label: string
          phase_id: number
          position: number
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          heading?: string
          id?: string
          is_published?: boolean
          label?: string
          phase_id?: number
          position?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: { course_id: string; id: number; name: string; position: number }
        Insert: { course_id: string; id?: number; name: string; position: number }
        Update: { course_id?: string; id?: number; name?: string; position?: number }
        Relationships: [
          {
            foreignKeyName: "phases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      section_items: {
        Row: {
          answers: string[] | null
          back: string | null
          correct_option: number | null
          explanation: string | null
          id: string
          options: string[] | null
          position: number
          prompt: string | null
          section_id: string
          tag: string | null
          words: string[] | null
        }
        Insert: {
          answers?: string[] | null
          back?: string | null
          correct_option?: number | null
          explanation?: string | null
          id?: string
          options?: string[] | null
          position: number
          prompt?: string | null
          section_id: string
          tag?: string | null
          words?: string[] | null
        }
        Update: {
          answers?: string[] | null
          back?: string | null
          correct_option?: number | null
          explanation?: string | null
          id?: string
          options?: string[] | null
          position?: number
          prompt?: string | null
          section_id?: string
          tag?: string | null
          words?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "lesson_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          username: string | null
          avatar_url: string | null
          class_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          username?: string | null
          avatar_url?: string | null
          class_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          username?: string | null
          avatar_url?: string | null
          class_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_error_stats: {
        Row: {
          category: Database["public"]["Enums"]["error_category"] | null
          course_id: string | null
          entries: number | null
          occurrences: number | null
          status: Database["public"]["Enums"]["error_status"] | null
        }
        Relationships: []
      }
      lesson_stats: {
        Row: {
          accuracy: number | null
          completed: number | null
          course_id: string | null
          graded: number | null
          label: string | null
          learners: number | null
          lesson_id: string | null
          position: number | null
          scored_items: number | null
          title: string | null
          waiting: number | null
        }
        Relationships: []
      }
      course_summary: {
        Row: {
          course_id: string | null
          name: string | null
          kind: Database["public"]["Enums"]["course_kind"] | null
          position: number | null
          classes: number | null
          students: number | null
          lessons: number | null
          attempts: number | null
          completed: number | null
          waiting: number | null
          ok: number | null
          done: number | null
          active: number | null
        }
        Relationships: []
      }
      class_overview: {
        Row: {
          class_id: string | null
          course_id: string | null
          name: string | null
          join_code: string | null
          students: number | null
          unlocked: number | null
          waiting: number | null
          ok: number | null
          done: number | null
          active: number | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          user_id: string | null
          full_name: string | null
          email: string | null
          class_id: string | null
          class_name: string | null
          course_id: string | null
          submitted: number | null
          waiting: number | null
          ok: number | null
          done: number | null
          last_activity: string | null
          open_errors: number | null
          username: string | null
          active: boolean | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          id: string | null
          type: Database["public"]["Enums"]["section_type"] | null
          prompt: string | null
          options: string[] | null
          correct_option: number | null
          answers: string[] | null
          words: string[] | null
          explanation: string | null
          tag: string | null
          lesson_id: string | null
          lesson_label: string | null
          lesson_title: string | null
          course_id: string | null
          back: string | null
        }
        Relationships: []
      }
      class_missing_work: {
        Row: {
          class_id: string | null
          lesson_id: string | null
          due_at: string | null
          user_id: string | null
          full_name: string | null
          username: string | null
          started: boolean | null
        }
        Relationships: []
      }
      class_lesson_stats: {
        Row: {
          class_id: string | null
          lesson_id: string | null
          submitted: number | null
          waiting: number | null
          ok: number | null
          done: number | null
        }
        Relationships: []
      }
      lesson_overview: {
        Row: {
          course_id: string | null
          description: string | null
          id: string | null
          is_published: boolean | null
          label: string | null
          phase_id: number | null
          position: number | null
          scored_items: number | null
          title: string | null
          created_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      close_class_lesson: {
        Args: { target_class: string; target_lesson: string; close_it: boolean }
        Returns: number
      }
      join_class: {
        Args: { code: string }
        Returns: Database["public"]["Tables"]["classes"]["Row"]
      }
      lesson_items: {
        Args: { lesson: string }
        Returns: Database["public"]["Tables"]["section_items"]["Row"][]
      }
      next_lesson_id: {
        Args: { course: string }
        Returns: string
      }
      release_class_results: {
        Args: { target_class: string; target_lesson: string }
        Returns: number
      }
      wrong_questions: {
        Args: { target_class: string; target_lessons: string[]; target_student?: string }
        Returns: {
          item_id: string
          lesson_id: string
          type: Database["public"]["Enums"]["section_type"]
          qid: string
          wrong: number
          answered: number
          prompt: string | null
          back: string | null
          options: string[] | null
          correct_option: number | null
          answers: string[] | null
          words: string[] | null
          explanation: string | null
          tag: string | null
        }[]
      }
      save_lesson: {
        Args: { lesson: Json }
        Returns: string
      }
      submit_attempt: {
        Args: { lesson: string }
        Returns: Database["public"]["Tables"]["attempts"]["Row"]
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      course_kind: "grade" | "track"
      attempt_status: "in_progress" | "submitted" | "graded"
      error_category: "grammar" | "vocabulary" | "naturalness" | "clarity" | "logic" | "cohesion"
      error_status: "open" | "improving" | "fixed"
      section_type: "explain" | "cards" | "mcq" | "typed" | "order" | "writing" | "match" | "error"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
