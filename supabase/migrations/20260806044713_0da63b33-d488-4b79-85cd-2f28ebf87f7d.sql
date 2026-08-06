CREATE TABLE public.cms_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'page',
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  status text NOT NULL DEFAULT 'draft',
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.cms_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX cms_blocks_page_idx ON public.cms_blocks(page_id, sort_order);

CREATE TABLE public.cms_page_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX cms_page_versions_page_idx ON public.cms_page_versions(page_id, created_at DESC);

GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;

GRANT SELECT ON public.cms_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_blocks TO authenticated;
GRANT ALL ON public.cms_blocks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_page_versions TO authenticated;
GRANT ALL ON public.cms_page_versions TO service_role;

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cms_pages_public_read ON public.cms_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY cms_pages_admin_read ON public.cms_pages
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY cms_pages_admin_write ON public.cms_pages
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY cms_blocks_public_read ON public.cms_blocks
  FOR SELECT TO anon, authenticated
  USING (visible AND EXISTS (SELECT 1 FROM public.cms_pages p WHERE p.id = cms_blocks.page_id AND p.status = 'published'));

CREATE POLICY cms_blocks_admin_read ON public.cms_blocks
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY cms_blocks_admin_write ON public.cms_blocks
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY cms_versions_admin_all ON public.cms_page_versions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_cms_pages_updated_at BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cms_blocks_updated_at BEFORE UPDATE ON public.cms_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();