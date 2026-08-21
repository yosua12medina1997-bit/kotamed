-- KOTA LEARNING · Academic Clinical Hub (Hospitalización + Emergencia)

CREATE TABLE public.kl_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  patient_id uuid NOT NULL,
  blocks jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, patient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kl_analyses TO authenticated;
GRANT ALL ON public.kl_analyses TO service_role;
ALTER TABLE public.kl_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kl_analyses_read" ON public.kl_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY "kl_analyses_insert" ON public.kl_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kl_analyses_update" ON public.kl_analyses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "kl_analyses_delete" ON public.kl_analyses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_kl_analyses_updated BEFORE UPDATE ON public.kl_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kl_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'tema',
  url text,
  storage_path text,
  body text,
  specialty text,
  level text,
  tags text[] NOT NULL DEFAULT '{}',
  objectives text[] NOT NULL DEFAULT '{}',
  duration_label text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kl_resources TO authenticated;
GRANT ALL ON public.kl_resources TO service_role;
ALTER TABLE public.kl_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kl_resources_read" ON public.kl_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "kl_resources_write" ON public.kl_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'));
CREATE TRIGGER trg_kl_resources_updated BEFORE UPDATE ON public.kl_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kl_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.kl_resources(id) ON DELETE CASCADE,
  scope text NOT NULL,
  scope_value text NOT NULL,
  module text,
  required boolean NOT NULL DEFAULT false,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kl_assignments_scope_idx ON public.kl_assignments (scope, scope_value);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kl_assignments TO authenticated;
GRANT ALL ON public.kl_assignments TO service_role;
ALTER TABLE public.kl_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kl_assignments_read" ON public.kl_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "kl_assignments_write" ON public.kl_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'academic_admin'));

CREATE TABLE public.kl_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.kl_resources(id) ON DELETE CASCADE,
  patient_id uuid,
  module text,
  status text NOT NULL DEFAULT 'pendiente',
  score numeric,
  minutes integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id, patient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kl_progress TO authenticated;
GRANT ALL ON public.kl_progress TO service_role;
ALTER TABLE public.kl_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kl_progress_own_read" ON public.kl_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "kl_progress_own_write" ON public.kl_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_kl_progress_updated BEFORE UPDATE ON public.kl_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();