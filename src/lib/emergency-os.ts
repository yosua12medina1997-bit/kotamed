/**
 * Kota Emergency — capa de datos del módulo "Rotación Pediatría HNSEB ·
 * Emergencia Pediátrica". Flujo: INGRESO → EVALUACIÓN → PRIORIZACIÓN →
 * ESTABILIZACIÓN → OBSERVACIÓN / SHOCK TRAUMA → REEVALUACIÓN → DESTINO.
 *
 * Las tablas `emerg_*` son nuevas y no están en los tipos generados, por eso se
 * usa un cliente sin tipar (mismo patrón que Kota Ward).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const edb = supabase as any;

export const EMERG_PERMISSION_MSG =
  "No se guardó: no tienes permisos sobre este registro (box asignado a otro interno o se requiere rol administrador).";

export function emergError(e: unknown) {
  const msg =
    (e as { message?: string } | null)?.message ?? "No se pudo guardar. Inténtalo de nuevo.";
  toast.error(msg);
  // eslint-disable-next-line no-console
  console.error("[Kota Emergency]", e);
}

/* ────────────────────────────── Modelos ────────────────────────────── */

export type EmergArea = "observacion" | "shock";

export interface EmergBox {
  id: string;
  area: EmergArea;
  code: string;
  label: string | null;
  sort_order: number;
  active: boolean;
}

export interface EmergBoxAssignment {
  id: string;
  box_id: string;
  user_id: string;
  role: string;
  active: boolean;
  note: string | null;
}

export type EmergStatus = "estable" | "seguimiento" | "prioritario" | "critico" | "estabilizacion";

