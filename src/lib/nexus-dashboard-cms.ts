/**
 * Dashboard Nexus (panel del alumno) — configuración editable desde CMS Studio.
 * Solo textos, visibilidad de paneles y accesos rápidos. Nunca permisos,
 * matrículas ni roles: esos datos siempre vienen del sistema real con RLS.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const SCOPE = "nexus-dashboard";

export type DashboardAction = {
  title: string;
  hint: string;
  to: string;
  icon: "book" | "case" | "brain" | "calc" | "library" | "spark";
};

export type NexusDashboardConfig = {
  /** Cabecera: admite {saludo} y {nombre}. */
  headline: string;
  subtitle: string;
  /** Panel "Continúa donde lo dejaste". */
  continueEyebrow: string;
  continueEmptyTitle: string;
  continueCta: string;
  continueEmptyCta: string;
  completedLabel: string;
  /** Cursos en progreso. */
  coursesTitle: string;
  coursesLinkLabel: string;
  coursesMax: number;
  /** Progreso general. */
  progressTitle: string;
  progressCta: string;
  levelLabel: string;
  /** Hoy para ti. */
  todayTitle: string;
  todayActions: DashboardAction[];
  /** Tarjeta Kota AI. */
  aiTitle: string;
  aiSubtitle: string;
  aiCta: string;
  aiTo: string;
  /** Medical Core. */
  coreMaxNodes: number;
  /** Visibilidad de paneles. */
  showContinue: boolean;
  showCore: boolean;
  showCourses: boolean;
  showProgress: boolean;
  showToday: boolean;
  showAi: boolean;
};

export const DEFAULT_NEXUS_DASHBOARD: NexusDashboardConfig = {
  headline: "{saludo}, {nombre}",
  subtitle: "Tu entorno de inteligencia médica está listo.",
  continueEyebrow: "Continúa donde lo dejaste",
  continueEmptyTitle: "Comienza tu primer módulo",
  continueCta: "Continuar aprendiendo",
  continueEmptyCta: "Explorar programas",
  completedLabel: "Completado",
  coursesTitle: "Mis cursos en progreso",
  coursesLinkLabel: "Ver todos mis cursos",
  coursesMax: 3,
  progressTitle: "Tu progreso general",
  progressCta: "Ver mi progreso",
  levelLabel: "Nivel actual",
  todayTitle: "Hoy para ti",
  todayActions: [
    { title: "Continuar clase", hint: "Tu programa activo", to: "", icon: "book" },
    { title: "Resolver un caso", hint: "Casos clínicos guiados", to: "/programas/kotamed-apex", icon: "case" },
    { title: "Repasar flashcards", hint: "Repaso espaciado", to: "/programas", icon: "brain" },
  ],
  aiTitle: "KOTA AI",
  aiSubtitle: "Tu asistente médico inteligente",
  aiCta: "Pregúntame cualquier cosa",
  aiTo: "/anatomy-lab",
  coreMaxNodes: 5,
  showContinue: true,
  showCore: true,
  showCourses: true,
  showProgress: true,
  showToday: true,
  showAi: true,
};

function merge(raw: any): NexusDashboardConfig {
  const c = raw && typeof raw === "object" ? raw : {};
  const actions = Array.isArray(c.todayActions)
    ? c.todayActions
        .filter((a: any) => a && typeof a.title === "string")
        .map((a: any) => ({
          title: String(a.title),
          hint: String(a.hint ?? ""),
          to: String(a.to ?? ""),
          icon: (["book", "case", "brain", "calc", "library", "spark"] as const).includes(a.icon)
            ? a.icon
            : "book",
        }))
    : DEFAULT_NEXUS_DASHBOARD.todayActions;
  return {
    ...DEFAULT_NEXUS_DASHBOARD,
    ...c,
    coursesMax: Math.max(1, Math.min(12, Number(c.coursesMax) || DEFAULT_NEXUS_DASHBOARD.coursesMax)),
    coreMaxNodes: Math.max(3, Math.min(8, Number(c.coreMaxNodes) || DEFAULT_NEXUS_DASHBOARD.coreMaxNodes)),
    todayActions: actions,
  };
}

/** Reemplaza {saludo} y {nombre} en las plantillas de copy. */
export function fillTemplate(tpl: string, vars: { saludo: string; nombre: string }) {
  return (tpl ?? "")
    .replace(/\{saludo\}/gi, vars.saludo)
    .replace(/\{nombre\}/gi, vars.nombre);
}

export function useNexusDashboardConfig() {
  return useQuery({
    queryKey: ["nexus-dashboard-config", SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<NexusDashboardConfig> => {
      try {
        const { data } = await db
          .from("ui_menu_prefs")
          .select("config")
          .eq("scope", SCOPE)
          .maybeSingle();
        return merge(data?.config ?? null);
      } catch {
        return DEFAULT_NEXUS_DASHBOARD;
      }
    },
  });
}

/** Guarda la configuración (solo administradores por RLS de ui_menu_prefs). */
export function useSaveNexusDashboardConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: NexusDashboardConfig) => {
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
      qc.setQueryData(["nexus-dashboard-config", SCOPE], config);
      qc.invalidateQueries({ queryKey: ["nexus-dashboard-config", SCOPE] });
    },
  });
}
