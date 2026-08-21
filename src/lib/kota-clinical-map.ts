/**
 * KOTA CLINICAL MAP — Biblioteca Maestra de Patologías.
 *
 * Capa de datos de la biblioteca clínica compartida por Hospitalización
 * Pediátrica (Kota Ward) y Emergencia Pediátrica (Kota Emergency).
 * Tablas `kcm_*` (fuera de los tipos generados) → cliente sin tipar.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type KcmModule = "ward" | "emergency";
export type KcmArea = "hospitalizacion" | "observacion" | "shock";

export interface KcmPathology {
  id: string;
  code: string | null;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
  specialty: string | null;
  description: string | null;
  keywords: string[];
  synonyms: string[];
  related_dx: string[];
  related_slugs: string[];
  severity: string;
  areas: string[];
  tags: string[];
  age_range: string | null;
  frequency: string | null;
  icon: string | null;
  color: string | null;
  active: boolean;
  archived: boolean;
  sort_order: number;
  created_at: string;
}

export interface KcmAreaConfig {
  id: string;
  pathology_id: string;
  area: KcmArea;
  focus: string[];
  note: string | null;
  steps: unknown;
}

export interface KcmResourceLink {
  id: string;
  pathology_id: string;
  resource_id: string;
  area: string | null;
  step_key: string | null;
  priority: number;
  hidden: boolean;
  note: string | null;
}

export interface KcmPatientLink {
  id: string;
  module: string;
  patient_id: string;
  pathology_id: string;
  area: string | null;
  priority: number;
  hidden: boolean;
  source: string;
  note: string | null;
}

/* ──────────────────────────── Constantes ──────────────────────────── */

export const KCM_AREAS: { key: KcmArea; label: string; short: string; module: KcmModule }[] = [
  { key: "hospitalizacion", label: "Hospitalización Pediátrica", short: "Hospitalización", module: "ward" },
  { key: "observacion", label: "Observación Pediátrica", short: "Observación", module: "emergency" },
  { key: "shock", label: "Shock Trauma", short: "Shock Trauma", module: "emergency" },
];

export const KCM_CATEGORIES = [
  "Respiratorias",
  "Infecciosas",
  "Gastrointestinales",
  "Neurológicas",
  "Shock y emergencias críticas",
  "Metabólicas y endocrinológicas",
  "Toxicológicas",
] as const;

export const KCM_SEVERITIES: { key: string; label: string; color: string }[] = [
  { key: "leve", label: "Leve", color: "#22c55e" },
  { key: "moderada", label: "Moderada", color: "#f59e0b" },
  { key: "grave", label: "Grave", color: "#f97316" },
  { key: "critica", label: "Crítica", color: "#ef4444" },
  { key: "variable", label: "Variable", color: "#0ea5e9" },
];

export function severityMeta(key: string) {
  return KCM_SEVERITIES.find((s) => s.key === key) ?? KCM_SEVERITIES[4];
}

/** Ruta clínica maestra de 6 pasos, común a todas las áreas. */
export const KCM_STEPS: { key: string; index: string; title: string; hint: string }[] = [
  { key: "reconoce", index: "01", title: "Reconoce", hint: "Identifica el patrón clínico y la gravedad inicial." },
  { key: "evalua", index: "02", title: "Evalúa", hint: "Examen dirigido, signos de alarma y exámenes clave." },
  { key: "piensa", index: "03", title: "Piensa", hint: "Fisiopatología y diagnósticos diferenciales." },
  { key: "decide", index: "04", title: "Decide", hint: "Conducta terapéutica y decisiones de manejo." },
  { key: "reevalua", index: "05", title: "Reevalúa", hint: "Respuesta al tratamiento y criterios de escalamiento." },
  { key: "aprende", index: "06", title: "Aprende", hint: "Puntos académicos y contenido vinculado." },
];

export const KCM_KEYS = {
  pathologies: ["kcm", "pathologies"],
  areaConfig: ["kcm", "area-config"],
  resourceLinks: ["kcm", "resource-links"],
  patientLinks: (module: string, patientId: string | null) => ["kcm", "patient-links", module, patientId],
};

function kcmError(e: unknown) {
  const msg = (e as { message?: string } | null)?.message ?? "No se pudo guardar.";
  toast.error(msg);
  // eslint-disable-next-line no-console
  console.error("[Kota Clinical Map]", e);
}

/* ────────────────────────────── Lecturas ────────────────────────────── */

export function useKcmPathologies() {
  return useQuery({
    queryKey: KCM_KEYS.pathologies,
    queryFn: async (): Promise<KcmPathology[]> => {
      const { data, error } = await db
        .from("kcm_pathologies")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KcmPathology[];
    },
    staleTime: 60_000,
  });
}

export function useKcmAreaConfigs() {
  return useQuery({
    queryKey: KCM_KEYS.areaConfig,
    queryFn: async (): Promise<KcmAreaConfig[]> => {
      const { data, error } = await db.from("kcm_area_config").select("*");
      if (error) throw error;
      return (data ?? []) as KcmAreaConfig[];
    },
    staleTime: 60_000,
  });
}

export function useKcmResourceLinks() {
  return useQuery({
    queryKey: KCM_KEYS.resourceLinks,
    queryFn: async (): Promise<KcmResourceLink[]> => {
      const { data, error } = await db
        .from("kcm_resource_links")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KcmResourceLink[];
    },
    staleTime: 60_000,
  });
}

