CREATE TABLE public.website_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  framework text,
  repository text,
  environment text NOT NULL DEFAULT 'production',
  integration_mode text NOT NULL DEFAULT 'read_only',
  last_scan_at timestamptz,
  last_scan_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.website_projects TO authenticated;
GRANT ALL ON public.website_projects TO service_role;

ALTER TABLE public.website_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view website projects"
ON public.website_projects FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can register website projects"
ON public.website_projects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update website projects"
ON public.website_projects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_website_projects_updated_at
BEFORE UPDATE ON public.website_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.website_scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.website_projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  duration_ms integer,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  actor_id uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.website_scan_events TO authenticated;
GRANT ALL ON public.website_scan_events TO service_role;

ALTER TABLE public.website_scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view website activity"
ON public.website_scan_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can log website activity"
ON public.website_scan_events FOR INSERT TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  AND actor_id = auth.uid()
);

CREATE INDEX idx_website_scan_events_project ON public.website_scan_events (project_id, created_at DESC);

INSERT INTO public.website_projects (name, slug, url, status, framework, environment, integration_mode, notes)
VALUES ('KOTAMED', 'kotamed-app', 'https://www.kotamed.app/', 'connected', 'TanStack Start (React 19 + Vite)', 'production', 'read_only', 'Integración inicial en modo solo lectura: CMS Studio no escribe en el sitio.');