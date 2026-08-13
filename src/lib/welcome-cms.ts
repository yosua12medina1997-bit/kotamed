/**
 * Experiencia post-matrícula (bienvenida premium) — textos editables desde CMS.
 * Solo copy/visibilidad: los datos del usuario (plan, programa, vigencia)
 * provienen siempre del sistema real con RLS. No toca autenticación ni roles.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const SCOPE = "post-enrollment-welcome";

export type WelcomeConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  checks: string[];
  greeting: string;
  tagline: string;
  ctaLabel: string;
  progressTitle: string;
  progressEmpty: string;
  helpUrl: string;
  showChecks: boolean;
  showPlanCard: boolean;
  showQuickLinks: boolean;
  showProgress: boolean;
  /** Frases contextuales por etapa/programa (clave = fragmento del slug/título). */
  programMessages: { key: string; label: string; message: string }[];
};

export const DEFAULT_WELCOME_CONFIG: WelcomeConfig = {
  eyebrow: "Admisión confirmada",
  title: "¡Bienvenido a KotaMed!",
  subtitle: "Tu matrícula ha sido completada correctamente.",
  checks: ["Matrícula confirmada", "Cuenta activada", "Acceso habilitado"],
  greeting: "Hola, {nombre}.",
  tagline: "Tu camino en KotaMed comienza ahora.",
  ctaLabel: "Entrar a mi espacio",
  progressTitle: "Tu progreso",
  progressEmpty: "Comienza tu primera actividad.",
  helpUrl: "/p/ayuda",
  showChecks: true,
  showPlanCard: true,
  showQuickLinks: true,
  showProgress: true,
  programMessages: [
    { key: "basicas", label: "Ciencias Básicas", message: "Construye una base sólida para comprender la medicina." },
    { key: "internado", label: "Internado", message: "Prepárate para llevar tus conocimientos al hospital." },
    { key: "enam", label: "Exámenes", message: "Prepárate para tu próximo gran objetivo." },
    { key: "essalud", label: "Exámenes", message: "Prepárate para tu próximo gran objetivo." },
    { key: "residentado", label: "Residentado", message: "Impulsa tu camino hacia la especialización." },
    { key: "r1", label: "Residencia", message: "Impulsa tu camino hacia la especialización." },
    { key: "r2", label: "Residencia", message: "Impulsa tu camino hacia la especialización." },
    { key: "r3", label: "Especialista", message: "Continúa creciendo como profesional." },
  ],
};

function merge(raw: any): WelcomeConfig {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    ...DEFAULT_WELCOME_CONFIG,
    ...c,
    checks: Array.isArray(c.checks) ? c.checks.map(String) : DEFAULT_WELCOME_CONFIG.checks,
    programMessages: Array.isArray(c.programMessages)
      ? c.programMessages.filter((m: any) => m && typeof m.key === "string")
      : DEFAULT_WELCOME_CONFIG.programMessages,
  };
}

/** Mensaje contextual según el programa matriculado. */
export function messageForProgram(cfg: WelcomeConfig, slugOrTitle: string | null | undefined) {
  const hay = (slugOrTitle ?? "").toLowerCase();
  if (!hay) return cfg.tagline;
  const found = cfg.programMessages.find((m) => hay.includes(m.key.toLowerCase()));
  return found?.message ?? cfg.tagline;
}

export function useWelcomeConfig() {
  return useQuery({
    queryKey: ["welcome-config", SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<WelcomeConfig> => {
      try {
        const { data } = await db
          .from("ui_menu_prefs")
          .select("config")
          .eq("scope", SCOPE)
          .maybeSingle();
        return merge(data?.config ?? null);
      } catch {
        return DEFAULT_WELCOME_CONFIG;
      }
    },
  });
}

/** Guarda la copy (solo administradores por RLS de ui_menu_prefs). */
export function useSaveWelcomeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: WelcomeConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert(
          { scope: SCOPE, config, updated_by: auth.user?.id ?? null },
          { onConflict: "scope" },
        );
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["welcome-config", SCOPE], config);
      qc.invalidateQueries({ queryKey: ["welcome-config", SCOPE] });
    },
  });
}
