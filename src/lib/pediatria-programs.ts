/**
 * Estructura académica del módulo de Pediatría.
 * Cinco programas independientes que acompañan al médico
 * desde la preparación para residentado hasta R3.
 *
 * Solo estructura — sin contenido académico desarrollado.
 */

export type ProgramId = "residentado" | "internado" | "r1" | "r2" | "r3";

export interface ChapterTemplateSection {
  title: string;
}

export interface Program {
  id: ProgramId;
  slug: string;
  order: number;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  audience: string;
  objectives?: string[];
  areas: string[];
  chapterFeatures?: string[];
  accent: "teal" | "indigo" | "violet" | "rose" | "amber";
}

export const CHAPTER_TEMPLATE: ChapterTemplateSection[] = [
  { title: "Hero del tema" },
  { title: "Objetivos de aprendizaje" },
  { title: "Competencias" },
  { title: "Tiempo estimado" },
  { title: "Nivel de dificultad" },
  { title: "Introducción" },
  { title: "Desarrollo teórico" },
  { title: "Anatomía y fisiología" },
  { title: "Fisiopatología" },
  { title: "Epidemiología" },
  { title: "Manifestaciones clínicas" },
  { title: "Diagnóstico" },
  { title: "Diagnóstico diferencial" },
  { title: "Laboratorios" },
  { title: "Imágenes" },
  { title: "Tratamiento" },
  { title: "Seguimiento" },
  { title: "Algoritmos clínicos" },
  { title: "Tablas comparativas" },
  { title: "Perlas clínicas" },
  { title: "Errores frecuentes" },
  { title: "Mnemotecnias" },
  { title: "Casos clínicos interactivos" },
  { title: "Banco de preguntas" },
  { title: "Flashcards" },
  { title: "Mapas mentales" },
  { title: "Medicina basada en evidencia" },
  { title: "Bibliografía" },
  { title: "Evaluación" },
  { title: "Checklist de competencias" },
  { title: "Seguimiento del progreso" },
];

