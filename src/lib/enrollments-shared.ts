/**
 * Tipos y catálogos compartidos del sistema de matriculación manual.
 * Client-safe: sin secretos ni dependencias de servidor.
 */

export const ENROLLMENT_KINDS = [
  { value: "programa", label: "Programa" },
  { value: "curso", label: "Curso" },
  { value: "diplomado", label: "Diplomado" },
  { value: "especialidad", label: "Especialidad" },
  { value: "biblioteca", label: "Biblioteca" },
  { value: "ia", label: "IA" },
  { value: "manual", label: "Manual" },
  { value: "otro", label: "Otro" },
] as const;

export type EnrollmentKind = (typeof ENROLLMENT_KINDS)[number]["value"];

/** Qué tipos de nodo del árbol académico se ofrecen para cada tipo de matrícula. */
export const KIND_NODE_FILTER: Record<EnrollmentKind, string[]> = {
  programa: ["program"],
  curso: ["course"],
  diplomado: ["program", "course"],
  especialidad: ["program", "area", "subarea"],
  biblioteca: ["program", "area", "subarea", "course"],
  ia: ["program", "area", "subarea", "course"],
  manual: ["program", "area", "subarea", "course", "chapter"],
  otro: ["program", "area", "subarea", "course", "chapter", "lesson"],
};

export const DURATIONS = [
  { value: "permanent", label: "Permanente", days: null },
  { value: "30", label: "30 días", days: 30 },
  { value: "60", label: "60 días", days: 60 },
  { value: "90", label: "90 días", days: 90 },
  { value: "180", label: "6 meses", days: 180 },
  { value: "365", label: "1 año", days: 365 },
  { value: "custom", label: "Personalizada", days: null },
] as const;

export type DurationValue = (typeof DURATIONS)[number]["value"];

export const REASONS = [
  "Compra manual",
  "Beca",
  "Premio",
  "Invitación",
  "Docente",
  "Administrador",
  "Promoción",
  "Convenio institucional",
  "Corrección",
  "Otro",
] as const;

export const ASSIGNMENT_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "membership", label: "Membresía" },
  { value: "institution", label: "Institucional" },
  { value: "promotion", label: "Promoción" },
  { value: "migration", label: "Migración" },
] as const;

export const ENROLLMENT_STATUSES = ["active", "suspended", "expired", "revoked"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export type UserEnrollment = {
  id: string;
  user_id: string;
  node_id: string;
  plan_id: string | null;
  enrollment_kind: string;
  assignment_type: string;
  reason: string | null;
  status: string;
  starts_at: string;
  expires_at: string | null;
  observations: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EnrollmentAuditRow = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  target_user_id: string | null;
  target_email: string | null;
  node_id: string | null;
  node_title: string | null;
  enrollment_id: string | null;
  detail: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

/** Fecha de vencimiento a partir de la duración elegida (null = permanente). */
export function resolveExpiry(
  duration: DurationValue,
  customEnd?: string,
): string | null {
  if (duration === "permanent") return null;
  if (duration === "custom") return customEnd ? new Date(customEnd).toISOString() : null;
  const days = Number(duration);
  if (!Number.isFinite(days) || days <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Una matrícula está vigente si está activa y no ha vencido. */
export function isEnrollmentLive(e: Pick<UserEnrollment, "status" | "expires_at">) {
  if (e.status !== "active") return false;
  return !e.expires_at || new Date(e.expires_at).getTime() > Date.now();
}

export function enrollmentStatusLabel(e: Pick<UserEnrollment, "status" | "expires_at">) {
  if (e.status === "suspended") return "Suspendida";
  if (e.status === "revoked") return "Revocada";
  if (!isEnrollmentLive(e)) return "Vencida";
  return e.expires_at ? "Activa" : "Permanente";
}
