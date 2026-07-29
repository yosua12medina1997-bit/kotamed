/**
 * Plantilla universal para "temas" clínicos. Persistida en
 * `content_nodes.metadata.topic`. La misma estructura sirve para cualquier
 * especialidad — solo cambia el contenido, no la presentación.
 */

export type SlideKind =
  | "title"
  | "objectives"
  | "intro"
  | "concepts"
  | "image"
  | "diagram"
  | "table"
  | "comparison"
  | "flowchart"
  | "cards"
  | "timeline"
  | "steps"
  | "drugs"
  | "epidemiology"
  | "summary"
  | "case"
  | "pearls"
  | "takehome"
  | "mistakes"
  | "tips"
  | "references";

export const SLIDE_KIND_LABEL: Record<SlideKind, string> = {
  title: "Portada",
  objectives: "Objetivos",
  intro: "Introducción",
  concepts: "Conceptos clave",
  image: "Imagen",
  diagram: "Diagrama",
  table: "Tabla",
  comparison: "Comparación",
  flowchart: "Algoritmo",
  cards: "Tarjetas",
  timeline: "Cronología",
  steps: "Pasos",
  drugs: "Medicamentos",
  epidemiology: "Epidemiología",
  summary: "Resumen",
  case: "Caso clínico",
  pearls: "Perlas",
  takehome: "Take-home",
  mistakes: "Errores frecuentes",
  tips: "Tips",
  references: "Referencias",
};

export type Slide = {
  id: string;
  kind: SlideKind;
  title: string;
  /** Markdown corto (intro / summary / takehome / tips / concepts). */
  body?: string;
  /** Lista genérica (objetivos, perlas, errores, tips, conceptos). */
  bullets?: string[];
  /** Tarjetas (clasificaciones, sub-tópicos). */
  cards?: { title: string; body: string }[];
  /** Tabla (comparativas, drogas, etc.). */
  table?: { headers: string[]; rows: string[][] };
  /** Pasos numerados. */
  steps?: { title: string; body?: string }[];
  /** Timeline / cronología. */
  timeline?: { time: string; label: string; body?: string }[];
  /** Algoritmo simple: nodos + aristas. */
  flowchart?: {
    nodes: { id: string; label: string }[];
    edges: { from: string; to: string; label?: string }[];
  };
  /** Caso clínico interactivo. */
  clinicalCase?: {
    presentation: string;
    questions: { q: string; a: string }[];
  };
  /** Referencias bibliográficas. */
  references?: { label: string; source?: string }[];
  imageUrl?: string;
  notes?: string;
};

export type Topic = {
  version: 1;
  title: string;
  subtitle?: string;
  slides: Slide[];
  meta?: {
    level?: string;
    tags?: string[];
    sources?: string[];
    updatedAt?: string;
    generatedBy?: string;
  };
};

export function createEmptyTopic(title: string): Topic {
  return {
    version: 1,
    title,
    slides: [
      {
        id: randomId(),
        kind: "title",
        title,
        body: "Subtítulo o resumen breve del tema.",
      },
    ],
  };
}

export function randomId() {
  return "s_" + Math.random().toString(36).slice(2, 10);
}

/**
 * Heurística: dado texto libre sugiere qué componente usar.
 * Solo palabras — el editor sigue permitiendo cambiar el tipo.
 */
export function inferSlideKind(raw: string): SlideKind {
  const s = raw.toLowerCase();
  if (/(algoritmo|flujograma|diagrama de flujo|árbol de decisión)/.test(s)) return "flowchart";
  if (/(comparaci[oó]n|vs\.?|frente a|diferencias entre)/.test(s)) return "comparison";
  if (/(tabla|columna|celda)/.test(s)) return "table";
  if (/(cronolog[ií]a|l[ií]nea de tiempo|timeline|historia natural)/.test(s)) return "timeline";
  if (/(pasos|procedimiento|técnica|maniobra|secuencia)/.test(s)) return "steps";
  if (/(clasificaci[oó]n|tipos|categor[ií]as|subgrupos)/.test(s)) return "cards";
  if (/(fisiopatolog[ií]a|mecanismo|diagrama)/.test(s)) return "diagram";
  if (/(epidemiolog[ií]a|prevalencia|incidencia|estad[ií]stica)/.test(s)) return "epidemiology";
  if (/(caso cl[ií]nico|paciente de|acude por)/.test(s)) return "case";
  if (/(medicamento|f[aá]rmaco|dosis|antibi[oó]tico|tratamiento farmacol[oó]gico)/.test(s))
    return "drugs";
  if (/(perlas)/.test(s)) return "pearls";
  if (/(errores frecuentes|pitfalls|no confundir)/.test(s)) return "mistakes";
  if (/(take.?home|para llevar|mensaje clave)/.test(s)) return "takehome";
  if (/(tips|consejos)/.test(s)) return "tips";
  if (/(referencias|bibliograf[ií]a|gu[ií]as)/.test(s)) return "references";
  if (/(objetivos|competencias)/.test(s)) return "objectives";
  if (/(resumen|síntesis|sintesis)/.test(s)) return "summary";
  if (/(conceptos clave|definici[oó]n)/.test(s)) return "concepts";
  return "intro";
}

export const ALL_SLIDE_KINDS: SlideKind[] = [
  "title",
  "objectives",
  "concepts",
  "intro",
  "epidemiology",
  "diagram",
  "table",
  "comparison",
  "flowchart",
  "cards",
  "timeline",
  "steps",
  "drugs",
  "image",
  "case",
  "pearls",
  "mistakes",
  "tips",
  "summary",
  "takehome",
  "references",
];
