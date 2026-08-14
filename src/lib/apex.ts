/**
 * Hooks de cliente del KotaMed Assessment Engine.
 * El banco de preguntas SIEMPRE se consulta vía server functions; desde el
 * navegador solo se leen datos propios del usuario (RLS) y la taxonomía.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/lib/session";
import {
  apexAdminAnalytics,
  apexBankStats,
  apexBulkAction,
  apexCreateRecoveryExam,
  apexFlagQuestion,
  apexGenerateFlashcards,
  apexGenerateStudyPlan,
  apexGenerateSummary,
  apexGetAttempt,
  apexImportQuestions,
  apexListQuestions,
  apexQuestionVersions,
  apexRestoreVersion,
  apexReviewAttempt,
  apexSaveAnswer,
  apexSaveQuestion,
  apexStartExam,
  apexSubmitAttempt,
  apexSuggestClassification,
} from "./apex.functions";
import { scheduleReview } from "./apex-core";
import type { TaxLevel } from "./apex-types";

const db = supabase as any;

/* ---------------- Rol ---------------- */

export function useApexAdmin() {
  const user = useSupabaseUser();
  const query = useQuery({
    queryKey: ["apex", "is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return (data ?? []).some((r) =>
        ["admin", "super_admin", "academic_admin"].includes(String(r.role)),
      );
    },
  });
  return { userId: user?.id, isAdmin: !!query.data, loading: user === undefined || query.isLoading };
}

/* ---------------- Taxonomía ---------------- */

export type TaxNode = {
  id: string;
  parent_id: string | null;
  level: TaxLevel;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export function useTaxonomy() {
  return useQuery({
    queryKey: ["apex", "taxonomy"],
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_taxonomy")
        .select("id,parent_id,level,name,slug,description,sort_order,is_active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TaxNode[];
    },
  });
}

export function useTaxonomyMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["apex", "taxonomy"] });

  const create = useMutation({
    mutationFn: async (input: { level: TaxLevel; name: string; parentId: string | null; siblings: number }) => {
      const slug =
        input.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 40) || "nodo";
      const { error } = await db.from("apex_taxonomy").insert({
        level: input.level,
        name: input.name,
        parent_id: input.parentId,
        slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
        sort_order: input.siblings,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<TaxNode> }) => {
      const { error } = await db.from("apex_taxonomy").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("apex_taxonomy").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* ---------------- Banco (admin) ---------------- */

export function useBankStats(enabled: boolean) {
  const fn = useServerFn(apexBankStats);
  return useQuery({ queryKey: ["apex", "bank-stats"], enabled, queryFn: () => fn({ data: undefined as never }) });
}

export type BankFilters = {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  difficulty: string;
  subjectId: string;
  topicId: string;
  chapterId: string;
  questionType: string;
  program: string;
  tag: string;
};

export function useBankQuestions(filters: BankFilters, enabled: boolean) {
  const fn = useServerFn(apexListQuestions);
  return useQuery({
    queryKey: ["apex", "bank", filters],
    enabled,
    queryFn: () => fn({ data: filters }),
  });
}

export function useBankMutations() {
  const qc = useQueryClient();
  const save = useServerFn(apexSaveQuestion);
  const bulk = useServerFn(apexBulkAction);
  const importFn = useServerFn(apexImportQuestions);
  const suggest = useServerFn(apexSuggestClassification);
  const versions = useServerFn(apexQuestionVersions);
  const restore = useServerFn(apexRestoreVersion);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["apex", "bank"] });
    qc.invalidateQueries({ queryKey: ["apex", "bank-stats"] });
  };

  return {
    save: useMutation({
      mutationFn: (input: { id?: string | null; patch: Record<string, unknown> }) => save({ data: input }),
      onSuccess: invalidate,
    }),
    bulk: useMutation({
      mutationFn: (input: { ids: string[]; action: string }) => bulk({ data: input }),
      onSuccess: invalidate,
    }),
    import: useMutation({
      mutationFn: (input: { rows: Record<string, string>[]; commit: boolean; defaultStatus?: string }) =>
        importFn({ data: input as never }),
      onSuccess: invalidate,
    }),
    suggest: useMutation({
      mutationFn: (samples: { stem: string; explanation?: string }[]) => suggest({ data: { samples } }),
    }),
    versions,
    restore: useMutation({
      mutationFn: (versionId: string) => restore({ data: { versionId } }),
      onSuccess: invalidate,
    }),
  };
}

