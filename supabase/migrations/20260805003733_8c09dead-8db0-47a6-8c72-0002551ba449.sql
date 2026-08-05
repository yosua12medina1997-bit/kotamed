-- ============ NEONATAL HOSPITALIZATION MODULE ============

CREATE TABLE public.neo_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL DEFAULT 'internado',
  area_slug text NOT NULL DEFAULT 'pediatria-neonatologia',
  unit text NOT NULL DEFAULT 'atencion-inmediata',
  hc text,
  apellidos text NOT NULL DEFAULT '',
  nombres text NOT NULL DEFAULT '',
  sexo text,
  fecha_nacimiento date,
  hora_nacimiento text,
  edad_gestacional numeric,
  peso_nacimiento numeric,
  diagnostico_ingreso text,
  medico_responsable text,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'hospitalizado',
  general jsonb NOT NULL DEFAULT '{}'::jsonb,
  maternal jsonb NOT NULL DEFAULT '{}'::jsonb,
  exam jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnoses jsonb NOT NULL DEFAULT '[]'::jsonb,
  scales jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_patients TO authenticated;
GRANT ALL ON public.neo_patients TO service_role;
ALTER TABLE public.neo_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_patients_read ON public.neo_patients FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_patients_insert ON public.neo_patients FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_patients_update ON public.neo_patients FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_patients_delete ON public.neo_patients FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_patients_updated BEFORE UPDATE ON public.neo_patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_patients_unit_idx ON public.neo_patients (unit, created_at DESC);

CREATE TABLE public.neo_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  day_number integer NOT NULL DEFAULT 1,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  format text NOT NULL DEFAULT 'soap',
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  author text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_evolutions TO authenticated;
GRANT ALL ON public.neo_evolutions TO service_role;
ALTER TABLE public.neo_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_evolutions_read ON public.neo_evolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_evolutions_insert ON public.neo_evolutions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_evolutions_update ON public.neo_evolutions FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_evolutions_delete ON public.neo_evolutions FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_evolutions_updated BEFORE UPDATE ON public.neo_evolutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_evolutions_patient_idx ON public.neo_evolutions (patient_id, day_number);

CREATE TABLE public.neo_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'hemograma',
  name text NOT NULL DEFAULT '',
  taken_at timestamptz NOT NULL DEFAULT now(),
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  interpretation text,
  storage_path text,
  url text,
  comments text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_labs TO authenticated;
GRANT ALL ON public.neo_labs TO service_role;
ALTER TABLE public.neo_labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_labs_read ON public.neo_labs FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_labs_insert ON public.neo_labs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_labs_update ON public.neo_labs FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_labs_delete ON public.neo_labs FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_labs_updated BEFORE UPDATE ON public.neo_labs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_labs_patient_idx ON public.neo_labs (patient_id, taken_at DESC);

CREATE TABLE public.neo_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'radiografia',
  title text NOT NULL DEFAULT '',
  storage_path text,
  url text,
  mime_type text,
  comments text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_media TO authenticated;
GRANT ALL ON public.neo_media TO service_role;
ALTER TABLE public.neo_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_media_read ON public.neo_media FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_media_insert ON public.neo_media FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_media_update ON public.neo_media FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_media_delete ON public.neo_media FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_media_updated BEFORE UPDATE ON public.neo_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_media_patient_idx ON public.neo_media (patient_id, taken_at DESC);

CREATE TABLE public.neo_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  dose text,
  route text,
  frequency text,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_medications TO authenticated;
GRANT ALL ON public.neo_medications TO service_role;
ALTER TABLE public.neo_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_medications_read ON public.neo_medications FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_medications_insert ON public.neo_medications FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_medications_update ON public.neo_medications FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_medications_delete ON public.neo_medications FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_medications_updated BEFORE UPDATE ON public.neo_medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_medications_patient_idx ON public.neo_medications (patient_id, created_at DESC);

CREATE TABLE public.neo_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_procedures TO authenticated;
GRANT ALL ON public.neo_procedures TO service_role;
ALTER TABLE public.neo_procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_procedures_read ON public.neo_procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_procedures_insert ON public.neo_procedures FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_procedures_update ON public.neo_procedures FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_procedures_delete ON public.neo_procedures FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_procedures_updated BEFORE UPDATE ON public.neo_procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_procedures_patient_idx ON public.neo_procedures (patient_id, performed_at DESC);

CREATE TABLE public.neo_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'npt',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_nutrition TO authenticated;
GRANT ALL ON public.neo_nutrition TO service_role;
ALTER TABLE public.neo_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_nutrition_read ON public.neo_nutrition FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_nutrition_insert ON public.neo_nutrition FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_nutrition_update ON public.neo_nutrition FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_nutrition_delete ON public.neo_nutrition FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_nutrition_updated BEFORE UPDATE ON public.neo_nutrition FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX neo_nutrition_patient_idx ON public.neo_nutrition (patient_id, recorded_at DESC);

CREATE TABLE public.neo_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.neo_patients(id) ON DELETE CASCADE,
  from_unit text,
  to_unit text NOT NULL,
  reason text,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.neo_transfers TO authenticated;
GRANT ALL ON public.neo_transfers TO service_role;
ALTER TABLE public.neo_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_transfers_read ON public.neo_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_transfers_insert ON public.neo_transfers FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_transfers_delete ON public.neo_transfers FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.has_role(auth.uid(),'admin'));

CREATE TABLE public.neo_form_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.neo_form_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.neo_form_config TO authenticated;
GRANT ALL ON public.neo_form_config TO service_role;
ALTER TABLE public.neo_form_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_form_config_read ON public.neo_form_config FOR SELECT TO authenticated USING (true);
CREATE POLICY neo_form_config_admin_write ON public.neo_form_config FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER neo_form_config_updated BEFORE UPDATE ON public.neo_form_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.neo_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.neo_audit_log TO authenticated;
GRANT ALL ON public.neo_audit_log TO service_role;
ALTER TABLE public.neo_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY neo_audit_admin_read ON public.neo_audit_log FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY neo_audit_insert ON public.neo_audit_log FOR INSERT TO authenticated WITH CHECK (actor = auth.uid());
CREATE INDEX neo_audit_created_idx ON public.neo_audit_log (created_at DESC);