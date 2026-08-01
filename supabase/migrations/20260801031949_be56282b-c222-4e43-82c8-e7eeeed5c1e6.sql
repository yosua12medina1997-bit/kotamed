-- Recreate every policy that used the (now revoked) public.has_role with private.has_role

-- profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- membership_plans
DROP POLICY IF EXISTS "Authenticated can view active plans" ON public.membership_plans;
CREATE POLICY "Authenticated can view active plans" ON public.membership_plans FOR SELECT TO authenticated
  USING (is_active OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage plans insert" ON public.membership_plans;
CREATE POLICY "Admins manage plans insert" ON public.membership_plans FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage plans update" ON public.membership_plans;
CREATE POLICY "Admins manage plans update" ON public.membership_plans FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage plans delete" ON public.membership_plans;
CREATE POLICY "Admins manage plans delete" ON public.membership_plans FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- payment_settings
DROP POLICY IF EXISTS "payment_settings_read" ON public.payment_settings;
CREATE POLICY "payment_settings_read" ON public.payment_settings FOR SELECT TO authenticated
  USING (is_active OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "payment_settings_admin_insert" ON public.payment_settings;
CREATE POLICY "payment_settings_admin_insert" ON public.payment_settings FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "payment_settings_admin_update" ON public.payment_settings;
CREATE POLICY "payment_settings_admin_update" ON public.payment_settings FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "payment_settings_admin_delete" ON public.payment_settings;
CREATE POLICY "payment_settings_admin_delete" ON public.payment_settings FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- plan_content_access
DROP POLICY IF EXISTS "Admins view plan access" ON public.plan_content_access;
CREATE POLICY "Admins view plan access" ON public.plan_content_access FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert plan access" ON public.plan_content_access;
CREATE POLICY "Admins insert plan access" ON public.plan_content_access FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update plan access" ON public.plan_content_access;
CREATE POLICY "Admins update plan access" ON public.plan_content_access FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete plan access" ON public.plan_content_access;
CREATE POLICY "Admins delete plan access" ON public.plan_content_access FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- teachers
DROP POLICY IF EXISTS "Authenticated view active teachers" ON public.teachers;
CREATE POLICY "Authenticated view active teachers" ON public.teachers FOR SELECT TO authenticated
  USING (is_active OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert teachers" ON public.teachers;
CREATE POLICY "Admins insert teachers" ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update teachers" ON public.teachers;
CREATE POLICY "Admins update teachers" ON public.teachers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete teachers" ON public.teachers;
CREATE POLICY "Admins delete teachers" ON public.teachers FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- user_memberships
DROP POLICY IF EXISTS "Users view own membership" ON public.user_memberships;
CREATE POLICY "Users view own membership" ON public.user_memberships FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert memberships" ON public.user_memberships;
CREATE POLICY "Admins insert memberships" ON public.user_memberships FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update memberships" ON public.user_memberships;
CREATE POLICY "Admins update memberships" ON public.user_memberships FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete memberships" ON public.user_memberships;
CREATE POLICY "Admins delete memberships" ON public.user_memberships FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- user_content_access
DROP POLICY IF EXISTS "Users view own access" ON public.user_content_access;
CREATE POLICY "Users view own access" ON public.user_content_access FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert user access" ON public.user_content_access;
CREATE POLICY "Admins insert user access" ON public.user_content_access FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update user access" ON public.user_content_access;
CREATE POLICY "Admins update user access" ON public.user_content_access FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete user access" ON public.user_content_access;
CREATE POLICY "Admins delete user access" ON public.user_content_access FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- admission_applications
DROP POLICY IF EXISTS "admin_admissions_select" ON public.admission_applications;
CREATE POLICY "admin_admissions_select" ON public.admission_applications FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admin_admissions_update" ON public.admission_applications;
CREATE POLICY "admin_admissions_update" ON public.admission_applications FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admin_admissions_delete" ON public.admission_applications;
CREATE POLICY "admin_admissions_delete" ON public.admission_applications FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- Relationship so enrollments can embed profile data
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
