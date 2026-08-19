/**
 * Página pública "Preparación ENAM" (/p/enam) — contenido editable.
 *
 * Reutiliza exactamente la misma estructura editable que Ciencias Básicas e
 * Internado Médico (hero inmersivo + cuerpo académico blanco), con su propio
 * scope en `ui_menu_prefs` (`page-enam`). Lectura pública (anon), escritura
 * solo administradores por RLS.
 *
 * Nota: todas las cifras (12,000+, 78%, Top 12%, 15 simulacros…) son contenido
 * DEMOSTRATIVO editable desde CMS Studio, no estadísticas reales de KotaMed.
 * Cuando el banco Apex tenga datos, se reemplazan desde el CMS/backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeScienceConfig, type CbConfig, type CbSectionId } from "@/lib/ciencias-basicas-cms";

const db = supabase as any;
export const ENAM_SCOPE = "page-enam";

export const ENAM_SECTION_LABEL: Record<CbSectionId, string> = {
  stats: "Métricas",
  intro: "¿Cómo funciona?",
  areas: "Temarios ENAM",
  path: "Metodología KotaMed",
  learn: "Todo lo que necesitas",
  method: "Simulacros y análisis",
  ai: "KotaMed IA",
  three: "Tu progreso y ranking",
  audience: "¿Para quién es?",
  cta: "CTA final",
};

/** Los temarios enlazan al motor de exámenes Apex (banco de preguntas real). */
const Q = (slug: string) => `/programas/kotamed-apex?area=${slug}`;

