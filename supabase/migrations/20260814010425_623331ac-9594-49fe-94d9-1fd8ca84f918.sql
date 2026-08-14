-- Helper: admin check for the assessment engine
CREATE OR REPLACE FUNCTION public.apex_is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$$;
REVOKE ALL ON FUNCTION public.apex_is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apex_is_admin(uuid) TO authenticated, service_role;

-- ============ TAXONOMY ============
CREATE TABLE public.apex_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'subject',
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apex_taxonomy TO authenticated;
GRANT ALL ON public.apex_taxonomy TO service_role;
ALTER TABLE public.apex_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_taxonomy_read" ON public.apex_taxonomy FOR SELECT TO authenticated USING (true);
CREATE POLICY "apex_taxonomy_admin" ON public.apex_taxonomy FOR ALL TO authenticated
  USING (public.apex_is_admin(auth.uid())) WITH CHECK (public.apex_is_admin(auth.uid()));
CREATE INDEX apex_taxonomy_parent_idx ON public.apex_taxonomy(parent_id, sort_order);
CREATE INDEX apex_taxonomy_level_idx ON public.apex_taxonomy(level);
CREATE TRIGGER apex_taxonomy_updated BEFORE UPDATE ON public.apex_taxonomy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRIVATE QUESTION BANK ============
CREATE TABLE public.apex_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code text,
  stem text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answers text[] NOT NULL DEFAULT '{}',
  explanation text,
  reference text,
  source text,
  subject_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE SET NULL,
  subtopic_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE SET NULL,
  concept_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE SET NULL,
  subject_label text,
  topic_label text,
  subtopic_label text,
  chapter_label text,
  difficulty text NOT NULL DEFAULT 'intermedia',
  question_type text NOT NULL DEFAULT 'single',
  tags text[] NOT NULL DEFAULT '{}',
  program text,
  year integer,
  image_url text,
  status text NOT NULL DEFAULT 'draft',
  ai_suggested jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  times_used integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  times_wrong integer NOT NULL DEFAULT 0,
  total_seconds bigint NOT NULL DEFAULT 0,
  flagged_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apex_questions TO authenticated;
GRANT ALL ON public.apex_questions TO service_role;
ALTER TABLE public.apex_questions ENABLE ROW LEVEL SECURITY;
-- Admin-only: students never read the bank directly (server serves exam items).
CREATE POLICY "apex_questions_admin_only" ON public.apex_questions FOR ALL TO authenticated
  USING (public.apex_is_admin(auth.uid())) WITH CHECK (public.apex_is_admin(auth.uid()));
