-- Robust, non-API role check used by policies
CREATE OR REPLACE FUNCTION private.is_enrollment_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$$;
REVOKE ALL ON FUNCTION private.is_enrollment_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_enrollment_admin(uuid) TO authenticated, service_role;

-- Repoint policies to the hardened function
DROP POLICY IF EXISTS "Enrollment admins insert enrollments" ON public.user_enrollments;
CREATE POLICY "Enrollment admins insert enrollments" ON public.user_enrollments
FOR INSERT TO authenticated WITH CHECK (private.is_enrollment_admin(auth.uid()));

DROP POLICY IF EXISTS "Enrollment admins update enrollments" ON public.user_enrollments;
CREATE POLICY "Enrollment admins update enrollments" ON public.user_enrollments
FOR UPDATE TO authenticated
USING (private.is_enrollment_admin(auth.uid()))
WITH CHECK (private.is_enrollment_admin(auth.uid()));

DROP POLICY IF EXISTS "Enrollment admins delete enrollments" ON public.user_enrollments;
CREATE POLICY "Enrollment admins delete enrollments" ON public.user_enrollments
FOR DELETE TO authenticated USING (private.is_enrollment_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own enrollments" ON public.user_enrollments;
CREATE POLICY "Users read own enrollments" ON public.user_enrollments
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.is_enrollment_admin(auth.uid()));

DROP POLICY IF EXISTS "Enrollment admins write audit" ON public.enrollment_audit_log;
CREATE POLICY "Enrollment admins write audit" ON public.enrollment_audit_log
FOR INSERT TO authenticated
WITH CHECK (private.is_enrollment_admin(auth.uid()) AND actor_id = auth.uid());

DROP POLICY IF EXISTS "Admins read enrollment audit" ON public.enrollment_audit_log;
CREATE POLICY "Admins read enrollment audit" ON public.enrollment_audit_log
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.is_enrollment_admin(auth.uid()));

-- Public RPC wrapper stays SECURITY INVOKER, delegating to the hardened check
CREATE OR REPLACE FUNCTION public.is_enrollment_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT private.is_enrollment_admin(_user_id)
$$;