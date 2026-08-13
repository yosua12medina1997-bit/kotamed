/**
 * "KotaMed Program Hub" — página pública /programas (informativa).
 *
 * Todo el contenido (hero, etapas, programas, línea de evolución, cifras,
 * CTA, ventajas, SEO, orden y visibilidad) se guarda en `ui_menu_prefs`
 * con scope `page-programas`. Lectura pública (anon), escritura solo admin.
 *
 * REGLA: aquí no vive la lógica de planes ni de matrícula. Cada programa solo
 * declara con qué planes está disponible (etiquetas informativas) y a qué
 * landing lleva su CTA.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import imgBasicas from "@/assets/ph/basicas.jpg.asset.json";
import imgClinicas from "@/assets/ph/clinicas.jpg.asset.json";
import imgInternado from "@/assets/ph/internado.jpg.asset.json";
import imgSerums from "@/assets/ph/serums.jpg.asset.json";
import imgEnam from "@/assets/ph/enam.jpg.asset.json";
import imgEssalud from "@/assets/ph/essalud.jpg.asset.json";
import imgExamenes from "@/assets/ph/examenes.jpg.asset.json";
import imgResidentado from "@/assets/ph/residentado.jpg.asset.json";
import imgEspecialidades from "@/assets/ph/especialidades.jpg.asset.json";
import imgSub from "@/assets/ph/subespecialidades.jpg.asset.json";
import imgTeam from "@/assets/ph/cta-team.jpg.asset.json";

const db = supabase as any;
export const HUB_SCOPE = "page-programas";

export type HubStage = {
  id: string;
  n: string;
  label: string;
  text: string;
  icon: string;
  visible?: boolean;
};

export type HubProgram = {
  id: string;
  stage: string;
  title: string;
  text: string;
  icon: string;
  image: string;
  href: string;
  ctaLabel: string;
  /** Planes en los que el programa está disponible (solo informativo). */
  plans: string[];
  featured?: boolean;
  visible?: boolean;
};

export type HubSectionId = "timeline" | "stages" | "stats" | "cta" | "features";

export const HUB_SECTION_LABEL: Record<HubSectionId, string> = {
  timeline: "Línea de evolución",
  stages: "Etapas y programas",
  stats: "Barra de cifras",
  cta: "Banner final",
  features: "Ventajas KotaMed",
};

export type HubConfig = {
  hero: {
    breadcrumb: string;
    title: string;
    highlight: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    chips: { label: string; icon: string }[];
    image: string;
    showEnvControls: boolean;
  };
  intro: { title: string; highlight: string; subtitle: string; mapLabel: string; mapHref: string };
  timeline: string[];
  stages: HubStage[];
  programs: HubProgram[];
  stats: { value: string; label: string; icon: string }[];
  cta: {
    title: string;
    highlight: string;
    tail: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    image: string;
  };
  features: { title: string; text: string; icon: string }[];
  seo: { title: string; description: string; ogImage: string };
  order: HubSectionId[];
  visible: Record<HubSectionId, boolean>;
};