CREATE INDEX apex_questions_status_idx ON public.apex_questions(status);
CREATE INDEX apex_questions_class_idx ON public.apex_questions(subject_id, topic_id, subtopic_id, chapter_id);
CREATE INDEX apex_questions_difficulty_idx ON public.apex_questions(difficulty);
CREATE INDEX apex_questions_program_idx ON public.apex_questions(program);
CREATE INDEX apex_questions_tags_idx ON public.apex_questions USING gin(tags);
CREATE INDEX apex_questions_stem_fts_idx ON public.apex_questions USING gin (to_tsvector('spanish', stem));
CREATE UNIQUE INDEX apex_questions_code_unique ON public.apex_questions(question_code) WHERE question_code IS NOT NULL;
CREATE TRIGGER apex_questions_updated BEFORE UPDATE ON public.apex_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.apex_question_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.apex_questions(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.apex_question_versions TO authenticated;
GRANT ALL ON public.apex_question_versions TO service_role;
ALTER TABLE public.apex_question_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_qv_admin" ON public.apex_question_versions FOR ALL TO authenticated
  USING (public.apex_is_admin(auth.uid())) WITH CHECK (public.apex_is_admin(auth.uid()));
CREATE INDEX apex_qv_question_idx ON public.apex_question_versions(question_id, version DESC);

-- ============ EXAM BLUEPRINTS ============
CREATE TABLE public.apex_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  mode text NOT NULL DEFAULT 'practice',
  question_count integer NOT NULL DEFAULT 20,
  duration_minutes integer NOT NULL DEFAULT 30,
  blocks integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apex_exams TO authenticated;
GRANT ALL ON public.apex_exams TO service_role;
ALTER TABLE public.apex_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_exams_read_published" ON public.apex_exams FOR SELECT TO authenticated
  USING (is_published OR public.apex_is_admin(auth.uid()));
CREATE POLICY "apex_exams_admin" ON public.apex_exams FOR ALL TO authenticated
  USING (public.apex_is_admin(auth.uid())) WITH CHECK (public.apex_is_admin(auth.uid()));
CREATE UNIQUE INDEX apex_exams_slug_unique ON public.apex_exams(slug);
CREATE TRIGGER apex_exams_updated BEFORE UPDATE ON public.apex_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ATTEMPTS ============
CREATE TABLE public.apex_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.apex_exams(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Examen KotaMed',
  mode text NOT NULL DEFAULT 'practice',
  status text NOT NULL DEFAULT 'in_progress',
  question_count integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  blocks integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  score numeric,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  unanswered_count integer NOT NULL DEFAULT 0,
  seconds_used integer NOT NULL DEFAULT 0,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.apex_attempts TO authenticated;
GRANT ALL ON public.apex_attempts TO service_role;
ALTER TABLE public.apex_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_attempts_own" ON public.apex_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.apex_is_admin(auth.uid()));
CREATE POLICY "apex_attempts_own_write" ON public.apex_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX apex_attempts_user_idx ON public.apex_attempts(user_id, created_at DESC);
CREATE TRIGGER apex_attempts_updated BEFORE UPDATE ON public.apex_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.apex_attempt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.apex_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.apex_questions(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  block integer NOT NULL DEFAULT 1,
  chosen text[],
  is_correct boolean,
  seconds integer NOT NULL DEFAULT 0,
  flagged boolean NOT NULL DEFAULT false,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.apex_attempt_items TO authenticated;
GRANT ALL ON public.apex_attempt_items TO service_role;
ALTER TABLE public.apex_attempt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_items_own" ON public.apex_attempt_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.apex_attempts a WHERE a.id = attempt_id
    AND (a.user_id = auth.uid() OR public.apex_is_admin(auth.uid()))));
CREATE INDEX apex_items_attempt_idx ON public.apex_attempt_items(attempt_id, position);
CREATE INDEX apex_items_question_idx ON public.apex_attempt_items(question_id);

-- ============ QUALITY FLAGS ============
CREATE TABLE public.apex_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.apex_questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.apex_flags TO authenticated;
GRANT ALL ON public.apex_flags TO service_role;
ALTER TABLE public.apex_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_flags_insert_own" ON public.apex_flags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "apex_flags_read" ON public.apex_flags FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.apex_is_admin(auth.uid()));
CREATE POLICY "apex_flags_admin" ON public.apex_flags FOR UPDATE TO authenticated
  USING (public.apex_is_admin(auth.uid())) WITH CHECK (public.apex_is_admin(auth.uid()));
CREATE INDEX apex_flags_question_idx ON public.apex_flags(question_id, status);

-- ============ PERSONAL LEARNING LAYER ============
CREATE TABLE public.apex_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.apex_attempts(id) ON DELETE SET NULL,
  question_id uuid REFERENCES public.apex_questions(id) ON DELETE SET NULL,
  deck text NOT NULL DEFAULT 'Mis errores',
  front text NOT NULL,
  back text NOT NULL,
  source text,
  ease numeric NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_grade integer,
  state text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apex_flashcards TO authenticated;
GRANT ALL ON public.apex_flashcards TO service_role;
ALTER TABLE public.apex_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_flashcards_own" ON public.apex_flashcards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX apex_flashcards_user_idx ON public.apex_flashcards(user_id, due_at);
CREATE TRIGGER apex_flashcards_updated BEFORE UPDATE ON public.apex_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.apex_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.apex_attempts(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.apex_summaries TO authenticated;
GRANT ALL ON public.apex_summaries TO service_role;
ALTER TABLE public.apex_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_summaries_own" ON public.apex_summaries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX apex_summaries_user_idx ON public.apex_summaries(user_id, created_at DESC);

CREATE TABLE public.apex_study_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.apex_attempts(id) ON DELETE SET NULL,
  day_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  detail text,
  kind text NOT NULL DEFAULT 'study',
  minutes integer NOT NULL DEFAULT 20,
  taxonomy_label text,
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apex_study_plan TO authenticated;
GRANT ALL ON public.apex_study_plan TO service_role;
ALTER TABLE public.apex_study_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_plan_own" ON public.apex_study_plan FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX apex_plan_user_idx ON public.apex_study_plan(user_id, day_number);
CREATE TRIGGER apex_plan_updated BEFORE UPDATE ON public.apex_study_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REVIEW RESOURCES (official KotaMed content links) ============
CREATE TABLE public.apex_resource_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_id uuid REFERENCES public.apex_taxonomy(id) ON DELETE CASCADE,
  label_match text,
  kind text NOT NULL DEFAULT 'chapter',
  title text NOT NULL,
  description text,
  url text,
  node_id uuid REFERENCES public.content_nodes(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES public.content_resources(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apex_resource_links TO authenticated;
GRANT ALL ON public.apex_resource_links TO service_role;
ALTER TABLE public.apex_resource_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apex_resources_read" ON public.apex_resource_links FOR SELECT TO authenticated
  USING (is_published OR public.apex_is_admin(auth.uid()));
CREATE POLICY "apex_resources_admin" ON public.apex_resource_links FOR ALL TO authenticated
  USING (public.apex_is_admin(auth.uid())) WITH CHECK (public.apex_is_admin(auth.uid()));
CREATE INDEX apex_resources_tax_idx ON public.apex_resource_links(taxonomy_id);
CREATE INDEX apex_resources_label_idx ON public.apex_resource_links(label_match);
CREATE TRIGGER apex_resources_updated BEFORE UPDATE ON public.apex_resource_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();