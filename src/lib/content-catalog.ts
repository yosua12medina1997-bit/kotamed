/**
 * Catálogo académico vivo: fusiona los programas estáticos con lo que el
 * administrador edita en el Editor de contenido (`content_nodes`).
 * Así el dashboard y el índice de programas reflejan los cambios al instante.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * Todos los nodos de contenido visibles (admins ven también los borradores por
 * RLS). Se pagina para que catálogos grandes (>1000 nodos) no pierdan programas.
 */
export function useContentNodes() {
  return useQuery({
    queryKey: ["content-catalog-nodes"],
    staleTime: 15_000,
    queryFn: async () => {
      const page = 1000;
      const all: CatalogNode[] = [];
      for (let from = 0; from < 20_000; from += page) {
        const { data, error } = await supabase
          .from("content_nodes")
          .select("id,parent_id,kind,title,slug,description,sort_order,is_published")
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + page - 1);
        if (error) throw error;
        const batch = (data ?? []) as CatalogNode[];
        all.push(...batch);
        if (batch.length < page) break;
      }
      return all;
    },
  });
}


export type CatalogProgram = Program & {
  nodeId?: string;
  isCustom: boolean;
  isPublished: boolean;
};

const ACCENTS: Program["accent"][] = ["teal", "indigo", "violet", "rose", "amber"];

export function buildProgramCatalog(
  nodes: CatalogNode[] | undefined,
  opts?: { includeIsolated?: boolean; onlyPublished?: boolean },
): CatalogProgram[] {
  const list = nodes ?? [];
  const byId = new Map(list.map((n) => [n.id, n]));
  /** Los programas de bibliotecas internas (p. ej. Pediatría & Neonatología) son aislados. */
  const isIsolated = (n: CatalogNode) => {
    if (opts?.includeIsolated) return false;
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
  const out =
    programNodes.length > 0 ? [...merged.filter((p) => p.nodeId), ...extras] : [...merged, ...extras];

  // Visibilidad: los usuarios normales solo ven programas publicados.
  return opts?.onlyPublished ? out.filter((p) => p.isPublished) : out;
}

/**
 * Programas listos para pintar en dashboard e índice.
 * `includeIsolated` (para administradores) también muestra los programas que
 * viven dentro de bibliotecas internas, de modo que no se oculte ninguno.
 */
export function useProgramCatalog(opts?: { includeIsolated?: boolean; onlyPublished?: boolean }) {
  const q = useContentNodes();
  return { ...q, programs: buildProgramCatalog(q.data, opts) };
}

/**
 * Visibilidad de un programa (solo administración).
 * `is_published = true` → visible para los usuarios; `false` → oculto (borrador).
 */
export function useSetProgramVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nodeId, visible }: { nodeId: string; visible: boolean }) => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ is_published: visible })
        .eq("id", nodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
    },
  });
}


/**
 * Orden oficial del recorrido académico KotaMed.
 * Los programas fuera de esta lista se muestran al final, por su orden propio.
 */
export const ACADEMIC_PATH_ORDER = [
  "ciencias-basicas",
  "ecb",
  "ciencias-clinicas",
  "essalud",
  "internado",
  "enam",
  "residentado",
] as const;

/** Etiquetas cortas para el recorrido (algunos nodos usan siglas). */
export const ACADEMIC_PATH_LABELS: Record<string, string> = {
  "ciencias-basicas": "Ciencias Básicas",
  ecb: "Examen de Cambio de Bloque",
  "ciencias-clinicas": "Ciencias Clínicas",
  essalud: "EsSalud",
  internado: "Internado Médico",
  enam: "ENAM",
  residentado: "Residentado Médico",
};

export function academicPathIndex(slug: string) {
  const i = (ACADEMIC_PATH_ORDER as readonly string[]).indexOf(slug);
  return i === -1 ? 999 : i;
}

/** Programas del catálogo vivo ordenados según el recorrido académico. */
export function sortByAcademicPath<T extends { slug: string; order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ia = academicPathIndex(a.slug);
    const ib = academicPathIndex(b.slug);
    if (ia !== ib) return ia - ib;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

/** Nombre a mostrar en el recorrido. */
export function academicPathLabel(slug: string, fallback: string) {
  return ACADEMIC_PATH_LABELS[slug] ?? fallback;
}