export const DEFAULT_HUB_CONFIG: HubConfig = {
  hero: {
    breadcrumb: "Programas KotaMed",
    title: "Tu recorrido académico completo, desde los fundamentos hasta la",
    highlight: "especialización",
    description:
      "Programas diseñados para acompañarte en cada etapa de tu formación médica y llevarte más lejos.",
    primaryLabel: "Explorar todos los programas",
    primaryHref: "#etapas",
    secondaryLabel: "¿Cómo funciona?",
    secondaryHref: "/p/planes",
    chips: [
      { label: "Aprendizaje estructurado", icon: "Layers" },
      { label: "Basado en evidencia", icon: "ShieldCheck" },
      { label: "Enfoque clínico", icon: "Stethoscope" },
      { label: "KotaMed AI", icon: "Sparkles" },
    ],
    image: "",
    showEnvControls: true,
  },
  intro: {
    title: "Un camino. Un",
    highlight: "propósito.",
    subtitle: "Cada programa es una etapa clave en tu formación como médico.",
    mapLabel: "Ver mapa completo",
    mapHref: "#etapas",
  },
  timeline: [
    "Ciencias Básicas",
    "Ciencias Clínicas",
    "Internado",
    "ENAM / SERUMS",
    "Residentado",
    "Especialidad",
    "Subespecialidad",
  ],
  stages: [
    { id: "fundamentos", n: "01", label: "Fundamentos", text: "Construye tu base científica y comprende cómo funciona el cuerpo humano.", icon: "Dna", visible: true },
    { id: "practica", n: "02", label: "Práctica", text: "Lleva tu conocimiento a la práctica real.", icon: "Stethoscope", visible: true },
    { id: "evaluacion", n: "03", label: "Evaluación", text: "Prepárate para superar los grandes desafíos.", icon: "ClipboardList", visible: true },
    { id: "especializacion", n: "04", label: "Especialización", text: "Conviértete en el especialista que el Perú necesita.", icon: "GraduationCap", visible: true },
  ],
  programs: [
    {
      id: "ciencias-basicas",
      stage: "fundamentos",
      title: "Ciencias Básicas",
      text: "Domina los fundamentos de las ciencias biomédicas.",
      icon: "Microscope",
      image: imgBasicas.url,
      href: "/p/ciencias-basicas",
      ctaLabel: "Explorar",
      plans: ["BASIC", "STUDENT"],
      featured: true,
      visible: true,
    },
    {
      id: "ciencias-clinicas",
      stage: "fundamentos",
      title: "Ciencias Clínicas",
      text: "Integra el conocimiento y desarrolla tu razonamiento clínico.",
      icon: "HeartPulse",
      image: imgClinicas.url,
      href: "/programas/ciencias-clinicas",
      ctaLabel: "Explorar",
      plans: ["STUDENT"],
      visible: true,
    },
    {
      id: "internado",
      stage: "practica",
      title: "Internado Médico",
      text: "Vive la medicina en el hospital y desarrolla habilidades esenciales.",
      icon: "Building2",
      image: imgInternado.url,
      href: "/programas/internado",
      ctaLabel: "Explorar",
      plans: ["INTERN", "EXAMS", "RESIDENT"],
      featured: true,
      visible: true,
    },
    {
      id: "serums",
      stage: "practica",
      title: "SERUMS",
      text: "Prepárate para tu servicio rural y fortalece tu compromiso profesional.",
      icon: "MapPin",
      image: imgSerums.url,
      href: "/programas/serums",
      ctaLabel: "Explorar",
      plans: ["INTERN"],
      visible: true,
    },
    {
      id: "enam",
      stage: "evaluacion",
      title: "ENAM",
      text: "Prepárate para el Examen Nacional de Medicina.",
      icon: "ClipboardList",
      image: imgEnam.url,
      href: "/programas/enam",
      ctaLabel: "Explorar",
      plans: ["EXAMS"],
      featured: true,
      visible: true,
    },
    {
      id: "essalud",
      stage: "evaluacion",
      title: "EsSalud",
      text: "Prepárate para el Residentado Médico de EsSalud.",
      icon: "ShieldPlus",
      image: imgEssalud.url,
      href: "/programas/essalud",
      ctaLabel: "Explorar",
      plans: ["EXAMS", "RESIDENT"],
      visible: true,
    },
    {
      id: "examenes",
      stage: "evaluacion",
      title: "Exámenes",
      text: "Fortalece tus conocimientos con simulacros y bancos de preguntas.",
      icon: "Target",
      image: imgExamenes.url,
      href: "/programas/examenes",
      ctaLabel: "Explorar",
      plans: ["EXAMS"],
      visible: true,
    },
    {
      id: "residentado",
      stage: "especializacion",
      title: "Residente Médico",
      text: "Comienza tu camino en la especialización médica.",
      icon: "Award",
      image: imgResidentado.url,
      href: "/programas/residentado",
      ctaLabel: "Explorar",
      plans: ["RESIDENT"],
      featured: true,
      visible: true,
    },
    {
      id: "especialidades",
      stage: "especializacion",
      title: "Especialidades",
      text: "Explora todas las especialidades médicas disponibles.",
      icon: "Layers",
      image: imgEspecialidades.url,
      href: "/programas/especialidades",
      ctaLabel: "Explorar",
      plans: ["RESIDENT"],
      visible: true,
    },
    {
      id: "subespecialidades",
      stage: "especializacion",
      title: "Subespecialidades",
      text: "Profundiza y conviértete en referente en tu área.",
      icon: "Brain",
      image: imgSub.url,
      href: "/programas/subespecialidades",
      ctaLabel: "Explorar",
      plans: ["RESIDENT"],
      visible: true,
    },
  ],
  stats: [
    { value: "10+", label: "Programas académicos", icon: "GraduationCap" },
    { value: "5,000+", label: "Estudiantes formados", icon: "Users" },
    { value: "2,000+", label: "Recursos académicos", icon: "BookOpen" },
    { value: "24/7", label: "Acompañamiento constante", icon: "Clock" },
  ],
  cta: {
    title: "Tu futuro comienza con la",
    highlight: "decisión",
    tail: "de hoy.",
    subtitle: "Elige tu programa y da el siguiente paso hacia tu mejor versión como médico.",
    primaryLabel: "Comenzar ahora",
    primaryHref: "/auth",
    secondaryLabel: "Explorar programas",
    secondaryHref: "#etapas",
    image: imgTeam.url,
  },
  features: [
    { title: "Aprende a tu ritmo", text: "Accede desde cualquier lugar y dispositivo.", icon: "Clock" },
    { title: "Contenido actualizado", text: "Material basado en evidencia y guías internacionales.", icon: "BookOpen" },
    { title: "Casos reales", text: "Aprende con situaciones clínicas reales y simulaciones.", icon: "Stethoscope" },
    { title: "IA integrada", text: "Inteligencia artificial que te guía, evalúa y recomienda.", icon: "Sparkles" },
    { title: "Comunidad médica", text: "Conecta con miles de estudiantes y profesionales.", icon: "Users" },
  ],
  seo: {
    title: "Programas académicos · KotaMed",
    description:
      "Tu recorrido académico completo: Ciencias Básicas, Ciencias Clínicas, Internado, SERUMS, ENAM, EsSalud, Residentado, Especialidades y Subespecialidades.",
    ogImage: "",
  },
  order: ["timeline", "stages", "stats", "cta", "features"],
  visible: { timeline: true, stages: true, stats: true, cta: true, features: true },
};

