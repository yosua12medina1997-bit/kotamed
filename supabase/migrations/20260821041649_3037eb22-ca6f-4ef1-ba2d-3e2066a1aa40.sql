DROP POLICY IF EXISTS kcm_pl_insert ON public.kcm_patient_links;
DROP POLICY IF EXISTS kcm_pl_update ON public.kcm_patient_links;
DROP POLICY IF EXISTS kcm_pl_delete ON public.kcm_patient_links;

CREATE POLICY kcm_pl_insert ON public.kcm_patient_links FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_kcm_admin(auth.uid()));
CREATE POLICY kcm_pl_update ON public.kcm_patient_links FOR UPDATE TO authenticated
  USING (private.is_kcm_admin(auth.uid())) WITH CHECK (private.is_kcm_admin(auth.uid()));
CREATE POLICY kcm_pl_delete ON public.kcm_patient_links FOR DELETE TO authenticated
  USING (private.is_kcm_admin(auth.uid()));