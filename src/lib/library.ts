/**
 * Biblioteca Universal de KotaMed: categorías, recursos, favoritos y
 * administración (solo administradores por RLS).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type LibraryCategory = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  cover_url: string | null;
  sort_order: number;
  is_published: boolean;
};

export type LibraryResource = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  resource_type: string;
  author: string | null;
  publisher: string | null;
  year: number | null;
  specialty: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[];
  bibliographic_source: string | null;
  doi: string | null;
  external_url: string | null;
  file_url: string | null;
  video_url: string | null;
  access_level: string;
  status: string;
  published_at: string | null;
  is_featured: boolean;
  view_count: number;
  sort_order: number;
  created_at?: string;
};

export const RESOURCE_TYPES = [
  "libro",
  "guia",
  "articulo",
  "video",
  "podcast",
  "caso",
  "flashcards",
  "documento",
  "protocolo",
  "calculadora",
] as const;

export const RESOURCE_STATUS = ["draft", "published", "archived"] as const;

export function useLibraryCategories() {
  return useQuery({
    queryKey: ["library-categories"],
    staleTime: 30_000,
    queryFn: async (): Promise<LibraryCategory[]> => {
      const { data, error } = await db
        .from("library_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LibraryCategory[];
    },
  });
}

export function useLibraryResources(opts?: { includeDrafts?: boolean }) {
  const includeDrafts = opts?.includeDrafts ?? false;
  return useQuery({
    queryKey: ["library-resources", includeDrafts],
    staleTime: 20_000,
    queryFn: async (): Promise<LibraryResource[]> => {
      let q = db.from("library_resources").select("*");
      if (!includeDrafts) q = q.eq("status", "published");
      const { data, error } = await q
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as LibraryResource[];
    },
  });
}

export function useLibraryFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ["library-favorites", userId],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await db
        .from("library_favorites")
        .select("resource_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data ?? []) as { resource_id: string }[]).map((r) => r.resource_id);
    },
  });
}

export function useToggleFavorite(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ resourceId, on }: { resourceId: string; on: boolean }) => {
      if (!userId) throw new Error("Sin sesión");
      if (on) {
        const { error } = await db
          .from("library_favorites")
          .upsert({ user_id: userId, resource_id: resourceId }, { onConflict: "user_id,resource_id" });
        if (error) throw error;
      } else {
        const { error } = await db
          .from("library_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("resource_id", resourceId);
        if (error) throw error;
      }
      return on;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-favorites", userId] }),
  });
}

/* ----------------------------------------------------------- administración */

export function useSaveLibraryCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<LibraryCategory>) => {
      const payload = { ...row };
      if (!payload.slug && payload.name) {
        payload.slug = payload.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      const { data, error } = await db
        .from("library_categories")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LibraryCategory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-categories"] }),
  });
}

export function useDeleteLibraryCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("library_categories").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-categories"] }),
  });
}

export function useSaveLibraryResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<LibraryResource>) => {
      const payload: Record<string, unknown> = { ...row };
      if (payload.status === "published" && !payload.published_at) {
        payload.published_at = new Date().toISOString();
      }
      const { data, error } = await db
        .from("library_resources")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LibraryResource;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-resources"] }),
  });
}

export function useDeleteLibraryResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("library_resources").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-resources"] }),
  });
}
