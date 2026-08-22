CREATE OR REPLACE FUNCTION private.ward_roster()
 RETURNS TABLE(user_id uuid, full_name text, initials text, is_admin boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
DECLARE
  rotation_node uuid := '0db73b5f-e9ab-49a3-bcca-6e070cc4fa5b';
  caller_is_admin boolean := private.is_ward_admin(auth.uid());
BEGIN
  IF NOT private.is_ward_staff(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT n.id, n.parent_id FROM public.content_nodes n WHERE n.id = rotation_node
    UNION ALL
    SELECT c.id, c.parent_id FROM public.content_nodes c JOIN down d ON c.parent_id = d.id
  ), up AS (
    SELECT n.id, n.parent_id FROM public.content_nodes n WHERE n.id = rotation_node
    UNION ALL
    SELECT p.id, p.parent_id FROM public.content_nodes p JOIN up u ON u.parent_id = p.id
  ), scope AS (
    SELECT id FROM down UNION SELECT id FROM up
  ), members AS (
    SELECT ue.user_id FROM public.user_enrollments ue
    WHERE ue.status = 'active'
      AND (ue.expires_at IS NULL OR ue.expires_at > now())
      AND ue.node_id IN (SELECT id FROM scope)
    UNION
    SELECT uca.user_id FROM public.user_content_access uca
    WHERE uca.granted
      AND (uca.expires_at IS NULL OR uca.expires_at > now())
      AND uca.node_id IN (SELECT id FROM scope)
    UNION
    SELECT a.user_id FROM public.ward_assignments a WHERE a.active
    UNION
    SELECT ba.user_id FROM public.ward_bed_assignments ba WHERE ba.active
    UNION
    SELECT p.id FROM public.profiles p WHERE caller_is_admin
  )
  SELECT
    p.id,
    COALESCE(NULLIF(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
    upper(
      COALESCE(
        substr(split_part(NULLIF(btrim(p.full_name), ''), ' ', 1), 1, 1)
          || substr(NULLIF(split_part(NULLIF(btrim(p.full_name), ''), ' ', 2), ''), 1, 1),
        substr(p.email, 1, 2)
      )
    ),
    private.is_ward_admin(p.id)
  FROM public.profiles p
  JOIN members m ON m.user_id = p.id
  ORDER BY 2;
END;
$function$;