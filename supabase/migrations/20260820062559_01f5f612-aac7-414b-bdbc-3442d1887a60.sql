-- Expresión reutilizada: paciente editable por el usuario actual
-- (se escribe inline en cada política para evitar funciones con privilegios).

CREATE TABLE public.emerg_reassessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text,
  response text,
  findings text,
  conduct text,
  author_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'borrador',
  subjective text,
  objective text,
  analysis text,
  plan_note text,
  author_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'laboratorio',
  name text NOT NULL,
  priority text NOT NULL DEFAULT 'rutina',
  status text NOT NULL DEFAULT 'solicitado',
  result text,
  flag text NOT NULL DEFAULT 'normal',
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  drug text NOT NULL,
  dose text,
  route text,
  at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'indicado',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'ingreso',
  label text,
  volume_ml numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_consults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  priority text NOT NULL DEFAULT 'rutina',
  status text NOT NULL DEFAULT 'solicitada',
  question text,
  answer text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'realizado',
  operator text,
  supervisor text,
  result text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_calcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  tool text NOT NULL,
  weight_kg numeric,
  result text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'nota',
  title text NOT NULL,
  detail text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emerg_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.emerg_patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendiente',
  due_at timestamptz,
  done_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['emerg_reassessments','emerg_evolutions','emerg_exams','emerg_treatments',
                           'emerg_balance','emerg_consults','emerg_procedures','emerg_calcs',
                           'emerg_events','emerg_tasks']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I
                      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()$f$, t);
    EXECUTE format($f$CREATE POLICY %1$s_select ON public.%1$I FOR SELECT TO authenticated
                      USING (private.is_ward_staff(auth.uid()))$f$, t);
    EXECUTE format($f$CREATE POLICY %1$s_write ON public.%1$I FOR ALL TO authenticated
      USING (
        public.is_ward_admin(auth.uid()) OR created_by = auth.uid()
        OR (patient_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.emerg_patients p
              WHERE p.id = %1$I.patient_id
                AND (p.created_by = auth.uid()
                     OR (p.box_id IS NOT NULL AND EXISTS (
                          SELECT 1 FROM public.emerg_box_assignments a
                          WHERE a.box_id = p.box_id AND a.user_id = auth.uid() AND a.active)))))
      )
      WITH CHECK (
        public.is_ward_admin(auth.uid()) OR created_by = auth.uid()
        OR (patient_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.emerg_patients p
              WHERE p.id = %1$I.patient_id
                AND (p.created_by = auth.uid()
                     OR (p.box_id IS NOT NULL AND EXISTS (
                          SELECT 1 FROM public.emerg_box_assignments a
                          WHERE a.box_id = p.box_id AND a.user_id = auth.uid() AND a.active)))))
      )$f$, t);
  END LOOP;
END $$;

-- Boxes iniciales: Observación (8) y Shock Trauma (3)
INSERT INTO public.emerg_boxes (area, code, label, sort_order)
SELECT 'observacion', 'BOX ' || lpad(g::text, 2, '0'), 'Observación', g
FROM generate_series(1, 8) g;
INSERT INTO public.emerg_boxes (area, code, label, sort_order)
SELECT 'shock', 'ST-' || lpad(g::text, 2, '0'), 'Shock Trauma', 100 + g
FROM generate_series(1, 3) g;
