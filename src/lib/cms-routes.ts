/**
 * Sistema centralizado de rutas del CMS KotaMed.
 *
 * - Cada página del CMS tiene una ruta calculada: `/` si es la página
 *   principal, o `/p/<slug>` en el resto de casos.
 * - Los enlaces de bloques y menús pueden guardarse como `page:<uuid>`.
 *   Así, si más adelante cambia el slug (o la página pasa a ser Home),
 *   todos los enlaces del sitio se actualizan automáticamente.
 * - Las redirecciones (`cms_redirects`) evitan 404 al renombrar rutas.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/lib/session";
import type { CmsPage } from "@/lib/cms";

export const PAGE_LINK_PREFIX = "page:";

export type CmsRedirect = {
  id: string;
  from_path: string;
  to_path: string;
  code: number;
  is_active: boolean;
  note: string | null;
  created_at: string;
};

export type RouteEntry = {
  pageId: string;
  title: string;
  slug: string;
  path: string;
  isHome: boolean;
  status: string;
  kind: string;
};

/** Ruta pública de una página. */
export function pagePath(slug: string, isHome: boolean) {
  return isHome ? "/" : `/p/${slug}`;
}

export function isPageLink(href?: string | null) {
  return !!href && href.startsWith(PAGE_LINK_PREFIX);
}

export function pageLink(pageId: string) {
  return `${PAGE_LINK_PREFIX}${pageId}`;
}

/* ------------------------------ Home page ------------------------------ */

export function useHomePageId() {
  return useQuery({
    queryKey: ["cms-home-page"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_settings")
        .select("home_page_id")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return ((data as { home_page_id?: string | null } | null)?.home_page_id ?? null) as string | null;
    },
  });
}

export function useSetHomePage() {
  const qc = useQueryClient();
  const user = useSupabaseUser();
  return useMutation({
    mutationFn: async (pageId: string | null) => {
      const { error } = await supabase
        .from("cms_settings")
        .upsert({ id: "global", home_page_id: pageId, updated_by: user?.id ?? null } as never, {
          onConflict: "id",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-home-page"] });
      qc.invalidateQueries({ queryKey: ["cms-route-map"] });
      qc.invalidateQueries({ queryKey: ["cms-settings"] });
    },
  });
}

/* ------------------------------- Route map ----------------------------- */

/**
 * Mapa `pageId → ruta`, construido con las páginas publicadas (producción) y,
 * cuando el usuario tiene permisos, también con los borradores.
 */
export function useRouteMap() {
  const home = useHomePageId();
  const query = useQuery({
    queryKey: ["cms-route-map"],
    staleTime: 30_000,
    queryFn: async () => {
      const out = new Map<string, { slug: string; title: string; status: string }>();
      const { data: published } = await supabase
        .from("cms_published")
        .select("page_id,slug,title");
      for (const r of (published ?? []) as { page_id: string; slug: string; title: string }[]) {
        out.set(r.page_id, { slug: r.slug, title: r.title, status: "published" });
      }
      const { data: drafts } = await supabase.from("cms_pages").select("id,slug,title,status");
      for (const r of (drafts ?? []) as { id: string; slug: string; title: string; status: string }[]) {
        if (!out.has(r.id)) out.set(r.id, { slug: r.slug, title: r.title, status: r.status });
      }
      return out;
    },
  });

  const resolve = useMemo(() => {
    const map = query.data;
    const homeId = home.data ?? null;
    return (href?: string | null): string => {
      if (!href) return "#";
      if (!isPageLink(href)) return href;
      const id = href.slice(PAGE_LINK_PREFIX.length);
      const row = map?.get(id);
      if (!row) return "#";
      return pagePath(row.slug, homeId === id);
    };
  }, [query.data, home.data]);

  return { ...query, homeId: home.data ?? null, resolve };
}

/** Lista de rutas del sitio administrada desde el CMS. */
export function useSiteRoutes(pages: CmsPage[]) {
  const { data: homeId } = useHomePageId();
  return useMemo<RouteEntry[]>(
    () =>
      pages
        .map((p) => ({
          pageId: p.id,
          title: p.title,
          slug: p.slug,
          isHome: homeId === p.id,
          path: pagePath(p.slug, homeId === p.id),
          status: p.status,
          kind: p.kind,
        }))
        .sort((a, b) => Number(b.isHome) - Number(a.isHome) || a.title.localeCompare(b.title)),
    [pages, homeId],
  );
}

/* ------------------------------ Redirecciones -------------------------- */

export function useRedirects() {
  return useQuery({
    queryKey: ["cms-redirects"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_redirects")
        .select("id,from_path,to_path,code,is_active,note,created_at")
        .order("from_path");
      if (error) throw error;
      return (data ?? []) as CmsRedirect[];
    },
  });
}

export function normalizePath(p: string) {
  const t = p.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return ("/" + t.replace(/^\/+/, "")).replace(/\/+$/, "") || "/";
}

export function useSaveRedirect() {
  const qc = useQueryClient();
  const user = useSupabaseUser();
  return useMutation({
    mutationFn: async (input: Partial<CmsRedirect> & { from_path: string; to_path: string }) => {
      const row = {
        from_path: normalizePath(input.from_path),
        to_path: normalizePath(input.to_path),
        code: input.code ?? 301,
        is_active: input.is_active ?? true,
        note: input.note ?? null,
      };
      if (row.from_path === row.to_path) throw new Error("El origen y el destino no pueden ser iguales.");
      if (input.id) {
        const { error } = await supabase.from("cms_redirects").update(row as never).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("cms_redirects")
        .upsert({ ...row, created_by: user?.id ?? null } as never, { onConflict: "from_path" })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-redirects"] }),
  });
}

export function useDeleteRedirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_redirects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-redirects"] }),
  });
}

/** Busca la redirección activa que aplica a una ruta. */
export function useRedirectFor(path: string | null) {
  return useQuery({
    queryKey: ["cms-redirect-for", path],
    enabled: !!path,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_redirects")
        .select("id,from_path,to_path,code,is_active,note,created_at")
        .eq("from_path", normalizePath(path!))
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CmsRedirect | null;
    },
  });
}

