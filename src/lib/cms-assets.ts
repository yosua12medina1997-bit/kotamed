/**
 * CMS KotaMed — Asset Manager real.
 * Sube archivos al bucket `cms`, guarda su metadata en `cms_assets` y permite
 * saber en qué bloques se está usando cada asset antes de eliminarlo.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadCmsMedia } from "@/lib/cms";
import { logCmsAudit } from "@/lib/cms-publish";

export type CmsAsset = {
  id: string;
  name: string;
  url: string;
  storage_path: string | null;
  type: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id, name, url, storage_path, type, mime_type, size_bytes, width, height, alt, description, created_at, updated_at";

export function assetKind(mime: string) {
  if (mime.startsWith("image/svg")) return "svg";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export const ASSET_LABEL: Record<string, string> = {
  image: "Imagen",
  svg: "Vector / SVG",
  video: "Video",
  pdf: "PDF",
  file: "Archivo",
};

export function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function imageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/") || file.type.includes("svg")) return { width: null, height: null };
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });
}

export function useCmsAssets() {
  return useQuery({
    queryKey: ["cms-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_assets")
        .select(COLS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CmsAsset[];
    },
  });
}

export function useUploadAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadCmsMedia(file, file.name);
      const { width, height } = await imageSize(file);
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("cms_assets")
        .insert({
          name: file.name,
          url,
          type: assetKind(file.type),
          mime_type: file.type || null,
          size_bytes: file.size,
          width,
          height,
          created_by: auth.user?.id ?? null,
        } as never)
        .select(COLS)
        .single();
      if (error) throw error;
      await logCmsAudit({ entity: "asset", action: "subió un asset", entityLabel: file.name });
      return data as unknown as CmsAsset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-assets"] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsAsset> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("cms_assets").update(rest as never).eq("id", id);
      if (error) throw error;
      await logCmsAudit({ entity: "asset", entityId: id, action: "actualizó un asset", detail: rest });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-assets"] }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: CmsAsset) => {
      if (asset.storage_path) await supabase.storage.from("cms").remove([asset.storage_path]);
      const { error } = await supabase.from("cms_assets").delete().eq("id", asset.id);
      if (error) throw error;
      await logCmsAudit({ entity: "asset", entityId: asset.id, entityLabel: asset.name, action: "eliminó un asset" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-assets"] }),
  });
}

/** Dónde se está usando un asset (páginas y bloques que referencian su URL). */
export function useAssetUsage(url: string | null) {
  return useQuery({
    queryKey: ["cms-asset-usage", url],
    enabled: !!url,
    queryFn: async () => {
      const [blocks, pages] = await Promise.all([
        supabase.from("cms_blocks").select("id, page_id, type, props"),
        supabase.from("cms_pages").select("id, title"),
      ]);
      if (blocks.error) throw blocks.error;
      if (pages.error) throw pages.error;
      const titles = new Map(
        ((pages.data ?? []) as { id: string; title: string }[]).map((p) => [p.id, p.title]),
      );
      const rows = (blocks.data ?? []) as { id: string; page_id: string; type: string; props: unknown }[];
      return rows
        .filter((b) => JSON.stringify(b.props ?? {}).includes(url!))
        .map((b) => ({ blockId: b.id, type: b.type, page: titles.get(b.page_id) ?? "—" }));
    },
  });
}
