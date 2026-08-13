/**
 * Página pública "Ciencias Básicas" (/p/ciencias-basicas) — contenido editable.
 *
 * Todo el contenido (hero, cifras, áreas, ruta, IA, 3D, CTA, SEO, orden y
 * visibilidad de secciones) se guarda en `ui_menu_prefs` con scope
 * `page-ciencias-basicas`. Lectura pública (anon), escritura solo admin por RLS.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import a01 from "@/assets/cb/01-anatomia.jpg.asset.json";
import a02 from "@/assets/cb/02-histologia.jpg.asset.json";
import a03 from "@/assets/cb/03-embriologia.jpg.asset.json";
import a04 from "@/assets/cb/04-fisiologia.jpg.asset.json";
import a05 from "@/assets/cb/05-bioquimica.jpg.asset.json";
import a06 from "@/assets/cb/06-celular.jpg.asset.json";
import a07 from "@/assets/cb/07-genetica.jpg.asset.json";
import a08 from "@/assets/cb/08-microbiologia.jpg.asset.json";
import a09 from "@/assets/cb/09-inmunologia.jpg.asset.json";
import a10 from "@/assets/cb/10-parasitologia.jpg.asset.json";
import a11 from "@/assets/cb/11-farmacologia.jpg.asset.json";
import a12 from "@/assets/cb/12-patologia.jpg.asset.json";
import aiBrain from "@/assets/cb/ai-brain.jpg.asset.json";
import anatomy3d from "@/assets/cb/anatomy-3d.jpg.asset.json";
import learn3d from "@/assets/cb/learn-3d.jpg.asset.json";

const db = supabase as any;
export const CB_SCOPE = "page-ciencias-basicas";

export type CbArea = {
  n: string;
  title: string;
  text: string;
  image: string;
  href: string;
  visible?: boolean;
};

export type CbSectionId =
  | "stats"
  | "intro"
  | "areas"
  | "path"
  | "learn"
  | "method"
  | "ai"
  | "three"
  | "audience"
  | "cta";

export type CbConfig = {
  hero: {
    breadcrumb: string;
    badge: string;
    title: string;
    highlight: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    chips: string[];
    /** Imagen ambiental del hero (vacío = laboratorio del Home). */
    image: string;
    showEnvControls: boolean;
  };
  stats: { value: string; label: string }[];
  intro: {
    title: string;
    subtitle: string;
    moreLabel: string;
    moreHref: string;
    steps: { label: string; text: string }[];
  };
  areas: { title: string; subtitle: string; allLabel: string; allHref: string; items: CbArea[] };
  path: { title: string; stages: { n: string; title: string; text: string }[] };
  learn: { title: string; items: string[]; image: string };
  method: { title: string; subtitle: string; steps: { title: string; text: string }[] };
  ai: {
    title: string;
    subtitle: string;
    benefits: string[];
    ctaLabel: string;
    ctaHref: string;
    image: string;
  };
  three: { title: string; subtitle: string; ctaLabel: string; ctaHref: string; image: string; systems: string[] };
  audience: { title: string; items: { title: string; text: string }[] };
  cta: {
    title: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  seo: { title: string; description: string; ogImage: string };
  order: CbSectionId[];
  visible: Record<CbSectionId, boolean>;
};

export const CB_SECTION_LABEL: Record<CbSectionId, string> = {
  stats: "Barra de valor",
  intro: "¿Qué son las Ciencias Básicas?",
  areas: "Áreas fundamentales",
  path: "Ruta de aprendizaje",
  learn: "¿Qué aprenderás?",
  method: "Metodología KotaMed",
  ai: "KotaMed AI",
  three: "Exploración 3D",
  audience: "¿Para quién es?",
  cta: "CTA final",
};

