CREATE POLICY "content_nodes_read_unpublished_enrolled"
ON public.content_nodes
FOR SELECT
TO authenticated
USING (is_published = false AND private.has_content_access(id));