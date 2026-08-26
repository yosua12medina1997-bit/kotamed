/**
 * "Contenido visual del tema" — presentación de imágenes/diapositivas asociada
 * a un tema (`content_nodes.metadata.deck`). No reemplaza el contenido textual:
 * convive con `metadata.topic` y, si está publicado, tiene prioridad al abrir.
 */
import { supabase } from "@/integrations/supabase/client";

export type DeckStatus = "draft" | "published" | "archived";

export interface DeckSlide {
  id: string;
  url: string;
  path: string;
  caption?: string;
}

export interface TopicDeck {
  version: 1;
  status: DeckStatus;
  slides: DeckSlide[];
  updatedAt?: string;
}

export const DECK_STATUS_LABEL: Record<DeckStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

const YEAR = 60 * 60 * 24 * 365;

export function emptyDeck(): TopicDeck {
  return { version: 1, status: "draft", slides: [] };
}

/** Lee el deck guardado en el metadata del nodo (tolerante a datos antiguos). */
export function readDeck(metadata: Record<string, unknown> | null | undefined): TopicDeck | null {
  const raw = (metadata as { deck?: unknown } | null | undefined)?.deck as TopicDeck | undefined;
  if (!raw || !Array.isArray(raw.slides)) return null;
  return {
    version: 1,
    status: (raw.status as DeckStatus) ?? "draft",
    slides: raw.slides.filter((s) => s && typeof s.url === "string"),
    updatedAt: raw.updatedAt,
  };
}

/** ¿El deck puede verlo un usuario final? */
export function isDeckVisible(deck: TopicDeck | null): boolean {
  return !!deck && deck.status === "published" && deck.slides.length > 0;
}

export async function uploadDeckImages(nodeId: string, files: File[]): Promise<DeckSlide[]> {
  const out: DeckSlide[] = [];
  for (const file of files) {
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `decks/${nodeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
    const { error } = await supabase.storage.from("content").upload(path, file);
    if (error) throw error;
    const { data } = await supabase.storage.from("content").createSignedUrl(path, YEAR);
    out.push({
      id: `d_${Math.random().toString(36).slice(2, 10)}`,
      url: data?.signedUrl ?? "",
      path,
      caption: "",
    });
  }
  return out;
}

export async function removeDeckImage(path: string) {
  if (!path) return;
  await supabase.storage.from("content").remove([path]);
}

/** Guarda el deck en el nodo sin tocar el resto del metadata. */
export async function saveDeck(
  nodeId: string,
  metadata: Record<string, unknown> | null | undefined,
  deck: TopicDeck,
) {
  const payload: TopicDeck = { ...deck, version: 1, updatedAt: new Date().toISOString() };
  const { error } = await supabase
    .from("content_nodes")
    .update({ metadata: { ...(metadata ?? {}), deck: payload } as never })
    .eq("id", nodeId);
  if (error) throw error;
  return payload;
}
