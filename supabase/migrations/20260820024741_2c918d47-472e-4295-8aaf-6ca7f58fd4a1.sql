CREATE OR REPLACE FUNCTION private.is_ward_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT _user_id IS NOT NULL AND (
    private.is_ward_admin(_user_id)
    OR private.has_content_access('0db73b5f-e9ab-49a3-bcca-6e070cc4fa5b'::uuid)
  )
$$;

REVOKE ALL ON FUNCTION private.is_ward_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_ward_staff(uuid) TO authenticated, service_role;