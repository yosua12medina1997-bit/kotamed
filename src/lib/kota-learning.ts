/**
 * KOTA LEARNING — Academic Clinical Hub.
 * Capa de datos del centro académico por paciente para Hospitalización
 * Pediátrica (Kota Ward) y Emergencia Pediátrica (Kota Emergency).
 *
 * Tablas `kl_*` (nuevas, fuera de los tipos generados) → cliente sin tipar.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const kdb = supabase as any;

export type KlModule = "ward" | "emergency";

export interface KlResource {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  url: string | null;
  storage_path: string | null;
  body: string | null;
  specialty: string | null;
  level: string | null;
  tags: string[];
  objectives: string[];
  duration_label: string | null;
  meta: Record<string, unknown>;
  archived: boolean;
  sort_order: number;
  created_at: string;
}

export interface KlAssignment {
  id: string;
  resource_id: string;
  scope: KlScope;
  scope_value: string;
  module: string | null;
  required: boolean;
  note: string | null;
  sort_order: number;
}

export type KlScope = "module" | "topic" | "dx" | "patient" | "role" | "user";

export interface KlAnalysis {
  id: string;
  module: string;
  patient_id: string;
  blocks: Record<string, string>;
  progress: number;
  updated_at: string;
}

export interface KlProgress {
  id: string;
  user_id: string;
  resource_id: string;
  patient_id: string | null;
  status: string;
  score: number | null;
  minutes: number;
  completed_at: string | null;
}

/* ───────────────────────────── Constantes ───────────────────────────── */

export const RESOURCE_KINDS = [
  { key: "tema", label: "Tema académico", icon: "BookOpen", color: "#0ea5e9" },
  { key: "video", label: "Video", icon: "PlayCircle", color: "#8b5cf6" },
  { key: "pdf", label: "PDF / Guía", icon: "FileText", color: "#f43f5e" },
  { key: "imagen", label: "Imagen / Infografía", icon: "Image", color: "#f59e0b" },
  { key: "algoritmo", label: "Algoritmo", icon: "GitBranch", color: "#14b8a6" },
  { key: "caso", label: "Caso clínico", icon: "Stethoscope", color: "#6366f1" },
  { key: "flashcards", label: "Flashcards", icon: "Layers", color: "#ec4899" },
  { key: "preguntas", label: "Banco de preguntas", icon: "HelpCircle", color: "#22c55e" },
  { key: "presentacion", label: "Presentación", icon: "Presentation", color: "#0284c7" },
  { key: "articulo", label: "Artículo científico", icon: "Newspaper", color: "#64748b" },
  { key: "enlace", label: "Enlace externo", icon: "Link2", color: "#0891b2" },
  { key: "documento", label: "Documento / Archivo", icon: "Paperclip", color: "#7c3aed" },
] as const;

export function kindMeta(kind: string) {
  return RESOURCE_KINDS.find((k) => k.key === kind) ?? RESOURCE_KINDS[0];
}

export const LEVELS = ["Interno", "Residente R1", "Residente R2", "Residente R3", "General"] as const;

export const SCOPE_LABELS: Record<KlScope, string> = {
  module: "Módulo",
  topic: "Tema",
  dx: "Diagnóstico / condición",
  patient: "Paciente",
  role: "Rol o grupo",
  user: "Usuario",
};

