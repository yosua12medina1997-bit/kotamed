-- ============ Helper de rol administrativo ============
CREATE OR REPLACE FUNCTION public.is_ward_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin','academic_admin')
  )
$$;
REVOKE ALL ON FUNCTION public.is_ward_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ward_admin(uuid) TO authenticated, service_role;

-- ============ PABELLONES ============
CREATE TABLE public.ward_pavilions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  subtitle text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_pavilions TO authenticated;
GRANT ALL ON public.ward_pavilions TO service_role;
ALTER TABLE public.ward_pavilions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_pavilions_read" ON public.ward_pavilions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_pavilions_admin" ON public.ward_pavilions FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_ward_pavilions_updated BEFORE UPDATE ON public.ward_pavilions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ZONAS DEL CROQUIS ============
CREATE TABLE public.ward_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pavilion_id uuid NOT NULL REFERENCES public.ward_pavilions(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'room',
  col integer NOT NULL DEFAULT 1,
  row_index integer NOT NULL DEFAULT 1,
  col_span integer NOT NULL DEFAULT 1,
  row_span integer NOT NULL DEFAULT 1,
  accent text,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_zones TO authenticated;
GRANT ALL ON public.ward_zones TO service_role;
ALTER TABLE public.ward_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_zones_read" ON public.ward_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_zones_admin" ON public.ward_zones FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_ward_zones_updated BEFORE UPDATE ON public.ward_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAMAS ============
CREATE TABLE public.ward_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.ward_zones(id) ON DELETE CASCADE,
  number text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_beds TO authenticated;
GRANT ALL ON public.ward_beds TO service_role;
ALTER TABLE public.ward_beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_beds_read" ON public.ward_beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_beds_admin" ON public.ward_beds FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_ward_beds_updated BEFORE UPDATE ON public.ward_beds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PACIENTES (académico / anonimizado) ============
CREATE TABLE public.ward_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id uuid REFERENCES public.ward_beds(id) ON DELETE SET NULL,
  code text,
  initials text,
  sex text,
  age_label text,
  weight_kg numeric,
  height_cm numeric,
  admitted_at date NOT NULL DEFAULT current_date,
  discharged_at date,
  reason text,
  main_dx text,
  secondary_dx text[] NOT NULL DEFAULT '{}',
  background text,
  allergies text,
  medications text,
  devices text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'estable',
  priority text NOT NULL DEFAULT 'media',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_patients TO authenticated;
GRANT ALL ON public.ward_patients TO service_role;
ALTER TABLE public.ward_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_patients_read" ON public.ward_patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_patients_write" ON public.ward_patients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_patients_update" ON public.ward_patients FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_patients_delete" ON public.ward_patients FOR DELETE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_ward_patients_updated BEFORE UPDATE ON public.ward_patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ASIGNACIONES ============
CREATE TABLE public.ward_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  zone_id uuid REFERENCES public.ward_zones(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'interno',
  active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_assignments TO authenticated;
GRANT ALL ON public.ward_assignments TO service_role;
ALTER TABLE public.ward_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_assignments_read" ON public.ward_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_assignments_admin" ON public.ward_assignments FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_ward_assignments_updated BEFORE UPDATE ON public.ward_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EVOLUCIONES / SOAP ============
CREATE TABLE public.ward_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  evo_date date NOT NULL DEFAULT current_date,
  hosp_day integer,
  status text NOT NULL DEFAULT 'borrador',
  subjective jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis text,
  plan_note text,
  summary text,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_evolutions TO authenticated;
GRANT ALL ON public.ward_evolutions TO service_role;
ALTER TABLE public.ward_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_evolutions_read" ON public.ward_evolutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_evolutions_insert" ON public.ward_evolutions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_evolutions_update" ON public.ward_evolutions FOR UPDATE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR author_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_ward_admin(auth.uid()) OR author_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "ward_evolutions_delete" ON public.ward_evolutions FOR DELETE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_ward_evolutions_updated BEFORE UPDATE ON public.ward_evolutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROBLEMAS CLÍNICOS ============
CREATE TABLE public.ward_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  state text NOT NULL DEFAULT 'en evolución',
  trend text NOT NULL DEFAULT 'estable',
  evidence text,
  studies text,
  plan text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_problems TO authenticated;
GRANT ALL ON public.ward_problems TO service_role;
ALTER TABLE public.ward_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_problems_read" ON public.ward_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_problems_write" ON public.ward_problems FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_problems_update" ON public.ward_problems FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_problems_delete" ON public.ward_problems FOR DELETE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_ward_problems_updated BEFORE UPDATE ON public.ward_problems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PLAN CLÍNICO ============
CREATE TABLE public.ward_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.ward_problems(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'monitorizacion',
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  owner text,
  due_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_plan_items TO authenticated;
GRANT ALL ON public.ward_plan_items TO service_role;
ALTER TABLE public.ward_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_plan_read" ON public.ward_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_plan_write" ON public.ward_plan_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_plan_update" ON public.ward_plan_items FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_plan_delete" ON public.ward_plan_items FOR DELETE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_ward_plan_updated BEFORE UPDATE ON public.ward_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PENDIENTES ============
CREATE TABLE public.ward_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.ward_patients(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES public.ward_problems(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'clinico',
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendiente',
  owner text,
  due_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_tasks TO authenticated;
GRANT ALL ON public.ward_tasks TO service_role;
ALTER TABLE public.ward_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_tasks_read" ON public.ward_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_tasks_write" ON public.ward_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_tasks_update" ON public.ward_tasks FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_tasks_delete" ON public.ward_tasks FOR DELETE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_ward_tasks_updated BEFORE UPDATE ON public.ward_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RUTA DE ESTUDIO ============
CREATE TABLE public.ward_study_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dx_key text NOT NULL,
  topic text NOT NULL,
  summary text,
  key_points text,
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_study_links TO authenticated;
GRANT ALL ON public.ward_study_links TO service_role;
ALTER TABLE public.ward_study_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_study_read" ON public.ward_study_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_study_admin" ON public.ward_study_links FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_ward_study_updated BEFORE UPDATE ON public.ward_study_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COMPETENCIAS ============
CREATE TABLE public.ward_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  group_label text NOT NULL DEFAULT 'Hospitalización Pediátrica',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_competencies TO authenticated;
GRANT ALL ON public.ward_competencies TO service_role;
ALTER TABLE public.ward_competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_competencies_read" ON public.ward_competencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_competencies_admin" ON public.ward_competencies FOR ALL TO authenticated
  USING (public.is_ward_admin(auth.uid())) WITH CHECK (public.is_ward_admin(auth.uid()));
CREATE TRIGGER trg_ward_competencies_updated BEFORE UPDATE ON public.ward_competencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ward_competency_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competency_id uuid NOT NULL REFERENCES public.ward_competencies(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pendiente',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, competency_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_competency_progress TO authenticated;
GRANT ALL ON public.ward_competency_progress TO service_role;
ALTER TABLE public.ward_competency_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_progress_read" ON public.ward_competency_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ward_admin(auth.uid()));
CREATE POLICY "ward_progress_own" ON public.ward_competency_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ward_progress_updated BEFORE UPDATE ON public.ward_competency_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CASOS DE APRENDIZAJE ============
CREATE TABLE public.ward_learning_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.ward_patients(id) ON DELETE SET NULL,
  title text NOT NULL,
  problem text,
  differential text,
  final_dx text,
  studies text,
  treatment text,
  evolution text,
  learnings text,
  difficulties text,
  pearls text,
  reflection text,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ward_learning_cases TO authenticated;
GRANT ALL ON public.ward_learning_cases TO service_role;
ALTER TABLE public.ward_learning_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ward_cases_read" ON public.ward_learning_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "ward_cases_insert" ON public.ward_learning_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ward_cases_update" ON public.ward_learning_cases FOR UPDATE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR author_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_ward_admin(auth.uid()) OR author_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "ward_cases_delete" ON public.ward_learning_cases FOR DELETE TO authenticated
  USING (public.is_ward_admin(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_ward_cases_updated BEFORE UPDATE ON public.ward_learning_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEMILLA: CROQUIS REAL HNSEB ============
INSERT INTO public.ward_pavilions (code, name, subtitle, sort_order) VALUES
  ('A', 'Pabellón A', 'Hospitalización Pediátrica · HNSEB', 1),
  ('B', 'Pabellón B', 'Hospitalización Pediátrica · HNSEB', 2);

INSERT INTO public.ward_zones (pavilion_id, label, kind, col, row_index, col_span, row_span, sort_order)
SELECT p.id, z.label, z.kind, z.col, z.row_index, z.col_span, z.row_span, z.sort_order
FROM public.ward_pavilions p
JOIN (VALUES
  ('A','NUTRICIÓN','service',1,1,1,1,1),
  ('A','IM LEYLA','room',2,1,1,1,2),
  ('A','SSHH','service',3,1,1,1,3),
  ('A','PASADIZO AL STAR MÉDICO Y JEFATURA','circulation',4,1,1,1,4),
  ('A','STAR ENFERMERÍA','service',5,1,1,1,5),
  ('A','ENTRADA PRINCIPAL','entrance',1,2,1,1,6),
  ('A','PASADIZO','circulation',2,2,4,1,7),
  ('A','SALA 3','room',1,3,1,1,8),
  ('A','IM LEYLA · SALA INFERIOR','room',2,3,2,1,9),
  ('A','IM DAMARIS','room',4,3,2,1,10),
  ('B','ENTRADA AUDITORIO','entrance',1,1,1,1,1),
  ('B','IM KELLY','room',2,1,2,1,2),
  ('B','SSHH','service',4,1,1,1,3),
  ('B','STAR ENFERMERÍA','service',5,1,1,1,4),
  ('B','PASADIZO','circulation',1,2,5,1,5),
  ('B','IM VERLIN','room',1,3,2,1,6),
  ('B','IM AILEN','room',3,3,2,1,7),
  ('B','SALA LIBRE','room',5,3,1,1,8)
) AS z(pav,label,kind,col,row_index,col_span,row_span,sort_order) ON z.pav = p.code;

INSERT INTO public.ward_beds (zone_id, number, sort_order)
SELECT zz.id, b.number, b.sort_order
FROM (VALUES
  ('A','IM LEYLA','8',1),
  ('A','IM LEYLA','33',2),
  ('A','IM LEYLA','15',3),
  ('A','SALA 3','3',1),
  ('A','IM DAMARIS','19',1),
  ('A','IM DAMARIS','20',2),
  ('A','IM DAMARIS','1',3),
  ('A','IM DAMARIS','14',4),
  ('B','IM KELLY','2',1),
  ('B','IM KELLY','9',2),
  ('B','IM KELLY','22',3),
  ('B','IM VERLIN','31',1),
  ('B','IM VERLIN','23',2),
  ('B','IM VERLIN','21',3),
  ('B','IM AILEN','32',1),
  ('B','IM AILEN','36',2)
) AS b(pav,zone,number,sort_order)
JOIN (
  SELECT z.id, z.label, p.code FROM public.ward_zones z JOIN public.ward_pavilions p ON p.id = z.pavilion_id
) zz ON zz.label = b.zone AND zz.code = b.pav;

INSERT INTO public.ward_competencies (code, title, group_label, sort_order) VALUES
  ('eval-inicial','Evaluación inicial del paciente pediátrico','Hospitalización Pediátrica',1),
  ('historia','Historia clínica pediátrica completa','Hospitalización Pediátrica',2),
  ('evolucion','Evolución diaria estructurada','Hospitalización Pediátrica',3),
  ('soap','Nota SOAP de calidad','Hospitalización Pediátrica',4),
  ('laboratorio','Interpretación de laboratorio','Razonamiento clínico',5),
  ('balance','Balance hídrico y requerimientos','Razonamiento clínico',6),
  ('imagenes','Interpretación de radiografía de tórax','Razonamiento clínico',7),
  ('antibiotico','Antibioticoterapia racional','Razonamiento clínico',8),
  ('oxigeno','Oxigenoterapia pediátrica','Procedimientos',9),
  ('procedimientos','Procedimientos básicos supervisados','Procedimientos',10),
  ('via-periferica','Vía periférica y muestras','Procedimientos',11),
  ('pase-visita','Presentación en pase de visita','Comunicación',12),
  ('familia','Educación a familiares','Comunicación',13),
  ('alta','Preparación para el alta','Comunicación',14);

INSERT INTO public.ward_study_links (dx_key, topic, summary, sort_order) VALUES
  ('neumonia','Neumonía adquirida en la comunidad','Criterios de gravedad, etiología por edad y esquemas antibióticos.',1),
  ('neumonia','Interpretación de radiografía de tórax','Patrones radiológicos: consolidación, intersticial, derrame.',2),
  ('neumonia','Oxigenoterapia pediátrica','Dispositivos, objetivos de saturación y escalamiento.',3),
  ('bronquiolitis','Bronquiolitis aguda','Diagnóstico clínico, escalas de severidad y manejo de soporte.',1),
  ('bronquiolitis','Insuficiencia respiratoria en el lactante','Signos de alarma y criterios de UCI.',2),
  ('deshidratacion','Deshidratación y rehidratación','Planes A, B y C; déficit y mantenimiento.',1),
  ('deshidratacion','Balance hídrico pediátrico','Holliday-Segar, ingresos, egresos y control de peso.',2),
  ('sepsis','Sepsis pediátrica','Reconocimiento precoz, bundles y antibioticoterapia empírica.',1),
  ('anemia','Anemia en pediatría','Clasificación, estudio inicial y tratamiento.',1),
  ('itu','Infección del tracto urinario','Diagnóstico, urocultivo y estudio de imágenes.',1);