export const DEFAULT_CB_CONFIG: CbConfig = {
  hero: {
    breadcrumb: "Academia › Ciencias Básicas",
    badge: "Ciencias Básicas",
    title: "Comprende la medicina desde sus",
    highlight: "fundamentos",
    description:
      "Domina los conceptos fundamentales de las ciencias biomédicas y conviértelos en una base sólida para comprender las ciencias clínicas.",
    primaryLabel: "Explorar Ciencias Básicas",
    primaryHref: "/programas",
    secondaryLabel: "¿Cómo funciona?",
    secondaryHref: "/p/ayuda",
    chips: ["Basado en evidencia", "Aprendizaje estructurado", "Integración clínica", "KotaMed AI"],
    image: "",
    showEnvControls: true,
  },
  stats: [
    { value: "12", label: "Áreas fundamentales" },
    { value: "350+", label: "Clases y recursos" },
    { value: "IA", label: "Inteligencia integrada" },
    { value: "24/7", label: "Disponible para ti" },
  ],
  intro: {
    title: "¿Qué son las Ciencias Básicas?",
    subtitle:
      "El punto de partida para comprender cómo funciona el cuerpo humano y por qué se producen las enfermedades.",
    moreLabel: "Más información",
    moreHref: "/programas",
    steps: [
      { label: "Biología", text: "Estudio de la vida" },
      { label: "Estructura", text: "Organización del cuerpo" },
      { label: "Función", text: "Cómo funciona" },
      { label: "Alteración", text: "Cambios y mecanismos" },
      { label: "Enfermedad", text: "Origen y desarrollo" },
      { label: "Clínica", text: "Aplicación médica" },
    ],
  },
  areas: {
    title: "Explora los fundamentos de la medicina",
    subtitle: "Domina cada área esencial para comprender el cuerpo humano y su funcionamiento.",
    allLabel: "Ver todas las áreas",
    allHref: "/programas",
    items: [
      { n: "01", title: "Anatomía", text: "Estudia la estructura del cuerpo humano y sus relaciones.", image: a01.url, href: "/programas" },
      { n: "02", title: "Histología", text: "Aprende la estructura microscópica de los tejidos.", image: a02.url, href: "/programas" },
      { n: "03", title: "Embriología", text: "Descubre el desarrollo del ser humano desde el origen.", image: a03.url, href: "/programas" },
      { n: "04", title: "Fisiología", text: "Comprende cómo funciona el organismo en condiciones normales.", image: a04.url, href: "/programas" },
      { n: "05", title: "Bioquímica", text: "Entiende los procesos químicos que sustentan la vida.", image: a05.url, href: "/programas" },
      { n: "06", title: "Biología celular y molecular", text: "Estudia las células y los mecanismos moleculares.", image: a06.url, href: "/programas" },
      { n: "07", title: "Genética", text: "Descubre cómo se heredan y expresan los rasgos.", image: a07.url, href: "/programas" },
      { n: "08", title: "Microbiología", text: "Estudia microorganismos y su impacto en la salud.", image: a08.url, href: "/programas" },
      { n: "09", title: "Inmunología", text: "Comprende el sistema que protege nuestro cuerpo.", image: a09.url, href: "/programas" },
      { n: "10", title: "Parasitología", text: "Estudia los parásitos y las enfermedades que producen.", image: a10.url, href: "/programas" },
      { n: "11", title: "Farmacología", text: "Aprende cómo actúan los medicamentos.", image: a11.url, href: "/programas" },
      { n: "12", title: "Patología", text: "Comprende los mecanismos de la enfermedad.", image: a12.url, href: "/programas" },
    ],
  },
  path: {
    title: "De los fundamentos a la práctica clínica",
    stages: [
      { n: "01", title: "Fundamentos", text: "Comprende las bases estructurales y moleculares." },
      { n: "02", title: "Comprensión", text: "Relaciona estructura, función y mecanismos." },
      { n: "03", title: "Integración", text: "Conecta diferentes áreas del conocimiento." },
      { n: "04", title: "Aplicación clínica", text: "Prepárate para comprender la enfermedad y la práctica médica." },
    ],
  },
  learn: {
    title: "¿Qué aprenderás en Ciencias Básicas?",
    items: [
      "Comprender la estructura y función del organismo.",
      "Integrar conceptos biomédicos.",
      "Relacionar diferentes sistemas.",
      "Comprender mecanismos fisiopatológicos.",
      "Construir una base sólida para las ciencias clínicas.",
      "Prepararte para evaluaciones académicas.",
    ],
    image: learn3d.url,
  },
  method: {
    title: "Metodología KotaMed",
    subtitle: "Aprende diferente. Comprende mejor.",
    steps: [
      { title: "Concepto", text: "Aprende la base de cada tema." },
      { title: "Comprensión", text: "Entiende y relaciona los conceptos." },
      { title: "Integración", text: "Conecta y aplica en contextos reales." },
      { title: "Aplicación", text: "Transfiere a la práctica clínica." },
    ],
  },
  ai: {
    title: "Aprende con inteligencia artificial",
    subtitle: "KotaMed AI te acompaña en cada paso.",
    benefits: [
      "Explicaciones personalizadas",
      "Resolución de dudas al instante",
      "Repaso inteligente de conceptos",
      "Relación entre temas y sistemas",
      "Orientación según tus objetivos",
    ],
    ctaLabel: "Conoce KotaMed AI",
    ctaHref: "/dashboard",
    image: aiBrain.url,
  },
  three: {
    title: "Explora el cuerpo humano de una nueva manera",
    subtitle: "Interactúa con modelos 3D y descubre cómo funciona cada sistema.",
    ctaLabel: "Explorar modelo 3D",
    ctaHref: "/anatomy-lab",
    image: anatomy3d.url,
    systems: [
      "Sistema nervioso",
      "Sistema cardiovascular",
      "Sistema respiratorio",
      "Sistema digestivo",
      "Sistema óseo",
    ],
  },
  audience: {
    title: "¿Para quién es Ciencias Básicas?",
    items: [
      { title: "Estudiante de medicina", text: "Construye una base sólida desde el inicio." },
      { title: "Refuerzo académico", text: "Repasa conceptos fundamentales y conecta conocimientos." },
      { title: "Preparación académica", text: "Fortalece tus fundamentos para evaluaciones importantes." },
      { title: "Futuro clínico", text: "Prepárate para comprender mejor las ciencias clínicas." },
    ],
  },
  cta: {
    title: "Construye hoy la base de tu medicina del mañana.",
    subtitle: "Únete a KotaMed y aprende con tecnología, evidencia y acompañamiento clínico.",
    primaryLabel: "Comenzar ahora",
    primaryHref: "/auth",
    secondaryLabel: "Explorar Academia",
    secondaryHref: "/programas",
  },
  seo: {
    title: "Ciencias Básicas · KotaMed",
    description:
      "Domina anatomía, fisiología, bioquímica y las 12 áreas fundamentales de la medicina con KotaMed AI, modelos 3D y aprendizaje estructurado.",
    ogImage: "",
  },
  order: ["stats", "intro", "areas", "path", "learn", "method", "ai", "three", "audience", "cta"],
  visible: {
    stats: true,
    intro: true,
    areas: true,
    path: true,
    learn: true,
    method: true,
    ai: true,
    three: true,
    audience: true,
    cta: true,
  },
};

