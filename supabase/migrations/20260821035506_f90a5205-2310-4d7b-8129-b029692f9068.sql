-- kl_analyses: restringir lectura y escritura al personal clínico
DROP POLICY IF EXISTS kl_analyses_read ON public.kl_analyses;
DROP POLICY IF EXISTS kl_analyses_insert ON public.kl_analyses;
DROP POLICY IF EXISTS kl_analyses_update ON public.kl_analyses;

CREATE POLICY kl_analyses_read ON public.kl_analyses
  FOR SELECT TO authenticated
  USING (private.is_ward_staff(auth.uid()) OR created_by = auth.uid());

CREATE POLICY kl_analyses_insert ON public.kl_analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_ward_staff(auth.uid())
    AND created_by = auth.uid()
    AND (updated_by IS NULL OR updated_by = auth.uid())
  );

CREATE POLICY kl_analyses_update ON public.kl_analyses
  FOR UPDATE TO authenticated
  USING (private.is_ward_staff(auth.uid()))
  WITH CHECK (private.is_ward_staff(auth.uid()) AND updated_by = auth.uid());

-- ward_learning_cases: la creación exige personal de sala y autoría propia
DROP POLICY IF EXISTS ward_cases_insert ON public.ward_learning_cases;

CREATE POLICY ward_cases_insert ON public.ward_learning_cases
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_ward_staff(auth.uid())
    AND created_by = auth.uid()
    AND (author_id IS NULL OR author_id = auth.uid())
  );