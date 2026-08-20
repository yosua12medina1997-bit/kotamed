DROP POLICY IF EXISTS ward_tasks_update ON public.ward_tasks;
CREATE POLICY ward_tasks_update ON public.ward_tasks FOR UPDATE TO authenticated
USING (private.is_ward_staff(auth.uid()) OR created_by = auth.uid())
WITH CHECK (private.is_ward_staff(auth.uid()) OR created_by = auth.uid());