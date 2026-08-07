CREATE TABLE IF NOT EXISTS public.neo_ai_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.neo_patients(id) ON DELETE SET NULL,
  unit text,
  source text NOT NULL DEFAULT 'upload',
  doc_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  ocr_text text,
  ai_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrections jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_confidence numeric,
  model text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.neo_ai_intakes TO authenticated;
GRANT ALL ON public.neo_ai_intakes TO service_role;

ALTER TABLE public.neo_ai_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neo_ai_intakes_insert_own" ON public.neo_ai_intakes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "neo_ai_intakes_select_staff" ON public.neo_ai_intakes
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.is_neo_staff(auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "neo_ai_intakes_update_own" ON public.neo_ai_intakes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS neo_ai_intakes_patient_idx ON public.neo_ai_intakes(patient_id);
CREATE INDEX IF NOT EXISTS neo_ai_intakes_created_idx ON public.neo_ai_intakes(created_at DESC);

CREATE TRIGGER trg_neo_ai_intakes_updated_at
  BEFORE UPDATE ON public.neo_ai_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();