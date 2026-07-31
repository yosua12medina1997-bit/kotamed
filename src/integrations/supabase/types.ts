export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_attempts: {
        Row: {
          area_slug: string
          chosen_index: number
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          seconds: number
          topic: string | null
          user_id: string
        }
        Insert: {
          area_slug?: string
          chosen_index: number
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          seconds?: number
          topic?: string | null
          user_id?: string
        }
        Update: {
          area_slug?: string
          chosen_index?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          seconds?: number
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "academy_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_cases: {
        Row: {
          area_slug: string
          content: Json
          created_at: string
          created_by: string | null
          difficulty: number
          id: string
          is_published: boolean
          level: string
          source: string | null
          specialty: string | null
          subspecialty: string | null
          tags: string[]
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          area_slug?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: number
          id?: string
          is_published?: boolean
          level?: string
          source?: string | null
          specialty?: string | null
          subspecialty?: string | null
          tags?: string[]
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          area_slug?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: number
          id?: string
          is_published?: boolean
          level?: string
          source?: string | null
          specialty?: string | null
          subspecialty?: string | null
          tags?: string[]
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      academy_flashcard_reviews: {
        Row: {
          card_id: string
          due_at: string
          ease: number
          id: string
          interval_days: number
          last_grade: number | null
          repetitions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          due_at?: string
          ease?: number
          id?: string
          interval_days?: number
          last_grade?: number | null
          repetitions?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          card_id?: string
          due_at?: string
          ease?: number
          id?: string
          interval_days?: number
          last_grade?: number | null
          repetitions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_flashcard_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "academy_flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_flashcards: {
        Row: {
          area_slug: string
          back: string
          block: string | null
          created_at: string
          created_by: string | null
          difficulty: number
          front: string
          id: string
          is_published: boolean
          tags: string[]
          topic: string | null
          updated_at: string
        }
        Insert: {
          area_slug?: string
          back: string
          block?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: number
          front: string
          id?: string
          is_published?: boolean
          tags?: string[]
          topic?: string | null
          updated_at?: string
        }
        Update: {
          area_slug?: string
          back?: string
          block?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: number
          front?: string
          id?: string
          is_published?: boolean
          tags?: string[]
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      academy_library_items: {
        Row: {
          area_slug: string
          author: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          keywords: string[]
          kind: string
          specialty: string | null
          storage_path: string | null
          subtopic: string | null
          summary: string | null
          title: string
          topic: string | null
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          area_slug?: string
          author?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[]
          kind?: string
          specialty?: string | null
          storage_path?: string | null
          subtopic?: string | null
          summary?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          area_slug?: string
          author?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          keywords?: string[]
          kind?: string
          specialty?: string | null
          storage_path?: string | null
          subtopic?: string | null
          summary?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      academy_questions: {
        Row: {
          answer_index: number
          area_slug: string
          bank: string
          bibliography: string | null
          created_at: string
          created_by: string | null
          difficulty: number
          exam_type: string
          explanation: string | null
          id: string
          image_url: string | null
          is_published: boolean
          level: string
          options: Json
          specialty: string | null
          stem: string
          subtopic: string | null
          tags: string[]
          time_seconds: number
          topic: string | null
          updated_at: string
        }
        Insert: {
          answer_index?: number
          area_slug?: string
          bank?: string
          bibliography?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: number
          exam_type?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          level?: string
          options?: Json
          specialty?: string | null
          stem: string
          subtopic?: string | null
          tags?: string[]
          time_seconds?: number
          topic?: string | null
          updated_at?: string
        }
        Update: {
          answer_index?: number
          area_slug?: string
          bank?: string
          bibliography?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: number
          exam_type?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          level?: string
          options?: Json
          specialty?: string | null
          stem?: string
          subtopic?: string | null
          tags?: string[]
          time_seconds?: number
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      academy_simulators: {
        Row: {
          area_slug: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          level: string
          mode: string
          scenario: Json
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          area_slug?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          level?: string
          mode?: string
          scenario?: Json
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          area_slug?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          level?: string
          mode?: string
          scenario?: Json
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      academy_study_events: {
        Row: {
          activity: string
          area_slug: string
          created_at: string
          id: string
          metadata: Json
          minutes: number
          score: number | null
          topic: string | null
          user_id: string
        }
        Insert: {
          activity: string
          area_slug?: string
          created_at?: string
          id?: string
          metadata?: Json
          minutes?: number
          score?: number | null
          topic?: string | null
          user_id?: string
        }
        Update: {
          activity?: string
          area_slug?: string
          created_at?: string
          id?: string
          metadata?: Json
          minutes?: number
          score?: number | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      academy_video_scripts: {
        Row: {
          area_slug: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          storyboard: Json
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          area_slug?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          storyboard?: Json
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          area_slug?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          storyboard?: Json
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admission_applications: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_expires_at: string | null
          created_at: string
          currency: string
          document_id: string | null
          duration_months: number
          email: string | null
          full_name: string | null
          hospital: string | null
          id: string
          payment_method: string | null
          phone: string | null
          plan_id: string | null
          plan_name: string | null
          plan_slug: string | null
          program_slug: string | null
          program_title: string | null
          receipt_path: string | null
          receipt_uploaded_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          status: string
          step: number
          study_year: string | null
          submitted_at: string | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          approved_expires_at?: string | null
          created_at?: string
          currency?: string
          document_id?: string | null
          duration_months?: number
          email?: string | null
          full_name?: string | null
          hospital?: string | null
          id?: string
          payment_method?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          plan_slug?: string | null
          program_slug?: string | null
          program_title?: string | null
          receipt_path?: string | null
          receipt_uploaded_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string
          step?: number
          study_year?: string | null
          submitted_at?: string | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_expires_at?: string | null
          created_at?: string
          currency?: string
          document_id?: string | null
          duration_months?: number
          email?: string | null
          full_name?: string | null
          hospital?: string | null
          id?: string
          payment_method?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          plan_slug?: string | null
          program_slug?: string | null
          program_title?: string | null
          receipt_path?: string | null
          receipt_uploaded_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string
          step?: number
          study_year?: string | null
          submitted_at?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      command_center: {
        Row: {
          area_slug: string
          coach: Json
          created_at: string
          id: string
          identity: Json
          legacy: Json
          missions: Json
          system_prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          area_slug: string
          coach?: Json
          created_at?: string
          id?: string
          identity?: Json
          legacy?: Json
          missions?: Json
          system_prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          area_slug?: string
          coach?: Json
          created_at?: string
          id?: string
          identity?: Json
          legacy?: Json
          missions?: Json
          system_prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_nodes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          kind: string
          metadata: Json
          parent_id: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          kind: string
          metadata?: Json
          parent_id?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          metadata?: Json
          parent_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      content_resources: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          kind: string
          metadata: Json
          mime_type: string | null
          node_id: string
          size_bytes: number | null
          sort_order: number
          storage_path: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          kind: string
          metadata?: Json
          mime_type?: string | null
          node_id: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          metadata?: Json
          mime_type?: string | null
          node_id?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_resources_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          program: Database["public"]["Enums"]["program_slug"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          program: Database["public"]["Enums"]["program_slug"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          program?: Database["public"]["Enums"]["program_slug"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          modules: Json
          name: string
          period: string
          price_amount: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          modules?: Json
          name: string
          period?: string
          price_amount?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          modules?: Json
          name?: string
          period?: string
          price_amount?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string
          holder_name: string
          id: string
          instructions: string | null
          is_active: boolean
          method: string
          phone_number: string
          qr_storage_path: string | null
          qr_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          holder_name?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          method?: string
          phone_number?: string
          qr_storage_path?: string | null
          qr_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          holder_name?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          method?: string
          phone_number?: string
          qr_storage_path?: string | null
          qr_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      plan_content_access: {
        Row: {
          created_at: string
          id: string
          node_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          node_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          node_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_content_access_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_content_access_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: string | null
          avatar_url: string | null
          city: string | null
          cmp: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          hospital: string | null
          id: string
          language: string
          last_seen_at: string | null
          notes: string | null
          phone: string | null
          rne: string | null
          specialty: string | null
          timezone: string
          university: string | null
          updated_at: string
        }
        Insert: {
          academic_level?: string | null
          avatar_url?: string | null
          city?: string | null
          cmp?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          hospital?: string | null
          id: string
          language?: string
          last_seen_at?: string | null
          notes?: string | null
          phone?: string | null
          rne?: string | null
          specialty?: string | null
          timezone?: string
          university?: string | null
          updated_at?: string
        }
        Update: {
          academic_level?: string | null
          avatar_url?: string | null
          city?: string | null
          cmp?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          hospital?: string | null
          id?: string
          language?: string
          last_seen_at?: string | null
          notes?: string | null
          phone?: string | null
          rne?: string | null
          specialty?: string | null
          timezone?: string
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string | null
          cv_url: string | null
          email: string | null
          full_name: string
          hospital: string | null
          id: string
          is_active: boolean
          rating: number
          sort_order: number
          specialty: string | null
          university: string | null
          updated_at: string
          user_id: string | null
          years_teaching: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          cv_url?: string | null
          email?: string | null
          full_name: string
          hospital?: string | null
          id?: string
          is_active?: boolean
          rating?: number
          sort_order?: number
          specialty?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string | null
          years_teaching?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          cv_url?: string | null
          email?: string | null
          full_name?: string
          hospital?: string | null
          id?: string
          is_active?: boolean
          rating?: number
          sort_order?: number
          specialty?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string | null
          years_teaching?: number
        }
        Relationships: []
      }
      user_content_access: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          granted: boolean
          id: string
          node_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted?: boolean
          id?: string
          node_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted?: boolean
          id?: string
          node_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_access_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          amount_paid: number | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_method: string | null
          plan_id: string
          renews_at: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id: string
          renews_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string
          renews_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_admission: {
        Args: { _actor_id: string; _application_id: string; _months?: number }
        Returns: {
          admin_notes: string | null
          amount: number
          approved_expires_at: string | null
          created_at: string
          currency: string
          document_id: string | null
          duration_months: number
          email: string | null
          full_name: string | null
          hospital: string | null
          id: string
          payment_method: string | null
          phone: string | null
          plan_id: string | null
          plan_name: string | null
          plan_slug: string | null
          program_slug: string | null
          program_title: string | null
          receipt_path: string | null
          receipt_uploaded_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          status: string
          step: number
          study_year: string | null
          submitted_at: string | null
          university: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "admission_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      program_slug: "residentado" | "internado" | "r1" | "r2" | "r3"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
      program_slug: ["residentado", "internado", "r1", "r2", "r3"],
    },
  },
} as const