export interface EmergPatient {
  id: string;
  box_id: string | null;
  area: EmergArea;
  code: string | null;
  initials: string | null;
  sex: string | null;
  age_label: string | null;
  weight_kg: number | null;
  admitted_at: string;
  reason: string | null;
  main_dx: string | null;
  status: EmergStatus;
  general_state: string | null;
  abcde: Record<string, { state?: string; note?: string }>;
  initial: Record<string, string>;
  problems: string[];
  next_recheck_at: string | null;
  handoff_at: string | null;
  disposition: string | null;
  disposition_note: string | null;
  disposition_at: string | null;
  discharged_at: string | null;
  ward_patient_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EmergReassessment {
  id: string;
  patient_id: string;
  at: string;
  vitals: Record<string, string>;
  state: string | null;
  response: string | null;
  findings: string | null;
  conduct: string | null;
  created_by: string | null;
}

export interface EmergEvolution {
  id: string;
  patient_id: string;
  at: string;
  status: string;
  subjective: string | null;
  objective: string | null;
  analysis: string | null;
  plan_note: string | null;
  created_by: string | null;
}

export interface EmergExam {
  id: string;
  patient_id: string;
  category: string;
  name: string;
  priority: string;
  status: string;
  result: string | null;
  flag: string;
  requested_at: string;
  created_by: string | null;
}

export interface EmergTreatment {
  id: string;
  patient_id: string;
  drug: string;
  dose: string | null;
  route: string | null;
  at: string;
  status: string;
  note: string | null;
  created_by: string | null;
}

export interface EmergBalanceRow {
  id: string;
  patient_id: string;
  at: string;
  kind: string;
  label: string | null;
  volume_ml: number;
  note: string | null;
  created_by: string | null;
}

export interface EmergConsult {
  id: string;
  patient_id: string;
  specialty: string;
  priority: string;
  status: string;
  question: string | null;
  answer: string | null;
  requested_at: string;
  created_by: string | null;
}

export interface EmergProcedure {
  id: string;
  patient_id: string;
  name: string;
  at: string;
  status: string;
  operator: string | null;
  supervisor: string | null;
  result: string | null;
  created_by: string | null;
}

export interface EmergCalc {
  id: string;
  patient_id: string;
  tool: string;
  weight_kg: number | null;
  result: string | null;
  created_at: string;
}

export interface EmergEvent {
  id: string;
  patient_id: string;
  at: string;
  kind: string;
  title: string;
  detail: string | null;
}

export interface EmergTask {
  id: string;
  patient_id: string | null;
  title: string;
  priority: string;
  status: string;
  due_at: string | null;
  done_at: string | null;
  created_by: string | null;
}

/* ───────────────────────────── Constantes ──────────────────────────── */

export const EMERG_STATUS: Record<EmergStatus, { label: string; color: string; short: string }> = {
  estable: { label: "Estable", color: "#16a34a", short: "EST" },
  seguimiento: { label: "En observación", color: "#0ea5e9", short: "OBS" },
  prioritario: { label: "Prioritario", color: "#f59e0b", short: "PRI" },
  estabilizacion: { label: "En estabilización", color: "#f97316", short: "EST+" },
  critico: { label: "Crítico", color: "#f43f5e", short: "CRÍ" },
};

export const AREAS: { value: EmergArea; label: string; hint: string; color: string }[] = [
  {
    value: "observacion",
    label: "Observación",
    hint: "Seguimiento y reevaluación de pacientes.",
    color: "#0ea5e9",
  },
  {
    value: "shock",
    label: "Shock Trauma",
    hint: "Atención inmediata y estabilización.",
    color: "#f43f5e",
  },
];

export const ABCDE_ITEMS = [
  { key: "a", label: "A · Vía aérea" },
  { key: "b", label: "B · Respiración" },
  { key: "c", label: "C · Circulación" },
  { key: "d", label: "D · Estado neurológico" },
  { key: "e", label: "E · Exposición" },
] as const;

export const ABCDE_STATES = [
  { value: "normal", label: "Normal", color: "#16a34a" },
  { value: "alterado", label: "Alterado", color: "#f59e0b" },
  { value: "critico", label: "Crítico", color: "#f43f5e" },
] as const;

export const VITALS = [
  { key: "fc", label: "FC (lpm)" },
  { key: "fr", label: "FR (rpm)" },
  { key: "t", label: "T° (°C)" },
  { key: "sato2", label: "SatO₂ (%)" },
  { key: "pa", label: "PA (mmHg)" },
  { key: "glasgow", label: "Glasgow / AVDI" },
] as const;

export const EXAM_CATEGORIES = ["laboratorio", "imagenes", "microbiologia", "otros"] as const;
export const EXAM_STATES = ["solicitado", "tomado", "pendiente", "disponible", "revisado"] as const;
export const EXAM_FLAGS = [
  { value: "normal", label: "Normal", color: "#16a34a" },
  { value: "alterado", label: "Alterado", color: "#f59e0b" },
  { value: "critico", label: "Crítico", color: "#f43f5e" },
] as const;

export const DISPOSITIONS = [
  { value: "alta", label: "Alta" },
  { value: "observacion", label: "Continúa en Observación" },
  { value: "hospitalizacion", label: "Hospitalización" },
  { value: "uci", label: "UCI Pediátrica" },
  { value: "referencia", label: "Referencia" },
  { value: "otro", label: "Otro" },
] as const;

export const RECHECK_OPTIONS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hora" },
  { minutes: 120, label: "2 horas" },
] as const;

/* ─────────────────────────────── Utils ─────────────────────────────── */

export function patientLabel(p: EmergPatient): string {
  return p.initials?.trim() || p.code?.trim() || "Paciente";
}