/* ------------------------------- Validador ----------------------------- */

export type RouteIssue = {
  level: "error" | "warning";
  scope: string;
  label: string;
  detail: string;
};

export type RouteAudit = { ok: number; issues: RouteIssue[] };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Analiza rutas duplicadas, slugs inválidos, enlaces vacíos o rotos,
 * menús sin destino y redirecciones circulares o inexistentes.
 */
export function auditRoutes(input: {
  routes: RouteEntry[];
  redirects: CmsRedirect[];
  links: { scope: string; label: string; href: string | null | undefined }[];
  homeId: string | null;
}): RouteAudit {
  const { routes, redirects, links, homeId } = input;
  const issues: RouteIssue[] = [];
  let ok = 0;

  const paths = new Map<string, RouteEntry[]>();
  for (const r of routes) {
    if (!SLUG_RE.test(r.slug) && !r.isHome) {
      issues.push({
        level: "error",
        scope: "Páginas",
        label: r.title,
        detail: `Slug inválido: "${r.slug}". Usa solo minúsculas, números y guiones.`,
      });
    } else ok++;
    const list = paths.get(r.path) ?? [];
    list.push(r);
    paths.set(r.path, list);
  }
  for (const [path, list] of paths) {
    if (list.length > 1) {
      issues.push({
        level: "error",
        scope: "Rutas",
        label: path,
        detail: `Ruta duplicada en ${list.length} páginas: ${list.map((l) => l.title).join(", ")}.`,
      });
    }
  }
  if (!homeId) {
    issues.push({
      level: "warning",
      scope: "Rutas",
      label: "Página principal",
      detail: "Ninguna página del CMS está marcada como Home; se usa la portada por defecto.",
    });
  }

  const validPaths = new Set(routes.map((r) => r.path));
  const pageIds = new Set(routes.map((r) => r.pageId));

  for (const l of links) {
    const href = (l.href ?? "").trim();
    if (!href || href === "#") {
      issues.push({
        level: "warning",
        scope: l.scope,
        label: l.label,
        detail: "Enlace sin destino configurado.",
      });
      continue;
    }
    if (isPageLink(href)) {
      const id = href.slice(PAGE_LINK_PREFIX.length);
      if (!pageIds.has(id)) {
        issues.push({
          level: "error",
          scope: l.scope,
          label: l.label,
          detail: "Apunta a una página del CMS que ya no existe.",
        });
      } else ok++;
      continue;
    }
    if (/^https?:\/\//i.test(href)) {
      try {
        new URL(href);
        ok++;
      } catch {
        issues.push({ level: "error", scope: l.scope, label: l.label, detail: `URL externa inválida: ${href}` });
      }
      continue;
    }
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      ok++;
      continue;
    }
    if (!href.startsWith("/")) {
      issues.push({
        level: "error",
        scope: l.scope,
        label: l.label,
        detail: `Destino mal formado: "${href}". Debe empezar por "/" o ser una URL completa.`,
      });
      continue;
    }
    const base = normalizePath(href.split(/[?#]/)[0] ?? href);
    const isCms = base.startsWith("/p/");
    const covered = redirects.some((r) => r.is_active && r.from_path === base);
    if (isCms && !validPaths.has(base) && !covered) {
      issues.push({
        level: "error",
        scope: l.scope,
        label: l.label,
        detail: `Enlace roto: ${base} no corresponde a ninguna página del CMS.`,
      });
    } else ok++;
  }

  const byFrom = new Map(redirects.map((r) => [r.from_path, r]));
  for (const r of redirects) {
    if (r.from_path === r.to_path) {
      issues.push({
        level: "error",
        scope: "Redirecciones",
        label: r.from_path,
        detail: "Redirección circular (origen igual al destino).",
      });
      continue;
    }
    let cursor = r.to_path;
    const seen = new Set([r.from_path]);
    let circular = false;
    for (let i = 0; i < 10; i++) {
      const next = byFrom.get(cursor);
      if (!next) break;
      if (seen.has(next.from_path)) {
        circular = true;
        break;
      }
      seen.add(next.from_path);
      cursor = next.to_path;
    }
    if (circular) {
      issues.push({
        level: "error",
        scope: "Redirecciones",
        label: r.from_path,
        detail: "Cadena de redirecciones circular.",
      });
      continue;
    }
    if (r.to_path.startsWith("/p/") && !validPaths.has(r.to_path)) {
      issues.push({
        level: "warning",
        scope: "Redirecciones",
        label: r.from_path,
        detail: `El destino ${r.to_path} no existe todavía en el CMS.`,
      });
      continue;
    }
    ok++;
  }

  return { ok, issues };
}
