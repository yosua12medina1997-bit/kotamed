/**
 * Módulos académicos del programa "Internado Médico".
 * Extrapolación de la arquitectura del Residentado (áreas ENAM):
 * cada rotación es un módulo independiente con landing, ruta académica,
 * contenido editable, casos, banco, flashcards, simuladores, biblioteca,
 * tutor IA, progreso y Command Center.
 *
 * Solo estructura — el contenido académico se edita desde el panel admin.
 */

import {
  Activity,
  Baby,
  HeartPulse,
  Scissors,
  Siren,
  ShieldPlus,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import type { BlueprintBlock, BlueprintCategory } from "@/lib/pediatria-neonatologia-blueprint";

export const INTERNADO_PROGRAM_SLUG = "internado";

/** Rotaciones del internado médico. */
export const INTERNADO_AREAS: EnamAreaMeta[] = [
  {
    slug: "medicina-interna",
    title: "Rotación de Medicina Interna",
    short: "MI",
    tagline: "Sala, visita médica y paciente adulto hospitalizado.",
    description:
      "Cómo desenvolverte en el servicio de Medicina Interna: historia clínica, evoluciones SOAP, indicaciones, interpretación de laboratorios e imágenes y presentación de pacientes.",
    icon: HeartPulse,
    accent: "oklch(0.68 0.15 25)",
    gradient: "from-rose-500/20 via-orange-500/10 to-transparent",
  },
  {
    slug: "cirugia-general",
    title: "Rotación de Cirugía General",
    short: "CG",
    tagline: "Preoperatorio, sala de operaciones y postoperatorio.",
    description:
      "Rotación quirúrgica del interno: asepsia, campo estéril, suturas, manejo de heridas, abdomen agudo y cuidados perioperatorios.",
    icon: Scissors,
    accent: "oklch(0.68 0.13 210)",
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
  },
  {
    slug: "ginecologia-obstetricia",
    title: "Rotación de Gineco-Obstetricia",
    short: "GO",
    tagline: "Control prenatal, sala de partos y puerperio.",
    description:
      "Atención de la gestante y de la mujer: partograma, atención del parto, emergencias obstétricas y patología ginecológica frecuente.",
    icon: Activity,
    accent: "oklch(0.70 0.15 350)",
    gradient: "from-pink-500/20 via-fuchsia-500/10 to-transparent",
  },
  {
    slug: "pediatria-neonatologia",
    title: "Rotación de Pediatría & Neonatología",
    short: "PN",
    tagline: "Del recién nacido al adolescente en el hospital.",
    description:
      "Rotación pediátrica del interno: historia clínica por grupos etarios, cálculo de dosis, fluidoterapia, atención inmediata del recién nacido y urgencias pediátricas.",
    icon: Baby,
    accent: "oklch(0.68 0.13 260)",
    gradient: "from-indigo-500/20 via-violet-500/10 to-transparent",
  },
  {
    slug: "emergencias",
    title: "Rotación de Emergencias",
    short: "EM",
    tagline: "Triaje, reanimación y decisiones en minutos.",
    description:
      "Servicio de emergencia: triaje, ABCDE, RCP, shock, politraumatizado, intoxicaciones y procedimientos de urgencia bajo supervisión.",
    icon: Siren,
    accent: "oklch(0.72 0.16 60)",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    slug: "salud-comunitaria",
    title: "Rotación de Salud Comunitaria",
    short: "SC",
    tagline: "Primer nivel de atención, prevención y ENAM.",
    description:
      "Atención primaria: estrategias sanitarias, AIEPI, vacunas, notificación epidemiológica, referencia y contrarreferencia y salud pública peruana.",
    icon: ShieldPlus,
    accent: "oklch(0.68 0.14 145)",
    gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
  },
];

export function getInternadoArea(slug: string): EnamAreaMeta | undefined {
  return INTERNADO_AREAS.find((a) => a.slug === slug);
}

/** Ruta académica por defecto del internado (editable por el admin). */
export const INTERNADO_ROUTE_STAGES = [
  "Inducción a la rotación",
  "Organización del servicio",
  "Historia clínica y examen físico",
  "Evoluciones y visita médica",
  "Procedimientos supervisados",
  "Guardias y urgencias",
  "Casos clínicos de la rotación",
  "Banco de preguntas ENAM",
  "Checklist de competencias",
  "Evaluación final de rotación",
];

/* ================================================================== */
/*  Blueprints por rotación                                            */
/* ================================================================== */

function cat(key: string, title: string, topics: string[]): BlueprintCategory {
  return { key, title, topics: topics.map((t) => ({ title: t })) };
}

/** Bloque común de práctica hospitalaria, con temas base del interno. */
function practiceBlock(extra: BlueprintCategory[]): BlueprintBlock {
  return {
    key: "practica",
    title: "Práctica hospitalaria",
    tagline:
      "Cómo trabajar dentro del servicio: documentación, procedimientos, guardias y comunicación clínica.",
    accent: "oklch(0.66 0.13 240)",
    icon: ClipboardList,
    categories: [
      cat("induccion", "Inducción a la rotación", [
        "Objetivos y competencias de la rotación",
        "Organización del servicio y roles del equipo",
        "Agenda del interno: visita, guardias y turnos",
        "Documentación obligatoria y aspectos médico-legales",
        "Bioseguridad y prevención de infecciones",
      ]),
      cat("documentacion", "Historia clínica y documentación", [
        "Anamnesis dirigida por motivo de consulta",
        "Examen físico completo y por sistemas",
        "Nota de ingreso",
        "Evolución diaria (SOAP)",
        "Indicaciones médicas e interconsultas",
        "Epicrisis y alta médica",
      ]),
      cat("razonamiento", "Razonamiento clínico", [
        "Construcción del problema clínico",
        "Diagnósticos diferenciales priorizados",
        "Solicitud racional de exámenes auxiliares",
        "Interpretación de laboratorio",
        "Interpretación de imágenes básicas",
        "Presentación del paciente en la visita médica",
      ]),
      ...extra,
      cat("competencias", "Evaluación y competencias", [
        "Checklist de competencias de la rotación",
        "Errores frecuentes del interno",
        "Rúbrica de evaluación final",
        "Portafolio de casos atendidos",
      ]),
    ],
  };
}

function examBlock(categories: BlueprintCategory[]): BlueprintBlock {
  return {
    key: "enam",
    title: "Alto rendimiento ENAM",
    tagline:
      "Temas de mayor peso en el ENAM asociados a la rotación, con perlas, algoritmos y banco de preguntas.",
    accent: "oklch(0.66 0.14 150)",
    icon: Stethoscope,
    categories,
  };
}

export const INTERNADO_BLUEPRINTS: Record<string, BlueprintBlock[]> = {
  "medicina-interna": [
    practiceBlock([
      cat("procedimientos", "Procedimientos y guardias", [
        "Vía periférica y toma de muestras",
        "Sonda nasogástrica y vesical",
        "Electrocardiograma: toma e interpretación inicial",
        "Oxigenoterapia y nebulizaciones",
        "Manejo inicial del paciente inestable en sala",
      ]),
    ]),
    examBlock([
      cat("cardio", "Cardiovascular", [
        "Hipertensión arterial y crisis hipertensiva",
        "Síndrome coronario agudo",
        "Insuficiencia cardiaca descompensada",
        "Fibrilación auricular",
      ]),
      cat("respiratorio", "Respiratorio", [
        "Neumonía adquirida en la comunidad",
        "EPOC exacerbado",
        "Asma del adulto",
        "Tuberculosis pulmonar",
        "Tromboembolismo pulmonar",
      ]),
      cat("metabolico", "Endocrino y metabólico", [
        "Diabetes mellitus 2 y control glucémico",
        "Cetoacidosis diabética y estado hiperosmolar",
        "Trastornos tiroideos",
        "Dislipidemias",
      ]),
      cat("nefro-gastro", "Nefrología y gastroenterología", [
        "Injuria renal aguda",
        "Enfermedad renal crónica",
        "Trastornos hidroelectrolíticos y ácido-base",
        "Hemorragia digestiva alta",
        "Cirrosis y sus complicaciones",
      ]),
      cat("infecto-neuro", "Infectología y neurología", [
        "Sepsis y shock septicémico",
        "Infección del tracto urinario",
        "Enfermedad cerebrovascular",
        "Meningitis del adulto",
        "Dengue y arbovirosis",
      ]),
    ]),
  ],
  "cirugia-general": [
    practiceBlock([
      cat("quirurgico", "Práctica quirúrgica", [
        "Lavado de manos, vestido y campo estéril",
        "Instrumental básico y su uso",
        "Nudos y técnicas de sutura",
        "Manejo de heridas y curaciones",
        "Drenajes y sondas",
        "Rol del interno en sala de operaciones",
      ]),
      cat("perioperatorio", "Perioperatorio", [
        "Evaluación y riesgo preoperatorio",
        "Consentimiento informado",
        "Profilaxis antibiótica y antitrombótica",
        "Control postoperatorio y complicaciones",
        "Manejo del dolor postoperatorio",
      ]),
    ]),
    examBlock([
      cat("abdomen", "Abdomen agudo", [
        "Apendicitis aguda",
        "Colecistitis y colelitiasis",
        "Obstrucción intestinal",
        "Perforación de víscera hueca",
        "Pancreatitis aguda",
      ]),
      cat("pared-vascular", "Pared abdominal y vascular", [
        "Hernias de pared abdominal",
        "Enfermedad hemorroidal y patología anorrectal",
        "Insuficiencia venosa y trombosis",
        "Pie diabético",
      ]),
      cat("trauma", "Trauma y quemaduras", [
        "Evaluación inicial del politraumatizado",
        "Trauma abdominal cerrado y penetrante",
        "Trauma torácico",
        "Quemaduras: extensión, profundidad y reposición",
      ]),
      cat("oncologia-qx", "Oncología quirúrgica", [
        "Cáncer gástrico",
        "Cáncer de colon y recto",
        "Patología mamaria y cáncer de mama",
        "Nódulo tiroideo",
      ]),
    ]),
  ],
  "ginecologia-obstetricia": [
    practiceBlock([
      cat("obstetricia-practica", "Práctica obstétrica", [
        "Control prenatal y carné perinatal",
        "Maniobras de Leopold y altura uterina",
        "Monitoreo fetal y partograma",
        "Atención del parto eutócico",
        "Atención del puerperio inmediato",
        "Rol del interno en sala de partos",
      ]),
    ]),
    examBlock([
      cat("obstetricia", "Obstetricia", [
        "Trastornos hipertensivos del embarazo y preeclampsia",
        "Hemorragia de la primera mitad del embarazo",
        "Hemorragia de la segunda mitad del embarazo",
        "Hemorragia postparto",
        "Parto pretérmino y RPM",
        "Diabetes gestacional",
        "Infecciones en el embarazo",
      ]),
      cat("ginecologia", "Ginecología", [
        "Sangrado uterino anormal",
        "Enfermedad inflamatoria pélvica",
        "Miomatosis uterina",
        "Cáncer de cuello uterino y tamizaje",
        "Anticoncepción y planificación familiar",
        "Climaterio y menopausia",
      ]),
      cat("emergencias-go", "Emergencias gineco-obstétricas", [
        "Embarazo ectópico",
        "Eclampsia",
        "Sufrimiento fetal agudo",
        "Sepsis obstétrica",
      ]),
    ]),
  ],
  "pediatria-neonatologia": [
    practiceBlock([
      cat("pediatria-practica", "Práctica pediátrica", [
        "Historia clínica pediátrica por grupos etarios",
        "Examen físico del lactante, preescolar y adolescente",
        "Cálculo de dosis por peso y superficie corporal",
        "Fluidoterapia y requerimientos basales",
        "Atención inmediata del recién nacido",
        "Comunicación con padres y cuidadores",
      ]),
    ]),
    examBlock([
      cat("neonatologia", "Neonatología", [
        "Reanimación neonatal",
        "Ictericia neonatal",
        "Sepsis neonatal",
        "Distrés respiratorio del recién nacido",
        "Prematuridad y bajo peso al nacer",
      ]),
      cat("crecimiento", "Crecimiento, desarrollo y nutrición", [
        "Evaluación del crecimiento y curvas OMS",
        "Desarrollo psicomotor",
        "Lactancia materna y alimentación complementaria",
        "Desnutrición y anemia infantil",
        "Esquema nacional de vacunación",
      ]),
      cat("infecto-ped", "Infectología pediátrica", [
        "Infección respiratoria aguda y neumonía",
        "Síndrome obstructivo bronquial y asma",
        "Enfermedad diarreica aguda y deshidratación",
        "Infección urinaria en niños",
        "Síndrome febril sin foco",
      ]),
      cat("urgencias-ped", "Urgencias pediátricas", [
        "Convulsión febril y estatus convulsivo",
        "Crisis asmática severa",
        "Shock en pediatría",
        "Intoxicaciones frecuentes",
        "Maltrato infantil: sospecha y ruta",
      ]),
    ]),
  ],
  emergencias: [
    practiceBlock([
      cat("emergencia-practica", "Práctica en emergencia", [
        "Triaje y priorización",
        "Evaluación primaria ABCDE",
        "Manejo de la vía aérea básica",
        "RCP básica y avanzada",
        "Accesos vasculares y de urgencia",
        "Registro y notas de emergencia",
      ]),
    ]),
    examBlock([
      cat("critico", "Paciente crítico", [
        "Paro cardiorrespiratorio",
        "Shock: clasificación y manejo inicial",
        "Insuficiencia respiratoria aguda",
        "Arritmias con inestabilidad",
        "Alteración del estado de conciencia",
      ]),
      cat("trauma-em", "Trauma", [
        "Politraumatizado: atención inicial",
        "Trauma craneoencefálico",
        "Trauma de tórax y abdomen",
        "Inmovilización y traslado",
      ]),
      cat("toxico-ambiental", "Toxicológico y ambiental", [
        "Intoxicación por organofosforados",
        "Intoxicación por monóxido de carbono",
        "Mordedura de ofidios y arácnidos",
        "Hipotermia e hipertermia",
      ]),
      cat("procedimientos-em", "Procedimientos de urgencia", [
        "Sutura de heridas en emergencia",
        "Inmovilización de fracturas",
        "Toracocentesis y paracentesis: indicaciones",
        "Interpretación rápida de ECG y gasometría",
      ]),
    ]),
  ],
  "salud-comunitaria": [
    practiceBlock([
      cat("primer-nivel", "Primer nivel de atención", [
        "Organización del establecimiento de salud",
        "Consulta ambulatoria y HIS",
        "Visita domiciliaria y trabajo con la comunidad",
        "Referencia y contrarreferencia",
        "Sistema de notificación epidemiológica",
      ]),
    ]),
    examBlock([
      cat("estrategias", "Estrategias sanitarias", [
        "Atención integral del niño (AIEPI)",
        "Salud materno-perinatal",
        "Inmunizaciones",
        "Tuberculosis: estrategia y tratamiento",
        "VIH/ITS y prevención",
        "Salud mental comunitaria",
      ]),
      cat("epidemiologia", "Epidemiología y bioestadística", [
        "Medidas de frecuencia y asociación",
        "Tipos de estudio epidemiológico",
        "Pruebas diagnósticas: sensibilidad y especificidad",
        "Brotes y vigilancia epidemiológica",
        "Lectura crítica de artículos",
      ]),
      cat("gestion", "Gestión y salud pública", [
        "Sistema de salud peruano y aseguramiento",
        "Determinantes sociales de la salud",
        "Promoción de la salud y prevención",
        "Calidad y seguridad del paciente",
        "Ética y aspectos médico-legales",
      ]),
    ]),
  ],
};

export function getInternadoBlueprint(slug: string): BlueprintBlock[] {
  return INTERNADO_BLUEPRINTS[slug] ?? [];
}
