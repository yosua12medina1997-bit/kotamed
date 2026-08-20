REVOKE ALL ON FUNCTION private.is_ward_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_ward_staff(uuid) TO authenticated, service_role;