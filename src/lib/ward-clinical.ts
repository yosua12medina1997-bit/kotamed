/**
 * Ward Clinical OS — capa de datos del expediente longitudinal del paciente
 * pediátrico (Rotación Pediatría HNSEB): historia clínica, examen físico,
 * monitorización, exámenes auxiliares, tratamiento, balance hídrico,
 * interconsultas, procedimientos, cálculos, timeline, alta y adjuntos.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { wdb } from "@/lib/ward-os";

/* ───────────────────────────── Constantes ──────────────────────────── */

export const PATIENT_ORIGINS = [
  { value: "observacion", label: "Observación" },
  { value: "shock_trauma", label: "Shock Trauma" },
  { value: "emergencia", label: "Emergencia" },
  { value: "ingreso_directo", label: "Ingreso directo" },
] as const;

export const PATIENT_STAGES = [
  { value: "shock_trauma", label: "Shock Trauma" },
  { value: "observacion", label: "Observación" },
  { value: "hospitalizacion", label: "Hospitalización" },
  { value: "alta", label: "Alta" },
] as const;

export const ABCDE = [
  { key: "a", label: "A — Vía aérea", hint: "Permeabilidad, secreciones, dispositivos" },
  { key: "b", label: "B — Ventilación", hint: "Trabajo respiratorio, SatO₂, oxigenoterapia" },
  { key: "c", label: "C — Circulación", hint: "FC, PA, perfusión, llenado capilar" },
  { key: "d", label: "D — Neurológico", hint: "Estado de conciencia, Glasgow pediátrico" },
  { key: "e", label: "E — Exposición", hint: "Hallazgos relevantes, temperatura, lesiones" },
] as const;

export const HISTORY_BLOCKS: { key: string; label: string; hint?: string }[] = [
  { key: "identificacion", label: "Identificación", hint: "Acompañante, responsable, procedencia" },
  { key: "motivo", label: "Motivo de consulta", hint: "Ej. fiebre y dificultad respiratoria de 3 días" },
  { key: "enfermedad_actual", label: "Enfermedad actual", hint: "Inicio, tiempo, forma, curso, cronología" },
  { key: "prenatales", label: "Antecedentes prenatales" },
  { key: "perinatales", label: "Antecedentes perinatales" },
  { key: "neonatales", label: "Antecedentes neonatales" },
  { key: "patologicos", label: "Antecedentes patológicos" },
  { key: "hospitalizaciones", label: "Hospitalizaciones previas" },
  { key: "cirugias", label: "Cirugías" },
  { key: "alergias", label: "Alergias" },
  { key: "medicacion", label: "Medicación habitual" },
  { key: "inmunizaciones", label: "Inmunizaciones" },
  { key: "desarrollo", label: "Desarrollo psicomotor" },
  { key: "alimentacion", label: "Alimentación" },
  { key: "familiares", label: "Antecedentes familiares" },
];

export const EXAM_SYSTEMS = [
  "Estado general",
  "Piel y mucosas",
  "Cabeza y cuello",
  "Ojos",
  "Otorrinolaringológico",
  "Cardiovascular",
  "Respiratorio",
  "Abdomen",
  "Genitourinario",
  "Neurológico",
  "Osteomuscular",
  "Extremidades",
] as const;

export const EXAM_CATEGORIES = [
  { value: "laboratorio", label: "Laboratorio" },
  { value: "imagenes", label: "Imágenes" },
  { value: "microbiologia", label: "Microbiología" },
  { value: "otros", label: "Otros estudios" },
] as const;

export const EXAM_SUGGESTIONS: Record<string, string[]> = {
  laboratorio: [
    "Hemograma",
    "PCR",
    "Procalcitonina",
    "Perfil renal",
    "Electrolitos",
    "Gasometría",
    "Perfil hepático",
    "Coagulación",
    "Examen de orina",
  ],
  imagenes: ["Radiografía de tórax", "Ecografía abdominal", "Tomografía", "Resonancia"],
  microbiologia: ["Hemocultivo", "Urocultivo", "Cultivo de secreción", "Panel viral"],
  otros: ["ECG", "Ecocardiograma", "EEG"],
};

export const EXAM_STATUS = [
  { value: "solicitado", label: "Solicitado" },
  { value: "tomado", label: "Tomado" },
  { value: "proceso", label: "En proceso" },
  { value: "resultado", label: "Resultado disponible" },
  { value: "revisado", label: "Revisado" },
] as const;

export const VALUE_FLAGS = [
  { value: "normal", label: "Normal", color: "#22c55e" },
  { value: "alterado", label: "Alterado", color: "#f59e0b" },
  { value: "critico", label: "Crítico", color: "#ef4444" },
] as const;