export function useApexAnalytics(enabled: boolean) {
  const fn = useServerFn(apexAdminAnalytics);
  return useQuery({
    queryKey: ["apex", "analytics"],
    enabled,
    queryFn: () => fn({ data: undefined as never }),
  });
}

/* ---------------- Plantillas de examen ---------------- */

export type ExamBlueprint = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mode: string;
  question_count: number;
  duration_minutes: number;
  blocks: number;
  config: Record<string, unknown>;
  is_published: boolean;
  sort_order: number;
};

export function useExamBlueprints() {
  return useQuery({
    queryKey: ["apex", "exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_exams")
        .select("id,title,slug,description,mode,question_count,duration_minutes,blocks,config,is_published,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ExamBlueprint[];
    },
  });
}

export function useExamBlueprintMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["apex", "exams"] });
  return {
    save: useMutation({
      mutationFn: async (input: { id?: string | null; patch: Record<string, unknown> }) => {
        if (input.id) {
          const { error } = await db.from("apex_exams").update(input.patch).eq("id", input.id);
          if (error) throw error;
          return input.id;
        }
        const { data, error } = await db.from("apex_exams").insert(input.patch).select("id").single();
        if (error) throw error;
        return data.id as string;
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db.from("apex_exams").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
  };
}

/* ---------------- Recursos oficiales ---------------- */

export type ResourceLink = {
  id: string;
  taxonomy_id: string | null;
  label_match: string | null;
  kind: string;
  title: string;
  description: string | null;
  url: string | null;
  is_published: boolean;
};

export function useResourceLinks() {
  return useQuery({
    queryKey: ["apex", "resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_resource_links")
        .select("id,taxonomy_id,label_match,kind,title,description,url,is_published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ResourceLink[];
    },
  });
}

export function useResourceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["apex", "resources"] });
  return {
    save: useMutation({
      mutationFn: async (input: { id?: string | null; patch: Record<string, unknown> }) => {
        if (input.id) {
          const { error } = await db.from("apex_resource_links").update(input.patch).eq("id", input.id);
          if (error) throw error;
          return;
        }
        const { error } = await db.from("apex_resource_links").insert(input.patch);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await db.from("apex_resource_links").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    }),
  };
}

/* ---------------- Exámenes del usuario ---------------- */

export type MyAttempt = {
  id: string;
  title: string;
  mode: string;
  status: string;
  question_count: number;
  duration_minutes: number;
  score: number | null;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  seconds_used: number;
  started_at: string;
  submitted_at: string | null;
  analysis: Record<string, any>;
};

export function useMyAttempts(userId: string | undefined) {
  return useQuery({
    queryKey: ["apex", "my-attempts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_attempts")
        .select(
          "id,title,mode,status,question_count,duration_minutes,score,correct_count,wrong_count,unanswered_count,seconds_used,started_at,submitted_at,analysis",
        )
        .eq("user_id", userId!)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as MyAttempt[];
    },
  });
}

export function useStartExam() {
  const fn = useServerFn(apexStartExam);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { examId?: string | null; config?: Record<string, unknown> }) =>
      fn({ data: input as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "my-attempts"] }),
  });
}

export function useAttempt(attemptId: string | null) {
  const fn = useServerFn(apexGetAttempt);
  return useQuery({
    queryKey: ["apex", "attempt", attemptId],
    enabled: !!attemptId,
    staleTime: Infinity,
    queryFn: () => fn({ data: { attemptId: attemptId! } }),
  });
}

export function useSaveAnswer() {
  const fn = useServerFn(apexSaveAnswer);
  return useMutation({
    mutationFn: (input: {
      attemptId: string;
      itemId: string;
      chosen: string[];
      seconds: number;
      flagged: boolean;
    }) => fn({ data: input }),
  });
}

