-- 1) Contenido publicado (producción) separado del borrador
CREATE TABLE public.cms_published (
  page_id uuid PRIMARY KEY REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'page',
  title text NOT NULL,
  subtitle text,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  published_by uuid,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_published TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_published TO authenticated;
GRANT ALL ON public.cms_published TO service_role;

ALTER TABLE public.cms_published ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published CMS content is public"
  ON public.cms_published FOR SELECT
  USING (true);

CREATE POLICY "Admins publish CMS content"
  ON public.cms_published FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE POLICY "Admins update published CMS content"
  ON public.cms_published FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE POLICY "Admins unpublish CMS content"
  ON public.cms_published FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE TRIGGER trg_cms_published_updated_at
  BEFORE UPDATE ON public.cms_published
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Biblioteca de assets
CREATE TABLE public.cms_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  storage_path text,
  type text NOT NULL DEFAULT 'image',
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  alt text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_assets TO authenticated;
GRANT ALL ON public.cms_assets TO service_role;

ALTER TABLE public.cms_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read CMS assets"
  ON public.cms_assets FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage CMS assets"
  ON public.cms_assets FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE TRIGGER trg_cms_assets_updated_at
  BEFORE UPDATE ON public.cms_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Auditoría del CMS
CREATE TABLE public.cms_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  entity text NOT NULL,
  entity_id uuid,
  entity_label text,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cms_audit_log TO authenticated;
GRANT ALL ON public.cms_audit_log TO service_role;

ALTER TABLE public.cms_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read CMS audit"
  ON public.cms_audit_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'academic_admin')
  );

CREATE POLICY "Actors write own CMS audit"
  ON public.cms_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX cms_audit_log_created_idx ON public.cms_audit_log (created_at DESC);

-- 4) Ajustes del CMS (modo seguro)
CREATE TABLE public.cms_settings (
  id text PRIMARY KEY DEFAULT 'global',
  safe_mode boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.cms_settings TO authenticated;
GRANT ALL ON public.cms_settings TO service_role;

ALTER TABLE public.cms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CMS settings readable"
  ON public.cms_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins insert CMS settings"
  ON public.cms_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins update CMS settings"
  ON public.cms_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_cms_settings_updated_at
  BEFORE UPDATE ON public.cms_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cms_settings (id, safe_mode) VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

-- 5) Historial de versiones: estado y autor
ALTER TABLE public.cms_page_versions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_by_email text;

-- 6) Copia el contenido ya publicado a producción para no romper el sitio actual
INSERT INTO public.cms_published (
  page_id, slug, kind, title, subtitle, seo, theme, metadata, sort_order, blocks, version, published_at
)
SELECT
  p.id, p.slug, p.kind, p.title, p.subtitle, p.seo, p.theme, p.metadata, p.sort_order,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id, 'type', b.type, 'name', b.name, 'sort_order', b.sort_order,
          'visible', b.visible, 'props', b.props, 'style', b.style
        ) ORDER BY b.sort_order
      )
      FROM public.cms_blocks b
      WHERE b.page_id = p.id AND b.visible = true
    ),
    '[]'::jsonb
  ),
  1,
  COALESCE(p.published_at, now())
FROM public.cms_pages p
WHERE p.status = 'published'
ON CONFLICT (page_id) DO NOTHING;