export const CONSULT_STATUS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "solicitada", label: "Solicitada" },
  { value: "evaluada", label: "Evaluada" },
  { value: "respondida", label: "Respuesta registrada" },
] as const;

export const PROCEDURE_LEVELS = [
  { value: "observado", label: "Observado" },
  { value: "supervisado", label: "Realizado con supervisión" },
  { value: "realizado", label: "Realizado" },
  { value: "competencia", label: "Competencia adquirida" },
] as const;

export const BALANCE_SHIFTS = [
  { value: "manana", label: "Turno mañana" },
  { value: "tarde", label: "Turno tarde" },
  { value: "noche", label: "Turno noche" },
  { value: "24h", label: "24 horas" },
] as const;

export const BALANCE_IN = ["oral", "ev", "medicacion", "otros"] as const;
export const BALANCE_OUT = ["diuresis", "deposiciones", "vomitos", "drenajes", "otros"] as const;

export const DISCHARGE_CHECKS = [
  { key: "dx", label: "Diagnóstico definido" },
  { key: "evolucion", label: "Evolución favorable" },
  { key: "tratamiento", label: "Tratamiento domiciliario indicado" },
  { key: "alarma", label: "Signos de alarma explicados" },
  { key: "control", label: "Control programado" },
  { key: "educacion", label: "Educación al familiar" },
  { key: "resumen", label: "Resumen de alta redactado" },
] as const;

export const TIMELINE_KINDS = [
  { value: "ingreso", label: "Ingreso" },
  { value: "evolucion", label: "Evoluciones" },
  { value: "laboratorio", label: "Laboratorios" },
  { value: "medicacion", label: "Medicación" },
  { value: "procedimiento", label: "Procedimientos" },
  { value: "interconsulta", label: "Interconsultas" },
  { value: "imagen", label: "Imágenes" },
  { value: "critico", label: "Eventos críticos" },
  { value: "nota", label: "Notas" },
] as const;

/* ─────────────────────────────── Modelos ───────────────────────────── */

export interface WardVital {
  id: string;
  patient_id: string;
  taken_at: string;
  temp: number | null;
  fc: number | null;
  fr: number | null;
  pa: string | null;
  pam: number | null;
  sato2: number | null;
  weight_kg: number | null;
  pain: number | null;
  glasgow: number | null;
  note: string | null;
}

export interface WardExamValue {
  label: string;
  value: string;
  unit?: string;
  flag?: string;
}

export interface WardExam {
  id: string;
  patient_id: string;
  category: string;
  name: string;
  requested_at: string;
  taken_at: string | null;
  status: string;
  flag: string;
  result_text: string | null;
  values: WardExamValue[];
  notes: string | null;
}

export interface WardMed {
  id: string;
  patient_id: string;
  name: string;
  dose: string | null;
  unit: string | null;
  route: string | null;
  frequency: string | null;
  started_at: string | null;
  status: string;
  calc: Record<string, unknown>;
  notes: string | null;
}

export interface WardBalance {
  id: string;
  patient_id: string;
  on_date: string;
  shift: string;
  ingresos: Record<string, number>;
  egresos: Record<string, number>;
  note: string | null;
}

export interface WardConsult {
  id: string;
  patient_id: string;
  specialty: string;
  reason: string | null;
  status: string;
  requested_at: string;
  answered_at: string | null;
  response: string | null;
}

export interface WardProcedure {
  id: string;
  patient_id: string | null;
  name: string;
  done_at: string;
  indication: string | null;
  level: string;
  competency_id: string | null;
  note: string | null;
}

export interface WardCalc {
  id: string;
  patient_id: string | null;
  tool: string;
  weight_kg: number | null;
  inputs: Record<string, unknown>;
  result: string | null;
  note: string | null;
  created_at: string;
}

export interface WardEvent {
  id: string;
  patient_id: string;
  kind: string;
  title: string;
  detail: string | null;
  occurred_at: string;
}