export const DEFAULT_ENAM_CONFIG: CbConfig = {
  hero: {
    breadcrumb: "Academia › ENAM",
    badge: "Preparación ENAM",
    title: "Prepárate para el ENAM y alcanza tu residencia con",
    highlight: "confianza",
    description:
      "La preparación más completa, actualizada y basada en evidencia para que llegues al examen con estrategia, práctica y seguridad.",
    primaryLabel: "Explorar temarios",
    primaryHref: "/programas/kotamed-apex",
    secondaryLabel: "¿Cómo funciona?",
    secondaryHref: "/p/ayuda",
    chips: [
      "Banco de preguntas +12,000 ítems",
      "Clases y casos explicados paso a paso",
      "Simulacros tipo ENAM",
      "KotaMed IA para dudas y apoyo",
    ],
    holoCards: [
      "Competencias · 7 áreas",
      "Simulacros · 15 disponibles",
      "Preguntas · 12,458 ítems",
      "Tu progreso · 78%",
      "Ranking · Top 12%",
      "Puntos débiles · 8 temas",
    ],
    image: "/enam/hero-enam.jpg",
    showEnvControls: true,
  },
  stats: [
    { value: "7", label: "Áreas temáticas" },
    { value: "12,000+", label: "Preguntas ENAM" },
    { value: "200+", label: "Clases y casos" },
    { value: "24/7", label: "A tu ritmo" },
  ],
  intro: {
    title: "¿Cómo funciona tu preparación ENAM?",
    subtitle: "Un camino claro para que estudies mejor, practiques más y rindas con seguridad.",
    moreLabel: "Más información",
    moreHref: "/programas/kotamed-apex",
    steps: [
      { label: "Estudia", text: "Accede a clases, resúmenes y material actualizado." },
      { label: "Practica", text: "Resuelve preguntas por temas y subtemas." },
      { label: "Simula", text: "Rinde simulacros bajo condiciones reales." },
      { label: "Analiza", text: "Revisa tu desempeño y detecta oportunidades." },
      { label: "Mejora", text: "Refuerza tus puntos débiles y sigue avanzando." },
    ],
  },
  areas: {
    title: "Temarios ENAM",
    subtitle: "Domina las áreas que realmente necesitas para rendir mejor.",
    allLabel: "Ver todos los temarios",
    allHref: "/programas/kotamed-apex",
    items: [
      { n: "01", title: "Medicina Interna", text: "Preguntas por tema y subtema.", image: "/enam/01-medicina-interna.jpg", href: Q("medicina-interna") },
      { n: "02", title: "Cirugía", text: "Preguntas por tema y subtema.", image: "/enam/02-cirugia.jpg", href: Q("cirugia") },
      { n: "03", title: "Pediatría", text: "Preguntas por tema y subtema.", image: "/enam/03-pediatria.jpg", href: Q("pediatria") },
      { n: "04", title: "Ginecología y Obstetricia", text: "Preguntas por tema y subtema.", image: "/enam/04-ginecologia.jpg", href: Q("ginecologia-obstetricia") },
      { n: "05", title: "Salud Pública", text: "Preguntas por tema y subtema.", image: "/enam/05-salud-publica.jpg", href: Q("salud-publica") },
      { n: "06", title: "Psiquiatría", text: "Preguntas por tema y subtema.", image: "/enam/06-psiquiatria.jpg", href: Q("psiquiatria") },
      { n: "07", title: "Anestesiología", text: "Preguntas por tema y subtema.", image: "/enam/07-anestesiologia.jpg", href: Q("anestesiologia") },
      { n: "08", title: "Traumatología", text: "Preguntas por tema y subtema.", image: "/enam/08-traumatologia.jpg", href: Q("traumatologia") },
      { n: "09", title: "Emergencias", text: "Preguntas por tema y subtema.", image: "/enam/09-emergencias.jpg", href: Q("emergencias") },
      { n: "10", title: "Dermatología", text: "Preguntas por tema y subtema.", image: "/enam/10-dermatologia.jpg", href: Q("dermatologia") },
      { n: "11", title: "Oftalmología", text: "Preguntas por tema y subtema.", image: "/enam/11-oftalmologia.jpg", href: Q("oftalmologia") },
      { n: "12", title: "Otorrinolaringología", text: "Preguntas por tema y subtema.", image: "/enam/12-otorrino.jpg", href: Q("otorrinolaringologia") },
    ],
  },
  path: {
    title: "Metodología KotaMed",
    stages: [
      { n: "01", title: "Estudia", text: "Aprende los conceptos clave de cada tema." },
      { n: "02", title: "Practica", text: "Resuelve preguntas y casos clínicos." },
      { n: "03", title: "Simula", text: "Rinde bajo tiempo y presión real." },
      { n: "04", title: "Analiza", text: "Identifica errores y oportunidades." },
      { n: "05", title: "Mejora", text: "Refuerza y consolida tu conocimiento." },
    ],
  },
  learn: {
    title: "Todo lo que necesitas para tu preparación",
    items: [
      "Contenido actualizado, basado en guías y normas vigentes.",
      "Banco ENAM con miles de preguntas clasificadas por área y tema.",
      "Simulacros reales tipo ENAM con tiempo y ranking.",
      "Estadísticas inteligentes con reportes detallados de tu progreso.",
      "IA KotaMed para resolver dudas y recibir apoyo académico.",
    ],
    image: "/enam/recursos.jpg",
  },
  method: {
    title: "Simula antes del gran día",
    subtitle: "Entrena bajo condiciones similares al examen y aprende de cada intento.",
    steps: [
      { title: "Simulacro ENAM", text: "100 preguntas · 120 min · condiciones reales." },
      { title: "Simulacro adaptativo", text: "Se ajusta a tu rendimiento y temas débiles." },
      { title: "Resultados detallados", text: "Puntaje, percentil, tiempo por pregunta y aciertos." },
      { title: "Mis puntos débiles", text: "Temas con menor rendimiento y plan de refuerzo." },
    ],
  },
  ai: {
    title: "KotaMed IA, tu asistente ENAM",
    subtitle: "Inteligencia artificial entrenada para acompañarte en cada paso de tu preparación.",
    benefits: [
      "Resuelve tus dudas al instante",
      "Explica por qué una alternativa es correcta y las demás no",
      "Genera preguntas similares y flashcards",
      "Identifica tus temas débiles",
      "Recomienda qué estudiar después",
    ],
    ctaLabel: "Probar KotaMed IA",
    ctaHref: "/programas/kotamed-apex",
    image: "/enam/ai-enam.jpg",
  },
  three: {
    title: "Tu progreso, en un solo lugar",
    subtitle:
      "Sigue tu avance general, tus simulacros realizados, tus preguntas respondidas y tu ranking; identifica tus fortalezas y mejora cada día.",
    ctaLabel: "Ver mi progreso",
    ctaHref: "/dashboard",
    image: "/enam/progreso.jpg",
    systems: [
      "Progreso general 78%",
      "Simulacros realizados 15",
      "Preguntas respondidas 3,842",
      "Puntos débiles 8 temas",
      "Ranking ENAM Top 12%",
    ],
  },
  audience: {
    title: "¿Para quién es la preparación ENAM?",
    items: [
      { title: "Médicos bachilleres", text: "Inicia tu camino al residentado con una preparación sólida." },
      { title: "Médicos cirujanos", text: "Refuerza tus conocimientos y mejora tu rendimiento." },
      { title: "Repostulantes", text: "Identifica tus errores, practica más y alcanza tu objetivo." },
      { title: "Docentes y academias", text: "Herramientas para enseñar, evaluar y acompañar mejor." },
    ],
  },
  cta: {
    title: "Tu preparación para el ENAM empieza mucho antes del examen.",
    subtitle: "Estudia. Practica. Simula. Analiza. Mejora.",
    primaryLabel: "Comenzar preparación ENAM",
    primaryHref: "/auth",
    secondaryLabel: "Explorar temarios",
    secondaryHref: "/programas/kotamed-apex",
  },
  seo: {
    title: "Preparación ENAM | KotaMed",
    description:
      "Prepárate para el ENAM con preguntas, simulacros, casos clínicos, clases, análisis de rendimiento y acompañamiento con inteligencia artificial.",
    ogImage: "",
  },
  order: ["stats", "intro", "areas", "learn", "method", "path", "ai", "three", "audience", "cta"],
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

export function useEnamConfig() {
  return useQuery({
    queryKey: ["enam-config", ENAM_SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CbConfig> => {
      try {
        const { data } = await db.from("ui_menu_prefs").select("config").eq("scope", ENAM_SCOPE).maybeSingle();
        return mergeScienceConfig(data?.config ?? null, DEFAULT_ENAM_CONFIG);
      } catch {
        return DEFAULT_ENAM_CONFIG;
      }
    },
  });
}

/** Guarda el contenido de la página (solo administradores por RLS). */
export function useSaveEnamConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CbConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert({ scope: ENAM_SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["enam-config", ENAM_SCOPE], config);
      qc.invalidateQueries({ queryKey: ["enam-config", ENAM_SCOPE] });
    },
  });
}
