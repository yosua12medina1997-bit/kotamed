CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.apex_is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$$;
REVOKE ALL ON FUNCTION private.apex_is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.apex_is_admin(uuid) TO authenticated, service_role;

-- Recreate every policy that referenced the public helper
DROP POLICY "apex_taxonomy_admin" ON public.apex_taxonomy;
CREATE POLICY "apex_taxonomy_admin" ON public.apex_taxonomy FOR ALL TO authenticated
  USING (private.apex_is_admin(auth.uid())) WITH CHECK (private.apex_is_admin(auth.uid()));

DROP POLICY "apex_questions_admin_only" ON public.apex_questions;
CREATE POLICY "apex_questions_admin_only" ON public.apex_questions FOR ALL TO authenticated
  USING (private.apex_is_admin(auth.uid())) WITH CHECK (private.apex_is_admin(auth.uid()));

DROP POLICY "apex_qv_admin" ON public.apex_question_versions;
CREATE POLICY "apex_qv_admin" ON public.apex_question_versions FOR ALL TO authenticated
  USING (private.apex_is_admin(auth.uid())) WITH CHECK (private.apex_is_admin(auth.uid()));

DROP POLICY "apex_exams_read_published" ON public.apex_exams;
CREATE POLICY "apex_exams_read_published" ON public.apex_exams FOR SELECT TO authenticated
  USING (is_published OR private.apex_is_admin(auth.uid()));
DROP POLICY "apex_exams_admin" ON public.apex_exams;
CREATE POLICY "apex_exams_admin" ON public.apex_exams FOR ALL TO authenticated
  USING (private.apex_is_admin(auth.uid())) WITH CHECK (private.apex_is_admin(auth.uid()));

DROP POLICY "apex_attempts_own" ON public.apex_attempts;
CREATE POLICY "apex_attempts_own" ON public.apex_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.apex_is_admin(auth.uid()));

DROP POLICY "apex_items_own" ON public.apex_attempt_items;
CREATE POLICY "apex_items_own" ON public.apex_attempt_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.apex_attempts a WHERE a.id = attempt_id
    AND (a.user_id = auth.uid() OR private.apex_is_admin(auth.uid()))));

DROP POLICY "apex_flags_read" ON public.apex_flags;
CREATE POLICY "apex_flags_read" ON public.apex_flags FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.apex_is_admin(auth.uid()));
DROP POLICY "apex_flags_admin" ON public.apex_flags;
CREATE POLICY "apex_flags_admin" ON public.apex_flags FOR UPDATE TO authenticated
  USING (private.apex_is_admin(auth.uid())) WITH CHECK (private.apex_is_admin(auth.uid()));

DROP POLICY "apex_resources_read" ON public.apex_resource_links;
CREATE POLICY "apex_resources_read" ON public.apex_resource_links FOR SELECT TO authenticated
  USING (is_published OR private.apex_is_admin(auth.uid()));
DROP POLICY "apex_resources_admin" ON public.apex_resource_links;
CREATE POLICY "apex_resources_admin" ON public.apex_resource_links FOR ALL TO authenticated
  USING (private.apex_is_admin(auth.uid())) WITH CHECK (private.apex_is_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.apex_is_admin(uuid);