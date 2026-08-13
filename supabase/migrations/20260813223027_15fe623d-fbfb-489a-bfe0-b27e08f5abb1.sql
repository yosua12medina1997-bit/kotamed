DROP POLICY IF EXISTS cms_media_authenticated_read ON storage.objects;

CREATE POLICY cms_media_registered_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cms'
  AND (
    private.is_cms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.cms_assets a
      WHERE a.storage_path = storage.objects.name
    )
  )
);

DROP POLICY IF EXISTS payment_qr_authenticated_read ON storage.objects;

CREATE POLICY payment_qr_active_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-qr'
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.payment_settings p
      WHERE p.qr_storage_path = storage.objects.name
        AND p.is_active = true
    )
  )
);