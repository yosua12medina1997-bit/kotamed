-- KOTA CLINICAL MAP · Biblioteca Maestra de Patologías
CREATE TABLE IF NOT EXISTS public.kcm_pathologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL,
  subcategory text,
  specialty text DEFAULT 'Pediatría',
  description text,
  keywords text[] NOT NULL DEFAULT '{}',
  synonyms text[] NOT NULL DEFAULT '{}',
  related_dx text[] NOT NULL DEFAULT '{}',
  related_slugs text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'variable',
  areas text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  age_range text,
  frequency text,
  icon text,
  color text,
  active boolean NOT NULL DEFAULT true,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kcm_area_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathology_id uuid NOT NULL REFERENCES public.kcm_pathologies(id) ON DELETE CASCADE,
  area text NOT NULL,
  focus text[] NOT NULL DEFAULT '{}',
  note text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pathology_id, area)
);

CREATE TABLE IF NOT EXISTS public.kcm_resource_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathology_id uuid NOT NULL REFERENCES public.kcm_pathologies(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.kl_resources(id) ON DELETE CASCADE,
  area text,
  step_key text,
  priority integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pathology_id, resource_id, area)
);

CREATE TABLE IF NOT EXISTS public.kcm_patient_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  patient_id uuid NOT NULL,
  pathology_id uuid NOT NULL REFERENCES public.kcm_pathologies(id) ON DELETE CASCADE,
  area text,
  priority integer NOT NULL DEFAULT 1,
  hidden boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, patient_id, pathology_id)
);

CREATE INDEX IF NOT EXISTS kcm_area_config_path_idx ON public.kcm_area_config(pathology_id);
CREATE INDEX IF NOT EXISTS kcm_resource_links_path_idx ON public.kcm_resource_links(pathology_id);
CREATE INDEX IF NOT EXISTS kcm_patient_links_patient_idx ON public.kcm_patient_links(module, patient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kcm_pathologies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kcm_area_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kcm_resource_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kcm_patient_links TO authenticated;
GRANT ALL ON public.kcm_pathologies TO service_role;
GRANT ALL ON public.kcm_area_config TO service_role;
GRANT ALL ON public.kcm_resource_links TO service_role;
GRANT ALL ON public.kcm_patient_links TO service_role;

ALTER TABLE public.kcm_pathologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kcm_area_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kcm_resource_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kcm_patient_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_kcm_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin','academic_admin')
  )
$$;
REVOKE ALL ON FUNCTION private.is_kcm_admin(uuid) FROM PUBLIC;

CREATE POLICY kcm_path_read ON public.kcm_pathologies FOR SELECT TO authenticated USING (true);
CREATE POLICY kcm_path_write ON public.kcm_pathologies FOR ALL TO authenticated
  USING (private.is_kcm_admin(auth.uid())) WITH CHECK (private.is_kcm_admin(auth.uid()));

CREATE POLICY kcm_area_read ON public.kcm_area_config FOR SELECT TO authenticated USING (true);
CREATE POLICY kcm_area_write ON public.kcm_area_config FOR ALL TO authenticated
  USING (private.is_kcm_admin(auth.uid())) WITH CHECK (private.is_kcm_admin(auth.uid()));

CREATE POLICY kcm_rl_read ON public.kcm_resource_links FOR SELECT TO authenticated USING (true);
CREATE POLICY kcm_rl_write ON public.kcm_resource_links FOR ALL TO authenticated
  USING (private.is_kcm_admin(auth.uid())) WITH CHECK (private.is_kcm_admin(auth.uid()));

CREATE POLICY kcm_pl_read ON public.kcm_patient_links FOR SELECT TO authenticated
  USING (private.is_ward_staff(auth.uid()) OR private.is_kcm_admin(auth.uid()));
