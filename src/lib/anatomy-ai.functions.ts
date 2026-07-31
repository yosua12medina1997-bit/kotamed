/**
 * IA contextual de Anatomy Lab: responde únicamente sobre la estructura
 * anatómica seleccionada. Disponible para cualquier usuario autenticado.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const askAnatomyAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        structure: z.string().min(1).max(120),
        latin: z.string().max(160).optional(),
        system: z.string().max(60).optional(),
        mode: z.string().max(40).optional(),
        question: z.string().min(3).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta LOVABLE_API_KEY.");
    const model = createLovableAiGatewayProvider(key).chatModel("google/gemini-3.6-flash");
    const { text } = await generateText({
      model,
      system: `Eres docente universitario de Ciencias Básicas de KotaMed (Perú).
Respondes SOLO sobre la estructura anatómica indicada; si la pregunta se aleja, redirige a esa estructura.
Español claro, nivel universitario, basado en Moore, Netter, Gray, Guyton, Ross, Langman y Robbins.
Máximo 250 palabras, markdown ligero con viñetas cuando ayude. Sin emojis.`,
      prompt: `Estructura: ${data.structure}${data.latin ? ` (${data.latin})` : ""}
Sistema: ${data.system ?? "no especificado"}
Modo de estudio activo: ${data.mode ?? "anatomia"}

Pregunta del estudiante: ${data.question}`,
    });
    return { answer: text };
  });
