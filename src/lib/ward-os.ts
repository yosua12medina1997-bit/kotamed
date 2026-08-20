/**
 * Ward OS — capa de datos del módulo "Rotación Pediatría HNSEB ·
 * Hospitalización Pediátrica". Croquis interactivo, pacientes académicos,
 * evoluciones SOAP, problemas, plan, pendientes, competencias y casos.
 *
 * Las tablas `ward_*` son nuevas y no están en los tipos generados, por eso se
 * usa un cliente sin tipar (mismo patrón que el HIS neonatal).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const wdb = supabase as any;

/* ────────────────────────────── Modelos ────────────────────────────── */

export interface WardPavilion {
  id: string;
  code: string;
  name: string;
  subtitle: string | null;
  sort_order: number;
}

export interface WardZone {
  id: string;
  pavilion_id: string;
  label: string;
  kind: ZoneKind;
  col: number;
  row_index: number;
  col_span: number;
  row_span: number;
  accent: string | null;
  note: string | null;
  sort_order: number;
}

export interface WardBed {
  id: string;
  zone_id: string;
  number: string;
  sort_order: number;
  active: boolean;
}

export interface WardPatient {
  id: string;
  bed_id: string | null;
  code: string | null;
  initials: string | null;
  sex: string | null;
  age_label: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  admitted_at: string;
  discharged_at: string | null;
  reason: string | null;
  main_dx: string | null;
  secondary_dx: string[];
  background: string | null;
  allergies: string | null;
  medications: string | null;
  devices: string[];
  status: PatientStatus;
  priority: string;
  notes: string | null;
  created_by: string | null;
}

export interface WardEvolution {
  id: string;
  patient_id: string;
  evo_date: string;
  hosp_day: number | null;
  status: string;
  subjective: Record<string, string>;
  objective: Record<string, string>;
  analysis: string | null;
  plan_note: string | null;
  summary: string | null;
  author_id: string | null;
  created_at: string;
}

export interface WardProblem {
  id: string;
  patient_id: string;
  title: string;
  state: string;
  trend: string;
  evidence: string | null;
  studies: string | null;
  plan: string | null;
  sort_order: number;
}

export interface WardPlanItem {
  id: string;
  patient_id: string;
  problem_id: string | null;
  category: string;
  content: string;
  status: string;
  owner: string | null;
  due_at: string | null;
  sort_order: number;
}

export interface WardTask {
  id: string;
  patient_id: string | null;
  title: string;
  kind: string;
  priority: string;
  status: string;
  owner: string | null;
  due_at: string | null;
  done_at: string | null;
}

export interface WardStudyLink {
  id: string;
  dx_key: string;
  topic: string;
  summary: string | null;
  key_points: string | null;
  url: string | null;
  sort_order: number;
}

export interface WardCompetency {
  id: string;
  code: string;
  title: string;
  group_label: string;
  description: string | null;
  sort_order: number;
}

export interface WardCompetencyProgress {
  id: string;
  user_id: string;
  competency_id: string;
  state: string;
  note: string | null;
}

export interface WardAssignment {
  id: string;
  patient_id: string;
  user_id: string;
  zone_id: string | null;
  role: string;
  active: boolean;
}

export interface WardLearningCase {
  id: string;
  patient_id: string | null;
  title: string;
  problem: string | null;
  differential: string | null;
  final_dx: string | null;
  studies: string | null;
  treatment: string | null;
  evolution: string | null;
  learnings: string | null;
  difficulties: string | null;
  pearls: string | null;
  reflection: string | null;
  created_at: string;
}

/* ───────────────────────────── Constantes ──────────────────────────── */

export type ZoneKind = "room" | "service" | "circulation" | "entrance";

export const ZONE_KINDS: { value: ZoneKind; label: string }[] = [
  { value: "room", label: "Sala / habitación" },
  { value: "service", label: "Servicio (nutrición, SSHH, star)" },
  { value: "circulation", label: "Pasadizo" },
  { value: "entrance", label: "Entrada" },
];

export type PatientStatus =
  | "estable"
  | "seguimiento"
  | "prioritario"
  | "critico"
  | "pendiente"
  | "alta";

export const PATIENT_STATUS: Record<
  PatientStatus,
  { label: string; color: string; short: string }
> = {
  estable: { label: "Estable", color: "#22c55e", short: "EST" },
  seguimiento: { label: "En seguimiento", color: "#38bdf8", short: "SEG" },
  prioritario: { label: "Prioritario", color: "#f59e0b", short: "PRI" },
  critico: { label: "Crítico", color: "#ef4444", short: "CRÍ" },
  pendiente: { label: "Pendiente", color: "#a78bfa", short: "PEN" },
  alta: { label: "Alta programada", color: "#14b8a6", short: "ALT" },
};

export const PRIORITIES = ["baja", "media", "alta"] as const;

export const PLAN_CATEGORIES = [
  { value: "monitorizacion", label: "Monitorización" },
  { value: "laboratorio", label: "Laboratorio / imágenes" },
  { value: "tratamiento", label: "Tratamiento" },
  { value: "hidratacion", label: "Hidratación / nutrición" },
  { value: "procedimiento", label: "Procedimiento" },
  { value: "educacion", label: "Educación a familia" },
  { value: "alta", label: "Criterios de alta" },
] as const;

