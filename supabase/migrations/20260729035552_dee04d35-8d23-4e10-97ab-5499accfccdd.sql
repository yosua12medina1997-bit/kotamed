
-- Helper: find the program slug ancestor for a given content node
CREATE OR REPLACE FUNCTION private.content_node_program(_node_id uuid)
RETURNS public.program_slug
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id, kind, slug
    FROM public.content_nodes
    WHERE id = _node_id
    UNION ALL
    SELECT n.id, n.parent_id, n.kind, n.slug
    FROM public.content_nodes n
    JOIN up ON up.parent_id = n.id
  )
  SELECT slug::public.program_slug
  FROM up
  WHERE kind = 'program'
    AND slug IN ('residentado','internado','r1','r2','r3')
  LIMIT 1;
$$;

-- Helper: does the current auth.uid() have access to this node (admin OR active enrollment in the ancestor program)
CREATE OR REPLACE FUNCTION private.has_content_access(_node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    CASE
      WHEN auth.uid() IS NULL THEN false
      WHEN private.has_role(auth.uid(), 'admin'::public.app_role) THEN true
      ELSE EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.expires_at > now()
          AND e.program = private.content_node_program(_node_id)
      )
    END;
$$;

GRANT EXECUTE ON FUNCTION private.content_node_program(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.has_content_access(uuid) TO authenticated, anon;

-- Replace content_nodes public read policy
DROP POLICY IF EXISTS content_nodes_read_published ON public.content_nodes;

-- Keep top-level course + program nodes visible to everyone (needed for public program listings/marketing)
CREATE POLICY content_nodes_read_public_shell
ON public.content_nodes
FOR SELECT
TO anon, authenticated
USING (
  is_published = true
  AND (
    parent_id IS NULL
    OR kind = 'program'
  )
);

-- Enrolled users (or admins) can read deeper published nodes
CREATE POLICY content_nodes_read_enrolled
ON public.content_nodes
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND private.has_content_access(id)
);

-- Replace content_resources public read policy: require enrollment
DROP POLICY IF EXISTS content_resources_read_published ON public.content_resources;

CREATE POLICY content_resources_read_enrolled
ON public.content_resources
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM public.content_nodes n
    WHERE n.id = content_resources.node_id
      AND n.is_published = true
  )
  AND private.has_content_access(node_id)
);

-- Replace storage bucket published-read policy with enrollment check
DROP POLICY IF EXISTS content_bucket_published_read ON storage.objects;

CREATE POLICY content_bucket_enrolled_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'content'
  AND EXISTS (
    SELECT 1
    FROM public.content_resources r
    JOIN public.content_nodes n ON n.id = r.node_id
    WHERE r.storage_path = storage.objects.name
      AND r.is_published = true
      AND n.is_published = true
      AND private.has_content_access(r.node_id)
  )
);