function mergeCb(raw: any): CbConfig {
  const c = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_CB_CONFIG;
  const order: CbSectionId[] = Array.isArray(c.order)
    ? (c.order.filter((k: any) => d.order.includes(k)) as CbSectionId[])
    : d.order;
  const missing = d.order.filter((k) => !order.includes(k));
  return {
    hero: { ...d.hero, ...(c.hero ?? {}), chips: Array.isArray(c.hero?.chips) ? c.hero.chips.map(String) : d.hero.chips },
    stats: Array.isArray(c.stats) ? c.stats : d.stats,
    intro: { ...d.intro, ...(c.intro ?? {}), steps: Array.isArray(c.intro?.steps) ? c.intro.steps : d.intro.steps },
    areas: {
      ...d.areas,
      ...(c.areas ?? {}),
      items: Array.isArray(c.areas?.items) ? c.areas.items : d.areas.items,
    },
    path: { ...d.path, ...(c.path ?? {}), stages: Array.isArray(c.path?.stages) ? c.path.stages : d.path.stages },
    learn: { ...d.learn, ...(c.learn ?? {}), items: Array.isArray(c.learn?.items) ? c.learn.items.map(String) : d.learn.items },
    method: { ...d.method, ...(c.method ?? {}), steps: Array.isArray(c.method?.steps) ? c.method.steps : d.method.steps },
    ai: { ...d.ai, ...(c.ai ?? {}), benefits: Array.isArray(c.ai?.benefits) ? c.ai.benefits.map(String) : d.ai.benefits },
    three: { ...d.three, ...(c.three ?? {}), systems: Array.isArray(c.three?.systems) ? c.three.systems.map(String) : d.three.systems },
    audience: { ...d.audience, ...(c.audience ?? {}), items: Array.isArray(c.audience?.items) ? c.audience.items : d.audience.items },
    cta: { ...d.cta, ...(c.cta ?? {}) },
    seo: { ...d.seo, ...(c.seo ?? {}) },
    order: [...order, ...missing],
    visible: { ...d.visible, ...(c.visible ?? {}) },
  };
}

export function useCbConfig() {
  return useQuery({
    queryKey: ["cb-config", CB_SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CbConfig> => {
      try {
        const { data } = await db.from("ui_menu_prefs").select("config").eq("scope", CB_SCOPE).maybeSingle();
        return mergeCb(data?.config ?? null);
      } catch {
        return DEFAULT_CB_CONFIG;
      }
    },
  });
}

/** Guarda el contenido de la página (solo administradores por RLS). */
export function useSaveCbConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CbConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert({ scope: CB_SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["cb-config", CB_SCOPE], config);
      qc.invalidateQueries({ queryKey: ["cb-config", CB_SCOPE] });
    },
  });
}