/** Guía estructurada del SOAP para el interno. */
export const SOAP_SUBJECTIVE = [
  { key: "noche", label: "¿Cómo pasó la noche?" },
  { key: "apetito", label: "Apetito / tolerancia oral" },
  { key: "fiebre", label: "Fiebre en las últimas 24 h" },
  { key: "deposiciones", label: "Deposiciones y diuresis" },
  { key: "sintomas", label: "Síntomas nuevos o persistentes" },
  { key: "familia", label: "Referido por la familia" },
] as const;

export const SOAP_OBJECTIVE = [
  { key: "fc", label: "FC (lpm)" },
  { key: "fr", label: "FR (rpm)" },
  { key: "t", label: "T° (°C)" },
  { key: "sato2", label: "SatO₂ (%)" },
  { key: "pa", label: "PA (mmHg)" },
  { key: "peso", label: "Peso (kg)" },
  { key: "examen", label: "Examen físico dirigido" },
  { key: "laboratorio", label: "Laboratorio / imágenes del día" },
  { key: "balance", label: "Balance hídrico" },
] as const;

/** Mapa diagnóstico → clave de ruta de estudio. */
export const DX_KEYS: { key: string; match: RegExp; label: string }[] = [
  { key: "neumonia", match: /neumon/i, label: "Neumonía" },
  { key: "bronquiolitis", match: /bronquiol/i, label: "Bronquiolitis" },
  { key: "deshidratacion", match: /deshidrat|diarrea|gastroenter/i, label: "Deshidratación" },
  { key: "sepsis", match: /sepsis|séptic|septic/i, label: "Sepsis" },
  { key: "anemia", match: /anemia/i, label: "Anemia" },
  { key: "itu", match: /itu|urinar|pielonef/i, label: "ITU" },
  { key: "asma", match: /asma|sibilan/i, label: "Asma / SOB" },
  { key: "convulsion", match: /convuls|epilep/i, label: "Convulsiones" },
];

export function dxKeysFor(text: string | null | undefined): string[] {
  const t = text ?? "";
  return DX_KEYS.filter((d) => d.match.test(t)).map((d) => d.key);
}

export function hospitalDay(admittedAt: string): number {
  const start = new Date(`${admittedAt}T00:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.max(1, Math.round((today - start) / 86_400_000) + 1);
}

export function patientLabel(p: WardPatient): string {
  return p.initials?.trim() || p.code?.trim() || "Paciente";
}

/* ─────────────────────────────── Hooks ─────────────────────────────── */

const k = (...parts: unknown[]) => ["ward", ...parts];

export function usePavilions() {
  return useQuery({
    queryKey: k("pavilions"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_pavilions")
        .select("id,code,name,subtitle,sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardPavilion[];
    },
  });
}

export function useZones(pavilionId: string | null) {
  return useQuery({
    queryKey: k("zones", pavilionId),
    enabled: !!pavilionId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_zones")
        .select("*")
        .eq("pavilion_id", pavilionId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardZone[];
    },
  });
}

export function useBeds() {
  return useQuery({
    queryKey: k("beds"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_beds")
        .select("id,zone_id,number,sort_order,active")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardBed[];
    },
  });
}

export function usePatients() {
  return useQuery({
    queryKey: k("patients"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_patients")
        .select("*")
        .is("discharged_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WardPatient[];
    },
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: k("assignments"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_assignments")
        .select("id,patient_id,user_id,zone_id,role,active")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as WardAssignment[];
    },
  });
}

export function useEvolutions(patientId: string | null) {
  return useQuery({
    queryKey: k("evolutions", patientId),
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_evolutions")
        .select("*")
        .eq("patient_id", patientId)
        .order("evo_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WardEvolution[];
    },
  });
}

export function useProblems(patientId: string | null) {
  return useQuery({
    queryKey: k("problems", patientId),
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_problems")
        .select("*")
        .eq("patient_id", patientId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardProblem[];
    },
  });
}

export function usePlanItems(patientId: string | null) {
  return useQuery({
    queryKey: k("plan", patientId),
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_plan_items")
        .select("*")
        .eq("patient_id", patientId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardPlanItem[];
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: k("tasks"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_tasks")
        .select("*")
        .order("status")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as WardTask[];
    },
  });
}

export function useStudyLinks() {
  return useQuery({
    queryKey: k("study"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_study_links")
        .select("*")
        .order("dx_key")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardStudyLink[];
    },
  });
}

export function useCompetencies() {
  return useQuery({
    queryKey: k("competencies"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_competencies")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as WardCompetency[];
    },
  });
}

export function useCompetencyProgress(userId: string | undefined) {
  return useQuery({
    queryKey: k("progress", userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_competency_progress")
        .select("id,user_id,competency_id,state,note")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as WardCompetencyProgress[];
    },
  });
}

export function useLearningCases() {
  return useQuery({
    queryKey: k("cases"),
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_learning_cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WardLearningCase[];
    },
  });
}

/* ───────────────────────────── Mutaciones ──────────────────────────── */

/** Mutación genérica de guardado (insert/update) e invalidación por tabla. */
export function useWardSave(table: string, invalidate: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await wdb.from(table).update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await wdb
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
  });
}

export function useWardDelete(table: string, invalidate: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await wdb.from(table).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
    },
  });
}

export const WARD_KEYS = {
  pavilions: k("pavilions"),
  zones: k("zones"),
  beds: k("beds"),
  patients: k("patients"),
  assignments: k("assignments"),
  tasks: k("tasks"),
  study: k("study"),
  competencies: k("competencies"),
  cases: k("cases"),
  evolutions: k("evolutions"),
  problems: k("problems"),
  plan: k("plan"),
  progress: k("progress"),
};
