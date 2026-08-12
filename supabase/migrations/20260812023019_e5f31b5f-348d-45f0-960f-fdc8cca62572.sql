CREATE TABLE IF NOT EXISTS public.cms_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  code integer NOT NULL DEFAULT 301,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_redirects TO authenticated;
GRANT ALL ON public.cms_redirects TO service_role;

ALTER TABLE public.cms_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_redirects_public_read" ON public.cms_redirects
  FOR SELECT USING (is_active = true);

CREATE POLICY "cms_redirects_admin_read" ON public.cms_redirects
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE POLICY "cms_redirects_admin_write" ON public.cms_redirects
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE TRIGGER update_cms_redirects_updated_at
  BEFORE UPDATE ON public.cms_redirects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cms_settings
  ADD COLUMN IF NOT EXISTS home_page_id uuid REFERENCES public.cms_pages(id) ON DELETE SET NULL;

ALTER TABLE public.cms_nav_items
  ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.cms_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS new_tab boolean NOT NULL DEFAULT false;