export function useKcmPatientLinks(module: KcmModule, patientId: string | null) {
  return useQuery({
    queryKey: KCM_KEYS.patientLinks(module, patientId),
    enabled: !!patientId,
    queryFn: async (): Promise<KcmPatientLink[]> => {
      const { data, error } = await db
        .from("kcm_patient_links")
        .select("*")
        .eq("module", module)
        .eq("patient_id", patientId)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KcmPatientLink[];
    },
  });
}

/* ───────────────────────────── Mutaciones ───────────────────────────── */

export function useSavePathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<KcmPathology> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await db.from("kcm_pathologies").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db.from("kcm_pathologies").insert(rest).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KCM_KEYS.pathologies });
      toast.success("Patología guardada.");
    },
    onError: kcmError,
  });
}

export function useDeletePathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("kcm_pathologies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KCM_KEYS.pathologies });
      toast.success("Patología eliminada.");
    },
    onError: kcmError,
  });
}

export function useDuplicatePathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: KcmPathology) => {
      const stamp = Date.now().toString(36);
      const { id, created_at, ...rest } = p as any;
      const { error } = await db.from("kcm_pathologies").insert({
        ...rest,
        code: null,
        name: `${p.name} (copia)`,
        slug: `${p.slug}-copia-${stamp}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KCM_KEYS.pathologies });
      toast.success("Patología duplicada.");
    },
    onError: kcmError,
  });
}

export function useSaveAreaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { pathology_id: string; area: KcmArea; focus: string[]; note: string | null }) => {
      const { error } = await db
        .from("kcm_area_config")
        .upsert(payload, { onConflict: "pathology_id,area" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KCM_KEYS.areaConfig });
      toast.success("Enfoque clínico actualizado.");
    },
    onError: kcmError,
  });
}

export function useSaveResourceLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      pathology_id: string;
      resource_id: string;
      area: string | null;
      step_key?: string | null;
      priority?: number;
      created_by?: string | null;
    }) => {
      const { error } = await db
        .from("kcm_resource_links")
        .upsert(payload, { onConflict: "pathology_id,resource_id,area" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KCM_KEYS.resourceLinks });
      toast.success("Contenido vinculado.");
    },
    onError: kcmError,
  });
}

export function useDeleteResourceLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("kcm_resource_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KCM_KEYS.resourceLinks }),
    onError: kcmError,
  });
}

export function useLinkPatientPathology(module: KcmModule, patientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { pathology_id: string; area: string | null; userId?: string; source?: string }) => {
      if (!patientId) throw new Error("Selecciona un paciente.");
      const { error } = await db.from("kcm_patient_links").upsert(
        {
          module,
          patient_id: patientId,
          pathology_id: payload.pathology_id,
          area: payload.area,
          source: payload.source ?? "manual",
          created_by: payload.userId ?? null,
        },
        { onConflict: "module,patient_id,pathology_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KCM_KEYS.patientLinks(module, patientId) });
      toast.success("Patología vinculada al paciente.");
    },
    onError: kcmError,
  });
}

export function useUnlinkPatientPathology(module: KcmModule, patientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("kcm_patient_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KCM_KEYS.patientLinks(module, patientId) }),
    onError: kcmError,
  });
}

/* ─────────────────────────────── Utilidades ─────────────────────────────── */

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Puntúa cuánto coincide una patología con el texto clínico del paciente. */
export function scorePathology(p: KcmPathology, text: string): number {
  const t = norm(text);
  if (!t.trim()) return 0;
  let score = 0;
  if (t.includes(norm(p.name))) score += 12;
  for (const s of p.synonyms) if (s && t.includes(norm(s))) score += 8;
  for (const k of p.keywords) if (k && t.includes(norm(k))) score += 3;
  for (const d of p.related_dx) if (d && t.includes(norm(d))) score += 4;
  return score;
}

/** Sugerencias automáticas a partir del diagnóstico y problemas del paciente. */
export function suggestPathologies(
  list: KcmPathology[],
  patientText: string,
  area: KcmArea | null,
  limit = 6,
): { pathology: KcmPathology; score: number }[] {
  return list
    .filter((p) => p.active && !p.archived)
    .filter((p) => !area || p.areas.length === 0 || p.areas.includes(area))
    .map((p) => ({ pathology: p, score: scorePathology(p, patientText) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Filtro de búsqueda de la biblioteca. */
export function filterPathologies(
  list: KcmPathology[],
  opts: { query?: string; category?: string | null; area?: KcmArea | null; severity?: string | null; showArchived?: boolean },
): KcmPathology[] {
  const q = norm(opts.query ?? "").trim();
  return list.filter((p) => {
    if (!opts.showArchived && (p.archived || !p.active)) return false;
    if (opts.category && p.category !== opts.category) return false;
    if (opts.severity && p.severity !== opts.severity) return false;
    if (opts.area && p.areas.length > 0 && !p.areas.includes(opts.area)) return false;
    if (!q) return true;
    const hay = [p.name, p.code ?? "", p.category, p.subcategory ?? "", ...p.synonyms, ...p.keywords, ...p.tags]
      .map(norm)
      .join(" ");
    return hay.includes(q);
  });
}

export function areaMeta(area: string | null | undefined) {
  return KCM_AREAS.find((a) => a.key === area) ?? KCM_AREAS[0];
}

/** Áreas disponibles según el módulo clínico activo. */
export function areasForModule(module: KcmModule): KcmArea[] {
  return KCM_AREAS.filter((a) => a.module === module).map((a) => a.key);
}
