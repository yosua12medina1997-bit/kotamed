
-- Tabla jerárquica de contenido editable por admin
CREATE TABLE public.content_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES public.content_nodes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('course','program','area','subarea','chapter','lesson')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, slug)
);

GRANT SELECT ON public.content_nodes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_nodes TO authenticated;
GRANT ALL ON public.content_nodes TO service_role;

ALTER TABLE public.content_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_nodes_read_all"
  ON public.content_nodes FOR SELECT
  USING (true);

CREATE POLICY "content_nodes_admin_insert"
  ON public.content_nodes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "content_nodes_admin_update"
  ON public.content_nodes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "content_nodes_admin_delete"
  ON public.content_nodes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_nodes_parent ON public.content_nodes(parent_id, sort_order);
CREATE INDEX idx_content_nodes_kind ON public.content_nodes(kind);

CREATE TRIGGER trg_content_nodes_updated_at
  BEFORE UPDATE ON public.content_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
