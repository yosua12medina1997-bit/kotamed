
CREATE OR REPLACE FUNCTION private.node_self_and_ancestors(_node_id uuid)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT n.id, n.parent_id FROM public.content_nodes n WHERE n.id = _node_id
    UNION ALL
    SELECT p.id, p.parent_id FROM public.content_nodes p JOIN chain c ON p.id = c.parent_id
  )
  SELECT chain.id FROM chain;
$$;

REVOKE ALL ON FUNCTION private.node_self_and_ancestors(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.has_content_access(_node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN auth.uid() IS NULL THEN false
      WHEN private.has_role(auth.uid(), 'admin'::public.app_role) THEN true
      ELSE (
        -- Matrícula clásica por programa (enum program_slug)
        EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.expires_at > now()
            AND e.program = private.content_node_program(_node_id)
        )
        -- Matrícula manual sobre el nodo o cualquier ancestro
        OR EXISTS (
          SELECT 1 FROM public.user_enrollments ue
          WHERE ue.user_id = auth.uid()
            AND ue.status = 'active'
            AND (ue.expires_at IS NULL OR ue.expires_at > now())
            AND ue.starts_at <= now()
            AND ue.node_id IN (SELECT id FROM private.node_self_and_ancestors(_node_id))
        )
        -- Permiso directo sobre el nodo o cualquier ancestro
        OR EXISTS (
          SELECT 1 FROM public.user_content_access uca
          WHERE uca.user_id = auth.uid()
            AND uca.granted = true
            AND (uca.expires_at IS NULL OR uca.expires_at > now())
            AND uca.node_id IN (SELECT id FROM private.node_self_and_ancestors(_node_id))
        )
        -- Acceso por membresía activa
        OR EXISTS (
          SELECT 1
          FROM public.user_memberships um
          JOIN public.plan_content_access pca ON pca.plan_id = um.plan_id
          WHERE um.user_id = auth.uid()
            AND um.status = 'active'
            AND (um.renews_at IS NULL OR um.renews_at > now())
            AND pca.node_id IN (SELECT id FROM private.node_self_and_ancestors(_node_id))
        )
      )
    END;
$$;

REVOKE ALL ON FUNCTION private.has_content_access(uuid) FROM PUBLIC;
