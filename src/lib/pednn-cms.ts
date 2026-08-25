/**
 * CMS real (persistente) para los módulos de contenido académico.
 *
 * Toda la jerarquía vive en `content_nodes`:
 *   root (course) → bloque (program) → categoría (area) → subcategoría (subarea)
 *   → tema (chapter) → sección (lesson)
 *
 * Los recursos de cada tema viven en `content_resources` (archivos, videos,
 * enlaces y notas), y el contenido de diapositivas en `metadata.topic`.
 *
 * La primera vez que un admin abre un módulo sin estructura en base de datos,
 * se siembra el blueprint estático una única vez y a partir de ahí TODO es
 * editable y persistente (crear, renombrar, describir, ordenar, publicar,
 * duplicar y eliminar en cualquier nivel).
 */
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { publishNodeBranch } from "@/lib/content-publish";

import { useSupabaseUser } from "@/lib/session";
import {
  PEDIATRIA_NEONATOLOGIA_BLUEPRINT,
  TOPIC_STANDARD_FORMAT,
  type BlueprintBlock,
} from "@/lib/pediatria-neonatologia-blueprint";

export type NodeKind = "course" | "program" | "area" | "subarea" | "chapter" | "lesson";

export const CHILD_KIND: Record<NodeKind, NodeKind | null> = {
  course: "program",
  program: "area",
  area: "subarea",
  subarea: "chapter",
  chapter: "lesson",
  lesson: null,
};

export const KIND_LABEL: Record<NodeKind, string> = {
  course: "Biblioteca",
  program: "Bloque",
  area: "Categoría",
  subarea: "Subcategoría",
  chapter: "Tema",
  lesson: "Sección",
};

export type CmsNode = {
  id: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  metadata: Record<string, any>;
  children: CmsNode[];
};

export interface CmsScope {
  /** Slug del nodo raíz en `content_nodes`. */
  rootSlug: string;
  /** Título del nodo raíz. */
  rootTitle: string;
  /** Prefijo de las query keys. */
  namespace: string;
  /** Blueprint usado sólo para la siembra inicial. */
  seed?: BlueprintBlock[];
}

const SELECT = "id,parent_id,kind,title,slug,description,sort_order,is_published,metadata";

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 48) || "nodo"
  );
}

function uniqueSlug(base: string) {
  return `${slugify(base)}-${Math.random().toString(36).slice(2, 7)}`;
}

type Row = Omit<CmsNode, "children"> & { metadata: any };

function toTree(rows: Row[], rootId: string): CmsNode[] {
  const byParent = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.parent_id ?? "__root__";
    const list = byParent.get(key) ?? [];
    list.push(r);
    byParent.set(key, list);
  }
  const build = (parentId: string): CmsNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
      .map((r) => ({
        ...r,
        metadata: (r.metadata ?? {}) as Record<string, any>,
        children: build(r.id),
      }));
  return build(rootId);
}

async function fetchDescendants(rootId: string): Promise<Row[]> {
  const all: Row[] = [];
  let frontier = [rootId];
  for (let depth = 0; depth < 6 && frontier.length > 0; depth++) {
    const { data, error } = await supabase
      .from("content_nodes")
      .select(SELECT)
      .in("parent_id", frontier);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Row[];
    all.push(...rows);
    frontier = rows.map((r) => r.id);
  }
  return all;
}

async function insertNode(input: {
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  slug: string;
  sort_order: number;
  description?: string | null;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}) {
  const { data, error } = await supabase
    .from("content_nodes")
    .insert({
      parent_id: input.parent_id,
      kind: input.kind,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      sort_order: input.sort_order,
      is_published: true,
      metadata: (input.metadata ?? {}) as never,
      created_by: input.userId ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Row;
}

/** Siembra el blueprint una única vez (sólo admin, sólo si el root está vacío). */
async function seedFromBlueprint(rootId: string, blocks: BlueprintBlock[], userId?: string | null) {
  for (const [bi, block] of blocks.entries()) {
    const blockNode = await insertNode({
      parent_id: rootId,
      kind: "program",
      title: block.title,
      slug: uniqueSlug(block.key),
      sort_order: bi,
      description: block.tagline,
      metadata: { accent: block.accent, iconKey: block.key },
      userId,
    });
    for (const [ci, cat] of block.categories.entries()) {
      const catNode = await insertNode({
        parent_id: blockNode.id,
        kind: "area",
        title: cat.title,
        slug: uniqueSlug(cat.key),
        sort_order: ci,
        metadata: { legacyKey: cat.key },
        userId,
      });
      for (const [ti, topic] of cat.topics.entries()) {
        await insertNode({
          parent_id: catNode.id,
          kind: "chapter",
          title: topic.title,
          slug: uniqueSlug(topic.title),
          sort_order: ti,
          metadata: {
            items: topic.items ?? [],
            sections: TOPIC_STANDARD_FORMAT,
          },
          userId,
        });
      }
    }
  }
}

/** Carga (y si hace falta siembra) el árbol completo del módulo. */
export function useCmsTree(scope: CmsScope, isAdmin: boolean) {
  const user = useSupabaseUser();
  const qc = useQueryClient();
  const queryKey = [scope.namespace, "cms-tree", scope.rootSlug, isAdmin];

  const query = useQuery({
    queryKey,
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      const { data: rootRows, error: rootErr } = await supabase
        .from("content_nodes")
        .select(SELECT)
        .eq("slug", scope.rootSlug)
        .is("parent_id", null)
        .limit(1);
      if (rootErr) throw rootErr;

      let root = (rootRows?.[0] ?? null) as unknown as Row | null;
      if (!root) {
        if (!isAdmin) return { root: null, blocks: [] as CmsNode[] };
        root = await insertNode({
          parent_id: null,
          kind: "course",
          title: scope.rootTitle,
          slug: scope.rootSlug,
          sort_order: 0,
          userId: user?.id ?? null,
        });
      }

      let rows = await fetchDescendants(root.id);
      if (rows.length === 0 && isAdmin) {
        const seed = scope.seed ?? PEDIATRIA_NEONATOLOGIA_BLUEPRINT;
        if (seed.length > 0) {
          await seedFromBlueprint(root.id, seed, user?.id ?? null);
          rows = await fetchDescendants(root.id);
        }
      }
      return { root, blocks: toTree(rows, root.id) };
    },
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: [scope.namespace, "cms-tree"] });
  }, [qc, scope.namespace]);

  return { ...query, invalidate };
}

