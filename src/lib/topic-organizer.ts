/**
 * Organización jerárquica de temas (solo SUPER ADMIN).
 *
 * Trabaja únicamente sobre la ESTRUCTURA (`parent_id`, `sort_order`, `kind`)
 * de los nodos `chapter` / `lesson`. Nunca toca títulos, metadatos, recursos
 * ni contenido interno de los temas.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CmsNode, NodeKind } from "@/lib/pednn-cms";

export type OrgNode = {
  id: string;
  title: string;
  /** `true` para categorías/subcategorías: son contenedores fijos. */
  fixed: boolean;
  kind: NodeKind;
  published: boolean;
  children: OrgNode[];
};

const isTopic = (n: CmsNode) => n.kind === "chapter" || n.kind === "lesson";
const isBranch = (n: CmsNode) => n.kind === "area" || n.kind === "subarea";

/** Construye el árbol editable a partir de los hijos visibles de un bloque. */
export function buildOrgTree(nodes: CmsNode[]): OrgNode[] {
  const map = (n: CmsNode): OrgNode => ({
    id: n.id,
    title: n.title,
    fixed: isBranch(n),
    kind: n.kind,
    published: n.is_published,
    children: n.children.filter((c) => isTopic(c) || isBranch(c)).map(map),
  });
  return nodes.filter((n) => isTopic(n) || isBranch(n)).map(map);
}

export function findNode(tree: OrgNode[], id: string): OrgNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** ¿`maybeChildId` está dentro del subárbol de `id`? */
export function isDescendant(tree: OrgNode[], id: string, maybeChildId: string): boolean {
  const node = findNode(tree, id);
  if (!node) return false;
  return !!findNode(node.children, maybeChildId);
}

function removeNode(tree: OrgNode[], id: string): { tree: OrgNode[]; removed: OrgNode | null } {
  let removed: OrgNode | null = null;
  const walk = (list: OrgNode[]): OrgNode[] => {
    const out: OrgNode[] = [];
    for (const n of list) {
      if (n.id === id) {
        removed = n;
        continue;
      }
      out.push({ ...n, children: walk(n.children) });
    }
    return out;
  };
  return { tree: walk(tree), removed };
}

export type DropMode = "before" | "after" | "inside";

/** Aplica un cambio superficial (título / publicado) a un nodo del árbol. */
export function patchNode(tree: OrgNode[], id: string, patch: Partial<OrgNode>): OrgNode[] {
  return tree.map((n) =>
    n.id === id
      ? { ...n, ...patch }
      : { ...n, children: patchNode(n.children, id, patch) },
  );
}

/** Elimina un nodo del árbol (usado tras borrarlo en base de datos). */
export function dropNode(tree: OrgNode[], id: string): OrgNode[] {
  return removeNode(tree, id).tree;
}

/** Firma de la ESTRUCTURA (ignora título y publicación) para detectar cambios. */
export function structureSignature(tree: OrgNode[]): string {
  const walk = (list: OrgNode[]): string =>
    list.map((n) => `${n.id}:${n.kind}[${walk(n.children)}]`).join(",");
  return walk(tree);
}

/** Renombra un tema. Solo toca el título. */
export async function renameTopic(id: string, title: string) {
  const { error } = await supabase.from("content_nodes").update({ title }).eq("id", id);
  if (error) throw error;
}

/** Publica u oculta un tema. */
export async function setTopicPublished(id: string, is_published: boolean) {
  const { error } = await supabase.from("content_nodes").update({ is_published }).eq("id", id);
  if (error) throw error;
}

/** Elimina un tema (y en cascada sus hijos según la base de datos). */
export async function deleteTopic(id: string) {
  const { error } = await supabase.from("content_nodes").delete().eq("id", id);
  if (error) throw error;
}

/** Mueve un nodo respecto a un objetivo. Devuelve el árbol nuevo. */
export function moveNode(
  tree: OrgNode[],
  dragId: string,
  targetId: string | null,
  mode: DropMode,
): OrgNode[] {
  if (dragId === targetId) return tree;
  if (targetId && isDescendant(tree, dragId, targetId)) return tree;

  const { tree: pruned, removed } = removeNode(tree, dragId);
  if (!removed) return tree;

  if (!targetId) return [...pruned, removed];

  const insert = (list: OrgNode[]): OrgNode[] => {
    const out: OrgNode[] = [];
    for (const n of list) {
      if (n.id === targetId) {
        if (mode === "before") out.push(removed!, { ...n, children: insert(n.children) });
        else if (mode === "after") out.push({ ...n, children: insert(n.children) }, removed!);
        else out.push({ ...n, children: [...insert(n.children), removed!] });
        continue;
      }
      out.push({ ...n, children: insert(n.children) });
    }
    return out;
  };
  return insert(pruned);
}

type Op = { id: string; parent_id: string; sort_order: number; kind: NodeKind };

/** Nodos con la posición/kind que les toca según el árbol editado. */
function flatten(tree: OrgNode[], rootParentId: string): Op[] {
  const ops: Op[] = [];
  const walk = (list: OrgNode[], parentId: string, parentIsTopic: boolean) => {
    list.forEach((n, i) => {
      const kind: NodeKind = n.fixed ? n.kind : parentIsTopic ? "lesson" : "chapter";
      ops.push({ id: n.id, parent_id: parentId, sort_order: i, kind });
      walk(n.children, n.id, !n.fixed);
    });
  };
  walk(tree, rootParentId, false);
  return ops;
}

/** Persiste la estructura completa. Devuelve el número de nodos actualizados. */
export async function saveOrganization(
  tree: OrgNode[],
  rootParentId: string,
  original: OrgNode[],
): Promise<number> {
  const before = new Map(flatten(original, rootParentId).map((o) => [o.id, o]));
  const ops = flatten(tree, rootParentId).filter((o) => {
    const prev = before.get(o.id);
    return (
      !prev ||
      prev.parent_id !== o.parent_id ||
      prev.sort_order !== o.sort_order ||
      prev.kind !== o.kind
    );
  });

  for (const op of ops) {
    const { error } = await supabase
      .from("content_nodes")
      .update({ parent_id: op.parent_id, sort_order: op.sort_order, kind: op.kind })
      .eq("id", op.id);
    if (error) {
      // Colisión de slug dentro del nuevo padre: se renombra sólo el slug.
      if ((error as any).code === "23505") {
        const slug = `nodo-${Math.random().toString(36).slice(2, 8)}`;
        const retry = await supabase
          .from("content_nodes")
          .update({ parent_id: op.parent_id, sort_order: op.sort_order, kind: op.kind, slug })
          .eq("id", op.id);
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
    }
  }
  return ops.length;
}
