CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_ward_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin','academic_admin')
  )
$$;
REVOKE ALL ON FUNCTION private.is_ward_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_ward_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_ward_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT private.is_ward_admin(_user_id)
$$;