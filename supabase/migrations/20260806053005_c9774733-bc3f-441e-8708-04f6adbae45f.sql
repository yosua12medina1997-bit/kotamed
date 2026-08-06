-- Navegación editable del sitio (cabecera / pie)
CREATE TABLE public.cms_nav_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location text NOT NULL DEFAULT 'header',
  parent_id uuid REFERENCES public.cms_nav_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  href text NOT NULL DEFAULT '#',
  icon text,
  badge text,
  description text,
  group_label text,
  is_cta boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_nav_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_nav_items TO authenticated;
GRANT ALL ON public.cms_nav_items TO service_role;

ALTER TABLE public.cms_nav_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_nav_public_read" ON public.cms_nav_items
  FOR SELECT TO anon, authenticated USING (visible = true);

CREATE POLICY "cms_nav_admin_read" ON public.cms_nav_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "cms_nav_admin_write" ON public.cms_nav_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_cms_nav_items_updated_at BEFORE UPDATE ON public.cms_nav_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cms_nav_items_location ON public.cms_nav_items(location, sort_order);

-- Colecciones reutilizables (docentes, testimonios, planes, FAQ, contadores, cronogramas)
CREATE TABLE public.cms_collection_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection text NOT NULL,
  title text NOT NULL DEFAULT '',
  subtitle text,
  text text,
  image text,
  icon text,
  href text,
  badge text,
  value text,
  label text,
  price text,
  rating text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_collection_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_collection_items TO authenticated;
GRANT ALL ON public.cms_collection_items TO service_role;

ALTER TABLE public.cms_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_collection_public_read" ON public.cms_collection_items
  FOR SELECT TO anon, authenticated USING (visible = true);

CREATE POLICY "cms_collection_admin_read" ON public.cms_collection_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "cms_collection_admin_write" ON public.cms_collection_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_cms_collection_items_updated_at BEFORE UPDATE ON public.cms_collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cms_collection_items_collection ON public.cms_collection_items(collection, sort_order);

-- Publicación programada de páginas
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS publish_at timestamptz;