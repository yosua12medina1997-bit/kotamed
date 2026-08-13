/**
 * KotaMed Dynamic Environment — configuración del HERO principal.
 *
 * Define los 7 estados ambientales (amanecer → noche), su iluminación y la
 * configuración editable del hero (textos, CTA, especialidades, intensidades).
 * La configuración se guarda en `ui_menu_prefs` con scope `hero-home`, de forma
 * que el administrador la edita desde KotaMed Studio sin tocar código. Si no
 * hay configuración guardada (o el visitante es anónimo) se usan los valores
 * por defecto.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EnvKey =
  | "amanecer"
  | "manana"
  | "dia"
  | "tarde"
  | "atardecer"
  | "anochecer"
  | "noche";

export type EnvState = {
  key: EnvKey;
  label: string;
  emoji: string;
  /** Hora de inicio (decimal, hora local). */
  from: number;
  /** Frase ambiental discreta. */
  caption: string;
  /** Gradiente del cielo / exterior. */
  sky: string;
  /** Velo de color sobre la escena. */
  veil: string;
  /** Filtros aplicados a la imagen base. */
  filter: string;
  /** Intensidad del glow holográfico (0–1). */
  glow: number;
  /** Luz ambiental interior del laboratorio (0–1). */
  ambient: number;
};

export const ENV_STATES: EnvState[] = [
  {
    key: "amanecer",
    label: "Amanecer",
    emoji: "🌅",
    from: 5,
    caption: "Un nuevo día para aprender.",
    sky: "linear-gradient(180deg, oklch(0.32 0.09 265 / 0.85) 0%, oklch(0.55 0.10 45 / 0.45) 55%, oklch(0.72 0.09 60 / 0.30) 100%)",
    veil: "radial-gradient(120% 90% at 12% 30%, oklch(0.78 0.10 60 / 0.20), transparent 60%)",
    filter: "brightness(0.9) saturate(1.05) contrast(1.04)",
    glow: 0.6,
    ambient: 0.55,
  },
  {
    key: "manana",
    label: "Mañana",
    emoji: "🌤️",
    from: 7,
    caption: "Energía y productividad clínica.",
    sky: "linear-gradient(180deg, oklch(0.72 0.10 240 / 0.55) 0%, oklch(0.88 0.06 230 / 0.28) 100%)",
    veil: "radial-gradient(120% 90% at 10% 20%, oklch(0.95 0.03 230 / 0.22), transparent 62%)",
    filter: "brightness(1.06) saturate(1.02) contrast(1.02)",
    glow: 0.45,
    ambient: 0.8,
  },
  {
    key: "dia",
    label: "Día",
    emoji: "☀️",
    from: 11,
    caption: "Claridad científica total.",
    sky: "linear-gradient(180deg, oklch(0.80 0.10 235 / 0.50) 0%, oklch(0.94 0.04 220 / 0.22) 100%)",
    veil: "radial-gradient(130% 100% at 8% 12%, oklch(0.98 0.02 220 / 0.26), transparent 60%)",
    filter: "brightness(1.14) saturate(0.98) contrast(1.01)",
    glow: 0.38,
    ambient: 1,
  },
  {
    key: "tarde",
    label: "Tarde",
    emoji: "🌤️",
    from: 16,
    caption: "Luz lateral, contraste cinematográfico.",
    sky: "linear-gradient(180deg, oklch(0.72 0.10 245 / 0.55) 0%, oklch(0.80 0.10 75 / 0.32) 100%)",
    veil: "radial-gradient(120% 90% at 85% 25%, oklch(0.85 0.11 70 / 0.24), transparent 60%)",
    filter: "brightness(1.04) saturate(1.08) contrast(1.03)",
    glow: 0.5,
    ambient: 0.8,
  },
  {
    key: "atardecer",
    label: "Atardecer",
    emoji: "🌇",
    from: 18.5,
    caption: "Mientras el día termina, el aprendizaje continúa.",
    sky: "linear-gradient(180deg, oklch(0.38 0.11 285 / 0.85) 0%, oklch(0.62 0.16 30 / 0.55) 50%, oklch(0.70 0.14 55 / 0.35) 100%)",
    veil: "radial-gradient(120% 95% at 15% 60%, oklch(0.65 0.17 25 / 0.26), transparent 62%)",
    filter: "brightness(0.96) saturate(1.16) contrast(1.06)",
    glow: 0.75,
    ambient: 0.5,
  },
  {
    key: "anochecer",
    label: "Anochecer",
    emoji: "🌆",
    from: 20,
    caption: "Ambiente sofisticado y futurista.",
    sky: "linear-gradient(180deg, oklch(0.24 0.07 265 / 0.90) 0%, oklch(0.32 0.08 255 / 0.60) 100%)",
    veil: "radial-gradient(120% 90% at 70% 70%, oklch(0.55 0.13 210 / 0.22), transparent 60%)",
    filter: "brightness(0.86) saturate(1.14) contrast(1.08)",
    glow: 0.88,
    ambient: 0.35,
  },
  {
    key: "noche",
    label: "Noche",
    emoji: "🌙",
    from: 23,
    caption: "KotaMed está contigo incluso cuando todos duermen.",
    sky: "linear-gradient(180deg, oklch(0.16 0.05 265 / 0.94) 0%, oklch(0.20 0.06 250 / 0.72) 100%)",
    veil: "radial-gradient(130% 100% at 60% 55%, oklch(0.55 0.12 195 / 0.26), transparent 62%)",
    filter: "brightness(0.74) saturate(1.2) contrast(1.12)",
    glow: 1,
    ambient: 0.22,
  },
];