export interface WardFile {
  id: string;
  patient_id: string;
  ref_kind: string;
  ref_id: string | null;
  bucket: string;
  path: string;
  name: string;
  mime: string | null;
  size_bytes: number | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

/* ─────────────────────────────── Hooks ─────────────────────────────── */

const ck = (...parts: unknown[]) => ["ward-clinical", ...parts];

export const CLINICAL_KEYS = {
  vitals: (id?: string | null) => ck("vitals", id),
  exams: (id?: string | null) => ck("exams", id),
  meds: (id?: string | null) => ck("meds", id),
  balance: (id?: string | null) => ck("balance", id),
  consults: (id?: string | null) => ck("consults", id),
  procedures: (id?: string | null) => ck("procedures", id),
  calcs: (id?: string | null) => ck("calcs", id),
  events: (id?: string | null) => ck("events", id),
  files: (id?: string | null) => ck("files", id),
};

function usePatientRows<T>(
  table: string,
  key: unknown[],
  patientId: string | null,
  order: { column: string; ascending?: boolean },
) {
  return useQuery({
    queryKey: key,
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from(table)
        .select("*")
        .eq("patient_id", patientId)
        .order(order.column, { ascending: order.ascending ?? false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useVitals = (id: string | null) =>
  usePatientRows<WardVital>("ward_vitals", CLINICAL_KEYS.vitals(id), id, { column: "taken_at" });
export const useExams = (id: string | null) =>
  usePatientRows<WardExam>("ward_exams", CLINICAL_KEYS.exams(id), id, { column: "requested_at" });
export const useMeds = (id: string | null) =>
  usePatientRows<WardMed>("ward_meds", CLINICAL_KEYS.meds(id), id, { column: "created_at" });
export const useBalances = (id: string | null) =>
  usePatientRows<WardBalance>("ward_balance", CLINICAL_KEYS.balance(id), id, { column: "on_date" });
export const useConsults = (id: string | null) =>
  usePatientRows<WardConsult>("ward_consults", CLINICAL_KEYS.consults(id), id, {
    column: "requested_at",
  });
export const useProcedures = (id: string | null) =>
  usePatientRows<WardProcedure>("ward_procedures", CLINICAL_KEYS.procedures(id), id, {
    column: "done_at",
  });
export const useCalcs = (id: string | null) =>
  usePatientRows<WardCalc>("ward_calcs", CLINICAL_KEYS.calcs(id), id, { column: "created_at" });
export const useClinicalEvents = (id: string | null) =>
  usePatientRows<WardEvent>("ward_events", CLINICAL_KEYS.events(id), id, { column: "occurred_at" });

export function useWardFiles(patientId: string | null, refKind?: string) {
  return useQuery({
    queryKey: [...CLINICAL_KEYS.files(patientId), refKind ?? "all"],
    enabled: !!patientId,
    queryFn: async () => {
      let q = wdb.from("ward_files").select("*").eq("patient_id", patientId);
      if (refKind) q = q.eq("ref_kind", refKind);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WardFile[];
    },
  });
}

/** Registra un evento en la línea de tiempo clínica del paciente. */
export async function logClinicalEvent(input: {
  patient_id: string;
  kind: string;
  title: string;
  detail?: string | null;
  occurred_at?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await wdb.from("ward_events").insert({
    ...input,
    detail: input.detail ?? null,
    created_by: auth.user?.id ?? null,
  });
}

/** Sube cualquier archivo clínico (foto, PDF, documento) del paciente. */
export function useUploadClinicalFile(patientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      refKind = "general",
      refId = null,
      note = null,
    }: {
      file: File;
      refKind?: string;
      refId?: string | null;
      note?: string | null;
    }) => {
      if (!patientId) throw new Error("Selecciona un paciente antes de subir archivos.");
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Debes iniciar sesión.");
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `ward/${patientId}/${refKind}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("clinico").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (up.error) throw up.error;
      const { error } = await wdb.from("ward_files").insert({
        patient_id: patientId,
        ref_kind: refKind,
        ref_id: refId,
        bucket: "clinico",
        path,
        name: file.name,
        mime: file.type || null,
        size_bytes: file.size,
        note,
        created_by: userId,
      });
      if (error) throw error;
      await logClinicalEvent({
        patient_id: patientId,
        kind: refKind === "imagenes" ? "imagen" : "nota",
        title: `Archivo adjunto: ${file.name}`,
      });
      return path;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLINICAL_KEYS.files(patientId) });
      void qc.invalidateQueries({ queryKey: CLINICAL_KEYS.events(patientId) });
    },
  });
}

export function useDeleteClinicalFile(patientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: WardFile) => {
      await supabase.storage.from(file.bucket).remove([file.path]);
      const { error } = await wdb.from("ward_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLINICAL_KEYS.files(patientId) }),
  });
}

/** URL firmada temporal para abrir/descargar un adjunto privado. */
export async function signedFileUrl(file: WardFile, seconds = 3600) {
  const { data, error } = await supabase.storage.from(file.bucket).createSignedUrl(file.path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

/* ────────────────────────────── Utilidades ─────────────────────────── */

export function bsaMosteller(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm) return null;
  return Math.sqrt((weightKg * heightCm) / 3600);
}

export function sumValues(rec: Record<string, number> | null | undefined) {
  return Object.values(rec ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function balanceTotals(row: WardBalance, weightKg?: number | null, hours = 24) {
  const ingresos = sumValues(row.ingresos);
  const egresos = sumValues(row.egresos);
  const diuresis = Number(row.egresos?.["diuresis"] ?? 0);
  return {
    ingresos,
    egresos,
    balance: ingresos - egresos,
    diuresisRate: weightKg ? diuresis / weightKg / hours : null,
  };
}

export function humanBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