export function fmtHour(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tiempo transcurrido en emergencia, formato 02 h 18 min. */
export function elapsed(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "00 min";
  const mins = Math.floor(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`
    : `${String(m).padStart(2, "0")} min`;
}

export function shortElapsed(iso: string | null | undefined): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function isRecheckDue(p: EmergPatient): boolean {
  return !!p.next_recheck_at && new Date(p.next_recheck_at).getTime() <= Date.now();
}

/** Reglas de edición equivalentes a las políticas de la base de datos. */
export function canEditPatient(
  p: EmergPatient | null,
  opts: { isAdmin: boolean; userId?: string; myBoxIds: Set<string> },
): boolean {
  if (!p) return false;
  if (opts.isAdmin) return true;
  if (p.created_by && p.created_by === opts.userId) return true;
  return !!p.box_id && opts.myBoxIds.has(p.box_id);
}

/* ─────────────────────────────── Hooks ─────────────────────────────── */

const k = (...parts: unknown[]) => ["emerg", ...parts];

export const EMERG_KEYS = {
  boxes: k("boxes"),
  boxAssignments: k("box-assignments"),
  patients: k("patients"),
  tasks: k("tasks"),
  reassessments: (id: string | null) => k("reassessments", id),
  evolutions: (id: string | null) => k("evolutions", id),
  exams: (id: string | null) => k("exams", id),
  treatments: (id: string | null) => k("treatments", id),
  balance: (id: string | null) => k("balance", id),
  consults: (id: string | null) => k("consults", id),
  procedures: (id: string | null) => k("procedures", id),
  calcs: (id: string | null) => k("calcs", id),
  events: (id: string | null) => k("events", id),
};

function listHook<T>(table: string, keyFn: (id: string | null) => unknown[], order: string) {
  return (patientId: string | null) =>
    useQuery({
      queryKey: keyFn(patientId),
      enabled: !!patientId,
      queryFn: async () => {
        const { data, error } = await edb
          .from(table)
          .select("*")
          .eq("patient_id", patientId)
          .order(order, { ascending: false });
        if (error) throw error;
        return (data ?? []) as T[];
      },
    });
}

export function useEmergBoxes() {
  return useQuery({
    queryKey: EMERG_KEYS.boxes,
    queryFn: async () => {
      const { data, error } = await edb
        .from("emerg_boxes")
        .select("id,area,code,label,sort_order,active")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as EmergBox[];
    },
  });
}

export function useEmergBoxAssignments() {
  return useQuery({
    queryKey: EMERG_KEYS.boxAssignments,
    queryFn: async () => {
      const { data, error } = await edb
        .from("emerg_box_assignments")
        .select("id,box_id,user_id,role,active,note")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as EmergBoxAssignment[];
    },
  });
}

export function useEmergPatients() {
  return useQuery({
    queryKey: EMERG_KEYS.patients,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await edb
        .from("emerg_patients")
        .select("*")
        .is("discharged_at", null)
        .order("admitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmergPatient[];
    },
  });
}

export function useEmergTasks() {
  return useQuery({
    queryKey: EMERG_KEYS.tasks,
    queryFn: async () => {
      const { data, error } = await edb
        .from("emerg_tasks")
        .select("*")
        .order("status")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as EmergTask[];
    },
  });
}

export const useReassessments = listHook<EmergReassessment>(
  "emerg_reassessments",
  EMERG_KEYS.reassessments,
  "at",
);
export const useEmergEvolutions = listHook<EmergEvolution>(
  "emerg_evolutions",
  EMERG_KEYS.evolutions,
  "at",
);
export const useEmergExams = listHook<EmergExam>("emerg_exams", EMERG_KEYS.exams, "requested_at");
export const useEmergTreatments = listHook<EmergTreatment>(
  "emerg_treatments",
  EMERG_KEYS.treatments,
  "at",
);
export const useEmergBalance = listHook<EmergBalanceRow>(
  "emerg_balance",
  EMERG_KEYS.balance,
  "at",
);
export const useEmergConsults = listHook<EmergConsult>(
  "emerg_consults",
  EMERG_KEYS.consults,
  "requested_at",
);
export const useEmergProcedures = listHook<EmergProcedure>(
  "emerg_procedures",
  EMERG_KEYS.procedures,
  "at",
);
export const useEmergCalcs = listHook<EmergCalc>("emerg_calcs", EMERG_KEYS.calcs, "created_at");
export const useEmergEvents = listHook<EmergEvent>("emerg_events", EMERG_KEYS.events, "at");

/* ───────────────────────────── Mutaciones ──────────────────────────── */

export function useEmergSave(table: string, invalidate: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { data, error } = await edb.from(table).update(rest).eq("id", id).select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error(EMERG_PERMISSION_MSG);
        return id;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await edb
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
    onError: (e) => emergError(e),
  });
}

export function useEmergDelete(table: string, invalidate: unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await edb.from(table).delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(EMERG_PERMISSION_MSG);
      return id;
    },
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => emergError(e),
  });
}

/** Registra un hito en la línea de tiempo de emergencia. */
export async function logEmergEvent(payload: {
  patient_id: string;
  kind: string;
  title: string;
  detail?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await edb.from("emerg_events").insert({ ...payload, created_by: auth.user?.id ?? null });
}
