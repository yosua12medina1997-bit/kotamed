/**
 * Publicación en cadena: al publicar un nodo o un recurso, los nodos padres
 * también quedan publicados. Sin esto, un tema publicado dentro de un área o
 * biblioteca en borrador seguía invisible para el estudiante (RLS exige que el
 * nodo y sus ancestros estén publicados).
 */
import { supabase } from "@/integrations/supabase/client";

/** Publica el nodo indicado y toda su cadena de ancestros. */
export async function publishNodeBranch(nodeId: string) {
  const ids: string[] = [];
  let current: string | null = nodeId;
  let guard = 0;

  while (current && guard++ < 20) {
    const { data, error } = await supabase
      .from("content_nodes")
      .select("id,parent_id,is_published")
      .eq("id", current)
      .maybeSingle();
    if (error) throw error;
    if (!data) break;
    if (!data.is_published) ids.push(data.id);
    current = data.parent_id;
  }

  if (ids.length === 0) return;
  const { error } = await supabase
    .from("content_nodes")
    .update({ is_published: true })
    .in("id", ids);
  if (error) throw error;
}
