REVOKE ALL ON FUNCTION public.approve_admission(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.approve_admission(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_admission(uuid, integer) TO authenticated;