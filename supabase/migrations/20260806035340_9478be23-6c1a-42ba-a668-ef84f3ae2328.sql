CREATE OR REPLACE FUNCTION public.is_enrollment_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$$;

REVOKE ALL ON FUNCTION public.is_enrollment_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_enrollment_admin(uuid) TO authenticated, service_role;

-- user_enrollments: writes only for super admin / academic admin
DROP POLICY IF EXISTS "Admins insert enrollments" ON public.user_enrollments;
DROP POLICY IF EXISTS "Admins update enrollments" ON public.user_enrollments;
DROP POLICY IF EXISTS "Admins delete enrollments" ON public.user_enrollments;

CREATE POLICY "Enrollment admins insert enrollments" ON public.user_enrollments
FOR INSERT TO authenticated
WITH CHECK (public.is_enrollment_admin(auth.uid()));

CREATE POLICY "Enrollment admins update enrollments" ON public.user_enrollments
FOR UPDATE TO authenticated
USING (public.is_enrollment_admin(auth.uid()))
WITH CHECK (public.is_enrollment_admin(auth.uid()));

CREATE POLICY "Enrollment admins delete enrollments" ON public.user_enrollments
FOR DELETE TO authenticated
USING (public.is_enrollment_admin(auth.uid()));

-- audit log: only enrollment admins may append
DROP POLICY IF EXISTS "Admins write enrollment audit" ON public.enrollment_audit_log;
CREATE POLICY "Enrollment admins write audit" ON public.enrollment_audit_log
FOR INSERT TO authenticated
WITH CHECK (public.is_enrollment_admin(auth.uid()) AND actor_id = auth.uid());

-- keep the owner email as super admin on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'yosua12medina1997@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'), (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;