function mergeHub(raw: any): HubConfig {
  const c = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_HUB_CONFIG;
  const order: HubSectionId[] = Array.isArray(c.order)
    ? (c.order.filter((k: any) => d.order.includes(k)) as HubSectionId[])
    : d.order;
  const missing = d.order.filter((k) => !order.includes(k));
  return {
    hero: {
      ...d.hero,
      ...(c.hero ?? {}),
      chips: Array.isArray(c.hero?.chips) ? c.hero.chips : d.hero.chips,
    },
    intro: { ...d.intro, ...(c.intro ?? {}) },
    timeline: Array.isArray(c.timeline) ? c.timeline.map(String) : d.timeline,
    stages: Array.isArray(c.stages) && c.stages.length ? c.stages : d.stages,
    programs: Array.isArray(c.programs) && c.programs.length ? c.programs : d.programs,
    stats: Array.isArray(c.stats) ? c.stats : d.stats,
    cta: { ...d.cta, ...(c.cta ?? {}) },
    features: Array.isArray(c.features) ? c.features : d.features,
    seo: { ...d.seo, ...(c.seo ?? {}) },
    order: [...order, ...missing],
    visible: { ...d.visible, ...(c.visible ?? {}) },
  };
}

export function useHubConfig() {
  return useQuery({
    queryKey: ["hub-config", HUB_SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<HubConfig> => {
      try {
        const { data } = await db.from("ui_menu_prefs").select("config").eq("scope", HUB_SCOPE).maybeSingle();
        return mergeHub(data?.config ?? null);
      } catch {
        return DEFAULT_HUB_CONFIG;
      }
    },
  });
}

/** Guarda el hub de programas (solo administradores por RLS). */
export function useSaveHubConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: HubConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert({ scope: HUB_SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["hub-config", HUB_SCOPE], config);
      qc.invalidateQueries({ queryKey: ["hub-config", HUB_SCOPE] });
    },
  });
}
