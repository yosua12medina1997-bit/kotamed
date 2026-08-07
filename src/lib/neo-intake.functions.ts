/**
 * Registro Inteligente de Pacientes (OCR + interpretación clínica con IA).
 * Función aditiva: no reemplaza ni modifica el registro manual existente.
 * Recibe fotografías / PDF digitalizados y devuelve los campos del formulario
 * de ingreso con su nivel de confianza, el texto reconocido y advertencias.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const FileInput = z.object({
  name: z.string().max(200),
  mime: z.string().max(120),
  dataUrl: z.string().min(32).max(9_000_000),
});

const Input = z.object({
  files: z.array(FileInput).min(1).max(6),
  unit: z.string().max(80).optional(),
  hint: z.string().max(600).optional(),
});

const SYSTEM = `Eres un asistente clínico neonatal experto en lectura de documentos hospitalarios peruanos
(historias clínicas, hojas de parto, hojas de referencia, carnés perinatales, epicrisis).

Tu tarea:
1. OCR: transcribe TODO el texto legible del documento.
2. INTERPRETACIÓN CLÍNICA: no te limites al OCR, interpreta abreviaturas y normaliza.
   - RNAT = recién nacido a término · RNPT = prematuro · RNPOT = postérmino
   - AEG = adecuado para edad gestacional · PEG = pequeño para EG · GEG = grande para EG
   - "Cesárea segmentaria" => tipo_parto = "cesarea"; "eutócico"/"vaginal" => "vaginal"
   - "EG 38+4" => 38.6 (semanas + días/7, un decimal)
   - "Peso 3.270" o "3,270 kg" => 3270 (gramos, entero)
   - "F" => femenino · "M" => masculino
   - Fechas => formato ISO YYYY-MM-DD · Horas => HH:MM (24h)
   - Apgar => "8/9" mantiene formato, valores 0-10
3. VALIDACIÓN: revisa coherencia (peso vs edad gestacional, fechas y horas válidas,
   Apgar 0-10, EG entre 20 y 44 semanas) y reporta cada inconsistencia en "warnings".
4. CONFIANZA: para cada campo extraído asigna un entero 0-100 según legibilidad y certeza.
   Si un dato no aparece en el documento, NO lo inventes: deja el campo en cadena vacía.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) con esta forma:
{
  "fields": {
    "apellidos": "", "nombres": "", "hc": "", "sexo": "masculino|femenino|indeterminado|",
    "fecha_nacimiento": "", "hora_nacimiento": "", "edad_gestacional": "", "peso_nacimiento": "",
    "diagnostico_ingreso": "", "medico_responsable": "", "procedencia": "", "hospital": "",
    "servicio": "", "tipo_parto": "", "apgar": "", "madre": "", "dni": "", "seguro": "",
    "cama": "", "observaciones": ""
  },
  "confidence": { "apellidos": 0 },
  "clasificacion": "p.ej. RNAT AEG",
  "ocrText": "transcripción completa",
  "warnings": ["..."],
  "recommendations": ["Vitamina K", "..."]
}`;

function parseJson(raw: string): any {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

export const analyzeNeoIntakeDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta LOVABLE_API_KEY.");

    const modelId = "google/gemini-3.6-flash";
    const model = createLovableAiGatewayProvider(key).chatModel(modelId);

    const content: any[] = [
      {
        type: "text",
        text: `Analiza ${data.files.length} documento(s) del ingreso neonatal${
          data.unit ? ` (unidad de destino: ${data.unit})` : ""
        }.${data.hint ? `\nContexto adicional del usuario: ${data.hint}` : ""}`,
      },
    ];

    for (const f of data.files) {
      if (f.mime.startsWith("image/")) {
        content.push({ type: "image_url", image_url: { url: f.dataUrl } });
      } else {
        content.push({
          type: "file",
          file: { filename: f.name, file_data: f.dataUrl },
        });
      }
    }

    const result = streamText({
      model,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    const text = await result.text;

    const parsed = parseJson(text);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("La IA no pudo interpretar el documento. Intenta con una foto más nítida.");
    }

    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.fields ?? {})) {
      fields[k] = v === null || v === undefined ? "" : String(v).trim();
    }
    const confidence: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed.confidence ?? {})) {
      const n = Number(v);
      if (Number.isFinite(n)) confidence[k] = Math.max(0, Math.min(100, Math.round(n)));
    }

    const scores = Object.entries(confidence)
      .filter(([k]) => (fields[k] ?? "") !== "")
      .map(([, v]) => v);

    return {
      model: modelId,
      fields,
      confidence,
      clasificacion: typeof parsed.clasificacion === "string" ? parsed.clasificacion : "",
      ocrText: typeof parsed.ocrText === "string" ? parsed.ocrText : "",
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 12) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String).slice(0, 14)
        : [],
      overallConfidence: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
    };
  });