export const ENV_BY_KEY: Record<EnvKey, EnvState> = ENV_STATES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<EnvKey, EnvState>,
);

/** Devuelve el estado ambiental correspondiente a una hora local decimal. */
export function envForHour(hour: number, states: EnvState[] = ENV_STATES): EnvState {
  const ordered = [...states].sort((a, b) => a.from - b.from);
  let current = ordered[ordered.length - 1]!;
  for (const s of ordered) if (hour >= s.from) current = s;
  // Antes del primer tramo (00:00–05:00) corresponde la noche.
  if (hour < ordered[0]!.from) current = ordered[ordered.length - 1]!;
  return current;
}

export type HeroSpecialty = {
  key: string;
  label: string;
  organ: string;
  description: string;
  /** Posición del hotspot sobre la escena, en porcentaje. */
  x: number;
  y: number;
  href?: string;
};

export const DEFAULT_SPECIALTIES: HeroSpecialty[] = [
  { key: "neuro", label: "Neurología", organ: "Cerebro", description: "Neuroanatomía, convulsiones y neurodesarrollo.", x: 67.5, y: 19, href: "/programas" },
  { key: "cardio", label: "Cardiología", organ: "Corazón", description: "Cardiopatías congénitas y hemodinamia.", x: 67, y: 43, href: "/programas" },
  { key: "neumo", label: "Neumología", organ: "Pulmones", description: "Ventilación, SDR y vía aérea.", x: 71.5, y: 45, href: "/programas" },
  { key: "gastro", label: "Gastroenterología", organ: "Sistema digestivo", description: "Nutrición enteral y patología digestiva.", x: 68.5, y: 55, href: "/programas" },
  { key: "nefro", label: "Nefrología", organ: "Riñones", description: "Equilibrio hidroelectrolítico y renal.", x: 64.5, y: 52, href: "/programas" },
  { key: "emerg", label: "Emergencias", organ: "Reanimación", description: "Soporte vital y estabilización.", x: 63, y: 33, href: "/programas" },
];

export const DEFAULT_PANELS = [
  "Neuroanatomía",
  "Cardiología",
  "Neumología",
  "Gastroenterología",
  "Pediatría",
  "Emergencias",
];

