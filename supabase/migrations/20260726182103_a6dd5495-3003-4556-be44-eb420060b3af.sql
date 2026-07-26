-- 1. Resources table (files/videos/links/text per content node)
CREATE TABLE IF NOT EXISTS public.content_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.content_nodes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('file','video','link','text','image','audio','embed')),
  title text NOT NULL,
  url text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_resources TO authenticated;
GRANT SELECT ON public.content_resources TO anon;
GRANT ALL ON public.content_resources TO service_role;

ALTER TABLE public.content_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_resources_read_all ON public.content_resources FOR SELECT USING (true);
CREATE POLICY content_resources_admin_insert ON public.content_resources FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY content_resources_admin_update ON public.content_resources FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY content_resources_admin_delete ON public.content_resources FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER content_resources_updated_at BEFORE UPDATE ON public.content_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_content_resources_node ON public.content_resources(node_id, sort_order);

-- 2. Seed Pediatría course + 5 programs (idempotent by slug)
DO $$
DECLARE
  v_course uuid;
BEGIN
  SELECT id INTO v_course FROM public.content_nodes WHERE parent_id IS NULL AND slug = 'pediatria' LIMIT 1;
  IF v_course IS NULL THEN
    INSERT INTO public.content_nodes (parent_id, kind, title, slug, description, sort_order, is_published)
    VALUES (NULL, 'course', 'Pediatría', 'pediatria', 'Módulo integral de Pediatría desde preparación para residentado hasta R3.', 0, true)
    RETURNING id INTO v_course;
  END IF;

  INSERT INTO public.content_nodes (parent_id, kind, title, slug, description, sort_order, is_published)
  SELECT v_course, 'program', t.title, t.slug, t.description, t.ord, true
  FROM (VALUES
    ('Preparación para Residentado Médico', 'residentado', 'Programa orientado a ENAM, ESSALUD y Residentado Médico.', 1),
    ('Internado Médico — Rotación de Pediatría', 'internado', 'Formación práctica del interno durante la rotación pediátrica.', 2),
    ('Residencia de Pediatría — R1', 'r1', 'Primer año de residencia. Bases clínicas, guardias y fundamentos.', 3),
    ('Residencia de Pediatría — R2', 'r2', 'Segundo año. Subespecialidades, procedimientos y liderazgo clínico.', 4),
    ('Residencia de Pediatría — R3', 'r3', 'Tercer año. Autonomía, docencia e investigación.', 5)
  ) AS t(title, slug, description, ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_nodes c WHERE c.parent_id = v_course AND c.slug = t.slug
  );
END $$;