export function useSubmitAttempt() {
  const fn = useServerFn(apexSubmitAttempt);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => fn({ data: { attemptId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["apex", "my-attempts"] });
      qc.invalidateQueries({ queryKey: ["apex", "review"] });
    },
  });
}

export function useAttemptReview(attemptId: string | null, enabled = true) {
  const fn = useServerFn(apexReviewAttempt);
  return useQuery({
    queryKey: ["apex", "review", attemptId],
    enabled: !!attemptId && enabled,
    queryFn: () => fn({ data: { attemptId: attemptId! } }),
  });
}

export function useLearningActions() {
  const qc = useQueryClient();
  const cards = useServerFn(apexGenerateFlashcards);
  const summary = useServerFn(apexGenerateSummary);
  const plan = useServerFn(apexGenerateStudyPlan);
  const recovery = useServerFn(apexCreateRecoveryExam);
  const flag = useServerFn(apexFlagQuestion);
  return {
    flashcards: useMutation({
      mutationFn: (attemptId: string) => cards({ data: { attemptId } }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "flashcards"] }),
    }),
    summary: useMutation({
      mutationFn: (attemptId: string) => summary({ data: { attemptId } }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "summaries"] }),
    }),
    plan: useMutation({
      mutationFn: (attemptId: string) => plan({ data: { attemptId } }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "plan"] }),
    }),
    recovery: useMutation({
      mutationFn: (attemptId: string) => recovery({ data: { attemptId } }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "my-attempts"] }),
    }),
    flag: useMutation({
      mutationFn: (input: { questionId: string; reason: string; note?: string }) => flag({ data: input }),
    }),
  };
}

/* ---------------- Flashcards / resúmenes / plan ---------------- */

export type ApexFlashcard = {
  id: string;
  deck: string;
  front: string;
  back: string;
  source: string | null;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  state: string;
};

export function useMyFlashcards(userId: string | undefined) {
  return useQuery({
    queryKey: ["apex", "flashcards", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_flashcards")
        .select("id,deck,front,back,source,ease,interval_days,repetitions,due_at,state")
        .eq("user_id", userId!)
        .order("due_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ApexFlashcard[];
    },
  });
}

export function useReviewFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { card: ApexFlashcard; grade: number }) => {
      const next = scheduleReview(
        {
          ease: Number(input.card.ease),
          interval_days: input.card.interval_days,
          repetitions: input.card.repetitions,
        },
        input.grade,
      );
      const { error } = await db.from("apex_flashcards").update(next).eq("id", input.card.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "flashcards"] }),
  });
}

export function useMySummaries(userId: string | undefined) {
  return useQuery({
    queryKey: ["apex", "summaries", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_summaries")
        .select("id,title,content,created_at,attempt_id")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PlanItem = {
  id: string;
  day_number: number;
  title: string;
  detail: string | null;
  kind: string;
  minutes: number;
  taxonomy_label: string | null;
  is_done: boolean;
  attempt_id: string | null;
};

export function useMyStudyPlan(userId: string | undefined) {
  return useQuery({
    queryKey: ["apex", "plan", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_study_plan")
        .select("id,day_number,title,detail,kind,minutes,taxonomy_label,is_done,attempt_id")
        .eq("user_id", userId!)
        .order("day_number", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as PlanItem[];
    },
  });
}

export function useTogglePlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; done: boolean }) => {
      const { error } = await db.from("apex_study_plan").update({ is_done: input.done }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apex", "plan"] }),
  });
}

/** Recursos oficiales que coinciden con una etiqueta de tema/capítulo. */
export function useResourcesForLabels(labels: string[]) {
  const key = labels.map((l) => l.toLowerCase()).sort().join("|");
  return useQuery({
    queryKey: ["apex", "resources-for", key],
    enabled: labels.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apex_resource_links")
        .select("id,title,description,kind,url,label_match")
        .eq("is_published", true)
        .in(
          "label_match",
          labels.map((l) => l.toLowerCase()),
        );
      if (error) throw error;
      return data ?? [];
    },
  });
}