/** Mutaciones CRUD sobre cualquier nivel del árbol. */
export function useCmsMutations(scope: CmsScope) {
  const user = useSupabaseUser();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [scope.namespace, "cms-tree"] });

  const create = useMutation({
    mutationFn: async (input: {
      parentId: string;
      kind: NodeKind;
      title: string;
      description?: string;
      siblings: number;
      metadata?: Record<string, unknown>;
    }) =>
      insertNode({
        parent_id: input.parentId,
        kind: input.kind,
        title: input.title,
        slug: uniqueSlug(input.title),
        sort_order: input.siblings,
        description: input.description ?? null,
        metadata: input.metadata,
        userId: user?.id ?? null,
      }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<CmsNode, "title" | "description" | "is_published" | "sort_order">> & {
        metadata?: Record<string, unknown>;
      };
    }) => {
      const { error } = await supabase
        .from("content_nodes")
        .update(input.patch as never)
        .eq("id", input.id);
      if (error) throw error;
      // Publicar en cadena para que el alumno vea el tema recién publicado.
      if (input.patch.is_published === true) await publishNodeBranch(input.id);

    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Mueve un nodo intercambiando `sort_order` con su vecino. */
  const move = useMutation({
    mutationFn: async (input: { node: CmsNode; siblings: CmsNode[]; dir: -1 | 1 }) => {
      const ordered = input.siblings;
      const i = ordered.findIndex((n) => n.id === input.node.id);
      const j = i + input.dir;
      if (i < 0 || j < 0 || j >= ordered.length) return;
      const a = ordered[i]!;
      const b = ordered[j]!;
      const updates = [
        supabase.from("content_nodes").update({ sort_order: j }).eq("id", a.id),
        supabase.from("content_nodes").update({ sort_order: i }).eq("id", b.id),
      ];
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: invalidate,
  });

  /** Copia profunda de un nodo y de sus descendientes (sin recursos). */
  const duplicate = useMutation({
    mutationFn: async (input: { node: CmsNode; siblings: number }) => {
      const clone = async (node: CmsNode, parentId: string, order: number, title?: string) => {
        const created = await insertNode({
          parent_id: parentId,
          kind: node.kind,
          title: title ?? node.title,
          slug: uniqueSlug(title ?? node.title),
          sort_order: order,
          description: node.description,
          metadata: node.metadata,
          userId: user?.id ?? null,
        });
        for (const [i, child] of node.children.entries()) {
          await clone(child, created.id, i);
        }
        return created;
      };
      if (!input.node.parent_id) throw new Error("No se puede duplicar la raíz");
      await clone(input.node, input.node.parent_id, input.siblings, `${input.node.title} (copia)`);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, move, duplicate, invalidate };
}

/** Filtra el árbol por texto, conservando la jerarquía de los resultados. */
export function filterTree(nodes: CmsNode[], q: string): CmsNode[] {
  const query = q.trim().toLowerCase();
  if (!query) return nodes;
  const walk = (list: CmsNode[]): CmsNode[] =>
    list
      .map((n) => {
        const children = walk(n.children);
        const hit =
          n.title.toLowerCase().includes(query) ||
          (n.description ?? "").toLowerCase().includes(query) ||
          (Array.isArray(n.metadata?.items) ? n.metadata.items : []).some((it: unknown) =>
            String(it).toLowerCase().includes(query),
          );
        if (!hit && children.length === 0) return null;
        return { ...n, children: hit ? n.children : children };
      })
      .filter((n): n is CmsNode => n !== null);
  return walk(nodes);
}

export function countTopics(node: CmsNode): number {
  if (node.kind === "chapter") return 1;
  return node.children.reduce((a, c) => a + countTopics(c), 0);
}

export function useTreeStats(blocks: CmsNode[]) {
  return useMemo(() => {
    let categories = 0;
    let topics = 0;
    const walk = (list: CmsNode[]) => {
      for (const n of list) {
        if (n.kind === "area" || n.kind === "subarea") categories++;
        if (n.kind === "chapter") topics++;
        walk(n.children);
      }
    };
    walk(blocks);
    return { blocks: blocks.length, categories, topics };
  }, [blocks]);
}