/** Bloques del workspace de razonamiento clínico, adaptados al contexto. */
export const REASONING_BLOCKS: {
  key: string;
  index: string;
  title: string;
  hintWard: string;
  hintEmerg: string;
}[] = [
  {
    key: "paciente",
    index: "01",
    title: "El paciente",
    hintWard: "Datos clínicos relevantes, día de hospitalización y evolución global.",
    hintEmerg: "Motivo de consulta, triaje, tiempo de llegada y estado general.",
  },
  {
    key: "problema",
    index: "02",
    title: "El problema",
    hintWard: "¿Cuál es el principal problema clínico activo hoy?",
    hintEmerg: "¿Cuál es el problema que amenaza la estabilidad del paciente?",
  },
  {
    key: "piensa",
    index: "03",
    title: "Piensa",
    hintWard: "Diagnósticos diferenciales y razonamiento fisiopatológico.",
    hintEmerg: "Diferenciales urgentes y descarte de causas potencialmente letales.",
  },
  {
    key: "investiga",
    index: "04",
    title: "Investiga",
    hintWard: "Exámenes, resultados, interpretación e imágenes.",
    hintEmerg: "Exámenes de urgencia, gasometría, imágenes y evidencia disponible.",
  },
  {
    key: "decide",
    index: "05",
    title: "Decide",
    hintWard: "Conducta terapéutica, plan diario y ajustes de manejo.",
    hintEmerg: "Estabilización, ABCDE, procedimientos y disposición final.",
  },
  {
    key: "aprende",
    index: "06",
    title: "Aprende",
    hintWard: "Puntos académicos y recursos relacionados con el caso.",
    hintEmerg: "Algoritmos, guías y puntos clave del manejo crítico.",
  },
  {
    key: "reflexiona",
    index: "07",
    title: "Reflexiona",
    hintWard: "Conclusiones, errores o alertas y preguntas para discusión.",
    hintEmerg: "Reevaluación crítica, alertas y preguntas para la entrega.",
  },
];

/** Campos estructurados del análisis clínico (además de los 7 bloques). */
export const ANALYSIS_FIELDS = [
  { key: "resumen", label: "Resumen del caso" },
  { key: "problemas", label: "Problemas clínicos activos" },
  { key: "diferenciales", label: "Diagnósticos diferenciales" },
  { key: "principal", label: "Diagnóstico principal" },
  { key: "fisiopatologia", label: "Fundamento fisiopatológico" },
  { key: "examenes", label: "Interpretación de exámenes" },
  { key: "imagenes", label: "Análisis de imágenes o estudios" },
  { key: "terapeutica", label: "Decisiones terapéuticas" },
  { key: "plan", label: "Plan de manejo" },
  { key: "evolucion", label: "Evolución clínica" },
  { key: "puntos", label: "Puntos de aprendizaje" },
  { key: "alertas", label: "Errores o alertas clínicas" },
  { key: "discusion", label: "Preguntas para discusión" },
] as const;

export function klError(e: unknown) {
  const msg = (e as { message?: string } | null)?.message ?? "No se pudo guardar.";
  toast.error(msg);
  // eslint-disable-next-line no-console
  console.error("[Kota Learning]", e);
}

export const KL_KEYS = {
  resources: ["kl", "resources"],
  assignments: ["kl", "assignments"],
  analysis: (module: string, patientId: string | null) => ["kl", "analysis", module, patientId],
  progress: (userId: string | undefined) => ["kl", "progress", userId],
};

/* ─────────────────────────────── Hooks ─────────────────────────────── */

export function useKlResources() {
  return useQuery({
    queryKey: KL_KEYS.resources,
    queryFn: async () => {
      const { data, error } = await kdb
        .from("kl_resources")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KlResource[];
    },
  });
}

export function useKlAssignments() {
  return useQuery({
    queryKey: KL_KEYS.assignments,
    queryFn: async () => {
      const { data, error } = await kdb.from("kl_assignments").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as KlAssignment[];
    },
  });
}

export function useKlAnalysis(module: KlModule, patientId: string | null) {
  return useQuery({
    queryKey: KL_KEYS.analysis(module, patientId),
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await kdb
        .from("kl_analyses")
        .select("*")
        .eq("module", module)
        .eq("patient_id", patientId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as KlAnalysis | null;
    },
  });
}

