/**
 * Página pública "Ciencias Clínicas" (/academia/ciencias-clinicas y /p/ciencias-clinicas).
 *
 * Reutiliza la misma estructura editable que Ciencias Básicas (hero inmersivo +
 * cuerpo académico blanco) pero con su propio contenido y su propio scope en
 * `ui_menu_prefs` (`page-ciencias-clinicas`). Lectura pública (anon),
 * escritura solo administradores por RLS.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeScienceConfig, type CbConfig, type CbSectionId } from "@/lib/ciencias-basicas-cms";

const db = supabase as any;
export const CC_SCOPE = "page-ciencias-clinicas";

export const CC_SECTION_LABEL: Record<CbSectionId, string> = {
  stats: "Barra de valor",
  intro: "Razonamiento clínico",
  areas: "Especialidades clínicas",
  path: "Ruta de aprendizaje",
  learn: "¿Qué aprenderás?",
  method: "Metodología KotaMed",
  ai: "KotaMed AI clínico",
  three: "Simulación 3D del paciente",
  audience: "¿Para quién es?",
  cta: "CTA final",
};

export const DEFAULT_CC_CONFIG: CbConfig = {
  hero: {
    breadcrumb: "Academia › Ciencias Clínicas",
    badge: "Ciencias Clínicas",
    title: "Aprende a pensar como un",
    highlight: "médico clínico",
    description:
      "Integra semiología, fisiopatología y toma de decisiones: evalúa, diagnostica y trata pacientes reales con simulación clínica y KotaMed AI.",
    primaryLabel: "Explorar Ciencias Clínicas",
    primaryHref: "/programas",
    secondaryLabel: "¿Cómo funciona?",
    secondaryHref: "/p/ayuda",
    chips: ["Casos clínicos reales", "Razonamiento diagnóstico", "Guías y evidencia", "KotaMed AI"],
    holoCards: ["Cardiología", "Neumología", "Neurología", "Gastroenterología", "Infectología", "Emergencias"],
    image: "/cc/hero-clinicas.jpg",
    showEnvControls: true,
  },
  stats: [
    { value: "12", label: "Especialidades clínicas" },
    { value: "900+", label: "Casos y clases clínicas" },
    { value: "IA", label: "Copiloto diagnóstico" },
    { value: "24/7", label: "Práctica simulada" },
  ],
  intro: {
    title: "¿Cómo se construye el razonamiento clínico?",
    subtitle:
      "Un método reproducible para pasar del síntoma al diagnóstico y del diagnóstico a un plan terapéutico seguro.",
    moreLabel: "Ver metodología clínica",
    moreHref: "/programas",
    steps: [
      { label: "Evaluar", text: "Anamnesis y examen físico" },
      { label: "Analizar", text: "Síndromes y mecanismos" },
      { label: "Diagnosticar", text: "Diferenciales priorizados" },
      { label: "Tratar", text: "Plan basado en evidencia" },
      { label: "Monitorizar", text: "Respuesta y complicaciones" },
      { label: "Decidir", text: "Alta, referencia o UCI" },
    ],
  },
  areas: {
    title: "Explora las especialidades clínicas",
    subtitle: "Domina cada especialidad con casos, imágenes, laboratorio y decisiones terapéuticas.",
    allLabel: "Ver todas las especialidades",
    allHref: "/programas",
    items: [
      { n: "01", title: "Cardiología", text: "ECG, insuficiencia cardiaca y síndrome coronario agudo.", image: "/cc/01-cardiologia.jpg", href: "/programas" },
      { n: "02", title: "Neumología", text: "Asma, EPOC, neumonías y manejo de la vía aérea.", image: "/cc/02-neumologia.jpg", href: "/programas" },
      { n: "03", title: "Gastroenterología", text: "Abdomen agudo, hepatopatías y hemorragia digestiva.", image: "/cc/03-gastroenterologia.jpg", href: "/programas" },
      { n: "04", title: "Nefrología", text: "Injuria renal aguda, electrolitos y ácido-base.", image: "/cc/04-nefrologia.jpg", href: "/programas" },
      { n: "05", title: "Endocrinología", text: "Diabetes, tiroides y emergencias metabólicas.", image: "/cc/05-endocrinologia.jpg", href: "/programas" },
      { n: "06", title: "Infectología", text: "Sepsis, antibioticoterapia y control de infecciones.", image: "/cc/06-infectologia.jpg", href: "/programas" },
      { n: "07", title: "Hematología", text: "Anemias, coagulopatías y transfusión.", image: "/cc/07-hematologia.jpg", href: "/programas" },
      { n: "08", title: "Neurología", text: "ACV, cefaleas, epilepsia y examen neurológico.", image: "/cc/08-neurologia.jpg", href: "/programas" },
      { n: "09", title: "Reumatología", text: "Artritis, enfermedades autoinmunes y dolor articular.", image: "/cc/09-reumatologia.jpg", href: "/programas" },
      { n: "10", title: "Dermatología", text: "Lesiones elementales y dermatosis frecuentes.", image: "/cc/10-dermatologia.jpg", href: "/programas" },
      { n: "11", title: "Pediatría", text: "Crecimiento, patología pediátrica y urgencias.", image: "/cc/11-pediatria.jpg", href: "/programas" },
      { n: "12", title: "Emergencias", text: "Triaje, reanimación y estabilización del paciente crítico.", image: "/cc/12-emergencias.jpg", href: "/programas" },
    ],
  },
  path: {
    title: "De la semiología a la decisión terapéutica",
    stages: [
      { n: "01", title: "Semiología", text: "Reconoce signos y síntomas con precisión." },
      { n: "02", title: "Síndromes", text: "Agrupa hallazgos en patrones clínicos." },
      { n: "03", title: "Diagnóstico", text: "Construye y prioriza diferenciales." },
      { n: "04", title: "Tratamiento", text: "Decide con evidencia, seguridad y seguimiento." },
    ],
  },
  learn: {
    title: "¿Qué aprenderás en Ciencias Clínicas?",
    items: [
      "Realizar una historia clínica y examen físico completos.",
      "Interpretar laboratorio, ECG e imágenes esenciales.",
      "Construir diagnósticos diferenciales priorizados.",
      "Aplicar guías clínicas actualizadas en cada decisión.",
      "Manejar urgencias y estabilizar al paciente crítico.",
      "Comunicar y documentar con estándar hospitalario.",
    ],
    image: "/cc/simulacion.jpg",
  },
  method: {
    title: "Metodología clínica KotaMed",
    subtitle: "Del caso al criterio: aprende decidiendo.",
    steps: [
      { title: "Caso real", text: "Empieza con un paciente, no con una lista." },
      { title: "Razonamiento", text: "Justifica cada hipótesis con hallazgos." },
      { title: "Evidencia", text: "Valida el plan con guías y literatura." },
      { title: "Decisión", text: "Ejecuta, monitoriza y reevalúa." },
    ],
  },
  ai: {
    title: "Tu copiloto clínico con inteligencia artificial",
    subtitle: "KotaMed AI razona contigo caso por caso, sin darte la respuesta masticada.",
    benefits: [
      "Diferenciales guiados por hallazgos",
      "Interpretación asistida de laboratorio e imágenes",
      "Dosis y ajustes terapéuticos verificados",
      "Preguntas socráticas para afianzar criterio",
      "Resúmenes clínicos listos para la historia",
    ],
    ctaLabel: "Conoce KotaMed AI",
    ctaHref: "/dashboard",
    image: "/cc/simulacion.jpg",
  },
  three: {
    title: "Explora al paciente en 3D",
    subtitle: "Recorre sistemas, correlaciona hallazgos y practica el examen físico sobre un modelo interactivo.",
    ctaLabel: "Abrir simulación 3D",
    ctaHref: "/anatomy-lab",
    image: "/cc/simulacion.jpg",
    systems: [
      "Cardiovascular",
      "Respiratorio",
      "Digestivo",
      "Neurológico",
      "Renal y metabólico",
    ],
  },
  audience: {
    title: "¿Para quién es Ciencias Clínicas?",
    items: [
      { title: "Estudiante de clínicas", text: "Convierte teoría en criterio clínico." },
      { title: "Interno y SERUMS", text: "Resuelve guardias con protocolos claros." },
      { title: "Preparación ENAM", text: "Domina los casos de mayor rendimiento." },
      { title: "Médico general", text: "Actualiza tu práctica con evidencia vigente." },
    ],
  },
  cta: {
    title: "Empieza hoy a razonar como un clínico de verdad.",
    subtitle: "Casos reales, simulación y KotaMed AI acompañando cada decisión.",
    primaryLabel: "Comenzar ahora",
    primaryHref: "/auth",
    secondaryLabel: "Explorar Academia",
    secondaryHref: "/programas",
  },
  seo: {
    title: "Ciencias Clínicas · KotaMed",
    description:
      "Domina el razonamiento clínico: semiología, 12 especialidades, casos reales, simulación 3D y KotaMed AI como copiloto diagnóstico.",
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

export function useCcConfig() {
  return useQuery({
    queryKey: ["cc-config", CC_SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CbConfig> => {
      try {
        const { data } = await db.from("ui_menu_prefs").select("config").eq("scope", CC_SCOPE).maybeSingle();
        return mergeScienceConfig(data?.config ?? null, DEFAULT_CC_CONFIG);
      } catch {
        return DEFAULT_CC_CONFIG;
      }
    },
  });
}

/** Guarda el contenido de la página (solo administradores por RLS). */
export function useSaveCcConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CbConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert({ scope: CC_SCOPE, config, is_public: true, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["cc-config", CC_SCOPE], config);
      qc.invalidateQueries({ queryKey: ["cc-config", CC_SCOPE] });
    },
  });
}
