DROP POLICY IF EXISTS "ward_patients_delete" ON public.ward_patients;
CREATE POLICY "ward_patients_delete" ON public.ward_patients FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));