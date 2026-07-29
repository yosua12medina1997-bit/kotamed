-- =========== CASOS CLÍNICOS ===========
CREATE TABLE public.academy_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  title text NOT NULL,
  level text NOT NULL DEFAULT 'residentado',
  specialty text,
  subspecialty text,
  topic text,
  difficulty int NOT NULL DEFAULT 2,
  tags text[] NOT NULL DEFAULT '{}',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_cases TO authenticated;
GRANT ALL ON public.academy_cases TO service_role;
ALTER TABLE public.academy_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_cases_read ON public.academy_cases FOR SELECT TO authenticated
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_cases_admin_insert ON public.academy_cases FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_cases_admin_update ON public.academy_cases FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_cases_admin_delete ON public.academy_cases FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academy_cases_updated BEFORE UPDATE ON public.academy_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== BANCO DE PREGUNTAS ===========
CREATE TABLE public.academy_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  stem text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer_index int NOT NULL DEFAULT 0,
  explanation text,
  bibliography text,
  level text NOT NULL DEFAULT 'residentado',
  exam_type text NOT NULL DEFAULT 'ENAM',
  specialty text,
  topic text,
  subtopic text,
  tags text[] NOT NULL DEFAULT '{}',
  difficulty int NOT NULL DEFAULT 2,
  time_seconds int NOT NULL DEFAULT 60,
  bank text NOT NULL DEFAULT 'personal',
  image_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_questions_area_idx ON public.academy_questions (area_slug, bank, topic);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_questions TO authenticated;
GRANT ALL ON public.academy_questions TO service_role;
ALTER TABLE public.academy_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_questions_read ON public.academy_questions FOR SELECT TO authenticated
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_questions_admin_insert ON public.academy_questions FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_questions_admin_update ON public.academy_questions FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_questions_admin_delete ON public.academy_questions FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academy_questions_updated BEFORE UPDATE ON public.academy_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== INTENTOS ===========
CREATE TABLE public.academy_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question_id uuid NOT NULL REFERENCES public.academy_questions(id) ON DELETE CASCADE,
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  topic text,
  chosen_index int NOT NULL,
  is_correct boolean NOT NULL,
  seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_attempts_user_idx ON public.academy_attempts (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_attempts TO authenticated;
GRANT ALL ON public.academy_attempts TO service_role;
ALTER TABLE public.academy_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_attempts_own ON public.academy_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========== SIMULADORES ===========
CREATE TABLE public.academy_simulators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  title text NOT NULL,
  level text NOT NULL DEFAULT 'residentado',
  topic text,
  mode text NOT NULL DEFAULT 'tutor',
  scenario jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_simulators TO authenticated;
GRANT ALL ON public.academy_simulators TO service_role;
ALTER TABLE public.academy_simulators ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_simulators_read ON public.academy_simulators FOR SELECT TO authenticated
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_simulators_admin_insert ON public.academy_simulators FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_simulators_admin_update ON public.academy_simulators FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_simulators_admin_delete ON public.academy_simulators FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academy_simulators_updated BEFORE UPDATE ON public.academy_simulators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== GUIONES DE VIDEO ===========
CREATE TABLE public.academy_video_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  title text NOT NULL,
  topic text,
  storyboard jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_video_scripts TO authenticated;
GRANT ALL ON public.academy_video_scripts TO service_role;
ALTER TABLE public.academy_video_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_video_scripts_read ON public.academy_video_scripts FOR SELECT TO authenticated
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_video_scripts_admin_insert ON public.academy_video_scripts FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_video_scripts_admin_update ON public.academy_video_scripts FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_video_scripts_admin_delete ON public.academy_video_scripts FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academy_video_scripts_updated BEFORE UPDATE ON public.academy_video_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== FLASHCARDS ===========
CREATE TABLE public.academy_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  front text NOT NULL,
  back text NOT NULL,
  topic text,
  block text,
  tags text[] NOT NULL DEFAULT '{}',
  difficulty int NOT NULL DEFAULT 2,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_flashcards_area_idx ON public.academy_flashcards (area_slug, topic);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_flashcards TO authenticated;
GRANT ALL ON public.academy_flashcards TO service_role;
ALTER TABLE public.academy_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_flashcards_read ON public.academy_flashcards FOR SELECT TO authenticated
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_flashcards_admin_insert ON public.academy_flashcards FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_flashcards_admin_update ON public.academy_flashcards FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_flashcards_admin_delete ON public.academy_flashcards FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academy_flashcards_updated BEFORE UPDATE ON public.academy_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  card_id uuid NOT NULL REFERENCES public.academy_flashcards(id) ON DELETE CASCADE,
  ease numeric NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  repetitions int NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_grade int,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_flashcard_reviews TO authenticated;
GRANT ALL ON public.academy_flashcard_reviews TO service_role;
ALTER TABLE public.academy_flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_flashcard_reviews_own ON public.academy_flashcard_reviews FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========== BIBLIOTECA ===========
CREATE TABLE public.academy_library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'guia',
  author text,
  year int,
  specialty text,
  topic text,
  subtopic text,
  keywords text[] NOT NULL DEFAULT '{}',
  url text,
  storage_path text,
  summary text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_library_items TO authenticated;
GRANT ALL ON public.academy_library_items TO service_role;
ALTER TABLE public.academy_library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_library_read ON public.academy_library_items FOR SELECT TO authenticated
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_library_admin_insert ON public.academy_library_items FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_library_admin_update ON public.academy_library_items FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY academy_library_admin_delete ON public.academy_library_items FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER academy_library_updated BEFORE UPDATE ON public.academy_library_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== EVENTOS DE ESTUDIO ===========
CREATE TABLE public.academy_study_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  activity text NOT NULL,
  topic text,
  minutes numeric NOT NULL DEFAULT 0,
  score numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_study_events_user_idx ON public.academy_study_events (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_study_events TO authenticated;
GRANT ALL ON public.academy_study_events TO service_role;
ALTER TABLE public.academy_study_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY academy_study_events_own ON public.academy_study_events FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());