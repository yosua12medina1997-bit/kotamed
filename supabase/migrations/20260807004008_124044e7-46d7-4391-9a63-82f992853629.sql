
-- Role-aware read access for academy CMS nodes
CREATE OR REPLACE FUNCTION private.cms_node_role_allowed(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT _roles IS NULL
      OR cardinality(_roles) = 0
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text = ANY (_roles)
      );
$$;

REVOKE ALL ON FUNCTION private.cms_node_role_allowed(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.cms_node_role_allowed(text[]) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS academy_cms_nodes_read ON public.academy_cms_nodes;
CREATE POLICY academy_cms_nodes_read ON public.academy_cms_nodes
FOR SELECT
USING (
  is_published
  AND NOT hidden
  AND private.cms_node_role_allowed(roles)
);

-- Scope avatar reads to the owner (admins can read all)
DROP POLICY IF EXISTS avatars_read_authenticated ON storage.objects;
CREATE POLICY avatars_read_own ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);