export function useSaveAnalysis(module: KlModule, patientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: Record<string, string>) => {
      if (!patientId) throw new Error("Selecciona un paciente activo.");
      const { data: auth } = await supabase.auth.getUser();
      const filled = Object.values(blocks).filter((v) => (v ?? "").trim().length > 0).length;
      const total = REASONING_BLOCKS.length + ANALYSIS_FIELDS.length;
      const { error } = await kdb.from("kl_analyses").upsert(
        {
          module,
          patient_id: patientId,
          blocks,
          progress: Math.round((filled / total) * 100),
          updated_by: auth.user?.id ?? null,
          created_by: auth.user?.id ?? null,
        },
        { onConflict: "module,patient_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Análisis clínico guardado");
      void qc.invalidateQueries({ queryKey: KL_KEYS.analysis(module, patientId) });
    },
    onError: klError,
  });
}

export function useKlSave(table: string, invalidate: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await kdb.from(table).update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await kdb
        .from(table)
        .insert({ ...rest, created_by: auth.user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
    },
    onError: klError,
  });
}

export function useKlDelete(table: string, invalidate: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await kdb.from(table).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
    },
    onError: klError,
  });
}

export function useKlProgress(userId: string | undefined) {
  return useQuery({
    queryKey: KL_KEYS.progress(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await kdb.from("kl_progress").select("*").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as KlProgress[];
    },
  });
}

export function useToggleProgress(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      resourceId: string;
      patientId: string | null;
      module: KlModule;
      status: string;
    }) => {
      if (!userId) throw new Error("Inicia sesión para registrar tu avance.");
      const { error } = await kdb.from("kl_progress").upsert(
        {
          user_id: userId,
          resource_id: input.resourceId,
          patient_id: input.patientId,
          module: input.module,
          status: input.status,
          completed_at: input.status === "hecho" ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,resource_id,patient_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KL_KEYS.progress(userId) }),
    onError: klError,
  });
}

/* ───────────────────────────── Selección ───────────────────────────── */

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Recursos relevantes para el contexto actual (módulo, paciente, dx, rol). */
export function relevantResources(
  resources: KlResource[],
  assignments: KlAssignment[],
  ctx: {
    module: KlModule;
    patientId: string | null;
    dxText: string | null;
    roles: string[];
    userId: string | undefined;
  },
): { resource: KlResource; reasons: string[]; required: boolean }[] {
  const byId = new Map(resources.filter((r) => !r.archived).map((r) => [r.id, r]));
  const out = new Map<string, { resource: KlResource; reasons: string[]; required: boolean }>();
  const dx = norm(ctx.dxText ?? "");

  for (const a of assignments) {
    const res = byId.get(a.resource_id);
    if (!res) continue;
    if (a.module && a.module !== ctx.module) continue;
    const value = norm(a.scope_value);
    let reason: string | null = null;
    if (a.scope === "module" && (a.scope_value === ctx.module || value === "todos")) {
      reason = ctx.module === "ward" ? "Hospitalización" : "Emergencia";
    } else if ((a.scope === "dx" || a.scope === "topic") && value) {
      if (dx.includes(value) || value.includes(dx.slice(0, 12))) reason = a.scope_value;
    } else if (a.scope === "patient" && ctx.patientId && a.scope_value === ctx.patientId) {
      reason = "Asignado a este paciente";
    } else if (a.scope === "role" && ctx.roles.some((r) => norm(r) === value)) {
      reason = `Grupo: ${a.scope_value}`;
    } else if (a.scope === "user" && ctx.userId && a.scope_value === ctx.userId) {
      reason = "Asignado a ti";
    }
    if (!reason) continue;
    const prev = out.get(res.id);
    out.set(res.id, {
      resource: res,
      reasons: [...new Set([...(prev?.reasons ?? []), reason])],
      required: (prev?.required ?? false) || a.required,
    });
  }

  // Coincidencia por etiquetas con el diagnóstico del paciente activo.
  if (dx) {
    for (const r of byId.values()) {
      if (out.has(r.id)) continue;
      const hit = [...r.tags, r.title].find((t) => t && (dx.includes(norm(t)) || norm(t).includes(dx)));
      if (hit) out.set(r.id, { resource: r, reasons: [`Relacionado: ${hit}`], required: false });
    }
  }

  return [...out.values()].sort(
    (a, b) => Number(b.required) - Number(a.required) || a.resource.sort_order - b.resource.sort_order,
  );
}
