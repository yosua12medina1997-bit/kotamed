/**
 * Módulos académicos genéricos para TODOS los programas de KotaMed.
 *
 * Extrapola la arquitectura de "Residentado · Pediatría & Neonatología" a
 * cualquier programa: cada área del programa (nodo `area` en `content_nodes`)
 * se convierte automáticamente en un módulo completo con Campus, Ruta
 * Académica, Contenido editable, Casos, Banco, Flashcards, Simuladores,
 * Biblioteca, Tutor IA, Progreso y Command Center.
 *
 * Solo estructura: el contenido académico se edita desde el panel admin.
 */
import {
  Activity,
  Baby,
  Bone,
  Brain,
  Building2,
  ClipboardList,
  Dna,
  FlaskConical,
  HeartPulse,
  Layers,
  ListChecks,
  Microscope,
  Pill,
  Scissors,
  ShieldPlus,
  Siren,
  Stethoscope,
  Syringe,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import type { BlueprintBlock, BlueprintCategory } from "@/lib/pediatria-neonatologia-blueprint";

/* ================================================================== */
/*  Paleta rotativa (para módulos creados dinámicamente por el admin)  */
/* ================================================================== */

const PALETTE: { accent: string; gradient: string }[] = [
  { accent: "oklch(0.62 0.11 185)", gradient: "from-teal-500/20 via-cyan-500/10 to-transparent" },
  { accent: "oklch(0.65 0.15 25)", gradient: "from-rose-500/20 via-orange-500/10 to-transparent" },
  { accent: "oklch(0.66 0.16 340)", gradient: "from-pink-500/20 via-fuchsia-500/10 to-transparent" },
  { accent: "oklch(0.68 0.13 260)", gradient: "from-indigo-500/20 via-violet-500/10 to-transparent" },
  { accent: "oklch(0.68 0.14 145)", gradient: "from-emerald-500/20 via-green-500/10 to-transparent" },
  { accent: "oklch(0.72 0.16 60)", gradient: "from-amber-500/20 via-orange-500/10 to-transparent" },
  { accent: "oklch(0.66 0.13 240)", gradient: "from-sky-500/20 via-blue-500/10 to-transparent" },
];

const ICON_HINTS: { test: RegExp; icon: LucideIcon }[] = [
  { test: /anatom|osteo|muscul/i, icon: Bone },
  { test: /histol|embriol|citol|celul/i, icon: Microscope },
  { test: /fisiolog/i, icon: Activity },
  { test: /bioqu[íi]m|biolog[íi]a molecular|gen[ée]tic/i, icon: Dna },
  { test: /microbiolog|parasitolog|infect/i, icon: FlaskConical },
  { test: /farmacolog|terap[ée]utic|f[áa]rmac/i, icon: Pill },
  { test: /patolog|anatom[íi]a patol/i, icon: Layers },
  { test: /neuro|psiqui|salud mental/i, icon: Brain },
  { test: /cirug|quir[úu]rg/i, icon: Scissors },
  { test: /gineco|obstet|mujer/i, icon: HeartPulse },
  { test: /pediatr|neonat|ni[ñn]/i, icon: Baby },
  { test: /salud p[úu]blic|epidemiolog|comunitari|primer nivel/i, icon: ShieldPlus },
  { test: /emergenc|urgenc|reanimac|trauma/i, icon: Siren },
  { test: /medicina interna|cl[íi]nic|semiolog/i, icon: Stethoscope },
  { test: /simulacro|examen|banco|evaluac/i, icon: ListChecks },
  { test: /gesti[óo]n|administrac|essalud|hospital/i, icon: Building2 },
  { test: /procedimient|t[ée]cnic|habilidad/i, icon: Syringe },
  { test: /docen|equipo|human/i, icon: Users },
];

function iconFor(title: string, index: number): LucideIcon {
  const hit = ICON_HINTS.find((h) => h.test.test(title));
  if (hit) return hit.icon;
  return [Stethoscope, Layers, ClipboardList, Activity][index % 4];
}

export function slugifyModule(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

/** Construye la metadata visual de un módulo a partir de su título/slug. */
export function buildModuleMeta(
  input: { slug: string; title: string; description?: string | null; short?: string },
  index = 0,
): EnamAreaMeta {
  const palette = PALETTE[index % PALETTE.length];
  const auto =
    input.title
      .replace(/^(rotaci[óo]n|m[óo]dulo|curso)\s+(de\s+)?/i, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "KM";
  const short = input.short ?? auto;
  const description =
    input.description?.trim() ||
    `Módulo académico de ${input.title} con ruta académica, contenido editable, casos clínicos, banco de preguntas, flashcards, simuladores, biblioteca y tutor IA.`;
  return {
    slug: input.slug,
    title: input.title,
    short,
    tagline: description.length > 110 ? `${description.slice(0, 107)}…` : description,
    description,
    icon: iconFor(`${input.title} ${input.slug}`, index),
    accent: palette.accent,
    gradient: palette.gradient,
  };
}

/* ================================================================== */
/*  Módulos por defecto de cada programa oficial                       */
/* ================================================================== */

type ModuleSeed = { title: string; description?: string };

const PROGRAM_MODULE_SEEDS: Record<string, ModuleSeed[]> = {
  "ciencias-basicas": [
    { title: "Anatomía Humana", description: "Anatomía descriptiva, topográfica y funcional aplicada a la clínica." },
    { title: "Histología & Embriología", description: "Tejidos, órganos y desarrollo humano con correlación clínica." },
    { title: "Fisiología", description: "Funcionamiento integrado de los sistemas del cuerpo humano." },
    { title: "Bioquímica & Biología Molecular", description: "Metabolismo, enzimología y genética molecular médica." },
    { title: "Microbiología & Parasitología", description: "Agentes infecciosos, diagnóstico microbiológico e inmunidad." },
    { title: "Farmacología", description: "Farmacocinética, farmacodinamia y terapéutica racional." },
    { title: "Anatomía Patológica", description: "Patología general y por sistemas con bases morfológicas." },
    { title: "Semiología Básica", description: "Anamnesis, examen físico y razonamiento clínico inicial." },
  ],
  ecb: [
    { title: "Repaso Integrado de Ciencias Básicas", description: "Síntesis de alto rendimiento de las siete básicas." },
    { title: "Integración Clínico-Básica", description: "Casos que conectan mecanismo, patología y clínica." },
    { title: "Semiología y Propedéutica", description: "Habilidades clínicas evaluadas en el cambio de bloque." },
    { title: "Simulacros ECB", description: "Simulacros cronometrados con métricas por área." },
  ],
  "ciencias-clinicas": [
    { title: "Medicina Interna", description: "Patología médica del adulto con enfoque por sistemas." },
    { title: "Cirugía General", description: "Abdomen agudo, trauma y manejo perioperatorio." },
    { title: "Gineco-Obstetricia", description: "Salud de la mujer, embarazo, parto y puerperio." },
    { title: "Pediatría & Neonatología", description: "Del recién nacido al adolescente, crecimiento y patología." },
    { title: "Salud Pública", description: "Epidemiología, bioestadística y sistema de salud peruano." },
    { title: "Especialidades Médicas", description: "Dermatología, oftalmología, ORL, neurología y psiquiatría." },
  ],
  essalud: [
    { title: "Medicina Interna EsSalud", description: "Temas de mayor peso del examen EsSalud en medicina." },
    { title: "Ciencias Quirúrgicas EsSalud", description: "Cirugía, trauma y urgencias quirúrgicas del examen." },
    { title: "Gineco-Obstetricia EsSalud", description: "Emergencias obstétricas y patología ginecológica." },
    { title: "Pediatría & Neonatología EsSalud", description: "Pediatría de alto rendimiento para el examen." },
    { title: "Salud Pública y Gestión", description: "Normativa, gestión sanitaria y salud pública peruana." },
    { title: "Simulacros EsSalud", description: "Simulacros con estructura y tiempos oficiales." },
  ],
  enam: [
    { title: "Medicina Interna", description: "Razonamiento clínico integral del adulto para el ENAM." },
    { title: "Ciencias Quirúrgicas", description: "Cirugía, trauma y manejo perioperatorio para el ENAM." },
    { title: "Gineco-Obstetricia", description: "Salud de la mujer y periodo perinatal para el ENAM." },
    { title: "Pediatría & Neonatología", description: "Paciente pediátrico y neonatal de alto rendimiento." },
    { title: "Salud Pública", description: "Epidemiología, prevención y organización sanitaria." },
    { title: "Simulacros ENAM", description: "Simulacros completos con analítica de desempeño." },
  ],
  serums: [
    { title: "Atención Primaria de Salud", description: "Consulta ambulatoria, AIEPI y paquetes de atención integral." },
    { title: "Emergencias en el Primer Nivel", description: "Estabilización, referencia y contrarreferencia." },
    { title: "Salud Materno-Infantil", description: "Control prenatal, parto de bajo riesgo y CRED." },
    { title: "Estrategias Sanitarias Nacionales", description: "Inmunizaciones, TBC, VIH, metaxénicas y notificación." },
    { title: "Gestión del Establecimiento", description: "Registro HIS, indicadores, normativa y trabajo comunitario." },
  ],
  r1: [
    { title: "Neonatología", description: "Atención del recién nacido sano y patológico." },
    { title: "Pediatría General y Hospitalización", description: "Sala de pediatría, manejo integral del niño hospitalizado." },
    { title: "Emergencias Pediátricas", description: "Estabilización, reanimación y urgencias frecuentes." },
    { title: "Crecimiento y Desarrollo", description: "Vigilancia del desarrollo, nutrición e inmunizaciones." },
    { title: "Procedimientos y Habilidades", description: "Procedimientos pediátricos supervisados y seguridad del paciente." },
  ],
  r2: [
    { title: "UCI Pediátrica", description: "Paciente crítico pediátrico: soporte hemodinámico y ventilatorio." },
    { title: "UCI Neonatal", description: "Prematuro extremo, ventilación y nutrición neonatal." },
    { title: "Subespecialidades Médicas", description: "Cardiología, neumología, nefrología y gastroenterología pediátrica." },
    { title: "Infectología Pediátrica", description: "Antibioticoterapia racional e infecciones complejas." },
    { title: "Investigación Clínica", description: "Metodología, lectura crítica y proyecto de tesis." },
  ],
  r3: [
    { title: "Pediatría Avanzada Integrada", description: "Casos complejos y toma de decisiones de alta responsabilidad." },
    { title: "Neurodesarrollo y Adolescencia", description: "Neurología, salud mental y medicina del adolescente." },
    { title: "Oncohematología Pediátrica", description: "Diagnóstico precoz, protocolos y cuidados de soporte." },
    { title: "Gestión y Liderazgo Clínico", description: "Calidad, seguridad, docencia y gestión del servicio." },
    { title: "Tesis y Publicación", description: "Cierre de investigación, redacción y difusión científica." },
  ],
};

/** Módulos por defecto para un programa nuevo creado por el admin. */
export const GENERIC_MODULE_SEEDS: ModuleSeed[] = [
  { title: "Fundamentos del Programa", description: "Objetivos, competencias y ruta de estudio del programa." },
  { title: "Contenido Académico Principal", description: "Temario nuclear del programa, editable desde el panel admin." },
  { title: "Casos y Práctica Clínica", description: "Casos clínicos, simulaciones y práctica aplicada." },
  { title: "Evaluación y Simulacros", description: "Banco de preguntas, flashcards y simulacros del programa." },
];

/** Semillas de módulos para un programa (oficiales o genéricas). */
export function moduleSeedsForProgram(programSlug: string): ModuleSeed[] {
  return PROGRAM_MODULE_SEEDS[programSlug] ?? GENERIC_MODULE_SEEDS;
}

/** Filas listas para insertar como nodos `area` hijos del programa. */
export function moduleRowsForProgram(programSlug: string, parentId: string) {
  return moduleSeedsForProgram(programSlug).map((m, i) => ({
    parent_id: parentId,
    kind: "area",
    title: m.title,
    slug: slugifyModule(m.title) || `modulo-${i + 1}`,
    description: m.description ?? null,
    sort_order: (i + 1) * 10,
    is_published: true,
  }));
}

/** Metadata de los módulos por defecto de un programa (fallback sin BD). */
export function defaultProgramModules(programSlug: string): EnamAreaMeta[] {
  return moduleSeedsForProgram(programSlug).map((m, i) =>
    buildModuleMeta({ slug: slugifyModule(m.title) || `modulo-${i + 1}`, title: m.title, description: m.description }, i),
  );
}

/* ================================================================== */
/*  Blueprint genérico de contenido                                    */
/* ================================================================== */

function cat(key: string, title: string, topics: string[]): BlueprintCategory {
  return { key, title, topics: topics.map((t) => ({ title: t })) };
}

/**
 * Estructura base de contenido para cualquier módulo. El admin agrega,
 * edita o elimina temas desde la propia vista de Contenido.
 */
export function genericBlueprint(moduleTitle: string): BlueprintBlock[] {
  return [
    {
      key: "programa",
      title: "Programa académico",
      tagline: `Temario base de ${moduleTitle}. Agrega, edita o elimina temas según tu plan de estudios.`,
      accent: "oklch(0.66 0.13 240)",
      icon: ClipboardList,
      categories: [
        cat("introduccion", "Introducción y competencias", [
          "Presentación del módulo y objetivos",
          "Competencias esperadas",
          "Bibliografía y fuentes recomendadas",
          "Metodología de estudio sugerida",
        ]),
        cat("fundamentos", "Fundamentos", [
          "Conceptos esenciales",
          "Bases fisiopatológicas o teóricas",
          "Terminología clave",
        ]),
        cat("desarrollo", "Desarrollo temático", [
          "Tema 1 (editable)",
          "Tema 2 (editable)",
          "Tema 3 (editable)",
          "Tema 4 (editable)",
        ]),
        cat("aplicacion", "Aplicación clínica", [
          "Casos clínicos integradores",
          "Algoritmos y flujogramas",
          "Perlas y errores frecuentes",
        ]),
        cat("evaluacion", "Evaluación", [
          "Banco de preguntas del módulo",
          "Flashcards de repaso espaciado",
          "Checklist de competencias",
          "Evaluación final del módulo",
        ]),
      ],
    },
    {
      key: "alto-rendimiento",
      title: "Alto rendimiento",
      tagline: "Temas de mayor peso en exámenes, con perlas, tablas y simulacros dirigidos.",
      accent: "oklch(0.66 0.14 150)",
      icon: Stethoscope,
      categories: [
        cat("prioritarios", "Temas prioritarios", [
          "Tema de alto rendimiento 1",
          "Tema de alto rendimiento 2",
          "Tema de alto rendimiento 3",
        ]),
        cat("simulacros", "Simulacros y métricas", [
          "Simulacro corto del módulo",
          "Simulacro completo",
          "Análisis de resultados y plan de mejora",
        ]),
      ],
    },
  ];
}
