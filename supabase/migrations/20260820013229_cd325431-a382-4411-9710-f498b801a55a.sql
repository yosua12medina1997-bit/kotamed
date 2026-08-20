-- 1. Extra clinical columns on the ward patient record
ALTER TABLE public.ward_patients
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'ingreso_directo',
  ADD COLUMN IF NOT EXISTS origin_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'hospitalizacion',
  ADD COLUMN IF NOT EXISTS abcde jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS history jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS exam jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS discharge jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS summary_text text;

-- 2. New longitudinal clinical tables
CREATE TABLE IF NOT EXISTS public.ward_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL DEFAULT now(),
  temp numeric, fc numeric, fr numeric, pa text, pam numeric,
  sato2 numeric, weight_kg numeric, pain numeric, glasgow numeric,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'laboratorio',
  name text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  taken_at timestamptz,
  status text NOT NULL DEFAULT 'solicitado',
  flag text NOT NULL DEFAULT 'normal',
  result_text text,
  values jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_meds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text, unit text, route text, frequency text,
  started_at date DEFAULT current_date,
  status text NOT NULL DEFAULT 'activo',
  calc jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  on_date date NOT NULL DEFAULT current_date,
  shift text NOT NULL DEFAULT '24h',
  ingresos jsonb NOT NULL DEFAULT '{}'::jsonb,
  egresos jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_consults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pendiente',
  requested_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  response text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  done_at timestamptz NOT NULL DEFAULT now(),
  indication text,
  level text NOT NULL DEFAULT 'observado',
  competency_id uuid REFERENCES public.ward_competencies(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_calcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  tool text NOT NULL,
  weight_kg numeric,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  title text NOT NULL,
  detail text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  ref_kind text NOT NULL DEFAULT 'general',
  ref_id uuid,
  bucket text NOT NULL DEFAULT 'clinico',
  path text NOT NULL,
  name text NOT NULL,
  mime text,
  size_bytes bigint,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grants, RLS and policies
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ward_vitals','ward_exams','ward_meds','ward_balance','ward_consults','ward_procedures','ward_calcs','ward_events','ward_files']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.is_ward_staff(auth.uid()) OR created_by = auth.uid())$f$, t || '_read', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())$f$, t || '_insert', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_ward_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_ward_admin(auth.uid()))$f$, t || '_update', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_ward_admin(auth.uid()))$f$, t || '_delete', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', 'trg_' || t || '_updated', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS ward_vitals_patient_idx ON public.ward_vitals(patient_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS ward_exams_patient_idx ON public.ward_exams(patient_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS ward_events_patient_idx ON public.ward_events(patient_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ward_files_patient_idx ON public.ward_files(patient_id, created_at DESC);

-- 4. Storage: clinical attachments for the ward rotation (ward/ prefix in the private "clinico" bucket)
CREATE POLICY "ward_clinico_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clinico' AND (storage.foldername(name))[1] = 'ward'
         AND (private.is_ward_staff(auth.uid()) OR owner = auth.uid()));
CREATE POLICY "ward_clinico_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinico' AND (storage.foldername(name))[1] = 'ward' AND auth.uid() IS NOT NULL);
CREATE POLICY "ward_clinico_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinico' AND (storage.foldername(name))[1] = 'ward'
         AND (owner = auth.uid() OR public.is_ward_admin(auth.uid())));