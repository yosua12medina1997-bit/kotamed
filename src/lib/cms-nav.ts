/**
 * Navegación editable del sitio (cabecera y pie) — Fase 3 del CMS KotaMed.
 * Los administradores pueden añadir, editar, ocultar, mover, duplicar y anidar
 * elementos (mega menú / submenús) desde CMS Studio.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NavLocation = "header" | "footer";

export type CmsNavItem = {
  id: string;
  location: NavLocation;
  parent_id: string | null;
  label: string;
  href: string;
  icon: string | null;
  badge: string | null;
  description: string | null;
  group_label: string | null;
  is_cta: boolean;
  sort_order: number;
  visible: boolean;
};

export type CmsNavNode = CmsNavItem & { children: CmsNavItem[] };

const COLS =
  "id, location, parent_id, label, href, icon, badge, description, group_label, is_cta, sort_order, visible";

function toTree(rows: CmsNavItem[]): CmsNavNode[] {
  const roots = rows.filter((r) => !r.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  return roots.map((r) => ({
    ...r,
    children: rows
      .filter((c) => c.parent_id === r.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

/** Navegación pública (solo elementos visibles). */
export function useSiteNav(location: NavLocation) {
  return useQuery({
    queryKey: ["cms-nav", location],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_nav_items")
        .select(COLS)
        .eq("location", location)
        .eq("visible", true)
        .order("sort_order");
      if (error) throw error;
      return toTree((data ?? []) as unknown as CmsNavItem[]);
    },
  });
}

/** Navegación completa para administración (incluye ocultos). */
export function useAdminNav(location: NavLocation) {
  return useQuery({
    queryKey: ["cms-nav-admin", location],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_nav_items")
        .select(COLS)
        .eq("location", location)
        .order("sort_order");
      if (error) throw error;
      return toTree((data ?? []) as unknown as CmsNavItem[]);
    },
  });
}

export function useSaveNavItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsNavItem> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase.from("cms_nav_items").update(rest as never).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("cms_nav_items")
        .insert(patch as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-nav"] });
      qc.invalidateQueries({ queryKey: ["cms-nav-admin"] });
    },
  });
}

export function useDeleteNavItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_nav_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-nav"] });
      qc.invalidateQueries({ queryKey: ["cms-nav-admin"] });
    },
  });
}

export function useReorderNav() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase.from("cms_nav_items").update({ sort_order: i }).eq("id", ids[i]!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-nav"] });
      qc.invalidateQueries({ queryKey: ["cms-nav-admin"] });
    },
  });
}

/* ------------------------- Navegación por defecto ------------------- */

type SeedItem = {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  is_cta?: boolean;
  children?: { label: string; href: string; icon?: string; description?: string }[];
};

export const DEFAULT_HEADER: SeedItem[] = [
  { label: "Inicio", href: "/", icon: "Home" },
  { label: "Programas", href: "/programas", icon: "Layers" },
  {
    label: "Academia",
    href: "/programas",
    icon: "GraduationCap",
    children: [
      { label: "Todos los programas", href: "/programas", icon: "Layers", description: "Catálogo académico completo" },
      { label: "Ciencias básicas", href: "/p/ciencias-basicas", icon: "FlaskConical", description: "Fundamentos preclínicos" },
      { label: "Ciencias clínicas", href: "/p/ciencias-clinicas", icon: "Stethoscope", description: "Semiología y clínica médica" },
      { label: "Internado médico", href: "/p/internado", icon: "ClipboardList", description: "Rotaciones y hospitalización" },
      { label: "ENAM", href: "/p/enam", icon: "Trophy", description: "Preparación intensiva" },  
      { label: "Residentado médico", href: "/p/residentado", icon: "Award", description: "Especialidades y subespecialidades" },
    ],
  },
  {
    label: "Recursos",
    href: "/p/biblioteca",
    icon: "BookOpen",
    children: [
      { label: "Biblioteca clínica", href: "/p/biblioteca", icon: "BookOpen", description: "Guías, papers y manuales" },
      { label: "Simuladores", href: "/p/simuladores", icon: "MonitorPlay", description: "Casos y escenarios interactivos" },
      { label: "Calculadoras", href: "/p/calculadoras", icon: "Activity", description: "Herramientas clínicas" },
    ],
  },
  { label: "Docentes", href: "/p/docentes", icon: "Users" },
  { label: "Planes", href: "/p/planes", icon: "Crown" },
  { label: "Contacto", href: "/p/contacto", icon: "Mail" },
  { label: "Iniciar sesión", href: "/auth", icon: "LogIn" },
  { label: "Comenzar ahora", href: "/programas", icon: "ArrowRight", is_cta: true },
];

export const DEFAULT_FOOTER: SeedItem[] = [
  {
    label: "Academia",
    href: "/programas",
    children: [
      { label: "Programas", href: "/programas" },
      { label: "Planes y precios", href: "/p/planes" },
      { label: "Docentes", href: "/p/docentes" },
    ],
  },
  {
    label: "Institucional",
    href: "/p/nosotros",
    children: [
      { label: "Nosotros", href: "/p/nosotros" },
      { label: "Contacto", href: "/p/contacto" },
      { label: "Preguntas frecuentes", href: "/p/faq" },
    ],
  },
  {
    label: "Legal",
    href: "/p/terminos",
    children: [
      { label: "Términos y condiciones", href: "/p/terminos" },
      { label: "Política de privacidad", href: "/p/privacidad" },
    ],
  },
];

/** Crea la navegación por defecto si aún no existe. */
export function useSeedNav() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { count } = await supabase
        .from("cms_nav_items")
        .select("id", { count: "exact", head: true });
      if ((count ?? 0) > 0) return 0;

      let created = 0;
      const seed = async (location: NavLocation, items: SeedItem[]) => {
        for (let i = 0; i < items.length; i++) {
          const it = items[i]!;
          const { data, error } = await supabase
            .from("cms_nav_items")
            .insert({
              location,
              label: it.label,
              href: it.href,
              icon: it.icon ?? null,
              badge: it.badge ?? null,
              is_cta: it.is_cta ?? false,
              sort_order: i,
            } as never)
            .select("id")
            .single();
          if (error) throw error;
          created++;
          const parentId = (data as { id: string }).id;
          for (let j = 0; j < (it.children?.length ?? 0); j++) {
            const c = it.children![j]!;
            const { error: e2 } = await supabase.from("cms_nav_items").insert({
              location,
              parent_id: parentId,
              label: c.label,
              href: c.href,
              icon: c.icon ?? null,
              description: c.description ?? null,
              sort_order: j,
            } as never);
            if (e2) throw e2;
            created++;
          }
        }
      };

      await seed("header", DEFAULT_HEADER);
      await seed("footer", DEFAULT_FOOTER);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-nav"] });
      qc.invalidateQueries({ queryKey: ["cms-nav-admin"] });
    },
  });
}
