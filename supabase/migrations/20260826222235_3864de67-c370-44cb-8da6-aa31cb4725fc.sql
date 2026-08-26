-- Visibilidad basada únicamente en el estado de publicación para usuarios autenticados.
DROP POLICY IF EXISTS content_nodes_read_enrolled ON public.content_nodes;
CREATE POLICY content_nodes_read_published
  ON public.content_nodes FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS content_resources_read_enrolled ON public.content_resources;
CREATE POLICY content_resources_read_published
  ON public.content_resources FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.content_nodes n
      WHERE n.id = content_resources.node_id AND n.is_published = true
    )
  );

GRANT SELECT ON public.content_nodes TO authenticated;
GRANT SELECT ON public.content_resources TO authenticated;