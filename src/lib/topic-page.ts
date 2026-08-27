/**
 * Datos de la página individual de un tema (`/tema/$topicId`).
 *
 * Recupera el nodo del tema desde `content_nodes` (por id o slug), su
 * categoría padre, los temas hermanos (para "siguiente tema") y todos los
 * recursos multimedia asociados en `content_resources`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NODE_SELECT =
  "id,parent_id,kind,title,slug,description,sort_order,is_published,metadata";

export type TopicNodeRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  metadata: Record<string, any> | null;
};

export type TopicResourceRow = {
  id: string;
  node_id: string;
  kind: "file" | "video" | "link" | "text" | "image" | "audio" | "embed";
  title: string;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  content: string | null;
  metadata: Record<string, any> | null;
  sort_order: number;
  is_published: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Convierte una URL de YouTube/Vimeo en URL embebible. Devuelve null si es archivo. */
export function toEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  if (/^https?:\/\/.*(loom\.com|dailymotion\.com|wistia)/.test(url)) return url;
  return null;
}

export function isDirectVideoFile(url: string) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

export function isPdf(res: TopicResourceRow) {
  const u = res.url ?? res.storage_path ?? "";
  return res.mime_type === "application/pdf" || /\.pdf(\?|$)/i.test(u);
}

/** Portada declarada en el CMS o primera diapositiva visual. */
export function nodeCover(metadata: Record<string, any> | null | undefined): string | null {
  const meta = metadata ?? {};
  const direct = meta.cover ?? meta.coverUrl ?? meta.image;
  if (typeof direct === "string" && direct.trim()) return direct;
  const slide = meta?.deck?.slides?.[0]?.url;
  return typeof slide === "string" && slide ? slide : null;
}

export function nodeBanner(metadata: Record<string, any> | null | undefined): string | null {
  const banner = (metadata ?? {}).banner ?? (metadata ?? {}).bannerUrl;
  if (typeof banner === "string" && banner.trim()) return banner;
  return nodeCover(metadata);
}

async function fetchNode(idOrSlug: string): Promise<TopicNodeRow | null> {
  const q = supabase.from("content_nodes").select(NODE_SELECT).limit(1);
  const { data, error } = UUID.test(idOrSlug)
    ? await q.eq("id", idOrSlug)
    : await q.eq("slug", idOrSlug);
  if (error) throw error;
  return (data?.[0] ?? null) as unknown as TopicNodeRow | null;
}

/** Carga el tema completo: nodo, padre, hermanos y recursos. */
export function useTopicPage(idOrSlug: string) {
  return useQuery({
    queryKey: ["topic-page", idOrSlug],
    queryFn: async () => {
      const topic = await fetchNode(idOrSlug);
      if (!topic) return { topic: null } as const;

      const [parentRes, siblingsRes, childrenRes, resourcesRes] = await Promise.all([
        topic.parent_id
          ? supabase.from("content_nodes").select(NODE_SELECT).eq("id", topic.parent_id).limit(1)
          : Promise.resolve({ data: [], error: null } as any),
        topic.parent_id
          ? supabase
              .from("content_nodes")
              .select(NODE_SELECT)
              .eq("parent_id", topic.parent_id)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        supabase
          .from("content_nodes")
          .select(NODE_SELECT)
          .eq("parent_id", topic.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("content_resources")
          .select(
            "id,node_id,kind,title,url,storage_path,mime_type,content,metadata,sort_order,is_published",
          )
          .eq("node_id", topic.id)
          .order("sort_order", { ascending: true }),
      ]);

      if (resourcesRes.error) throw resourcesRes.error;

      const parent = (parentRes.data?.[0] ?? null) as unknown as TopicNodeRow | null;
      const siblings = ((siblingsRes.data ?? []) as unknown as TopicNodeRow[]).filter(
        (n) => n.kind === "chapter" || n.kind === "lesson",
      );
      const children = ((childrenRes.data ?? []) as unknown as TopicNodeRow[]).filter(
        (n) => n.kind === "chapter" || n.kind === "lesson",
      );
      const resources = (resourcesRes.data ?? []) as unknown as TopicResourceRow[];

      return { topic, parent, siblings, children, resources } as const;

    },
  });
}
