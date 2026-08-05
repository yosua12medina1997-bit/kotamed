CREATE TABLE public.academy_cms_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL,
  scope text NOT NULL DEFAULT 'internado-medico-hospitalizacion:neonatologia',
  parent_id uuid REFERENCES public.academy_cms_nodes(id) ON DELETE CASCADE,
  level_kind text NOT NULL DEFAULT 'tema',
  case_type text,
  title text NOT NULL,
  subtitle text,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  hidden boolean NOT NULL DEFAULT false,
  publish_at timestamptz,
  close_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  roles text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_cms_nodes_module ON public.academy_cms_nodes(module, scope);
CREATE INDEX idx_academy_cms_nodes_parent ON public.academy_cms_nodes(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_cms_nodes TO authenticated;
GRANT ALL ON public.academy_cms_nodes TO service_role;
ALTER TABLE public.academy_cms_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_cms_nodes_read ON public.academy_cms_nodes
FOR SELECT TO authenticated
USING (is_published AND NOT hidden);

CREATE POLICY academy_cms_nodes_admin_read ON public.academy_cms_nodes
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY academy_cms_nodes_admin_insert ON public.academy_cms_nodes
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY academy_cms_nodes_admin_update ON public.academy_cms_nodes
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY academy_cms_nodes_admin_delete ON public.academy_cms_nodes
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_academy_cms_nodes_updated_at
BEFORE UPDATE ON public.academy_cms_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_cms_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL,
  scope text NOT NULL DEFAULT 'internado-medico-hospitalizacion:neonatologia',
  key text NOT NULL,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  applies_to text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, scope, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_cms_fields TO authenticated;
GRANT ALL ON public.academy_cms_fields TO service_role;
ALTER TABLE public.academy_cms_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_cms_fields_read ON public.academy_cms_fields
FOR SELECT TO authenticated USING (true);

CREATE POLICY academy_cms_fields_admin_write ON public.academy_cms_fields
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_academy_cms_fields_updated_at
BEFORE UPDATE ON public.academy_cms_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_cms_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.academy_cms_nodes(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_academy_cms_versions_node ON public.academy_cms_versions(node_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_cms_versions TO authenticated;
GRANT ALL ON public.academy_cms_versions TO service_role;
ALTER TABLE public.academy_cms_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_cms_versions_admin_all ON public.academy_cms_versions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));