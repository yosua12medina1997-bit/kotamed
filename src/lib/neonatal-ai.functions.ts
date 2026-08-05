/**
 * Server functions IA del módulo de Hospitalización Neonatal.
 * Apoyo académico: resumen clínico, interpretación de laboratorios,
 * sugerencia de plan y diagnósticos diferenciales. Todo con fines
 * educativos y siempre supervisado por el docente.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const SYSTEM = `Eres un neonatólogo docente de un hospital de nivel III en Perú que enseña a internos de medicina.
Respondes en español clínico, conciso, sin emojis y sin markdown pesado.
Te basas en evidencia vigente: AAP, NRP, OMS, MINSA Perú, Nelson 21ed, Cloherty, ESPGHAN.
Siempre aclaras que es material educativo y que la decisión final es del médico tratante.`;

function model(structuredOutputs = true) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta LOVABLE_API_KEY.");
  return createLovableAiGatewayProvider(key, { structuredOutputs }).chatModel(
    "google/gemini-3.6-flash",
  );
}

async function structured<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
  try {
    const { output } = await generateText({
      model: model(),
      system: SYSTEM,
      prompt,
      output: Output.object({ schema: schema as any }),
    });
    return output as T;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      try {
        return schema.parse(JSON.parse((error as any).text ?? "{}"));
      } catch {
        throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
      }
    }
    throw error;
  }
}

/** Resumen clínico estructurado del expediente. */
export const neoSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chart: string }) => input)
  .handler(async ({ data }) => {
    const schema = z.object({
      summary: z.string(),
      activeProblems: z.array(z.string()),
      pendingActions: z.array(z.string()),
      alerts: z.array(z.string()),
    });
    return structured(
      schema,
      `Resume el siguiente expediente neonatal como si presentaras el paciente en la visita médica.
Devuelve: resumen narrativo breve (máx 140 palabras), lista de problemas activos, pendientes y alertas de seguridad.

EXPEDIENTE:
${data.chart.slice(0, 14000)}`,
    );
  });

/** Interpretación educativa de laboratorios. */
export const neoLabInterpretation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { context: string; labs: string }) => input)
  .handler(async ({ data }) => {
    const schema = z.object({
      interpretation: z.string(),
      abnormal: z.array(z.object({ item: z.string(), comment: z.string() })),
      suggestions: z.array(z.string()),
    });
    return structured(
      schema,
      `Contexto del recién nacido: ${data.context.slice(0, 3000)}

Interpreta estos resultados de laboratorio considerando rangos de referencia neonatales por día de vida y edad gestacional.

RESULTADOS:
${data.labs.slice(0, 6000)}`,
    );
  });

/** Sugerencia de plan de trabajo y diferenciales. */
export const neoPlanSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chart: string; question?: string }) => input)
  .handler(async ({ data }) => {
    const schema = z.object({
      differentials: z.array(z.object({ dx: z.string(), rationale: z.string() })),
      workup: z.array(z.string()),
      management: z.array(z.string()),
      teaching: z.string(),
    });
    return structured(
      schema,
      `Expediente neonatal:
${data.chart.slice(0, 12000)}

${data.question ? `Pregunta del interno: ${data.question}` : "Propón el abordaje del día."}

Devuelve diagnósticos diferenciales priorizados con razonamiento, exámenes a solicitar, plan terapéutico (con dosis por kg cuando aplique) y una perla docente.`,
    );
  });

/** Redacta una evolución SOAP a partir de datos crudos. */
export const neoEvolutionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chart: string; notes: string; format: string }) => input)
  .handler(async ({ data }) => {
    const schema = z.object({
      s: z.string(),
      o: z.string(),
      a: z.string(),
      p: z.string(),
    });
    return structured(
      schema,
      `Redacta una evolución neonatal en formato ${data.format === "soap" ? "SOAP" : "tradicional (usa los campos como secciones)"}.
Usa lenguaje de historia clínica hospitalaria peruana, sin inventar datos que no estén presentes.

CONTEXTO DEL PACIENTE:
${data.chart.slice(0, 10000)}

NOTAS CRUDAS DEL INTERNO:
${data.notes.slice(0, 4000)}`,
    );
  });
