CREATE POLICY cms_media_admin_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'cms'
    AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  )
  WITH CHECK (
    bucket_id = 'cms'
    AND (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

CREATE POLICY cms_media_authenticated_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cms');