export type HeroConfig = {
  image: string | null;
  title: string;
  highlight: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  chips: string[];
  panels: string[];
  specialties: HeroSpecialty[];
  /** Multiplicador de iluminación (0.5–1.5). */
  lightIntensity: number;
  /** Multiplicador de glow (0–2). */
  glowIntensity: number;
  /** Duración de la transición entre ambientes, en segundos. */
  transitionSeconds: number;
  autoMode: boolean;
  organInteraction: boolean;
  accent: string;
  /* ---- KotaMed Dynamic Environment (ambiente global de la página) ---- */
  /** Activa el entorno de laboratorio detrás de toda la página. */
  envEnabled: boolean;
  /** Parallax al hacer scroll. */
  envParallax: boolean;
  /** Modo automático según hora local para el ambiente global. */
  envAuto: boolean;
  /** Imagen de extensión del escenario (skyline / arquitectura). */
  envImage: string | null;
  /** Blur ambiental de las capas de fondo, en px. */
  envBlur: number;
  /** Opacidad global del entorno (0–1). */
  envOpacity: number;
  /** Oscurecimiento del overlay de legibilidad (0–1). */
  envOverlay: number;
  /** Profundidad del parallax (0–2). */
  envDepth: number;

};

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  image: null,
  title: "Formamos hoy,\ncuidamos el",
  highlight: "mañana",
  description:
    "Aprende, practica y evoluciona con inteligencia artificial, casos reales, simulaciones de alta fidelidad y contenido médico basado en evidencia.",
  primaryLabel: "Comenzar mi aprendizaje",
  primaryHref: "/programas",
  secondaryLabel: "Explorar plataforma",
  secondaryHref: "/dashboard",
  chips: ["IA integrada", "Clases en vivo", "Contenido basado en evidencia", "Simulaciones"],
  panels: DEFAULT_PANELS,
  specialties: DEFAULT_SPECIALTIES,
  lightIntensity: 1,
  glowIntensity: 1,
  transitionSeconds: 8,
  autoMode: true,
  organInteraction: true,
  accent: "#00D8D0",
};

const HERO_SCOPE = "hero-home";
const db = supabase as any;

function mergeConfig(raw: any): HeroConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_HERO_CONFIG;
  return {
    ...DEFAULT_HERO_CONFIG,
    ...raw,
    chips: Array.isArray(raw.chips) && raw.chips.length ? raw.chips.map(String) : DEFAULT_HERO_CONFIG.chips,
    panels: Array.isArray(raw.panels) && raw.panels.length ? raw.panels.map(String) : DEFAULT_HERO_CONFIG.panels,
    specialties:
      Array.isArray(raw.specialties) && raw.specialties.length
        ? (raw.specialties as HeroSpecialty[])
        : DEFAULT_HERO_CONFIG.specialties,
  };
}

/** Lee la configuración del hero (con fallback silencioso a los valores por defecto). */
export function useHeroConfig() {
  return useQuery({
    queryKey: ["hero-config", HERO_SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<HeroConfig> => {
      try {
        const { data } = await db
          .from("ui_menu_prefs")
          .select("config")
          .eq("scope", HERO_SCOPE)
          .maybeSingle();
        return mergeConfig(data?.config ?? null);
      } catch {
        return DEFAULT_HERO_CONFIG;
      }
    },
  });
}

/** Guarda la configuración del hero (solo administradores por RLS). */
export function useSaveHeroConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: HeroConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert(
          { scope: HERO_SCOPE, config, updated_by: auth.user?.id ?? null },
          { onConflict: "scope" },
        );
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["hero-config", HERO_SCOPE], config);
    },
  });
}

/** Hora local en formato HH:MM y zona detectada, refrescada cada 30 s.
 *  Inicializa con valores estables para evitar saltos de hidratación SSR/cliente.
 */
export function useLocalClock() {
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => new Date(0));
  useEffect(() => {
    setHydrated(true);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!hydrated) {
      // Valores estables durante SSR e hidratación; se actualizan al montar.
      return { hour: 12, time: "--:--", city: "" };
    }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const city = zone.split("/").pop()?.replace(/_/g, " ") ?? "";
    return {
      hour: now.getHours() + now.getMinutes() / 60,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      city,
    };
  }, [now, hydrated]);
}

/** Detecta preferencia de movimiento reducido. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Modo visual optimizado en dispositivos de bajo rendimiento. */
export function useLowPerfMode() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const nav = navigator as any;
    const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
    const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    const saveData = !!nav.connection?.saveData;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    setLow(saveData || cores <= 4 || mem <= 4 || narrow);
  }, []);
  return low;
}
