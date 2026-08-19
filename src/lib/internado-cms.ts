/**
 * Página pública "Internado Médico" (/p/internado) — contenido editable.
 *
 * Reutiliza exactamente la misma estructura editable que Ciencias Básicas /
 * Ciencias Clínicas (hero inmersivo + cuerpo académico blanco), con su propio
 * scope en `ui_menu_prefs` (`page-internado`). Lectura pública (anon),
 * escritura solo administradores por RLS.
 *
 * Nota: las cifras (12+, 300+, 1000+, 78%) son contenido de demostración
 * editable desde CMS Studio, no estadísticas reales de KotaMed.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeScienceConfig, type CbConfig, type CbSectionId } from "@/lib/ciencias-basicas-cms";

const db = supabase as any;
export const INT_SCOPE = "page-internado";

export const INT_SECTION_LABEL: Record<CbSectionId, string> = {
  stats: "Métricas",
  intro: "¿Cómo funciona?",
  areas: "Rotaciones y áreas",
  path: "Metodología KotaMed",
  learn: "Todo lo que necesitas",
  method: "¿Por qué KotaMed?",
  ai: "KotaMed IA",
  three: "Tu progreso",
  audience: "¿Para quién es?",
  cta: "CTA final",
};

const R = (slug: string) => `/programas/internado/areas/${slug}`;

export const DEFAULT_INT_CONFIG: CbConfig = {
  hero: {
    breadcrumb: "Academia › Internado Médico",
    badge: "Internado Médico",
    title: "Vive tu internado con confianza, aprende con",
    highlight: "propósito",
    description:
      "Recursos, guías, casos clínicos y herramientas diseñadas para acompañarte en cada rotación y convertir cada día en una oportunidad de aprendizaje.",
    primaryLabel: "Explorar rotaciones",
    primaryHref: "/programas/internado/areas",
    secondaryLabel: "¿Cómo funciona?",
    secondaryHref: "/p/ayuda",
    chips: ["Guías por rotación", "Casos clínicos reales", "Evaluaciones y quizzes", "IA para dudas y apoyo"],
    holoCards: [
      "Medicina Interna",
      "Pediatría",
      "Cirugía",
      "Ginecología y Obstetricia",
      "Emergencias y Urgencias",
      "Atención Primaria",
    ],
    image: "/int/hero-internado.jpg",
    showEnvControls: true,
  },
  stats: [
    { value: "12+", label: "Rotaciones y áreas" },
    { value: "300+", label: "Guías y protocolos" },
    { value: "1000+", label: "Casos y preguntas" },
    { value: "24/7", label: "Disponible para ti" },
  ],
  intro: {
    title: "¿Cómo funciona tu internado en KotaMed?",
    subtitle: "Un camino claro para que aproveches cada rotación al máximo.",
    moreLabel: "Más información",
    moreHref: "/programas/internado/areas",
    steps: [
      { label: "Elige tu rotación", text: "Consulta guías y objetivos." },
      { label: "Estudia y prepárate", text: "Accede a recursos, clases y casos." },
      { label: "Aplica en la práctica", text: "Pon en práctica lo aprendido." },
      { label: "Reflexiona y evalúa", text: "Responde quizzes y recibe feedback." },
      { label: "Mejora continuamente", text: "Sigue aprendiendo y registra tu progreso." },
    ],
  },
  areas: {
    title: "Rotaciones y áreas del internado",
    subtitle: "Cada rotación con sus objetivos, guías, casos clínicos, procedimientos y evaluaciones.",
    allLabel: "Ver todas las rotaciones",
    allHref: "/programas/internado/areas",
    items: [
      { n: "01", title: "Medicina Interna", text: "Evalúa, diagnostica y maneja patologías prevalentes del adulto.", image: "/int/01-medicina-interna.jpg", href: R("medicina-interna") },
      { n: "02", title: "Pediatría", text: "Atención integral al niño sano y enfermo en todos sus niveles.", image: "/int/02-pediatria.jpg", href: R("pediatria-neonatologia") },
      { n: "03", title: "Ginecología y Obstetricia", text: "Salud sexual y reproductiva, control prenatal y parto seguro.", image: "/int/03-ginecologia.jpg", href: R("ginecologia-obstetricia") },
      { n: "04", title: "Cirugía", text: "Principios quirúrgicos, procedimientos y manejo perioperatorio.", image: "/int/04-cirugia.jpg", href: R("cirugia-general") },
      { n: "05", title: "Emergencias y Urgencias", text: "Atención inicial, triaje y manejo de situaciones críticas.", image: "/int/05-emergencias.jpg", href: R("emergencias") },
      { n: "06", title: "Atención Primaria de Salud", text: "Promoción, prevención y atención integral en la comunidad.", image: "/int/06-atencion-primaria.jpg", href: R("salud-comunitaria") },
      { n: "07", title: "Salud Mental", text: "Evaluación y abordaje de trastornos mentales frecuentes.", image: "/int/07-salud-mental.jpg", href: R("salud-comunitaria") },
      { n: "08", title: "Anestesiología", text: "Manejo anestésico básico y cuidado perioperatorio.", image: "/int/08-anestesiologia.jpg", href: R("cirugia-general") },
      { n: "09", title: "Radiología", text: "Interpretación básica de imágenes y estudios complementarios.", image: "/int/09-radiologia.jpg", href: R("medicina-interna") },
      { n: "10", title: "Patología Clínica", text: "Principios de laboratorio clínico e interpretación de resultados.", image: "/int/10-patologia.jpg", href: R("medicina-interna") },
      { n: "11", title: "Medicina Preventiva y Salud Pública", text: "Epidemiología, vigilancia y programas de salud.", image: "/int/11-preventiva.jpg", href: R("salud-comunitaria") },
      { n: "12", title: "Electivo", text: "Rotación a elección para complementar tu formación.", image: "/int/12-electivo.jpg", href: "/programas/internado/areas" },
    ],
  },
  path: {
    title: "Metodología KotaMed",
    stages: [
      { n: "01", title: "Prepara", text: "Estudia antes de cada rotación." },
      { n: "02", title: "Aplica", text: "Vive la experiencia en el campo clínico." },
      { n: "03", title: "Reflexiona", text: "Analiza, discute y aprende." },
      { n: "04", title: "Mejora", text: "Evalúa tu progreso y sigue avanzando." },
    ],
  },
  learn: {
    title: "Todo lo que necesitas para aprender y destacar",
    items: [
      "Guías y protocolos actualizados y basados en normas vigentes.",
      "Casos clínicos reales y comentados paso a paso.",
      "Quizzes y evaluaciones para poner a prueba tus conocimientos.",
      "KotaMed IA para resolver dudas y recibir apoyo académico.",
      "Registro de actividades que evidencia tu aprendizaje en cada rotación.",
    ],
    image: "/int/recursos.jpg",
  },
  method: {
    title: "¿Por qué KotaMed para tu internado?",
    subtitle: "Aprende haciendo, reflexiona y mejora cada día.",
    steps: [
      { title: "Contenido confiable", text: "Actualizado y basado en evidencia." },
      { title: "Enfoque práctico", text: "Pensado para el trabajo hospitalario real." },
      { title: "Docentes expertos", text: "Diseñado por médicos y tutores clínicos." },
      { title: "Acompañamiento 24/7", text: "Disponible en cualquier momento y lugar." },
    ],
  },
  ai: {
    title: "KotaMed IA, tu asistente de internado",
    subtitle: "Una inteligencia artificial diseñada para acompañarte durante cada rotación.",
    benefits: [
      "Resuelve tus dudas al instante",
      "Explicaciones claras y contextualizadas",
      "Recomendaciones de estudio personalizadas",
      "Apoyo en guardias y procedimientos",
      "Disponible 24/7 desde cualquier dispositivo",
    ],
    ctaLabel: "Probar KotaMed IA",
    ctaHref: "/dashboard",
    image: "/int/ai-internado.jpg",
  },
  three: {
    title: "Tu progreso, en un solo lugar",
    subtitle:
      "Sigue tus rotaciones y actividades completadas, revisa tu rendimiento en quizzes y recibe recomendaciones para mejorar.",
    ctaLabel: "Ver mi progreso",
    ctaHref: "/dashboard",
    image: "/int/progreso.jpg",
    systems: [
      "Rotaciones completadas",
      "Actividades registradas",
      "Quizzes y evaluaciones",
      "Rendimiento por área",
      "Recomendaciones personalizadas",
    ],
  },
  audience: {
    title: "¿Para quién es Internado KotaMed?",
    items: [
      { title: "Estudiantes de medicina", text: "Aprovecha al máximo tu internado." },
      { title: "Internos de medicina", text: "Organízate, aprende y destaca en cada rotación." },
      { title: "Docentes y tutores", text: "Recursos para enseñar y evaluar mejor." },
      { title: "Hospitales y universidades", text: "Plataforma adaptable a su plan de internado." },
    ],
  },
  cta: {
    title: "Tu internado puede ser mucho más que una rotación.",
    subtitle: "Conviértelo en una etapa de aprendizaje, práctica y crecimiento profesional.",
    primaryLabel: "Comenzar mi internado",
    primaryHref: "/auth",
    secondaryLabel: "Explorar rotaciones",
    secondaryHref: "/programas/internado/areas",
  },
  seo: {
    title: "Internado Médico | KotaMed",
    description:
      "Prepárate para tu internado médico con guías, casos clínicos, evaluaciones, herramientas y acompañamiento con inteligencia artificial.",
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

export function useIntConfig() {
  return useQuery({
    queryKey: ["int-config", INT_SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CbConfig> => {
      try {
        const { data } = await db.from("ui_menu_prefs").select("config").eq("scope", INT_SCOPE).maybeSingle();
        return mergeScienceConfig(data?.config ?? null, DEFAULT_INT_CONFIG);
      } catch {
        return DEFAULT_INT_CONFIG;
      }
    },
  });
}

/** Guarda el contenido de la página (solo administradores por RLS). */
export function useSaveIntConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CbConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert({ scope: INT_SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["int-config", INT_SCOPE], config);
      qc.invalidateQueries({ queryKey: ["int-config", INT_SCOPE] });
    },
  });
}
