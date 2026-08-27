/**
 * Reordenamiento de módulos por arrastrar y soltar (solo Super Admin).
 * Guarda el nuevo orden en `content_nodes.sort_order` de forma permanente,
 * sin tocar títulos, contenido, categorías ni temas.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Mueve el elemento `from` a la posición `to` devolviendo una nueva lista. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** Persiste el orden final: sort_order = (índice + 1) * 10. */
export async function persistModuleOrder(ids: string[]) {
  const results = await Promise.all(
    ids.map((id, i) =>
      supabase
        .from("content_nodes")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/**
 * Estado de arrastre para una lista de módulos con `id`.
 * Devuelve la lista ordenada localmente (optimista) y los handlers HTML5.
 */
export function useModuleDnd<T extends { id: string }>(
  items: T[],
  opts?: { enabled?: boolean; onPersisted?: () => void },
) {
  const enabled = opts?.enabled !== false;
  const [order, setOrder] = useState<T[]>(items);
  const dragIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const signature = items.map((i) => i.id).join("|");

  useEffect(() => {
    setOrder(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const onDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      if (!enabled) return;
      dragIndex.current = index;
      setDragging(index);
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", String(index));
      } catch {
        /* algunos navegadores lo bloquean */
      }
    },
    [enabled],
  );

  const onDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      if (!enabled || dragIndex.current === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setOverIndex(index);
    },
    [enabled],
  );

  const finish = useCallback(() => {
    dragIndex.current = null;
    setDragging(null);
    setOverIndex(null);
  }, []);

  const onDrop = useCallback(
    (index: number) => async (e: React.DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      const from = dragIndex.current;
      finish();
      if (from === null || from === index) return;
      const next = moveItem(order, from, index);
      setOrder(next);
      try {
        await persistModuleOrder(next.map((n) => n.id));
        opts?.onPersisted?.();
      } catch {
        setOrder(items);
      }
    },
    [enabled, finish, items, opts, order],
  );

  return {
    order,
    dragging,
    overIndex,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd: finish,
    enabled,
  };
}
