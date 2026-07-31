CREATE POLICY "comprobantes_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "comprobantes_own_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "comprobantes_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "comprobantes_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));