CREATE POLICY kcm_pl_insert ON public.kcm_patient_links FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (private.is_ward_staff(auth.uid()) OR private.is_kcm_admin(auth.uid())));
CREATE POLICY kcm_pl_update ON public.kcm_patient_links FOR UPDATE TO authenticated
  USING (private.is_ward_staff(auth.uid()) OR private.is_kcm_admin(auth.uid()))
  WITH CHECK (private.is_ward_staff(auth.uid()) OR private.is_kcm_admin(auth.uid()));
CREATE POLICY kcm_pl_delete ON public.kcm_patient_links FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR private.is_kcm_admin(auth.uid()));

CREATE TRIGGER trg_kcm_path_updated BEFORE UPDATE ON public.kcm_pathologies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kcm_area_updated BEFORE UPDATE ON public.kcm_area_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kcm_pl_updated BEFORE UPDATE ON public.kcm_patient_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.kcm_pathologies
  (code, name, slug, category, subcategory, description, keywords, synonyms, severity, areas, tags, age_range, frequency, sort_order)
VALUES
('NACP-01','Neumonía adquirida en la comunidad','neumonia-adquirida-comunidad','Respiratorias','Infección de vía aérea baja','Infección del parénquima pulmonar adquirida fuera del ámbito hospitalario. Puede variar desde formas leves hasta neumonía grave con compromiso sistémico.','{neumonia,nac,consolidacion,tos,fiebre,taquipnea}','{"Neumonía comunitaria","NAC"}','variable','{hospitalizacion,observacion,shock}','{Fiebre,Tos,Disnea,Hipoxemia,"Infección respiratoria"}','1 mes – 18 años','Muy frecuente',10),
('BRQ-02','Bronquiolitis','bronquiolitis','Respiratorias','Infección de vía aérea baja','Inflamación aguda de la vía aérea pequeña, típicamente por VRS, en menores de 2 años.','{bronquiolitis,vrs,sibilancias,lactante}','{"Bronquiolitis aguda"}','moderada','{hospitalizacion,observacion,shock}','{Sibilancias,Lactante,Hipoxemia}','0 – 24 meses','Muy frecuente',20),
('ASM-03','Crisis asmática','crisis-asmatica','Respiratorias','Obstrucción bronquial','Exacerbación aguda del asma con obstrucción reversible al flujo aéreo.','{asma,crisis,broncoespasmo,sibilancias,salbutamol}','{"Exacerbación asmática","Crisis de asma"}','moderada','{observacion,shock,hospitalizacion}','{Sibilancias,Broncodilatadores}','2 – 18 años','Frecuente',30),
('ASM-04','Estatus asmático','estatus-asmatico','Respiratorias','Obstrucción bronquial','Crisis asmática grave refractaria al tratamiento inicial, con riesgo de falla respiratoria.','{estatus,asmatico,refractario,sulfato,magnesio}','{"Asma casi fatal","Status asthmaticus"}','critica','{shock,hospitalizacion}','{Crítico,"Soporte ventilatorio"}','2 – 18 años','Poco frecuente',40),
('IRA-05','Insuficiencia respiratoria','insuficiencia-respiratoria','Respiratorias','Falla de órgano','Incapacidad del sistema respiratorio para mantener intercambio gaseoso adecuado.','{insuficiencia,respiratoria,hipoxemia,hipercapnia}','{"Falla respiratoria"}','critica','{shock,hospitalizacion,observacion}','{Crítico,Oxigenoterapia}','Todas las edades','Frecuente',50),
('CRP-06','Crup','crup','Respiratorias','Vía aérea superior','Laringotraqueítis aguda con estridor inspiratorio y tos perruna.','{crup,laringotraqueitis,estridor,tos,perruna,dexametasona}','{"Laringotraqueítis aguda"}','moderada','{observacion,hospitalizacion}','{Estridor,"Vía aérea"}','6 meses – 6 años','Frecuente',60),
('ACE-07','Aspiración de cuerpo extraño','aspiracion-cuerpo-extrano','Respiratorias','Vía aérea','Obstrucción parcial o total de la vía aérea por cuerpo extraño.','{cuerpo,extrano,aspiracion,atragantamiento,broncoscopia}','{"Atragantamiento"}','critica','{shock,observacion}','{Emergencia,"Vía aérea"}','6 meses – 5 años','Poco frecuente',70),
('ATL-08','Atelectasia','atelectasia','Respiratorias','Complicación pulmonar','Colapso alveolar segmentario o lobar con pérdida de volumen pulmonar.','{atelectasia,colapso,fisioterapia}','{}','leve','{hospitalizacion}','{Complicación,Fisioterapia}','Todas las edades','Frecuente',80),
('DPL-09','Derrame pleural','derrame-pleural','Respiratorias','Complicación pulmonar','Acumulación anormal de líquido en el espacio pleural.','{derrame,pleural,toracocentesis,ecografia}','{}','moderada','{hospitalizacion,observacion}','{Complicación,Procedimiento}','Todas las edades','Frecuente',90),
('EMP-10','Empiema','empiema','Respiratorias','Complicación pulmonar','Derrame pleural infectado con pus, complicación de neumonía.','{empiema,pus,drenaje,toracico}','{"Derrame pleural complicado"}','grave','{hospitalizacion,shock}','{Complicación,Drenaje}','Todas las edades','Poco frecuente',100),
('SDRA-11','SDRA','sdra','Respiratorias','Falla de órgano','Síndrome de distrés respiratorio agudo con hipoxemia refractaria e infiltrados bilaterales.','{sdra,distres,pafi,ventilacion,protectora}','{"Distrés respiratorio agudo"}','critica','{shock,hospitalizacion}','{Crítico,UCI}','Todas las edades','Poco frecuente',110),
('SEP-12','Sepsis','sepsis','Infecciosas','Infección sistémica','Disfunción orgánica secundaria a una respuesta desregulada del huésped a la infección.','{sepsis,infeccion,lactato,cultivos,antibiotico}','{"Sepsis pediátrica"}','grave','{shock,hospitalizacion,observacion}','{Crítico,"Antibioticoterapia"}','Todas las edades','Frecuente',120),
('SHS-13','Shock séptico','shock-septico','Infecciosas','Shock','Sepsis con hipoperfusión persistente pese a la reanimación con fluidos.','{shock,septico,vasoactivos,noradrenalina,bolo}','{"Sepsis con shock"}','critica','{shock,hospitalizacion}','{Crítico,Vasoactivos}','Todas las edades','Poco frecuente',130),
('ITU-14','Infección urinaria','infeccion-urinaria','Infecciosas','Urinaria','Infección del tracto urinario bajo con síntomas miccionales o fiebre en lactantes.','{itu,urocultivo,disuria,fiebre}','{"ITU"}','leve','{observacion,hospitalizacion}','{Fiebre,Antibióticos}','0 – 18 años','Muy frecuente',140),
('PNF-15','Pielonefritis','pielonefritis','Infecciosas','Urinaria','Infección del parénquima renal con fiebre alta y compromiso sistémico.','{pielonefritis,renal,fiebre,puno,percusion}','{"ITU alta"}','moderada','{hospitalizacion,observacion}','{Fiebre,Antibióticos}','0 – 18 años','Frecuente',150),
('MEN-16','Meningitis','meningitis','Infecciosas','Neuroinfección','Inflamación de las meninges de etiología bacteriana o viral.','{meningitis,puncion,lumbar,rigidez,nuca}','{"Meningoencefalitis"}','grave','{shock,hospitalizacion}','{Crítico,"Punción lumbar"}','Todas las edades','Poco frecuente',160),
('ENC-17','Encefalitis','encefalitis','Infecciosas','Neuroinfección','Inflamación del parénquima cerebral con alteración del estado de conciencia.','{encefalitis,conciencia,convulsion,aciclovir}','{}','grave','{shock,hospitalizacion}','{Crítico,Neurología}','Todas las edades','Poco frecuente',170),
('DEN-18','Dengue','dengue','Infecciosas','Arbovirosis','Infección por virus dengue con espectro desde forma leve hasta dengue grave con shock.','{dengue,plaquetas,hematocrito,signos,alarma}','{"Dengue con signos de alarma"}','variable','{observacion,hospitalizacion,shock}','{Fiebre,"Signos de alarma"}','Todas las edades','Frecuente',180),
('CEL-19','Celulitis','celulitis','Infecciosas','Piel y partes blandas','Infección aguda de dermis y tejido celular subcutáneo.','{celulitis,piel,eritema,antibiotico}','{}','leve','{observacion,hospitalizacion}','{Piel,Antibióticos}','Todas las edades','Frecuente',190),
('OST-20','Osteomielitis','osteomielitis','Infecciosas','Osteoarticular','Infección del hueso, generalmente hematógena en pediatría.','{osteomielitis,hueso,rm,antibiotico,prolongado}','{}','moderada','{hospitalizacion}','{Osteoarticular,Antibióticos}','Todas las edades','Poco frecuente',200),
('ART-21','Artritis séptica','artritis-septica','Infecciosas','Osteoarticular','Infección del espacio articular; emergencia ortopédica.','{artritis,septica,articulacion,artrocentesis}','{}','grave','{hospitalizacion,observacion}','{Osteoarticular,Procedimiento}','Todas las edades','Poco frecuente',210),
('GEA-22','Gastroenteritis aguda','gastroenteritis-aguda','Gastrointestinales','Diarrea aguda','Inflamación del tracto gastrointestinal con diarrea y/o vómitos de curso agudo.','{gea,diarrea,vomitos,rotavirus,srp}','{"GEA","Diarrea aguda"}','leve','{observacion,hospitalizacion}','{Diarrea,Hidratación}','0 – 18 años','Muy frecuente',220),
('DES-23','Deshidratación','deshidratacion','Gastrointestinales','Hidroelectrolítico','Pérdida de agua y electrolitos con repercusión hemodinámica variable.','{deshidratacion,plan,rehidratacion,turgor}','{"Depleción de volumen"}','moderada','{observacion,shock,hospitalizacion}','{Hidratación,"Plan B/C"}','0 – 18 años','Muy frecuente',230),
('DAA-24','Dolor abdominal agudo','dolor-abdominal-agudo','Gastrointestinales','Abdomen','Dolor abdominal de inicio reciente que requiere descartar causa quirúrgica.','{dolor,abdominal,agudo,abdomen,quirurgico}','{}','variable','{observacion,hospitalizacion}','{Abdomen,Cirugía}','Todas las edades','Muy frecuente',240),
('APE-25','Apendicitis','apendicitis','Gastrointestinales','Abdomen quirúrgico','Inflamación del apéndice cecal; causa quirúrgica más frecuente de abdomen agudo.','{apendicitis,alvarado,mcburney,cirugia}','{}','grave','{observacion,hospitalizacion}','{Cirugía,Abdomen}','5 – 18 años','Frecuente',250),
('INV-26','Invaginación intestinal','invaginacion-intestinal','Gastrointestinales','Abdomen quirúrgico','Telescopaje intestinal con obstrucción; clásica tríada en lactantes.','{invaginacion,intususcepcion,ecografia,enema}','{"Intususcepción"}','grave','{observacion,shock,hospitalizacion}','{Cirugía,Lactante}','3 meses – 3 años','Poco frecuente',260),
('PAN-27','Pancreatitis','pancreatitis','Gastrointestinales','Digestivo','Inflamación pancreática con dolor abdominal y elevación enzimática.','{pancreatitis,amilasa,lipasa,dolor}','{}','moderada','{hospitalizacion}','{Digestivo}','Todas las edades','Poco frecuente',270),
('HDA-28','Hemorragia digestiva','hemorragia-digestiva','Gastrointestinales','Sangrado','Sangrado del tracto digestivo alto o bajo con riesgo hemodinámico.','{hemorragia,digestiva,melena,hematemesis,endoscopia}','{}','grave','{shock,observacion,hospitalizacion}','{Sangrado,Crítico}','Todas las edades','Poco frecuente',280),
('HEP-29','Hepatitis','hepatitis','Gastrointestinales','Hígado','Inflamación hepática con elevación de transaminasas e ictericia.','{hepatitis,ictericia,transaminasas}','{}','variable','{hospitalizacion,observacion}','{Hígado}','Todas las edades','Poco frecuente',290),
('CVF-30','Convulsión febril','convulsion-febril','Neurológicas','Crisis','Crisis convulsiva asociada a fiebre en niños sin patología neurológica de base.','{convulsion,febril,fiebre,crisis,simple,compleja}','{}','leve','{observacion,hospitalizacion}','{Neurología,Fiebre}','6 meses – 5 años','Muy frecuente',300),
('PCC-31','Primera crisis convulsiva','primera-crisis-convulsiva','Neurológicas','Crisis','Primer episodio convulsivo no provocado que requiere estudio.','{primera,crisis,convulsiva,eeg}','{}','moderada','{observacion,hospitalizacion}','{Neurología}','Todas las edades','Frecuente',310),
('EEP-32','Estado epiléptico','estado-epileptico','Neurológicas','Crisis','Crisis prolongada o recurrente sin recuperación; emergencia neurológica.','{estado,epileptico,status,midazolam,benzodiacepina}','{"Status epiléptico"}','critica','{shock,hospitalizacion}','{Crítico,Neurología}','Todas las edades','Poco frecuente',320),
('AEC-33','Alteración del estado de conciencia','alteracion-estado-conciencia','Neurológicas','Conciencia','Disminución o alteración del nivel de alerta de causa múltiple.','{conciencia,glasgow,somnolencia,coma}','{}','grave','{shock,observacion,hospitalizacion}','{Crítico,Glasgow}','Todas las edades','Frecuente',330),
('TEC-34','Traumatismo craneoencefálico','traumatismo-craneoencefalico','Neurológicas','Trauma','Lesión craneal traumática con espectro de leve a grave.','{tec,trauma,craneo,glasgow,tomografia}','{"TEC"}','variable','{shock,observacion,hospitalizacion}','{Trauma,Crítico}','Todas las edades','Frecuente',340),
('HEC-35','Hipertensión endocraneana','hipertension-endocraneana','Neurológicas','Presión intracraneal','Aumento de presión intracraneal con riesgo de herniación.','{hipertension,endocraneana,pic,manitol}','{}','critica','{shock,hospitalizacion}','{Crítico,UCI}','Todas las edades','Poco frecuente',350),
('SIN-36','Síncope','sincope','Neurológicas','Conciencia','Pérdida transitoria de la conciencia por hipoperfusión cerebral.','{sincope,lipotimia,ecg,ortostatico}','{}','leve','{observacion}','{Cardiología,Neurología}','5 – 18 años','Frecuente',360),
('SHV-37','Shock hipovolémico','shock-hipovolemico','Shock y emergencias críticas','Shock','Hipoperfusión por pérdida de volumen intravascular.','{shock,hipovolemico,bolo,cristaloides}','{}','critica','{shock,hospitalizacion}','{Crítico,Reanimación}','Todas las edades','Frecuente',370),
('SHH-38','Shock hemorrágico','shock-hemorragico','Shock y emergencias críticas','Shock','Shock por pérdida sanguínea aguda; requiere control de sangrado y hemoderivados.','{shock,hemorragico,transfusion,sangrado}','{}','critica','{shock}','{Crítico,Transfusión}','Todas las edades','Poco frecuente',380),
('SHA-39','Shock anafiláctico','shock-anafilactico','Shock y emergencias críticas','Shock','Shock distributivo por reacción anafiláctica; adrenalina inmediata.','{shock,anafilactico,adrenalina,alergia}','{}','critica','{shock,observacion}','{Crítico,Adrenalina}','Todas las edades','Poco frecuente',390),
('SHC-40','Shock cardiogénico','shock-cardiogenico','Shock y emergencias críticas','Shock','Falla de bomba con hipoperfusión sistémica.','{shock,cardiogenico,inotropicos,ecocardiografia}','{}','critica','{shock,hospitalizacion}','{Crítico,Cardiología}','Todas las edades','Raro',400),
('SHO-41','Shock obstructivo','shock-obstructivo','Shock y emergencias críticas','Shock','Obstrucción al flujo por neumotórax a tensión, taponamiento o tromboembolia.','{shock,obstructivo,neumotorax,taponamiento}','{}','critica','{shock}','{Crítico,Procedimiento}','Todas las edades','Raro',410),
('ANA-42','Anafilaxia','anafilaxia','Shock y emergencias críticas','Alergia','Reacción alérgica sistémica grave de instalación rápida.','{anafilaxia,adrenalina,urticaria,angioedema}','{}','critica','{shock,observacion}','{Alergia,Adrenalina}','Todas las edades','Poco frecuente',420),
('POL-43','Politraumatismo','politraumatismo','Shock y emergencias críticas','Trauma','Lesiones traumáticas múltiples con riesgo vital.','{politrauma,abcde,trauma,fast}','{"Trauma múltiple"}','critica','{shock}','{Trauma,Crítico}','Todas las edades','Frecuente',430),
('TTX-44','Trauma torácico','trauma-toracico','Shock y emergencias críticas','Trauma','Lesión torácica traumática con posible compromiso ventilatorio.','{trauma,toracico,neumotorax,contusion}','{}','critica','{shock}','{Trauma,Crítico}','Todas las edades','Poco frecuente',440),
('TAB-45','Trauma abdominal','trauma-abdominal','Shock y emergencias críticas','Trauma','Lesión abdominal traumática cerrada o penetrante.','{trauma,abdominal,fast,hepatico,esplenico}','{}','critica','{shock}','{Trauma,Crítico}','Todas las edades','Poco frecuente',450),
('QUE-46','Quemaduras graves','quemaduras-graves','Shock y emergencias críticas','Trauma','Quemaduras extensas o profundas con repercusión sistémica.','{quemadura,superficie,parkland,via,aerea}','{}','critica','{shock,hospitalizacion}','{Trauma,Hidratación}','Todas las edades','Poco frecuente',460),
('CAD-47','Cetoacidosis diabética','cetoacidosis-diabetica','Metabólicas y endocrinológicas','Diabetes','Descompensación diabética con hiperglucemia, acidosis y cetosis.','{cad,cetoacidosis,insulina,acidosis,glucosa}','{"CAD"}','critica','{shock,hospitalizacion,observacion}','{Crítico,Endocrinología}','2 – 18 años','Frecuente',470),
('HIG-48','Hipoglucemia grave','hipoglucemia-grave','Metabólicas y endocrinológicas','Glucemia','Glucosa plasmática crítica con síntomas neuroglucopénicos.','{hipoglucemia,dextrosa,glucosa,convulsion}','{}','critica','{shock,observacion}','{Crítico,Metabólico}','Todas las edades','Frecuente',480),
('THE-49','Trastornos hidroelectrolíticos severos','trastornos-hidroelectroliticos','Metabólicas y endocrinológicas','Electrolitos','Alteraciones graves de sodio, potasio, calcio o equilibrio ácido-base.','{hiponatremia,hipernatremia,hipokalemia,hiperkalemia,electrolitos}','{}','grave','{hospitalizacion,shock}','{Metabólico,Laboratorio}','Todas las edades','Frecuente',490),
('CSR-50','Crisis suprarrenal','crisis-suprarrenal','Metabólicas y endocrinológicas','Endocrino','Insuficiencia suprarrenal aguda con shock e hipoglucemia.','{crisis,suprarrenal,hidrocortisona,addison}','{}','critica','{shock,hospitalizacion}','{Crítico,Endocrinología}','Todas las edades','Raro',500),
('TOX-51','Intoxicación medicamentosa','intoxicacion-medicamentosa','Toxicológicas','Intoxicación','Exposición tóxica a fármacos con riesgo sistémico.','{intoxicacion,farmaco,carbon,activado,antidoto}','{}','grave','{shock,observacion}','{Toxicología,Antídoto}','Todas las edades','Frecuente',510),
('TOX-52','Intoxicación por sustancias desconocidas','intoxicacion-desconocida','Toxicológicas','Intoxicación','Cuadro toxicológico sin agente identificado; manejo sindrómico.','{intoxicacion,desconocida,toxidrome,soporte}','{}','grave','{shock,observacion}','{Toxicología}','Todas las edades','Poco frecuente',520),
('TOX-53','Síndrome colinérgico','sindrome-colinergico','Toxicológicas','Toxíndrome','Toxíndrome por organofosforados con hipersecreción y bradicardia.','{colinergico,organofosforado,atropina,pralidoxima}','{}','critica','{shock,hospitalizacion}','{Toxicología,Antídoto}','Todas las edades','Poco frecuente',530),
('TOX-54','Envenenamiento con compromiso sistémico','envenenamiento-sistemico','Toxicológicas','Envenenamiento','Mordedura o picadura con toxicidad sistémica de origen ofídico o arácnido.','{envenenamiento,ofidico,antiveneno,loxosceles}','{}','critica','{shock,hospitalizacion}','{Toxicología,Antiveneno}','Todas las edades','Poco frecuente',540)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.kcm_area_config (pathology_id, area, focus, note)
SELECT p.id, v.area, v.focus, v.note
FROM public.kcm_pathologies p
JOIN (VALUES
 ('neumonia-adquirida-comunidad','hospitalizacion', ARRAY['Diagnóstico','Severidad','Manejo intrahospitalario','Antibioticoterapia','Evolución','Complicaciones','Criterios de alta'], 'Manejo integral, evolución clínica, complicaciones y criterios de alta.'),
 ('neumonia-adquirida-comunidad','observacion', ARRAY['Evaluación inicial','Respuesta al tratamiento','Reevaluación','Criterios de hospitalización','Criterios de alta'], 'Evaluación inicial, respuesta al tratamiento y decisión de destino.'),
 ('neumonia-adquirida-comunidad','shock', ARRAY['ABCDE','Estabilización','Oxigenoterapia','Soporte ventilatorio','Manejo del shock','Antibióticos tempranos','Reevaluación'], 'Estabilización, soporte avanzado y manejo del paciente crítico.'),
 ('bronquiolitis','hospitalizacion', ARRAY['Diagnóstico clínico','Score de severidad','Soporte respiratorio','Hidratación y nutrición','Criterios de alta'], 'Soporte y vigilancia respiratoria del lactante.'),
 ('bronquiolitis','observacion', ARRAY['Evaluación inicial','Prueba terapéutica','Reevaluación','Criterios de hospitalización'], 'Observación corta con reevaluaciones seriadas.'),
 ('gastroenteritis-aguda','observacion', ARRAY['Grado de deshidratación','Plan de hidratación','Tolerancia oral','Reevaluación','Criterios de alta'], 'Hidratación y tolerancia oral en observación.'),
 ('estatus-asmatico','shock', ARRAY['ABCDE','Broncodilatación continua','Corticoide sistémico','Sulfato de magnesio','Soporte ventilatorio','Reevaluación'], 'Manejo escalonado del asma casi fatal.'),
 ('shock-septico','shock', ARRAY['ABCDE','Accesos vasculares','Bolos de cristaloides','Antibióticos en la primera hora','Vasoactivos','Reevaluación hemodinámica'], 'Reanimación guiada por metas.'),
 ('cetoacidosis-diabetica','hospitalizacion', ARRAY['Diagnóstico bioquímico','Hidratación','Insulinoterapia','Corrección electrolítica','Vigilancia neurológica','Transición a subcutánea'], 'Protocolo CAD con controles horarios.')
) AS v(slug, area, focus, note) ON v.slug = p.slug
ON CONFLICT (pathology_id, area) DO NOTHING;