export const PROGRAMS: Program[] = [
  {
    id: "residentado",
    slug: "residentado",
    order: 1,
    title: "Preparación para Residentado Médico",
    subtitle: "Programa 1",
    tagline: "Domina Pediatría para ENAM, ESSALUD y Residentado Médico.",
    description:
      "Programa orientado exclusivamente a la preparación para los principales exámenes de ingreso a la residencia. Desarrolla conocimientos de alto rendimiento académico y entrena al estudiante para resolver preguntas, interpretar casos clínicos y aplicar algoritmos con enfoque de examen.",
    audience: "Estudiantes preparándose para ENAM, ESSALUD y Residentado Médico",
    accent: "teal",
    chapterFeatures: [
      "Clase Premium",
      "Manual Premium",
      "Resumen Ejecutivo",
      "Mapas mentales",
      "Flashcards",
      "Algoritmos diagnósticos",
      "Algoritmos terapéuticos",
      "Casos clínicos",
      "Banco de preguntas",
      "Simulacros",
      "Perlas del examen",
      "Errores frecuentes",
      "Mnemotecnias",
      "Medicina basada en evidencia",
      "Bibliografía",
      "Tiempo estimado",
      "Nivel de dificultad",
      "Progreso individual",
    ],
    areas: [
      "Neonatología",
      "Crecimiento y Desarrollo",
      "Nutrición",
      "Vacunas",
      "Infectología",
      "Neumología",
      "Cardiología",
      "Gastroenterología",
      "Nefrología",
      "Endocrinología",
      "Neurología",
      "Hematología",
      "Oncología",
      "Reumatología",
      "Genética",
      "Urgencias Pediátricas",
      "Adolescencia",
      "Pediatría Social",
    ],
  },
  {
    id: "internado",
    slug: "internado",
    order: 2,
    title: "Internado Médico — Rotación de Pediatría",
    subtitle: "Programa 2",
    tagline:
      "Aprende a desenvolverte como Interno de Medicina durante tu rotación hospitalaria en Pediatría.",
    description:
      "Programa dirigido a estudiantes de Medicina en Internado Médico. Enseña cómo trabajar dentro del servicio de Pediatría, desarrollar habilidades clínicas, mejorar la seguridad durante la atención de pacientes y fortalecer simultáneamente la preparación para el ENAM.",
    audience: "Internos de Medicina en rotación de Pediatría",
    accent: "indigo",
    objectives: [
      "Adaptarse al servicio de Pediatría",
      "Elaborar historias clínicas pediátricas",
      "Realizar examen físico por grupos etarios",
      "Elaborar evoluciones",
      "Presentar pacientes durante la visita médica",
      "Elaborar diagnósticos diferenciales",
      "Solicitar e interpretar estudios complementarios",
      "Reconocer urgencias pediátricas",
      "Realizar procedimientos básicos bajo supervisión",
      "Comunicarse correctamente con padres y familiares",
      "Trabajar con residentes, asistentes y enfermería",
    ],
    areas: [
      "Introducción a la Rotación",
      "Organización del Servicio",
      "Historia Clínica Pediátrica",
      "Examen Físico Pediátrico",
      "Evoluciones Médicas",
      "SOAP",
      "Ingresos",
      "Altas",
      "Interconsultas",
      "Guardias",
      "Urgencias Pediátricas",
      "Procedimientos Básicos",
      "Interpretación de Laboratorios",
      "Interpretación de Imágenes",
      "Comunicación con Padres",
      "Casos Clínicos del Internado",
      "Checklist de Competencias",
      "Evaluación Final de Rotación",
    ],
  },
  {
    id: "r1",
    slug: "r1",
    order: 3,
    title: "Residencia de Pediatría — R1",
    subtitle: "Programa 3",
    tagline: "Construye las bases para convertirte en un pediatra seguro y competente.",
    description:
      "Programa enfocado en la adaptación al primer año de residencia. Prioriza el desarrollo del razonamiento clínico, la organización hospitalaria y el manejo inicial de los pacientes pediátricos.",
    audience: "Residentes de primer año de Pediatría",
    accent: "violet",
    areas: [
      "Adaptación al Hospital",
      "Historia Clínica Avanzada",
      "Examen Físico Avanzado",
      "Evoluciones",
      "Guardias",
      "Ingresos",
      "Altas",
      "Prescripciones",
      "Cálculo de Medicamentos",
      "Fluidoterapia",
      "Electrolitos",
      "Antibioticoterapia",
      "Interpretación Básica de Laboratorio",
      "Interpretación Básica de Imágenes",
      "Urgencias Pediátricas",
      "Procedimientos Básicos",
      "Comunicación con Padres",
      "Comunicación con Enfermería",
      "Casos Clínicos Reales",
      "Errores Frecuentes del R1",
      "Checklist de Competencias",
    ],
  },
  {
    id: "r2",
    slug: "r2",
    order: 4,
    title: "Residencia de Pediatría — R2",
    subtitle: "Programa 4",
    tagline:
      "Desarrolla pensamiento clínico avanzado y aprende el manejo del paciente pediátrico complejo.",
    description:
      "Programa dirigido al segundo año de residencia. Fortalece la autonomía clínica, el manejo interdisciplinario y la atención de pacientes críticos.",
    audience: "Residentes de segundo año de Pediatría",
    accent: "rose",
    areas: [
      "Paciente Pediátrico Complejo",
      "Neonatología Avanzada",
      "Unidad de Cuidados Intensivos Pediátricos",
      "Ventilación Mecánica",
      "Nutrición Especializada",
      "Infectología Avanzada",
      "Ecografía Clínica",
      "Farmacología Avanzada",
      "Interpretación Avanzada",
      "Investigación Clínica",
      "Docencia",
      "Supervisión de Internos",
      "Casos Complejos",
      "Medicina Basada en Evidencia",
    ],
  },
  {
    id: "r3",
    slug: "r3",
    order: 5,
    title: "Residencia de Pediatría — R3",
    subtitle: "Programa 5",
    tagline: "Consolida tu formación como especialista y prepárate para ejercer con liderazgo.",
    description:
      "Programa orientado al desarrollo profesional previo al egreso. El residente aprende competencias clínicas, académicas y de liderazgo.",
    audience: "Residentes de tercer año de Pediatría",
    accent: "amber",
    areas: [
      "Liderazgo Clínico",
      "Docencia",
      "Investigación Científica",
      "Presentaciones Académicas",
      "Congresos",
      "Casos Clínicos Complejos",
      "Enfermedades Poco Frecuentes",
      "Medicina Basada en Evidencia",
      "Gestión Hospitalaria",
      "Calidad y Seguridad del Paciente",
      "Preparación para la Vida Laboral",
      "Subespecialidades Pediátricas",
      "Formación de Residentes",
      "Desarrollo Profesional",
    ],
  },
];

export function getProgram(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

export const ACCENT_CLASSES: Record<
  Program["accent"],
  { chip: string; ring: string; dot: string; soft: string }
> = {
  teal: {
    chip: "bg-teal-100 text-teal-700 border-teal-200/60",
    ring: "ring-teal-200/60",
    dot: "bg-teal-500",
    soft: "bg-teal-50",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-700 border-indigo-200/60",
    ring: "ring-indigo-200/60",
    dot: "bg-indigo-500",
    soft: "bg-indigo-50",
  },
  violet: {
    chip: "bg-violet-100 text-violet-700 border-violet-200/60",
    ring: "ring-violet-200/60",
    dot: "bg-violet-500",
    soft: "bg-violet-50",
  },
  rose: {
    chip: "bg-rose-100 text-rose-700 border-rose-200/60",
    ring: "ring-rose-200/60",
    dot: "bg-rose-500",
    soft: "bg-rose-50",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700 border-amber-200/60",
    ring: "ring-amber-200/60",
    dot: "bg-amber-500",
    soft: "bg-amber-50",
  },
};
