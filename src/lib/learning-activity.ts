/**
 * Actividad real de aprendizaje del alumno: alimenta "Continúa donde lo
 * dejaste" y el progreso de "Mis cursos". Cada fila es propia del usuario (RLS).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type LearningActivity = {
  id: string;
  node_id: string | null;
  program_slug: string | null;
  topic_id: string | null;
  label: string | null;
  kind: string | null;
  path: string | null;
  progress_pct: number;
  last_seen_at: string;
};

/** Últimas actividades del usuario autenticado. */
export function useMyLearningActivity(userId: string | undefined, limit = 12) {
  return useQuery({
    queryKey: ["learning-activity", userId, limit],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: async (): Promise<LearningActivity[]> => {
      const { data, error } = await db
        .from("learning_activity")
        .select("*")
        .eq("user_id", userId!)
        .order("last_seen_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LearningActivity[];
    },
  });
}

/** Registra o actualiza la última actividad (idempotente por tema). */
export function useTrackActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programSlug?: string | null;
      topicId?: string | null;
      nodeId?: string | null;
      label?: string | null;
      kind?: string | null;
      path?: string | null;
      progressPct?: number;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { error } = await db.from("learning_activity").upsert(
        {
          user_id: uid,
          program_slug: input.programSlug ?? null,
          topic_id: input.topicId ?? null,
          node_id: input.nodeId ?? null,
          label: input.label ?? null,
          kind: input.kind ?? null,
          path: input.path ?? null,
          progress_pct: Math.max(0, Math.min(100, Math.round(input.progressPct ?? 0))),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,program_slug,topic_id" },
      );
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-activity"] }),
  });
}
