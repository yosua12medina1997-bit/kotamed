-- 1) Ward clinical INSERT policies: require ward staff (admin or enrolled rotation member)
DROP POLICY IF EXISTS ward_patients_write ON public.ward_patients;
CREATE POLICY ward_patients_write ON public.ward_patients FOR INSERT TO authenticated
  WITH CHECK (private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_evolutions_insert ON public.ward_evolutions;
CREATE POLICY ward_evolutions_insert ON public.ward_evolutions FOR INSERT TO authenticated
  WITH CHECK (private.is_ward_staff(auth.uid()) AND public.can_edit_ward_patient(patient_id));

DROP POLICY IF EXISTS ward_problems_write ON public.ward_problems;
CREATE POLICY ward_problems_write ON public.ward_problems FOR INSERT TO authenticated
  WITH CHECK (private.is_ward_staff(auth.uid()) AND public.can_edit_ward_patient(patient_id));

DROP POLICY IF EXISTS ward_plan_write ON public.ward_plan_items;
CREATE POLICY ward_plan_write ON public.ward_plan_items FOR INSERT TO authenticated
  WITH CHECK (private.is_ward_staff(auth.uid()) AND public.can_edit_ward_patient(patient_id));

DROP POLICY IF EXISTS ward_tasks_write ON public.ward_tasks;
CREATE POLICY ward_tasks_write ON public.ward_tasks FOR INSERT TO authenticated
  WITH CHECK (private.is_ward_staff(auth.uid()));

-- 2) Clinical entry tables: creator must also be ward staff
DROP POLICY IF EXISTS ward_vitals_insert ON public.ward_vitals;
CREATE POLICY ward_vitals_insert ON public.ward_vitals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_balance_insert ON public.ward_balance;
CREATE POLICY ward_balance_insert ON public.ward_balance FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_exams_insert ON public.ward_exams;
CREATE POLICY ward_exams_insert ON public.ward_exams FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_meds_insert ON public.ward_meds;
CREATE POLICY ward_meds_insert ON public.ward_meds FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_consults_insert ON public.ward_consults;
CREATE POLICY ward_consults_insert ON public.ward_consults FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_procedures_insert ON public.ward_procedures;
CREATE POLICY ward_procedures_insert ON public.ward_procedures FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_calcs_insert ON public.ward_calcs;
CREATE POLICY ward_calcs_insert ON public.ward_calcs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_events_insert ON public.ward_events;
CREATE POLICY ward_events_insert ON public.ward_events FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

DROP POLICY IF EXISTS ward_files_insert ON public.ward_files;
CREATE POLICY ward_files_insert ON public.ward_files FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.is_ward_staff(auth.uid()));

-- 3) Storage: ward folder of the private clinico bucket only for ward staff
DROP POLICY IF EXISTS ward_clinico_insert ON storage.objects;
CREATE POLICY ward_clinico_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinico'
    AND (storage.foldername(name))[1] = 'ward'
    AND owner = auth.uid()
    AND private.is_ward_staff(auth.uid())
  );

-- The generic clinico insert policy must not re-open the ward folder
DROP POLICY IF EXISTS clinico_insert_authenticated ON storage.objects;
CREATE POLICY clinico_insert_authenticated ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinico'
    AND owner = auth.uid()
    AND coalesce((storage.foldername(name))[1], '') <> 'ward'
  );

-- 4) Remove SECURITY DEFINER functions from the exposed API schema:
--    keep the privileged bodies in the private schema and expose thin
--    SECURITY INVOKER wrappers instead.
CREATE OR REPLACE FUNCTION private.ward_roster()
RETURNS TABLE(user_id uuid, full_name text, initials text, is_admin boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  rotation_node uuid := '0db73b5f-e9ab-49a3-bcca-6e070cc4fa5b';
BEGIN
  IF NOT private.is_ward_staff(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE scope AS (
    SELECT n.id FROM public.content_nodes n WHERE n.id = rotation_node
    UNION ALL
    SELECT c.id FROM public.content_nodes c JOIN scope s ON c.parent_id = s.id
  ), members AS (
    SELECT ue.user_id FROM public.user_enrollments ue
    WHERE ue.status = 'active'
      AND (ue.expires_at IS NULL OR ue.expires_at > now())
      AND ue.node_id IN (SELECT id FROM scope)
    UNION
    SELECT uca.user_id FROM public.user_content_access uca
    WHERE uca.granted
      AND (uca.expires_at IS NULL OR uca.expires_at > now())
      AND uca.node_id IN (SELECT id FROM scope)
    UNION
    SELECT a.user_id FROM public.ward_assignments a WHERE a.active
    UNION
    SELECT ba.user_id FROM public.ward_bed_assignments ba WHERE ba.active
  )
  SELECT
    p.id,
    COALESCE(NULLIF(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
    upper(
      COALESCE(
        substr(split_part(NULLIF(btrim(p.full_name), ''), ' ', 1), 1, 1)
          || substr(NULLIF(split_part(NULLIF(btrim(p.full_name), ''), ' ', 2), ''), 1, 1),
        substr(p.email, 1, 2)
      )
    ),
    private.is_ward_admin(p.id)
  FROM public.profiles p
  JOIN members m ON m.user_id = p.id
  ORDER BY 2;
END;
$$;

REVOKE ALL ON FUNCTION private.ward_roster() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ward_roster()
RETURNS TABLE(user_id uuid, full_name text, initials text, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $$ SELECT * FROM private.ward_roster() $$;

GRANT EXECUTE ON FUNCTION public.ward_roster() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $$ SELECT private.has_role(_user_id, _role) $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;