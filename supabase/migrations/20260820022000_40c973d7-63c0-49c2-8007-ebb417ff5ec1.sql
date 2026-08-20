-- Asignación clínica de camas a internos
CREATE TABLE public.ward_bed_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bed_id uuid NOT NULL REFERENCES public.ward_beds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'interno',
  active boolean NOT NULL DEFAULT true,
  note text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ward_bed_assignments_one_active ON public.ward_bed_assignments (bed_id) WHERE active;
CREATE INDEX ward_bed_assignments_user ON public.ward_bed_assignments (user_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_bed_assignments TO authenticated;
GRANT ALL ON public.ward_bed_assignments TO service_role;
ALTER TABLE public.ward_bed_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ward_bed_assignments_read ON public.ward_bed_assignments
  FOR SELECT TO authenticated
  USING (private.is_ward_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY ward_bed_assignments_admin ON public.ward_bed_assignments
  FOR ALL TO authenticated
  USING (private.is_ward_admin(auth.uid()))
  WITH CHECK (private.is_ward_admin(auth.uid()));

CREATE TRIGGER trg_ward_bed_assignments_updated
  BEFORE UPDATE ON public.ward_bed_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Historial administrativo de reasignaciones
CREATE TABLE public.ward_bed_assignment_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bed_id uuid NOT NULL REFERENCES public.ward_beds(id) ON DELETE CASCADE,
  from_user_id uuid,
  to_user_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ward_bed_assignment_log_bed ON public.ward_bed_assignment_log (bed_id, created_at DESC);

GRANT SELECT, INSERT ON public.ward_bed_assignment_log TO authenticated;
GRANT ALL ON public.ward_bed_assignment_log TO service_role;
ALTER TABLE public.ward_bed_assignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ward_bed_assignment_log_read ON public.ward_bed_assignment_log
  FOR SELECT TO authenticated USING (private.is_ward_staff(auth.uid()));
CREATE POLICY ward_bed_assignment_log_insert ON public.ward_bed_assignment_log
  FOR INSERT TO authenticated WITH CHECK (private.is_ward_admin(auth.uid()));

-- Permisos clínicos basados en la cama asignada
CREATE OR REPLACE FUNCTION private.can_edit_ward_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT _user_id IS NOT NULL AND (
    private.is_ward_admin(_user_id)
    OR _patient_id IS NULL
    OR EXISTS (SELECT 1 FROM public.ward_patients p WHERE p.id = _patient_id AND p.created_by = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.ward_patients p
      JOIN public.ward_bed_assignments ba ON ba.bed_id = p.bed_id AND ba.active
      WHERE p.id = _patient_id AND ba.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.ward_assignments a
      WHERE a.patient_id = _patient_id AND a.user_id = _user_id AND a.active
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_ward_patient(_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path TO 'public', 'private'
AS $$ SELECT private.can_edit_ward_patient(auth.uid(), _patient_id) $$;
REVOKE ALL ON FUNCTION public.can_edit_ward_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_ward_patient(uuid) TO authenticated, service_role;

DROP POLICY ward_patients_update ON public.ward_patients;
CREATE POLICY ward_patients_update ON public.ward_patients
  FOR UPDATE TO authenticated
  USING (private.can_edit_ward_patient(auth.uid(), id))
  WITH CHECK (private.can_edit_ward_patient(auth.uid(), id));

DROP POLICY ward_problems_update ON public.ward_problems;
CREATE POLICY ward_problems_update ON public.ward_problems
  FOR UPDATE TO authenticated
  USING (private.can_edit_ward_patient(auth.uid(), patient_id))
  WITH CHECK (private.can_edit_ward_patient(auth.uid(), patient_id));

DROP POLICY ward_plan_update ON public.ward_plan_items;
CREATE POLICY ward_plan_update ON public.ward_plan_items
  FOR UPDATE TO authenticated
  USING (private.can_edit_ward_patient(auth.uid(), patient_id))
  WITH CHECK (private.can_edit_ward_patient(auth.uid(), patient_id));

DROP POLICY ward_tasks_update ON public.ward_tasks;
CREATE POLICY ward_tasks_update ON public.ward_tasks
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR private.can_edit_ward_patient(auth.uid(), patient_id))
  WITH CHECK (created_by = auth.uid() OR private.can_edit_ward_patient(auth.uid(), patient_id));