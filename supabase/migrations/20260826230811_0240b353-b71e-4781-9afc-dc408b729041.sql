-- ============ Biblioteca Universal ============
CREATE TABLE public.library_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.library_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_categories TO authenticated;
GRANT ALL ON public.library_categories TO service_role;
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_categories_read_published" ON public.library_categories
  FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'));
CREATE POLICY "library_categories_admin_write" ON public.library_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'));

CREATE TRIGGER trg_library_categories_updated_at BEFORE UPDATE ON public.library_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.library_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  cover_url text,
  resource_type text NOT NULL DEFAULT 'documento',
  author text,
  publisher text,
  year integer,
  specialty text,
  category_id uuid REFERENCES public.library_categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.library_categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  bibliographic_source text,
  doi text,
  external_url text,
  file_url text,
  video_url text,
  access_level text NOT NULL DEFAULT 'authenticated',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  related_nodes uuid[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_resources TO authenticated;
GRANT ALL ON public.library_resources TO service_role;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_resources_read_published" ON public.library_resources
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'));
CREATE POLICY "library_resources_admin_write" ON public.library_resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'));

CREATE TRIGGER trg_library_resources_updated_at BEFORE UPDATE ON public.library_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_library_resources_status ON public.library_resources(status);
CREATE INDEX idx_library_resources_category ON public.library_resources(category_id);

CREATE TABLE public.library_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_favorites TO authenticated;
GRANT ALL ON public.library_favorites TO service_role;
ALTER TABLE public.library_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_favorites_own" ON public.library_favorites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ Actividad real de aprendizaje ============
CREATE TABLE public.learning_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  node_id uuid REFERENCES public.content_nodes(id) ON DELETE SET NULL,
  program_slug text,
  topic_id text,
  label text,
  kind text,
  path text,
  progress_pct integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_slug, topic_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_activity TO authenticated;
GRANT ALL ON public.learning_activity TO service_role;
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_activity_own" ON public.learning_activity
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learning_activity_admin_read" ON public.learning_activity
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_learning_activity_updated_at BEFORE UPDATE ON public.learning_activity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_learning_activity_user ON public.learning_activity(user_id, last_seen_at DESC);