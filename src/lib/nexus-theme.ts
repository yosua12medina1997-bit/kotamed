/**
 * KOTAMED NEXUS — Adaptive Medical Learning Environment (solo capa visual).
 * Gestiona la apariencia del usuario final: Claro, Oscuro y Ambiente
 * (adaptación suave a la hora local y, si está disponible, al clima).
 * No toca datos, permisos ni rutas.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export type Appearance = "light" | "dark" | "ambient";
export type Phase = "morning" | "afternoon" | "dusk" | "night";
export type Weather = "clear" | "cloudy" | "rain" | "unknown";

const KEY = "kotamed:nexus-appearance";

export function phaseFor(date = new Date()): Phase {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 20) return "dusk";
  return "night";
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Ambientes: gradiente de fondo + intensidad del Medical Core por fase. */
const AMBIENT: Record<
  Phase,
  { base: "light" | "dark"; glow: string; core: number; label: string }
> = {
  morning: {
    base: "light",
    glow:
      "radial-gradient(120% 90% at 15% -10%, rgba(39,199,216,0.20), transparent 62%), radial-gradient(90% 80% at 100% 0%, rgba(47,128,237,0.14), transparent 60%)",
    core: 0.85,
    label: "Mañana",
  },
  afternoon: {
    base: "light",
    glow:
      "radial-gradient(120% 90% at 50% -20%, rgba(33,183,181,0.16), transparent 60%), radial-gradient(80% 70% at 100% 100%, rgba(47,128,237,0.10), transparent 62%)",
    core: 1,
    label: "Tarde",
  },
  dusk: {
    base: "dark",
    glow:
      "radial-gradient(120% 95% at 30% -10%, rgba(39,199,216,0.24), transparent 62%), radial-gradient(90% 80% at 100% 10%, rgba(124,110,220,0.20), transparent 62%)",
    core: 1.1,
    label: "Atardecer",
  },
  night: {
    base: "dark",
    glow:
      "radial-gradient(120% 90% at 50% -15%, rgba(33,183,181,0.18), transparent 60%), radial-gradient(80% 70% at 90% 100%, rgba(47,128,237,0.14), transparent 62%)",
    core: 1.25,
    label: "Noche",
  },
};

const WEATHER_TUNE: Record<Weather, { brightness: number; saturation: number }> = {
  clear: { brightness: 1.03, saturation: 1.05 },
  cloudy: { brightness: 0.98, saturation: 0.9 },
  rain: { brightness: 0.95, saturation: 0.85 },
  unknown: { brightness: 1, saturation: 1 },
};

export interface NexusEnv {
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  /** Base efectiva aplicada a los tokens de color. */
  base: "light" | "dark";
  phase: Phase;
  phaseLabel: string;
  weather: Weather;
  greeting: string;
  /** Estilos ambientales para el contenedor raíz. */
  ambientStyle: React.CSSProperties;
  coreIntensity: number;
  reducedMotion: boolean;
  lowPower: boolean;
}

export function useNexusEnv(): NexusEnv {
  const [appearance, setAppearanceState] = useState<Appearance>("ambient");
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather>("unknown");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);

  // Preferencia guardada por usuario (localStorage, sin backend).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY) as Appearance | null;
      if (saved === "light" || saved === "dark" || saved === "ambient") {
        setAppearanceState(saved);
      }
    } catch {
      /* noop */
    }
  }, []);

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a);
    try {
      window.localStorage.setItem(KEY, a);
    } catch {
      /* noop */
    }
  }, []);

  // Reloj ambiental: revisa cada minuto para transiciones progresivas.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", on);
    const cores = navigator.hardwareConcurrency ?? 4;
    setLowPower(cores <= 4 || window.innerWidth < 768);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Clima opcional: si el navegador no da permiso, se ignora en silencio.
  useEffect(() => {
    if (appearance !== "ambient" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=weather_code`,
          );
          if (!res.ok) return;
          const json = (await res.json()) as { current?: { weather_code?: number } };
          const code = json.current?.weather_code ?? -1;
          if (cancelled || code < 0) return;
          setWeather(code === 0 || code === 1 ? "clear" : code <= 48 ? "cloudy" : "rain");
        } catch {
          /* clima opcional */
        }
      },
      () => undefined,
      { timeout: 6000, maximumAge: 900_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [appearance]);

  const phase = phaseFor(now);
  const cfg = AMBIENT[phase];
  const base: "light" | "dark" =
    appearance === "light" ? "light" : appearance === "dark" ? "dark" : cfg.base;

  const tune = WEATHER_TUNE[appearance === "ambient" ? weather : "unknown"];

  const ambientStyle = useMemo<React.CSSProperties>(() => {
    const glow =
      appearance === "ambient"
        ? cfg.glow
        : appearance === "dark"
          ? AMBIENT.night.glow
          : AMBIENT.afternoon.glow;
    return {
      "--nexus-ambient": glow,
      "--nexus-brightness": String(tune.brightness),
      "--nexus-saturation": String(tune.saturation),
    } as React.CSSProperties;
  }, [appearance, cfg.glow, tune.brightness, tune.saturation]);

  return {
    appearance,
    setAppearance,
    base,
    phase,
    phaseLabel: cfg.label,
    weather,
    greeting: greetingFor(now),
    ambientStyle,
    coreIntensity:
      appearance === "ambient" ? cfg.core : appearance === "dark" ? 1.2 : 1,
    reducedMotion,
    lowPower,
  };
}
