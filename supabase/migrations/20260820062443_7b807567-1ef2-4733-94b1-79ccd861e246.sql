DROP POLICY IF EXISTS emerg_patients_update ON public.emerg_patients;
DROP FUNCTION IF EXISTS public.can_edit_emerg_patient(uuid);
DROP FUNCTION IF EXISTS private.can_edit_emerg_patient(uuid, uuid);

CREATE POLICY emerg_patients_update ON public.emerg_patients FOR UPDATE TO authenticated
  USING (
    public.is_ward_admin(auth.uid())
    OR created_by = auth.uid()
    OR (box_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.emerg_box_assignments a
          WHERE a.box_id = emerg_patients.box_id AND a.user_id = auth.uid() AND a.active))
  )
  WITH CHECK (
    public.is_ward_admin(auth.uid())
    OR created_by = auth.uid()
    OR (box_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.emerg_box_assignments a
          WHERE a.box_id = emerg_patients.box_id AND a.user_id = auth.uid() AND a.active))
  );