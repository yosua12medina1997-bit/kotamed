/**
 * Auditoría y clasificación VISUAL del árbol de contenido (`content_nodes`).
 *
 * REGLA: este módulo NO modifica datos. Sólo lee todos los nodos existentes y
 * los agrupa en categorías administrativas (programas, biblioteca, cursos,
 * ciencias médicas y contenido sin clasificar) para que el 100 % del contenido
 * sea visible sin cambiar títulos, slugs, IDs ni relaciones.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditKind = "course" | "program" | "area" | "subarea" | "chapter" | "lesson";

export type AuditNode = {
  id: string;
  parent_id: string | null;
  kind: AuditKind;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export const AUDIT_KIND_LABEL: Record<string, string> = {
  course: "Curso",
  program: "Programa",
  area: "Área",
  subarea: "Subárea",
  chapter: "Capítulo",
  lesson: "Lección",
};

/** Jerarquía esperada; se usa sólo para detectar relaciones atípicas. */
const EXPECTED_PARENT: Record<string, string[]> = {
  course: [],
  program: ["course"],
  area: ["program"],
  subarea: ["area"],
  chapter: ["area", "subarea"],
  lesson: ["chapter"],
};

const SCIENCE_RE =
  /(ciencias\s+b[aá]sicas|ciencias\s+cl[ií]nicas|fisiolog|anatom|farmacolog|patolog|microbiolog|bioqu[ií]m|semiolog|histolog|embriolog|inmunolog|parasitolog|gen[eé]tica)/i;

const LIBRARY_RE = /bibliotec/i;

/** Carga TODOS los nodos sin límite de paginación (bloques de 1000). */
export function useAllContentNodes(enabled: boolean) {
  return useQuery({
    queryKey: ["content-nodes"],
    enabled,
    staleTime: 10_000,
    queryFn: async () => {
      const all: AuditNode[] = [];
      const size = 1000;
      for (let page = 0; page < 60; page++) {
        const { data, error } = await supabase
          .from("content_nodes")
          .select("id,parent_id,kind,title,slug,description,sort_order,is_published,created_at")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .range(page * size, page * size + size - 1);
        if (error) throw error;
        const rows = (data ?? []) as AuditNode[];
        all.push(...rows);
        if (rows.length < size) break;
      }
      return all;
    },
  });
}

export type AuditIndex = {
  nodes: AuditNode[];
  byId: Map<string, AuditNode>;
  childrenOf: Map<string | null, AuditNode[]>;
  /** Ruta jerárquica (títulos) de cada nodo, sin incluirse a sí mismo. */
  pathOf: Map<string, AuditNode[]>;
  rootOf: Map<string, AuditNode>;
  roots: AuditNode[];
  libraries: AuditNode[];
  courses: AuditNode[];
  programs: AuditNode[];
  sciences: AuditNode[];
  unclassified: AuditNode[];
  counts: Record<string, number>;
};

export function buildAuditIndex(nodes: AuditNode[]): AuditIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string | null, AuditNode[]>();
  for (const n of nodes) {
    const arr = childrenOf.get(n.parent_id) ?? [];
    arr.push(n);
    childrenOf.set(n.parent_id, arr);
  }

  const pathOf = new Map<string, AuditNode[]>();
  const rootOf = new Map<string, AuditNode>();
  const broken = new Set<string>();

  for (const n of nodes) {
    const chain: AuditNode[] = [];
    let cur = n.parent_id ? byId.get(n.parent_id) : undefined;
    let guard = 0;
    let ok = true;
    while (guard++ < 20) {
      if (n.parent_id && !cur && chain.length === 0) {
        ok = false; // padre inexistente → huérfano
        break;
      }
      if (!cur) break;
      chain.unshift(cur);
      if (!cur.parent_id) break;
      const next = byId.get(cur.parent_id);
      if (!next) {
        ok = false;
        break;
      }
      cur = next;
    }
    pathOf.set(n.id, chain);
    const root = chain[0] ?? n;
    rootOf.set(n.id, root);
    if (!ok) broken.add(n.id);
  }

  const roots = (childrenOf.get(null) ?? []).slice();
  const isLibraryRoot = (n: AuditNode) => LIBRARY_RE.test(n.title) || LIBRARY_RE.test(n.slug);

  const libraries = roots.filter(isLibraryRoot);
  const courses = roots.filter((n) => !isLibraryRoot(n));
  const librarySet = new Set(libraries.map((n) => n.id));

  const programs = nodes.filter((n) => {
    if (n.kind !== "program") return false;
    const root = rootOf.get(n.id);
    return !root || !librarySet.has(root.id);
  });

  const sciences = nodes.filter(
    (n) =>
      (n.kind === "program" || n.kind === "area" || n.kind === "subarea") &&
      (SCIENCE_RE.test(n.title) || SCIENCE_RE.test(n.slug)),
  );

  const unclassified = nodes.filter((n) => {
    if (broken.has(n.id)) return true;
    if (!n.parent_id) return n.kind !== "course"; // raíz de tipo inesperado
    const parent = byId.get(n.parent_id);
    if (!parent) return true;
    const expected = EXPECTED_PARENT[n.kind] ?? [];
    return expected.length > 0 && !expected.includes(parent.kind);
  });

  const counts: Record<string, number> = {
    total: nodes.length,
    course: 0,
    program: 0,
    area: 0,
    subarea: 0,
    chapter: 0,
    lesson: 0,
    draft: 0,
    published: 0,
  };
  for (const n of nodes) {
    counts[n.kind] = (counts[n.kind] ?? 0) + 1;
    if (n.is_published) counts.published++;
    else counts.draft++;
  }
  counts.libraries = libraries.length;
  counts.academicPrograms = programs.length;
  counts.rootCourses = courses.length;
  counts.sciences = sciences.length;
  counts.unclassified = unclassified.length;

  return {
    nodes,
    byId,
    childrenOf,
    pathOf,
    rootOf,
    roots,
    libraries,
    courses,
    programs,
    sciences,
    unclassified,
    counts,
  };
}

/** Texto de la ruta jerárquica: "Biblioteca > Neonatología > Reanimación". */
export function pathLabel(idx: AuditIndex, node: AuditNode) {
  const chain = idx.pathOf.get(node.id) ?? [];
  return [...chain.map((n) => n.title), node.title].join(" > ");
}

/** Búsqueda global: título, slug, descripción y tipo. */
export function searchNodes(idx: AuditIndex, q: string): AuditNode[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return idx.nodes.filter((n) => {
    const hay = `${n.title} ${n.slug} ${n.description ?? ""} ${AUDIT_KIND_LABEL[n.kind] ?? n.kind}`.toLowerCase();
    if (hay.includes(query)) return true;
    return pathLabel(idx, n).toLowerCase().includes(query);
  });
}

/** Descendientes directos + subtotales de un nodo. */
export function subtreeStats(idx: AuditIndex, id: string) {
  let areas = 0;
  let chapters = 0;
  let lessons = 0;
  const walk = (nodeId: string, depth: number) => {
    if (depth > 8) return;
    for (const c of idx.childrenOf.get(nodeId) ?? []) {
      if (c.kind === "area" || c.kind === "subarea") areas++;
      if (c.kind === "chapter") chapters++;
      if (c.kind === "lesson") lessons++;
      walk(c.id, depth + 1);
    }
  };
  walk(id, 0);
  return { areas, chapters, lessons };
}
