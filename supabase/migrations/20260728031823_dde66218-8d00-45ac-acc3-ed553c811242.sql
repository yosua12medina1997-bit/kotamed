-- Restrict public reads to published rows; admins see everything
DROP POLICY IF EXISTS content_nodes_read_all ON public.content_nodes;
CREATE POLICY content_nodes_read_published
  ON public.content_nodes FOR SELECT
  TO anon, authenticated
  USING (is_published = true);
CREATE POLICY content_nodes_admin_read_all
  ON public.content_nodes FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS content_resources_read_all ON public.content_resources;
CREATE POLICY content_resources_read_published
  ON public.content_resources FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.content_nodes n
      WHERE n.id = content_resources.node_id AND n.is_published = true
    )
  );
CREATE POLICY content_resources_admin_read_all
  ON public.content_resources FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Tighten storage bucket 'content'
DROP POLICY IF EXISTS content_bucket_read ON storage.objects;
DROP POLICY IF EXISTS content_bucket_admin_read ON storage.objects;
DROP POLICY IF EXISTS content_bucket_public_read ON storage.objects;

CREATE POLICY content_bucket_admin_read
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY content_bucket_published_read
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND EXISTS (
      SELECT 1 FROM public.content_resources r
      JOIN public.content_nodes n ON n.id = r.node_id
      WHERE r.storage_path = storage.objects.name
        AND r.is_published = true
        AND n.is_published = true
    )
  );