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
      academy_cms_fields: {
        Row: {
          applies_to: string[]
          created_at: string
          created_by: string | null
          id: string
          key: string
          label: string
          module: string
          options: Json
          scope: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          applies_to?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          label: string
          module: string
          options?: Json
          scope?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          applies_to?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          label?: string
          module?: string
          options?: Json
          scope?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_cms_nodes: {
        Row: {
          body: string | null
          case_type: string | null
          close_at: string | null
          created_at: string
          created_by: string | null
          data: Json
          hidden: boolean
          id: string
          is_published: boolean
          level_kind: string
          module: string
          parent_id: string | null
          publish_at: string | null
          roles: string[]
          scope: string
          sort_order: number
          subtitle: string | null
          tags: string[]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body?: string | null
          case_type?: string | null
          close_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          hidden?: boolean
          id?: string
          is_published?: boolean
          level_kind?: string
          module: string
          parent_id?: string | null
          publish_at?: string | null
          roles?: string[]
          scope?: string
          sort_order?: number
          subtitle?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string | null
          case_type?: string | null
          close_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          hidden?: boolean
          id?: string
          is_published?: boolean
          level_kind?: string
          module?: string
          parent_id?: string | null
          publish_at?: string | null
          roles?: string[]
          scope?: string
          sort_order?: number
          subtitle?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_cms_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "academy_cms_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_cms_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          node_id: string
          note: string | null
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          node_id: string
          note?: string | null
          snapshot?: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          node_id?: string
          note?: string | null
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_cms_versions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "academy_cms_nodes"
            referencedColumns: ["id"]
          },
        ]
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
      apex_attempt_items: {
        Row: {
          answered_at: string | null
          attempt_id: string
          block: number
          chosen: string[] | null
          created_at: string
          flagged: boolean
          id: string
          is_correct: boolean | null
          position: number
          question_id: string
          seconds: number
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          block?: number
          chosen?: string[] | null
          created_at?: string
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          position?: number
          question_id: string
          seconds?: number
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          block?: number
          chosen?: string[] | null
          created_at?: string
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          position?: number
          question_id?: string
          seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "apex_attempt_items_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "apex_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_attempt_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "apex_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_attempts: {
        Row: {
          analysis: Json
          blocks: number
          config: Json
          correct_count: number
          created_at: string
          duration_minutes: number
          exam_id: string | null
          expires_at: string | null
          id: string
          mode: string
          question_count: number
          score: number | null
          seconds_used: number
          started_at: string
          status: string
          submitted_at: string | null
          title: string
          unanswered_count: number
          updated_at: string
          user_id: string
          wrong_count: number
        }
        Insert: {
          analysis?: Json
          blocks?: number
          config?: Json
          correct_count?: number
          created_at?: string
          duration_minutes?: number
          exam_id?: string | null
          expires_at?: string | null
          id?: string
          mode?: string
          question_count?: number
          score?: number | null
          seconds_used?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          title?: string
          unanswered_count?: number
          updated_at?: string
          user_id: string
          wrong_count?: number
        }
        Update: {
          analysis?: Json
          blocks?: number
          config?: Json
          correct_count?: number
          created_at?: string
          duration_minutes?: number
          exam_id?: string | null
          expires_at?: string | null
          id?: string
          mode?: string
          question_count?: number
          score?: number | null
          seconds_used?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          title?: string
          unanswered_count?: number
          updated_at?: string
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "apex_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "apex_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_exams: {
        Row: {
          blocks: number
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          mode: string
          question_count: number
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: number
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          mode?: string
          question_count?: number
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: number
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          mode?: string
          question_count?: number
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      apex_flags: {
        Row: {
          created_at: string
          id: string
          note: string | null
          question_id: string
          reason: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          question_id: string
          reason: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          question_id?: string
          reason?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apex_flags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "apex_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_flashcards: {
        Row: {
          attempt_id: string | null
          back: string
          created_at: string
          deck: string
          due_at: string
          ease: number
          front: string
          id: string
          interval_days: number
          last_grade: number | null
          question_id: string | null
          repetitions: number
          source: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          back: string
          created_at?: string
          deck?: string
          due_at?: string
          ease?: number
          front: string
          id?: string
          interval_days?: number
          last_grade?: number | null
          question_id?: string | null
          repetitions?: number
          source?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          back?: string
          created_at?: string
          deck?: string
          due_at?: string
          ease?: number
          front?: string
          id?: string
          interval_days?: number
          last_grade?: number | null
          question_id?: string | null
          repetitions?: number
          source?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apex_flashcards_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "apex_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_flashcards_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "apex_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_question_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          question_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          question_id: string
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          question_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "apex_question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "apex_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_questions: {
        Row: {
          ai_suggested: Json
          chapter_id: string | null
          chapter_label: string | null
          concept_id: string | null
          correct_answers: string[]
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          flagged_count: number
          id: string
          image_url: string | null
          options: Json
          program: string | null
          question_code: string | null
          question_type: string
          reference: string | null
          source: string | null
          status: string
          stem: string
          subject_id: string | null
          subject_label: string | null
          subtopic_id: string | null
          subtopic_label: string | null
          tags: string[]
          times_correct: number
          times_used: number
          times_wrong: number
          topic_id: string | null
          topic_label: string | null
          total_seconds: number
          updated_at: string
          version: number
          year: number | null
        }
        Insert: {
          ai_suggested?: Json
          chapter_id?: string | null
          chapter_label?: string | null
          concept_id?: string | null
          correct_answers?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          flagged_count?: number
          id?: string
          image_url?: string | null
          options?: Json
          program?: string | null
          question_code?: string | null
          question_type?: string
          reference?: string | null
          source?: string | null
          status?: string
          stem: string
          subject_id?: string | null
          subject_label?: string | null
          subtopic_id?: string | null
          subtopic_label?: string | null
          tags?: string[]
          times_correct?: number
          times_used?: number
          times_wrong?: number
          topic_id?: string | null
          topic_label?: string | null
          total_seconds?: number
          updated_at?: string
          version?: number
          year?: number | null
        }
        Update: {
          ai_suggested?: Json
          chapter_id?: string | null
          chapter_label?: string | null
          concept_id?: string | null
          correct_answers?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          flagged_count?: number
          id?: string
          image_url?: string | null
          options?: Json
          program?: string | null
          question_code?: string | null
          question_type?: string
          reference?: string | null
          source?: string | null
          status?: string
          stem?: string
          subject_id?: string | null
          subject_label?: string | null
          subtopic_id?: string | null
          subtopic_label?: string | null
          tags?: string[]
          times_correct?: number
          times_used?: number
          times_wrong?: number
          topic_id?: string | null
          topic_label?: string | null
          total_seconds?: number
          updated_at?: string
          version?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apex_questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_resource_links: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          kind: string
          label_match: string | null
          node_id: string | null
          resource_id: string | null
          sort_order: number
          taxonomy_id: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          label_match?: string | null
          node_id?: string | null
          resource_id?: string | null
          sort_order?: number
          taxonomy_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          label_match?: string | null
          node_id?: string | null
          resource_id?: string | null
          sort_order?: number
          taxonomy_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apex_resource_links_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_resource_links_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apex_resource_links_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_study_plan: {
        Row: {
          attempt_id: string | null
          created_at: string
          day_number: number
          detail: string | null
          id: string
          is_done: boolean
          kind: string
          minutes: number
          taxonomy_label: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          day_number?: number
          detail?: string | null
          id?: string
          is_done?: boolean
          kind?: string
          minutes?: number
          taxonomy_label?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          day_number?: number
          detail?: string | null
          id?: string
          is_done?: boolean
          kind?: string
          minutes?: number
          taxonomy_label?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apex_study_plan_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "apex_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_summaries: {
        Row: {
          attempt_id: string | null
          content: string
          created_at: string
          id: string
          sources: Json
          title: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          content: string
          created_at?: string
          id?: string
          sources?: Json
          title: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          content?: string
          created_at?: string
          id?: string
          sources?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apex_summaries_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "apex_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_taxonomy: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          level: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apex_taxonomy_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "apex_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_assets: {
        Row: {
          alt: string | null
          created_at: string
          created_by: string | null
          description: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string | null
          tags: string[]
          type: string
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path?: string | null
          tags?: string[]
          type?: string
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string | null
          tags?: string[]
          type?: string
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      cms_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          entity_label: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
        }
        Relationships: []
      }
      cms_blocks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          page_id: string
          props: Json
          sort_order: number
          style: Json
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          page_id: string
          props?: Json
          sort_order?: number
          style?: Json
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          page_id?: string
          props?: Json
          sort_order?: number
          style?: Json
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cms_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_collection_items: {
        Row: {
          badge: string | null
          collection: string
          created_at: string
          created_by: string | null
          data: Json
          features: Json
          href: string | null
          icon: string | null
          id: string
          image: string | null
          label: string | null
          price: string | null
          rating: string | null
          sort_order: number
          subtitle: string | null
          text: string | null
          title: string
          updated_at: string
          value: string | null
          visible: boolean
        }
        Insert: {
          badge?: string | null
          collection: string
          created_at?: string
          created_by?: string | null
          data?: Json
          features?: Json
          href?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          label?: string | null
          price?: string | null
          rating?: string | null
          sort_order?: number
          subtitle?: string | null
          text?: string | null
          title?: string
          updated_at?: string
          value?: string | null
          visible?: boolean
        }
        Update: {
          badge?: string | null
          collection?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          features?: Json
          href?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          label?: string | null
          price?: string | null
          rating?: string | null
          sort_order?: number
          subtitle?: string | null
          text?: string | null
          title?: string
          updated_at?: string
          value?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      cms_nav_items: {
        Row: {
          badge: string | null
          created_at: string
          created_by: string | null
          description: string | null
          group_label: string | null
          href: string
          icon: string | null
          id: string
          is_cta: boolean
          label: string
          location: string
          new_tab: boolean
          page_id: string | null
          parent_id: string | null
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          badge?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_label?: string | null
          href?: string
          icon?: string | null
          id?: string
          is_cta?: boolean
          label: string
          location?: string
          new_tab?: boolean
          page_id?: string | null
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          badge?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_label?: string | null
          href?: string
          icon?: string | null
          id?: string
          is_cta?: boolean
          label?: string
          location?: string
          new_tab?: boolean
          page_id?: string | null
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cms_nav_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_nav_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_nav_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_versions: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          note: string | null
          page_id: string
          snapshot: Json
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          note?: string | null
          page_id: string
          snapshot: Json
          status?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          note?: string | null
          page_id?: string
          snapshot?: Json
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          metadata: Json
          publish_at: string | null
          published_at: string | null
          seo: Json
          slug: string
          sort_order: number
          status: string
          subtitle: string | null
          theme: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          seo?: Json
          slug: string
          sort_order?: number
          status?: string
          subtitle?: string | null
          theme?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          metadata?: Json
          publish_at?: string | null
          published_at?: string | null
          seo?: Json
          slug?: string
          sort_order?: number
          status?: string
          subtitle?: string | null
          theme?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_published: {
        Row: {
          blocks: Json
          created_at: string
          kind: string
          metadata: Json
          page_id: string
          published_at: string
          published_by: string | null
          seo: Json
          slug: string
          sort_order: number
          subtitle: string | null
          theme: Json
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          blocks?: Json
          created_at?: string
          kind?: string
          metadata?: Json
          page_id: string
          published_at?: string
          published_by?: string | null
          seo?: Json
          slug: string
          sort_order?: number
          subtitle?: string | null
          theme?: Json
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          blocks?: Json
          created_at?: string
          kind?: string
          metadata?: Json
          page_id?: string
          published_at?: string
          published_by?: string | null
          seo?: Json
          slug?: string
          sort_order?: number
          subtitle?: string | null
          theme?: Json
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cms_published_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_redirects: {
        Row: {
          code: number
          created_at: string
          created_by: string | null
          from_path: string
          id: string
          is_active: boolean
          note: string | null
          to_path: string
          updated_at: string
        }
        Insert: {
          code?: number
          created_at?: string
          created_by?: string | null
          from_path: string
          id?: string
          is_active?: boolean
          note?: string | null
          to_path: string
          updated_at?: string
        }
        Update: {
          code?: number
          created_at?: string
          created_by?: string | null
          from_path?: string
          id?: string
          is_active?: boolean
          note?: string | null
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_settings: {
        Row: {
          created_at: string
          home_page_id: string | null
          id: string
          safe_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          home_page_id?: string | null
          id?: string
          safe_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          home_page_id?: string | null
          id?: string
          safe_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_settings_home_page_id_fkey"
            columns: ["home_page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
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
      enrollment_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detail: Json
          enrollment_id: string | null
          id: string
          ip_address: string | null
          node_id: string | null
          node_title: string | null
          target_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          enrollment_id?: string | null
          id?: string
          ip_address?: string | null
          node_id?: string | null
          node_title?: string | null
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          enrollment_id?: string | null
          id?: string
          ip_address?: string | null
          node_id?: string | null
          node_title?: string | null
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "enrollments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      neo_ai_intakes: {
        Row: {
          ai_data: Json
          confidence: Json
          corrections: Json
          created_at: string
          created_by: string | null
          doc_paths: Json
          final_data: Json
          id: string
          model: string | null
          ocr_text: string | null
          overall_confidence: number | null
          patient_id: string | null
          source: string
          unit: string | null
          updated_at: string
          warnings: Json
        }
        Insert: {
          ai_data?: Json
          confidence?: Json
          corrections?: Json
          created_at?: string
          created_by?: string | null
          doc_paths?: Json
          final_data?: Json
          id?: string
          model?: string | null
          ocr_text?: string | null
          overall_confidence?: number | null
          patient_id?: string | null
          source?: string
          unit?: string | null
          updated_at?: string
          warnings?: Json
        }
        Update: {
          ai_data?: Json
          confidence?: Json
          corrections?: Json
          created_at?: string
          created_by?: string | null
          doc_paths?: Json
          final_data?: Json
          id?: string
          model?: string | null
          ocr_text?: string | null
          overall_confidence?: number | null
          patient_id?: string | null
          source?: string
          unit?: string | null
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "neo_ai_intakes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_email: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: string
          patient_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_email?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          id?: string
          patient_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_email?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          patient_id?: string | null
        }
        Relationships: []
      }
      neo_care_team: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      neo_evolutions: {
        Row: {
          author: string | null
          content: Json
          created_at: string
          created_by: string | null
          day_number: number
          format: string
          id: string
          patient_id: string
          recorded_at: string
          updated_at: string
          vitals: Json
        }
        Insert: {
          author?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          day_number?: number
          format?: string
          id?: string
          patient_id: string
          recorded_at?: string
          updated_at?: string
          vitals?: Json
        }
        Update: {
          author?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          day_number?: number
          format?: string
          id?: string
          patient_id?: string
          recorded_at?: string
          updated_at?: string
          vitals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "neo_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_form_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          scope: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      neo_labs: {
        Row: {
          category: string
          comments: string | null
          created_at: string
          created_by: string | null
          id: string
          interpretation: string | null
          name: string
          patient_id: string
          results: Json
          storage_path: string | null
          taken_at: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interpretation?: string | null
          name?: string
          patient_id: string
          results?: Json
          storage_path?: string | null
          taken_at?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interpretation?: string | null
          name?: string
          patient_id?: string
          results?: Json
          storage_path?: string | null
          taken_at?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neo_labs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_media: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          mime_type: string | null
          patient_id: string
          storage_path: string | null
          taken_at: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          patient_id: string
          storage_path?: string | null
          taken_at?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          patient_id?: string
          storage_path?: string | null
          taken_at?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neo_media_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_medications: {
        Row: {
          created_at: string
          created_by: string | null
          dose: string | null
          ended_at: string | null
          frequency: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          patient_id: string
          route: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dose?: string | null
          ended_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          patient_id: string
          route?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dose?: string | null
          ended_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          patient_id?: string
          route?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neo_medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_nutrition: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          kind: string
          notes: string | null
          patient_id: string
          recorded_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          notes?: string | null
          patient_id: string
          recorded_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          notes?: string | null
          patient_id?: string
          recorded_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neo_nutrition_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_patients: {
        Row: {
          ai_summary: string | null
          apellidos: string
          area_slug: string
          created_at: string
          created_by: string | null
          diagnoses: Json
          diagnostico_ingreso: string | null
          edad_gestacional: number | null
          exam: Json
          fecha_ingreso: string
          fecha_nacimiento: string | null
          general: Json
          hc: string | null
          hora_nacimiento: string | null
          id: string
          maternal: Json
          medico_responsable: string | null
          nombres: string
          peso_nacimiento: number | null
          program_slug: string
          scales: Json
          sexo: string | null
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          apellidos?: string
          area_slug?: string
          created_at?: string
          created_by?: string | null
          diagnoses?: Json
          diagnostico_ingreso?: string | null
          edad_gestacional?: number | null
          exam?: Json
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          general?: Json
          hc?: string | null
          hora_nacimiento?: string | null
          id?: string
          maternal?: Json
          medico_responsable?: string | null
          nombres?: string
          peso_nacimiento?: number | null
          program_slug?: string
          scales?: Json
          sexo?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          apellidos?: string
          area_slug?: string
          created_at?: string
          created_by?: string | null
          diagnoses?: Json
          diagnostico_ingreso?: string | null
          edad_gestacional?: number | null
          exam?: Json
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          general?: Json
          hc?: string | null
          hora_nacimiento?: string | null
          id?: string
          maternal?: Json
          medico_responsable?: string | null
          nombres?: string
          peso_nacimiento?: number | null
          program_slug?: string
          scales?: Json
          sexo?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      neo_procedures: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          name: string
          notes: string | null
          patient_id: string
          performed_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string
          notes?: string | null
          patient_id: string
          performed_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          performed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neo_procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      neo_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_unit: string | null
          id: string
          patient_id: string
          reason: string | null
          to_unit: string
          transferred_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_unit?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          to_unit: string
          transferred_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_unit?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          to_unit?: string
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neo_transfers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "neo_patients"
            referencedColumns: ["id"]
          },
        ]
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
      ui_menu_prefs: {
        Row: {
          config: Json
          created_at: string
          id: string
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          scope: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
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
      user_enrollments: {
        Row: {
          assigned_by: string | null
          assignment_type: string
          created_at: string
          enrollment_kind: string
          expires_at: string | null
          id: string
          node_id: string
          observations: string | null
          plan_id: string | null
          reason: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          enrollment_kind?: string
          expires_at?: string | null
          id?: string
          node_id: string
          observations?: string | null
          plan_id?: string | null
          reason?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          enrollment_kind?: string
          expires_at?: string | null
          id?: string
          node_id?: string
          observations?: string | null
          plan_id?: string | null
          reason?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_enrollments_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
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
      ward_assignments: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          patient_id: string
          role: string
          started_at: string
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          patient_id: string
          role?: string
          started_at?: string
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          patient_id?: string
          role?: string
          started_at?: string
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "ward_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_balance: {
        Row: {
          created_at: string
          created_by: string | null
          egresos: Json
          id: string
          ingresos: Json
          note: string | null
          on_date: string
          patient_id: string
          shift: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          egresos?: Json
          id?: string
          ingresos?: Json
          note?: string | null
          on_date?: string
          patient_id: string
          shift?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          egresos?: Json
          id?: string
          ingresos?: Json
          note?: string | null
          on_date?: string
          patient_id?: string
          shift?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_balance_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_bed_assignment_log: {
        Row: {
          actor_id: string | null
          bed_id: string
          created_at: string
          from_user_id: string | null
          id: string
          to_user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          bed_id: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          to_user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          bed_id?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_bed_assignment_log_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "ward_beds"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_bed_assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          bed_id: string
          created_at: string
          id: string
          note: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          bed_id: string
          created_at?: string
          id?: string
          note?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          bed_id?: string
          created_at?: string
          id?: string
          note?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_bed_assignments_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "ward_beds"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_beds: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          number: string
          sort_order: number
          updated_at: string
          zone_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          number: string
          sort_order?: number
          updated_at?: string
          zone_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          number?: string
          sort_order?: number
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_beds_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "ward_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_calcs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          note: string | null
          patient_id: string | null
          result: string | null
          tool: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          note?: string | null
          patient_id?: string | null
          result?: string | null
          tool: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          note?: string | null
          patient_id?: string | null
          result?: string | null
          tool?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_calcs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_competencies: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          group_label: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_label?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_label?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ward_competency_progress: {
        Row: {
          competency_id: string
          created_at: string
          id: string
          note: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competency_id: string
          created_at?: string
          id?: string
          note?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competency_id?: string
          created_at?: string
          id?: string
          note?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_competency_progress_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "ward_competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_consults: {
        Row: {
          answered_at: string | null
          created_at: string
          created_by: string | null
          id: string
          patient_id: string
          reason: string | null
          requested_at: string
          response: string | null
          specialty: string
          status: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          requested_at?: string
          response?: string | null
          specialty: string
          status?: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          requested_at?: string
          response?: string | null
          specialty?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_consults_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_events: {
        Row: {
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          kind: string
          occurred_at: string
          patient_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          patient_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          patient_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_evolutions: {
        Row: {
          analysis: string | null
          author_id: string | null
          created_at: string
          created_by: string | null
          evo_date: string
          hosp_day: number | null
          id: string
          objective: Json
          patient_id: string
          plan_note: string | null
          status: string
          subjective: Json
          summary: string | null
          updated_at: string
        }
        Insert: {
          analysis?: string | null
          author_id?: string | null
          created_at?: string
          created_by?: string | null
          evo_date?: string
          hosp_day?: number | null
          id?: string
          objective?: Json
          patient_id: string
          plan_note?: string | null
          status?: string
          subjective?: Json
          summary?: string | null
          updated_at?: string
        }
        Update: {
          analysis?: string | null
          author_id?: string | null
          created_at?: string
          created_by?: string | null
          evo_date?: string
          hosp_day?: number | null
          id?: string
          objective?: Json
          patient_id?: string
          plan_note?: string | null
          status?: string
          subjective?: Json
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_exams: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          flag: string
          id: string
          name: string
          notes: string | null
          patient_id: string
          requested_at: string
          result_text: string | null
          status: string
          taken_at: string | null
          updated_at: string
          values: Json
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          flag?: string
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          requested_at?: string
          result_text?: string | null
          status?: string
          taken_at?: string | null
          updated_at?: string
          values?: Json
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          flag?: string
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          requested_at?: string
          result_text?: string | null
          status?: string
          taken_at?: string | null
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ward_exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_files: {
        Row: {
          bucket: string
          created_at: string
          created_by: string | null
          id: string
          mime: string | null
          name: string
          note: string | null
          path: string
          patient_id: string
          ref_id: string | null
          ref_kind: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mime?: string | null
          name: string
          note?: string | null
          path: string
          patient_id: string
          ref_id?: string | null
          ref_kind?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mime?: string | null
          name?: string
          note?: string | null
          path?: string
          patient_id?: string
          ref_id?: string | null
          ref_kind?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_learning_cases: {
        Row: {
          author_id: string | null
          created_at: string
          created_by: string | null
          differential: string | null
          difficulties: string | null
          evolution: string | null
          final_dx: string | null
          id: string
          learnings: string | null
          patient_id: string | null
          pearls: string | null
          problem: string | null
          reflection: string | null
          studies: string | null
          title: string
          treatment: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          created_by?: string | null
          differential?: string | null
          difficulties?: string | null
          evolution?: string | null
          final_dx?: string | null
          id?: string
          learnings?: string | null
          patient_id?: string | null
          pearls?: string | null
          problem?: string | null
          reflection?: string | null
          studies?: string | null
          title: string
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          created_by?: string | null
          differential?: string | null
          difficulties?: string | null
          evolution?: string | null
          final_dx?: string | null
          id?: string
          learnings?: string | null
          patient_id?: string | null
          pearls?: string | null
          problem?: string | null
          reflection?: string | null
          studies?: string | null
          title?: string
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_learning_cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_meds: {
        Row: {
          calc: Json
          created_at: string
          created_by: string | null
          dose: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          patient_id: string
          route: string | null
          started_at: string | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          calc?: Json
          created_at?: string
          created_by?: string | null
          dose?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          route?: string | null
          started_at?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          calc?: Json
          created_at?: string
          created_by?: string | null
          dose?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          route?: string | null
          started_at?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_meds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_patients: {
        Row: {
          abcde: Json
          admitted_at: string
          age_label: string | null
          allergies: string | null
          background: string | null
          bed_id: string | null
          code: string | null
          created_at: string
          created_by: string | null
          devices: string[]
          discharge: Json
          discharged_at: string | null
          exam: Json
          height_cm: number | null
          history: Json
          id: string
          initials: string | null
          main_dx: string | null
          medications: string | null
          notes: string | null
          origin: string | null
          origin_at: string | null
          priority: string
          reason: string | null
          secondary_dx: string[]
          sex: string | null
          stage: string | null
          status: string
          summary_text: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          abcde?: Json
          admitted_at?: string
          age_label?: string | null
          allergies?: string | null
          background?: string | null
          bed_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          devices?: string[]
          discharge?: Json
          discharged_at?: string | null
          exam?: Json
          height_cm?: number | null
          history?: Json
          id?: string
          initials?: string | null
          main_dx?: string | null
          medications?: string | null
          notes?: string | null
          origin?: string | null
          origin_at?: string | null
          priority?: string
          reason?: string | null
          secondary_dx?: string[]
          sex?: string | null
          stage?: string | null
          status?: string
          summary_text?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          abcde?: Json
          admitted_at?: string
          age_label?: string | null
          allergies?: string | null
          background?: string | null
          bed_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          devices?: string[]
          discharge?: Json
          discharged_at?: string | null
          exam?: Json
          height_cm?: number | null
          history?: Json
          id?: string
          initials?: string | null
          main_dx?: string | null
          medications?: string | null
          notes?: string | null
          origin?: string | null
          origin_at?: string | null
          priority?: string
          reason?: string | null
          secondary_dx?: string[]
          sex?: string | null
          stage?: string | null
          status?: string
          summary_text?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_patients_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "ward_beds"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_pavilions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          sort_order: number
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sort_order?: number
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ward_plan_items: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          owner: string | null
          patient_id: string
          problem_id: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          owner?: string | null
          patient_id: string
          problem_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          owner?: string | null
          patient_id?: string
          problem_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_plan_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_plan_items_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "ward_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_problems: {
        Row: {
          created_at: string
          created_by: string | null
          evidence: string | null
          id: string
          patient_id: string
          plan: string | null
          sort_order: number
          state: string
          studies: string | null
          title: string
          trend: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence?: string | null
          id?: string
          patient_id: string
          plan?: string | null
          sort_order?: number
          state?: string
          studies?: string | null
          title: string
          trend?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence?: string | null
          id?: string
          patient_id?: string
          plan?: string | null
          sort_order?: number
          state?: string
          studies?: string | null
          title?: string
          trend?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_problems_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_procedures: {
        Row: {
          competency_id: string | null
          created_at: string
          created_by: string | null
          done_at: string
          id: string
          indication: string | null
          level: string
          name: string
          note: string | null
          patient_id: string | null
          updated_at: string
        }
        Insert: {
          competency_id?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string
          id?: string
          indication?: string | null
          level?: string
          name: string
          note?: string | null
          patient_id?: string | null
          updated_at?: string
        }
        Update: {
          competency_id?: string | null
          created_at?: string
          created_by?: string | null
          done_at?: string
          id?: string
          indication?: string | null
          level?: string
          name?: string
          note?: string | null
          patient_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_procedures_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "ward_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_study_links: {
        Row: {
          created_at: string
          created_by: string | null
          dx_key: string
          id: string
          key_points: string | null
          sort_order: number
          summary: string | null
          topic: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dx_key: string
          id?: string
          key_points?: string | null
          sort_order?: number
          summary?: string | null
          topic: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dx_key?: string
          id?: string
          key_points?: string | null
          sort_order?: number
          summary?: string | null
          topic?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      ward_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          done_at: string | null
          due_at: string | null
          id: string
          kind: string
          owner: string | null
          patient_id: string | null
          priority: string
          problem_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          owner?: string | null
          patient_id?: string | null
          priority?: string
          problem_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          owner?: string | null
          patient_id?: string | null
          priority?: string
          problem_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "ward_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_vitals: {
        Row: {
          created_at: string
          created_by: string | null
          fc: number | null
          fr: number | null
          glasgow: number | null
          id: string
          note: string | null
          pa: string | null
          pain: number | null
          pam: number | null
          patient_id: string
          sato2: number | null
          taken_at: string
          temp: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fc?: number | null
          fr?: number | null
          glasgow?: number | null
          id?: string
          note?: string | null
          pa?: string | null
          pain?: number | null
          pam?: number | null
          patient_id: string
          sato2?: number | null
          taken_at?: string
          temp?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fc?: number | null
          fr?: number | null
          glasgow?: number | null
          id?: string
          note?: string | null
          pa?: string | null
          pain?: number | null
          pam?: number | null
          patient_id?: string
          sato2?: number | null
          taken_at?: string
          temp?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "ward_patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_zones: {
        Row: {
          accent: string | null
          col: number
          col_span: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string
          note: string | null
          pavilion_id: string
          row_index: number
          row_span: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent?: string | null
          col?: number
          col_span?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label: string
          note?: string | null
          pavilion_id: string
          row_index?: number
          row_span?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent?: string | null
          col?: number
          col_span?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string
          note?: string | null
          pavilion_id?: string
          row_index?: number
          row_span?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_zones_pavilion_id_fkey"
            columns: ["pavilion_id"]
            isOneToOne: false
            referencedRelation: "ward_pavilions"
            referencedColumns: ["id"]
          },
        ]
      }
      website_projects: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          framework: string | null
          id: string
          integration_mode: string
          last_scan_at: string | null
          last_scan_summary: Json
          name: string
          notes: string | null
          repository: string | null
          slug: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment?: string
          framework?: string | null
          id?: string
          integration_mode?: string
          last_scan_at?: string | null
          last_scan_summary?: Json
          name: string
          notes?: string | null
          repository?: string | null
          slug: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          framework?: string | null
          id?: string
          integration_mode?: string
          last_scan_at?: string | null
          last_scan_summary?: Json
          name?: string
          notes?: string | null
          repository?: string | null
          slug?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      website_scan_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detail: Json
          duration_ms: number | null
          error_message: string | null
          id: string
          project_id: string
          status: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          project_id: string
          status?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_scan_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "website_projects"
            referencedColumns: ["id"]
          },
        ]
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
      can_edit_ward_patient: { Args: { _patient_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_enrollment_admin: { Args: { _user_id: string }; Returns: boolean }
      is_ward_admin: { Args: { _user_id: string }; Returns: boolean }
      ward_roster: {
        Args: never
        Returns: {
          full_name: string
          initials: string
          is_admin: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin" | "academic_admin"
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
      app_role: ["admin", "student", "super_admin", "academic_admin"],
      program_slug: ["residentado", "internado", "r1", "r2", "r3"],
    },
  },
} as const
