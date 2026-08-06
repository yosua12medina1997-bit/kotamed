-- Care team membership: who may access neonatal clinical data
CREATE TABLE IF NOT EXISTS public.neo_care_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_care_team TO authenticated;
GRANT ALL ON public.neo_care_team TO service_role;

ALTER TABLE public.neo_care_team ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_neo_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT _user_id IS NOT NULL AND (
    private.has_role(_user_id, 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.neo_care_team t WHERE t.user_id = _user_id)
  )
$$;

REVOKE ALL ON FUNCTION private.is_neo_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_neo_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS neo_care_team_admin_write ON public.neo_care_team;
CREATE POLICY neo_care_team_admin_write ON public.neo_care_team
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS neo_care_team_staff_read ON public.neo_care_team;
CREATE POLICY neo_care_team_staff_read ON public.neo_care_team
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_neo_staff(auth.uid()));

-- Scope clinical reads: creator, care team, or admin only
DROP POLICY IF EXISTS neo_patients_read ON public.neo_patients;
CREATE POLICY neo_patients_read ON public.neo_patients
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_evolutions_read ON public.neo_evolutions;
CREATE POLICY neo_evolutions_read ON public.neo_evolutions
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_labs_read ON public.neo_labs;
CREATE POLICY neo_labs_read ON public.neo_labs
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_media_read ON public.neo_media;
CREATE POLICY neo_media_read ON public.neo_media
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_medications_read ON public.neo_medications;
CREATE POLICY neo_medications_read ON public.neo_medications
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_procedures_read ON public.neo_procedures;
CREATE POLICY neo_procedures_read ON public.neo_procedures
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_nutrition_read ON public.neo_nutrition;
CREATE POLICY neo_nutrition_read ON public.neo_nutrition
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

DROP POLICY IF EXISTS neo_transfers_read ON public.neo_transfers;
CREATE POLICY neo_transfers_read ON public.neo_transfers
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()));

-- Clinical files: only uploader, care team, or admin
DROP POLICY IF EXISTS clinico_read_authenticated ON storage.objects;
CREATE POLICY clinico_read_authenticated ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinico'
    AND (owner = auth.uid() OR private.is_neo_staff(auth.uid()))
  );