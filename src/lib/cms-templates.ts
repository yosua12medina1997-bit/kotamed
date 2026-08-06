/**
 * Biblioteca de plantillas de sección (Fase 3): conjuntos de bloques listos
 * para armar landings en minutos desde CMS Studio.
 */
import { defaultBlock, type CmsBlockProps, type CmsBlockStyle, type CmsBlockType } from "@/lib/cms";

export type TemplateBlock = { type: CmsBlockType; props: CmsBlockProps; style: CmsBlockStyle };
export type SectionTemplate = { id: string; label: string; group: string; blocks: TemplateBlock[] };

function b(type: CmsBlockType, props: CmsBlockProps = {}, style: CmsBlockStyle = {}): TemplateBlock {
  const base = defaultBlock(type);
  return { type, props: { ...base.props, ...props }, style: { ...base.style, ...style } };
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: "hero-clasico",
    label: "Hero clásico (texto + CTA)",
    group: "Héroes",
    blocks: [
      b("hero", {
        eyebrow: "KotaMed",
        title: "Formamos hoy, cuidamos el mañana",
        subtitle: "Formación médica premium con inteligencia artificial, casos reales y simulación clínica.",
        primaryLabel: "Comenzar ahora",
        primaryHref: "/programas",
        secondaryLabel: "Conocer la metodología",
        secondaryHref: "#metodologia",
      }),
    ],
  },
  {
    id: "hero-programa",
    label: "Hero de programa + contadores",
    group: "Héroes",
    blocks: [
      b("hero", { eyebrow: "Programa", title: "Nombre del programa", subtitle: "Promesa académica en una línea." }),
      b("counters", { collection: "counters", title: "Resultados que respaldan el programa" }, { columns: 4, tone: "muted" }),
    ],
  },
  {
    id: "beneficios-3",
    label: "Beneficios en 3 columnas",
    group: "Contenido",
    blocks: [
      b("benefits", {
        title: "Por qué elegir KotaMed",
        subtitle: "Metodología clínica, evidencia y acompañamiento real.",
        items: [
          { title: "Evidencia actualizada", text: "AAP, Nelson y UpToDate en cada tema.", icon: "BookOpen" },
          { title: "Docentes en actividad", text: "Especialistas de hospitales nivel III.", icon: "Users" },
          { title: "IA clínica 24/7", text: "Razonamiento guiado, no memorización.", icon: "Sparkles" },
        ],
      }),
    ],
  },
  {
    id: "docentes-testimonios",
    label: "Docentes + testimonios (colecciones)",
    group: "Prueba social",
    blocks: [
      b("teachers", { collection: "teachers", title: "Nuestros docentes" }, { columns: 3 }),
      b("testimonials", { collection: "testimonials", title: "Lo que dicen nuestros médicos" }, { columns: 3, tone: "muted" }),
    ],
  },
  {
    id: "planes-faq",
    label: "Planes + preguntas frecuentes",
    group: "Conversión",
    blocks: [
      b("plans", { collection: "plans", title: "Planes de acceso" }, { columns: 3 }),
      b("faq", { collection: "faq", title: "Preguntas frecuentes" }, { align: "left", columns: 2 }),
    ],
  },
  {
    id: "cronograma",
    label: "Cronograma académico",
    group: "Contenido",
    blocks: [b("timeline", { collection: "timeline", title: "Ruta del programa" }, { align: "left" })],
  },
  {
    id: "comparativa",
    label: "Tabla comparativa",
    group: "Contenido",
    blocks: [
      b("table", {
        title: "Compara los planes",
        items: [
          { title: "Programas incluidos", text: "1 / Todos" },
          { title: "Simuladores", text: "No / Sí" },
          { title: "IA clínica", text: "Limitada / Ilimitada" },
        ],
      }),
    ],
  },
  {
    id: "video-cta",
    label: "Video institucional + CTA",
    group: "Conversión",
    blocks: [
      b("video", { title: "Conoce KotaMed en 90 segundos" }),
      b("cta", { title: "Da el siguiente paso en tu formación médica", primaryLabel: "Matricularme", primaryHref: "/auth" }, { tone: "gradient" }),
    ],
  },
  {
    id: "landing-completa",
    label: "Landing completa (recomendada)",
    group: "Páginas completas",
    blocks: [
      b("hero", { eyebrow: "Programa", title: "Nombre del programa", subtitle: "Promesa académica en una línea." }),
      b("counters", { collection: "counters" }, { columns: 4, tone: "muted" }),
      b("benefits", { title: "Lo que lograrás" }),
      b("timeline", { collection: "timeline", title: "Ruta del programa" }, { align: "left" }),
      b("teachers", { collection: "teachers", title: "Docentes" }),
      b("testimonials", { collection: "testimonials", title: "Testimonios" }, { tone: "muted" }),
      b("plans", { collection: "plans", title: "Planes" }),
      b("faq", { collection: "faq", title: "Preguntas frecuentes" }, { align: "left", columns: 2 }),
      b("cta", { title: "Inscríbete hoy", primaryLabel: "Comenzar", primaryHref: "/auth" }, { tone: "gradient" }),
    ],
  },
];
