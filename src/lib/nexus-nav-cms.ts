/**
 * Navegación dinámica del Panel del Alumno (Nexus), administrable al 100%
 * desde CMS Studio. Se guarda en `ui_menu_prefs` con scope `nexus-nav`.
 * Nunca define permisos reales: solo qué accesos se muestran y a dónde apuntan.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  ClipboardList,
  GraduationCap,
  Home,
  Library,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const SCOPE = "nexus-nav";

export const NAV_ICONS = {
  home: Home,
  courses: GraduationCap,
  clinic: Stethoscope,
  ai: Sparkles,
  exams: ClipboardList,
  library: Library,
  progress: BarChart3,
  book: BookOpen,
  brain: Brain,
  calc: Calculator,
  team: Users,
} as const;

export type NavIcon = keyof typeof NAV_ICONS;

export type NavVisibility = "all" | "enrolled" | "admin" | "super_admin";

export type NexusNavItem = {
  id: string;
  label: string;
  to: string;
  icon: NavIcon;
  hint: string;
  enabled: boolean;
  newTab: boolean;
  visibility: NavVisibility;
};

export type NexusNavConfig = {
  items: NexusNavItem[];
  showProfile: boolean;
  showSettings: boolean;
  searchPlaceholder: string;
};

export const DEFAULT_NEXUS_NAV: NexusNavConfig = {
  searchPlaceholder: "Buscar cursos, temas, clases, casos...",
  showProfile: true,
  showSettings: true,
  items: [
    { id: "inicio", label: "Inicio", to: "/dashboard", icon: "home", hint: "Panel principal", enabled: true, newTab: false, visibility: "all" },
    { id: "mis-cursos", label: "Mis cursos", to: "/mis-cursos", icon: "courses", hint: "Programas matriculados", enabled: true, newTab: false, visibility: "all" },
    { id: "clinica", label: "Clínica", to: "/programas/internado/areas", icon: "clinic", hint: "Rotaciones clínicas", enabled: true, newTab: false, visibility: "all" },
    { id: "kota-ai", label: "Kota AI", to: "/anatomy-lab", icon: "ai", hint: "Asistente inteligente", enabled: true, newTab: false, visibility: "all" },
    { id: "evaluaciones", label: "Evaluaciones", to: "/programas/kotamed-apex", icon: "exams", hint: "Exámenes y simulacros", enabled: true, newTab: false, visibility: "all" },
    { id: "biblioteca", label: "Biblioteca", to: "/biblioteca", icon: "library", hint: "Biblioteca Universal", enabled: true, newTab: false, visibility: "all" },
    { id: "progreso", label: "Mi progreso", to: "/mis-cursos", icon: "progress", hint: "Avance académico", enabled: true, newTab: false, visibility: "all" },
  ],
};

function slugId(label: string) {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `item-${Math.random().toString(36).slice(2, 7)}`
  );
}

function merge(raw: any): NexusNavConfig {
  const c = raw && typeof raw === "object" ? raw : {};
  const items = Array.isArray(c.items)
    ? c.items
        .filter((i: any) => i && typeof i.label === "string" && i.label.trim())
        .map((i: any, idx: number): NexusNavItem => ({
          id: String(i.id ?? slugId(i.label) ?? idx),
          label: String(i.label),
          to: String(i.to ?? "/dashboard"),
          icon: (Object.keys(NAV_ICONS) as NavIcon[]).includes(i.icon) ? i.icon : "book",
          hint: String(i.hint ?? ""),
          enabled: i.enabled !== false,
          newTab: i.newTab === true,
          visibility: (["all", "enrolled", "admin", "super_admin"] as NavVisibility[]).includes(i.visibility)
            ? i.visibility
            : "all",
        }))
    : DEFAULT_NEXUS_NAV.items;
  return {
    items: items.length > 0 ? items : DEFAULT_NEXUS_NAV.items,
    showProfile: c.showProfile !== false,
    showSettings: c.showSettings !== false,
    searchPlaceholder: String(c.searchPlaceholder ?? DEFAULT_NEXUS_NAV.searchPlaceholder),
  };
}

export function newNavItem(): NexusNavItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 7)}`,
    label: "Nuevo acceso",
    to: "/dashboard",
    icon: "book",
    hint: "",
    enabled: true,
    newTab: false,
    visibility: "all",
  };
}

/** Lee la navegación del panel (con valores por defecto si aún no existe). */
export function useNexusNav() {
  return useQuery({
    queryKey: ["nexus-nav", SCOPE],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<NexusNavConfig> => {
      try {
        const { data } = await db
          .from("ui_menu_prefs")
          .select("config")
          .eq("scope", SCOPE)
          .maybeSingle();
        return merge(data?.config ?? null);
      } catch {
        return DEFAULT_NEXUS_NAV;
      }
    },
  });
}

/** Guarda la navegación (solo administradores, según RLS de ui_menu_prefs). */
export function useSaveNexusNav() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: NexusNavConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert({ scope: SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["nexus-nav", SCOPE], config);
      qc.invalidateQueries({ queryKey: ["nexus-nav", SCOPE] });
    },
  });
}

/** Filtra accesos según el rol / matrícula real del usuario. */
export function visibleNavItems(
  items: NexusNavItem[],
  ctx: { enrolled: boolean; isAdmin: boolean; isSuperAdmin: boolean },
) {
  return items.filter((i) => {
    if (!i.enabled) return false;
    if (i.visibility === "enrolled") return ctx.enrolled || ctx.isAdmin || ctx.isSuperAdmin;
    if (i.visibility === "admin") return ctx.isAdmin || ctx.isSuperAdmin;
    if (i.visibility === "super_admin") return ctx.isSuperAdmin;
    return true;
  });
}
