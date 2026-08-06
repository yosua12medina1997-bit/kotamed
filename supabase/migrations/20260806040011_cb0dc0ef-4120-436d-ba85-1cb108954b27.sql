-- Policies referenced public.has_role, which authenticated cannot execute -> permission denied at runtime.
DROP POLICY IF EXISTS "Users read own enrollments" ON public.user_enrollments;
CREATE POLICY "Users read own enrollments" ON public.user_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_enrollment_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read enrollment audit" ON public.enrollment_audit_log;
CREATE POLICY "Admins read enrollment audit" ON public.enrollment_audit_log
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_enrollment_admin(auth.uid()));

DROP POLICY IF EXISTS "academy_cms_fields_admin_write" ON public.academy_cms_fields;
CREATE POLICY "academy_cms_fields_admin_write" ON public.academy_cms_fields
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "academy_cms_nodes_admin_delete" ON public.academy_cms_nodes;
CREATE POLICY "academy_cms_nodes_admin_delete" ON public.academy_cms_nodes
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "academy_cms_nodes_admin_insert" ON public.academy_cms_nodes;
CREATE POLICY "academy_cms_nodes_admin_insert" ON public.academy_cms_nodes
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "academy_cms_nodes_admin_read" ON public.academy_cms_nodes;
CREATE POLICY "academy_cms_nodes_admin_read" ON public.academy_cms_nodes
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "academy_cms_nodes_admin_update" ON public.academy_cms_nodes;
CREATE POLICY "academy_cms_nodes_admin_update" ON public.academy_cms_nodes
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "academy_cms_versions_admin_all" ON public.academy_cms_versions;
CREATE POLICY "academy_cms_versions_admin_all" ON public.academy_cms_versions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "comprobantes_admin_delete" ON storage.objects;
CREATE POLICY "comprobantes_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(), 'admin'::public.app_role)));

DROP POLICY IF EXISTS "comprobantes_own_select" ON storage.objects;
CREATE POLICY "comprobantes_own_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(), 'admin'::public.app_role)));