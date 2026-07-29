/** Helpers de datos compartidos por las secciones académicas. */
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFiles } from "@/lib/file-text";

/** Cliente sin tipar para las tablas académicas nuevas. */
export const db = supabase as any;

export const LEVELS = [
  "internado",
  "enam",
  "residentado",
  "especialidad",
  "subespecialidad",
] as const;

export const EXAM_TYPES = [
  "ENAM",
  "Residentado",
  "MIR",
  "USMLE",
  "ABP",
  "AAP",
  "PALS",
  "Caso clínico",
  "Imagen",
  "ECG",
  "Radiografía",
  "Gasometría",
  "Laboratorio",
  "Interpretación",
] as const;

/** Registra minutos y actividad para las métricas de progreso. */
export async function logStudy(input: {
  areaSlug: string;
  activity: string;
  minutes?: number;
  topic?: string | null;
  score?: number | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from("academy_study_events").insert({
      area_slug: input.areaSlug,
      activity: input.activity,
      minutes: input.minutes ?? 0,
      topic: input.topic ?? null,
      score: input.score ?? null,
      metadata: (input.metadata ?? {}) as never,
    });
  } catch {
    /* métricas silenciosas */
  }
}

export async function readFilesAsText(list: FileList | null): Promise<string> {
  if (!list || list.length === 0) return "";
  return extractTextFromFiles(Array.from(list));
}

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
