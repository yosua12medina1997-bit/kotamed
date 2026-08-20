DROP POLICY IF EXISTS ward_patients_update ON public.ward_patients;
CREATE POLICY ward_patients_update ON public.ward_patients FOR UPDATE TO authenticated
USING (private.is_ward_staff(auth.uid()) OR created_by = auth.uid())
WITH CHECK (private.is_ward_staff(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS ward_plan_update ON public.ward_plan_items;
CREATE POLICY ward_plan_update ON public.ward_plan_items FOR UPDATE TO authenticated
USING (private.is_ward_staff(auth.uid()) OR created_by = auth.uid())
WITH CHECK (private.is_ward_staff(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS ward_problems_update ON public.ward_problems;
CREATE POLICY ward_problems_update ON public.ward_problems FOR UPDATE TO authenticated
USING (private.is_ward_staff(auth.uid()) OR created_by = auth.uid())
WITH CHECK (private.is_ward_staff(auth.uid()) OR created_by = auth.uid());