/**
 * Catálogo académico vivo: fusiona los programas estáticos con lo que el
 * administrador edita en el Editor de contenido (`content_nodes`).
 * Así el dashboard y el índice de programas reflejan los cambios al instante.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAMS, type Program } from "@/lib/pediatria-programs";

export type CatalogNode = {
  id: string;
  parent_id: string | null;
  kind: string;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

/** Todos los nodos de contenido visibles (admins ven también los borradores por RLS). */
export function useContentNodes() {
  return useQuery({
    queryKey: ["content-catalog-nodes"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,parent_id,kind,title,slug,description,sort_order,is_published")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogNode[];
    },
  });
}

export type CatalogProgram = Program & {
  nodeId?: string;
  isCustom: boolean;
  isPublished: boolean;
};

const ACCENTS: Program["accent"][] = ["teal", "indigo", "violet", "rose", "amber"];

export function buildProgramCatalog(nodes: CatalogNode[] | undefined): CatalogProgram[] {
  const list = nodes ?? [];
  const byId = new Map(list.map((n) => [n.id, n]));
  /** Los programas de bibliotecas internas (p. ej. Pediatría & Neonatología) son aislados. */
  const isIsolated = (n: CatalogNode) => {
    let cur = n.parent_id ? byId.get(n.parent_id) : undefined;
    let guard = 0;
    while (cur && guard++ < 10) {
      if (/bibliotec/i.test(cur.slug) || /bibliotec/i.test(cur.title)) return true;
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return false;
  };
  const programNodes = list.filter((n) => n.kind === "program" && !isIsolated(n));

  const areasOf = (nodeId: string) =>
    list
      .filter((n) => n.parent_id === nodeId && (n.kind === "area" || n.kind === "subarea"))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((n) => n.title);

  const merged: CatalogProgram[] = PROGRAMS.map((p) => {
    const node = programNodes.find((n) => n.slug === p.slug);
    if (!node) return { ...p, isCustom: false, isPublished: true };
    const areas = areasOf(node.id);
    return {
      ...p,
      title: node.title || p.title,
      description: node.description || p.description,
      tagline: node.description || p.tagline,
      areas: areas.length > 0 ? areas : p.areas,
      nodeId: node.id,
      isCustom: false,
      isPublished: node.is_published,
    };
  });

  const staticSlugs = new Set(PROGRAMS.map((p) => p.slug));
  const extras: CatalogProgram[] = programNodes
    .filter((n) => !staticSlugs.has(n.slug))
    .map((n, i) => ({
      id: n.slug as Program["id"],
      slug: n.slug,
      order: 100 + i,
      title: n.title,
      subtitle: "Programa personalizado",
      tagline: n.description || "Programa creado desde el editor de contenido.",
      description: n.description || "",
      audience: "Definido por el administrador",
      areas: areasOf(n.id),
      accent: ACCENTS[i % ACCENTS.length],
      nodeId: n.id,
      isCustom: true,
      isPublished: n.is_published,
    }));

  // Si el administrador ya definió programas en el editor, esos mandan:
  // los estáticos sin nodo equivalente dejan de mostrarse.
  if (programNodes.length > 0) {
    return [...merged.filter((p) => p.nodeId), ...extras];
  }

  return [...merged, ...extras];
}

/** Programas listos para pintar en dashboard e índice. */
export function useProgramCatalog() {
  const q = useContentNodes();
  return { ...q, programs: buildProgramCatalog(q.data) };
}
