-- ══════════════ KOTA EMERGENCY — Emergencia Pediátrica HNSEB ══════════════

CREATE TABLE public.emerg_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL DEFAULT 'observacion',
  code text NOT NULL,
  label text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emerg_boxes TO authenticated;
GRANT ALL ON public.emerg_boxes TO service_role;
ALTER TABLE public.emerg_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY emerg_boxes_select ON public.emerg_boxes FOR SELECT TO authenticated
  USING (private.is_ward_staff(auth.uid()));
CREATE POLICY emerg_boxes_write ON public.emerg_boxes FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_emerg_boxes_updated BEFORE UPDATE ON public.emerg_boxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emerg_box_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES public.emerg_boxes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'interno',
  active boolean NOT NULL DEFAULT true,
  note text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (box_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emerg_box_assignments TO authenticated;
GRANT ALL ON public.emerg_box_assignments TO service_role;
ALTER TABLE public.emerg_box_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY emerg_box_assign_select ON public.emerg_box_assignments FOR SELECT TO authenticated
  USING (private.is_ward_staff(auth.uid()));
CREATE POLICY emerg_box_assign_write ON public.emerg_box_assignments FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));

CREATE TABLE public.emerg_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES public.emerg_boxes(id) ON DELETE SET NULL,
  area text NOT NULL DEFAULT 'observacion',
  code text,
  initials text,
  sex text,
  age_label text,
  weight_kg numeric,
  admitted_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  main_dx text,
  status text NOT NULL DEFAULT 'estable',
  general_state text,
  abcde jsonb NOT NULL DEFAULT '{}'::jsonb,
  initial jsonb NOT NULL DEFAULT '{}'::jsonb,
  problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_recheck_at timestamptz,
  handoff_at timestamptz,
  disposition text,
  disposition_note text,
  disposition_at timestamptz,
  discharged_at timestamptz,
  ward_patient_id uuid REFERENCES public.ward_patients(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emerg_patients TO authenticated;
GRANT ALL ON public.emerg_patients TO service_role;
ALTER TABLE public.emerg_patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_emerg_patients_updated BEFORE UPDATE ON public.emerg_patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ¿Puede el usuario editar este paciente de emergencia?
CREATE OR REPLACE FUNCTION private.can_edit_emerg_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.emerg_patients p
    WHERE p.id = _patient_id
      AND (
        private.is_ward_admin(_user_id)
        OR p.created_by = _user_id
        OR (p.box_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.emerg_box_assignments a
              WHERE a.box_id = p.box_id AND a.user_id = _user_id AND a.active
           ))
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION private.can_edit_emerg_patient(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_edit_emerg_patient(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_edit_emerg_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, private AS $$
  SELECT private.can_edit_emerg_patient(auth.uid(), _patient_id)
$$;
REVOKE EXECUTE ON FUNCTION public.can_edit_emerg_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_emerg_patient(uuid) TO authenticated, service_role;

CREATE POLICY emerg_patients_select ON public.emerg_patients FOR SELECT TO authenticated
  USING (private.is_ward_staff(auth.uid()));
CREATE POLICY emerg_patients_insert ON public.emerg_patients FOR INSERT TO authenticated
  WITH CHECK (private.is_ward_staff(auth.uid()));
CREATE POLICY emerg_patients_update ON public.emerg_patients FOR UPDATE TO authenticated
  USING (private.can_edit_emerg_patient(auth.uid(), id))
  WITH CHECK (private.can_edit_emerg_patient(auth.uid(), id));
CREATE POLICY emerg_patients_delete ON public.emerg_patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
