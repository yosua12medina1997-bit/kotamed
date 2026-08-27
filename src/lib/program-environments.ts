/**
 * KOTAMED PROGRAM ENVIRONMENTS™
 * Sistema visual reutilizable: cada programa recibe un "ambiente" (núcleo visual,
 * acentos, atmósfera y movimiento) sin tocar datos, rutas ni lógica.
 * El SuperAdmin puede sobrescribir cualquier valor desde metadata.environment
 * del nodo de contenido del programa.
 */
import coreHeart from "@/assets/programs/core-heart.png";
import coreBrain from "@/assets/programs/core-brain.png";
import coreLungs from "@/assets/programs/core-lungs.png";
import coreChild from "@/assets/programs/core-child.png";
import coreNodes from "@/assets/programs/core-nodes.png";
import coreNeonate from "@/assets/programs/core-neonate.png";
import holoBody from "@/assets/nexus/holo-body.png";

export type CoreKey =
  | "child"
  | "neonate"
  | "heart"
  | "brain"
  | "lungs"
  | "nodes"
  | "body";

export const CORE_IMAGES: Record<CoreKey, string> = {
  child: coreChild,
  neonate: coreNeonate,
  heart: coreHeart,
  brain: coreBrain,
  lungs: coreLungs,
  nodes: coreNodes,
  body: holoBody,
};

export const CORE_LABELS: Record<CoreKey, string> = {
  child: "Figura anatómica infantil",
  neonate: "Ecosistema neonatal",
  heart: "Corazón anatómico",
  brain: "Cerebro y conexiones",
  lungs: "Pulmones y flujo aéreo",
  nodes: "Núcleo de conocimiento",
  body: "Silueta anatómica completa",
};

export interface ProgramEnvironment {
  /** núcleo visual */
  core: CoreKey;
  /** imagen personalizada (CMS) que reemplaza el núcleo */
  coverUrl?: string | null;
  /** acento principal / secundario (rgb) */
  accent: string;
  accent2: string;
  /** intensidad de luz ambiental 0.4 – 1.4 */
  light: number;
  /** intensidad de movimiento 0 – 1.4 */
  motion: number;
  /** atmósfera declarada */
  mood: string;
  /** decoraciones sutiles */
  rings: boolean;
  grid: boolean;
}

const BASE: ProgramEnvironment = {
  core: "body",
  accent: "47,196,205",
  accent2: "78,150,225",
  light: 1,
  motion: 1,
  mood: "Entorno clínico premium",
  rings: true,
  grid: true,
};

type Preset = Partial<ProgramEnvironment>;

const PRESETS: { test: RegExp; env: Preset }[] = [
  { test: /neonat/, env: { core: "neonate", accent: "150,215,240", accent2: "210,235,248", light: 1.15, motion: 0.55, mood: "El comienzo de la vida" } },
  { test: /pediatr/, env: { core: "child", accent: "56,200,210", accent2: "120,195,235", light: 1.1, motion: 0.85, mood: "Vida, crecimiento y cuidado" } },
  { test: /cardio|corazon|cardiac/, env: { core: "heart", accent: "236,110,140", accent2: "56,190,215", light: 0.95, motion: 1, mood: "El sistema que impulsa la vida" } },
  { test: /neuro|cerebr/, env: { core: "brain", accent: "96,140,255", accent2: "150,120,235", light: 0.9, motion: 0.8, mood: "Inteligencia y conexiones" } },
  { test: /neumo|respirat|pulmon/, env: { core: "lungs", accent: "120,200,235", accent2: "180,225,240", light: 1.12, motion: 0.7, mood: "Respiración, espacio y flujo" } },
  { test: /emergenc|urgenc|trauma/, env: { core: "nodes", accent: "62,170,220", accent2: "235,90,110", light: 0.9, motion: 1.15, mood: "Control bajo presión" } },
  { test: /enam|pre[\s-]?enam|examen/, env: { core: "nodes", accent: "60,190,215", accent2: "96,140,255", light: 1, motion: 0.9, mood: "Preparación, estrategia y dominio" } },
  { test: /residentad|r1|r2|r3|apex/, env: { core: "nodes", accent: "70,150,235", accent2: "47,205,210", light: 0.85, motion: 1, mood: "Alto rendimiento y evolución" } },
  { test: /medicina\s*interna|internado|clinic/, env: { core: "body", accent: "52,190,205", accent2: "90,150,225", light: 1, motion: 0.85, mood: "Conexión de sistemas y razonamiento" } },
  { test: /cirug|quirurg/, env: { core: "body", accent: "96,150,190", accent2: "60,200,215", light: 0.85, motion: 0.8, mood: "Precisión, técnica y profundidad" } },
  { test: /ciencias\s*basic|anatom|fisiolog/, env: { core: "nodes", accent: "60,200,205", accent2: "130,190,240", light: 1.1, motion: 0.8, mood: "Fundamentos del cuerpo humano" } },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Sobrescritura guardada por el SuperAdmin en metadata.environment. */
export type EnvironmentOverride = Partial<ProgramEnvironment> | undefined | null;

/** Resuelve el ambiente de un programa a partir de su slug/título + override CMS. */
export function resolveProgramEnvironment(
  slug: string,
  title?: string | null,
  override?: EnvironmentOverride,
): ProgramEnvironment {
  const key = normalize(`${slug} ${title ?? ""}`);
  const preset = PRESETS.find((p) => p.test.test(key))?.env ?? {};
  return { ...BASE, ...preset, ...(override ?? {}) };
}

/** Imagen final del núcleo visual (cover del CMS con prioridad). */
export function coreImage(env: ProgramEnvironment): string {
  return env.coverUrl || CORE_IMAGES[env.core] || CORE_IMAGES.body;
}
