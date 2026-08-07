/**
 * Registro Inteligente con IA — utilidades de cliente (aditivo).
 * Validación clínica local, recomendaciones informativas, subida de documentos
 * al bucket privado `clinico` y registro de auditoría en `neo_ai_intakes`.
 */
import { CLINICO_BUCKET, hdb } from "@/lib/neonatal-hospital";

export const AI_INTAKE_FIELDS = [
  { key: "apellidos", label: "Apellidos" },
  { key: "nombres", label: "Nombres" },
  { key: "hc", label: "Historia clínica" },
  { key: "sexo", label: "Sexo" },
  { key: "fecha_nacimiento", label: "Fecha de nacimiento" },
  { key: "hora_nacimiento", label: "Hora de nacimiento" },
  { key: "edad_gestacional", label: "Edad gestacional (sem)" },
  { key: "peso_nacimiento", label: "Peso al nacer (g)" },
  { key: "diagnostico_ingreso", label: "Diagnóstico de ingreso" },
  { key: "medico_responsable", label: "Médico responsable" },
  { key: "tipo_parto", label: "Tipo de parto" },
  { key: "apgar", label: "Apgar" },
  { key: "procedencia", label: "Procedencia" },
  { key: "hospital", label: "Hospital" },
  { key: "servicio", label: "Servicio" },
  { key: "madre", label: "Madre" },
  { key: "dni", label: "DNI" },
  { key: "seguro", label: "Seguro" },
  { key: "cama", label: "Número de cama" },
  { key: "observaciones", label: "Observaciones" },
] as const;

export type AiIntakeFieldKey = (typeof AI_INTAKE_FIELDS)[number]["key"];

export interface AiIntakeResult {
  model: string;
  fields: Record<string, string>;
  confidence: Record<string, number>;
  clasificacion: string;
  ocrText: string;
  warnings: string[];
  recommendations: string[];
  overallConfidence: number;
}

export const CONFIDENCE_THRESHOLD = 85;

export const ACCEPTED_INTAKE_TYPES =
  "application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif";

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/* ================================================================== */
/*  VALIDACIÓN CLÍNICA LOCAL                                           */
/* ================================================================== */

export function validateIntake(fields: Record<string, string>): string[] {
  const out: string[] = [];
  const eg = Number(fields["edad_gestacional"]);
  const peso = Number(fields["peso_nacimiento"]);

  if (fields["edad_gestacional"] && (!Number.isFinite(eg) || eg < 20 || eg > 44))
    out.push("Edad gestacional fuera de rango fisiológico (20–44 semanas).");
  if (fields["peso_nacimiento"] && (!Number.isFinite(peso) || peso < 300 || peso > 6500))
    out.push("Peso al nacer fuera de rango esperado (300–6500 g).");
  if (Number.isFinite(eg) && Number.isFinite(peso) && eg >= 37 && peso < 2000)
    out.push("Peso muy bajo para un recién nacido a término: verifica el dato.");
  if (Number.isFinite(eg) && Number.isFinite(peso) && eg < 32 && peso > 2500)
    out.push("Peso elevado para la edad gestacional declarada: verifica el dato.");

  const f = fields["fecha_nacimiento"];
  if (f) {
    const d = new Date(f);
    if (Number.isNaN(d.getTime())) out.push("Fecha de nacimiento inválida.");
    else if (d.getTime() > Date.now() + 60_000) out.push("La fecha de nacimiento es futura.");
  }
  const h = fields["hora_nacimiento"];
  if (h && !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) out.push("Hora de nacimiento inválida (HH:MM).");

  const apgar = fields["apgar"];
  if (apgar) {
    const nums = apgar.match(/\d+/g)?.map(Number) ?? [];
    if (nums.some((n) => n < 0 || n > 10)) out.push("Apgar debe estar entre 0 y 10.");
  }

  if (!fields["apellidos"] && !fields["nombres"])
    out.push("No se detectaron nombres ni apellidos: complétalos manualmente.");

  return out;
}

/** Verifica si la historia clínica ya está registrada en el servicio. */
export async function checkDuplicateHc(hc: string): Promise<string[]> {
  const clean = hc.trim();
  if (!clean) return [];
  const { data, error } = await hdb
    .from("neo_patients")
    .select("id, apellidos, nombres")
    .eq("hc", clean)
    .limit(1);
  if (error || !data?.length) return [];
  const p = data[0];
  return [
    `La historia clínica ${clean} ya existe en el servicio (${[p.apellidos, p.nombres]
      .filter(Boolean)
      .join(" ")}).`,
  ];
}

/* ================================================================== */
/*  RECOMENDACIONES INFORMATIVAS                                       */
/* ================================================================== */

export function clinicalReminders(fields: Record<string, string>, extra: string[] = []): string[] {
  const eg = Number(fields["edad_gestacional"]);
  const peso = Number(fields["peso_nacimiento"]);
  const base = [
    "Vitamina K",
    "Profilaxis ocular",
    "Vacuna BCG",
    "Vacuna Hepatitis B",
    "Tamizaje neonatal",
    "Contacto piel a piel",
    "Lactancia materna precoz",
  ];
  if (Number.isFinite(eg) && eg < 37) base.push("Control térmico y glicemia (prematuro)");
  if (Number.isFinite(peso) && peso < 2500) base.push("Vigilancia nutricional por bajo peso");
  if (Number.isFinite(eg) && eg < 32) base.push("Evaluar surfactante y soporte respiratorio");
  const merged = [...base, ...extra.filter(Boolean)];
  return Array.from(new Set(merged)).slice(0, 14);
}

export function classify(fields: Record<string, string>, fallback = ""): string {
  const eg = Number(fields["edad_gestacional"]);
  if (!Number.isFinite(eg)) return fallback;
  const term = eg < 37 ? "RNPT" : eg > 41.9 ? "RNPOT" : "RNAT";
  return fallback && fallback.includes(term) ? fallback : term;
}

/* ================================================================== */
/*  DOCUMENTOS + AUDITORÍA                                             */
/* ================================================================== */

export async function uploadIntakeDocs(files: File[]): Promise<string[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? "anon";
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `ai-intake/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(CLINICO_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (!error) paths.push(path);
  }
  return paths;
}

export interface AuditPayload {
  patientId?: string | null;
  unit?: string;
  source: "camera" | "upload";
  docPaths: string[];
  result: AiIntakeResult;
  finalData: Record<string, any>;
  corrections: Record<string, { ai: string; final: string }>;
  warnings: string[];
}

export async function saveIntakeAudit(p: AuditPayload): Promise<string | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await hdb
    .from("neo_ai_intakes")
    .insert({
      patient_id: p.patientId ?? null,
      unit: p.unit ?? null,
      source: p.source,
      doc_paths: p.docPaths,
      ocr_text: p.result.ocrText || null,
      ai_data: p.result.fields,
      confidence: p.result.confidence,
      warnings: p.warnings,
      corrections: p.corrections,
      final_data: p.finalData,
      overall_confidence: p.result.overallConfidence,
      model: p.result.model,
      created_by: auth.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return null;
  return data?.id ?? null;
}

export function diffCorrections(
  ai: Record<string, string>,
  final: Record<string, any>,
): Record<string, { ai: string; final: string }> {
  const out: Record<string, { ai: string; final: string }> = {};
  for (const { key } of AI_INTAKE_FIELDS) {
    const a = (ai[key] ?? "").trim();
    const f = String(final[key] ?? "").trim();
    if (a !== f) out[key] = { ai: a, final: f };
  }
  return out;
}
