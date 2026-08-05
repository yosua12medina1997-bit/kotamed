/**
 * IA del CMS académico (Casos clínicos y Docencia).
 * Genera y mejora contenido docente a partir del nodo seleccionado.
 * Solo disponible para usuarios autenticados.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ACTIONS: Record<string, string> = {
  redactar:
    "Redacta la sección solicitada de forma completa, ordenada y lista para publicar en un CMS académico.",
  mejorar: "Mejora la redacción, claridad y precisión clínica del texto entregado, sin inventar datos.",
  resumen: "Elabora un resumen docente con puntos clave y perlas clínicas.",
  objetivos: "Genera objetivos de aprendizaje y competencias medibles.",
  diferencial: "Genera diagnósticos diferenciales ordenados por probabilidad con justificación.",
  preguntas:
    "Genera 5 preguntas tipo ENAM/Residentado con 5 alternativas, respuesta correcta y explicación.",
  flashcards: "Genera 10 flashcards en formato 'Pregunta :: Respuesta'.",
  bibliografia:
    "Propón bibliografía pertinente (MINSA, AAP, OMS, NRP, Cloherty, Nelson, Fanaroff, Pediatrics) con el aporte de cada fuente.",
  algoritmo: "Construye un algoritmo o mapa conceptual en texto jerárquico con flechas y niveles.",
  caso: "Construye un caso clínico completo con historia, examen, laboratorios, evolución y discusión.",
};

export const askAcademyCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().min(2).max(40),
        module: z.string().max(40),
        path: z.string().max(600).optional(),
        section: z.string().max(120).optional(),
        context: z.string().max(12000).optional(),
        extra: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta LOVABLE_API_KEY.");
    const task = ACTIONS[data.action] ?? ACTIONS["redactar"]!;
    const model = createLovableAiGatewayProvider(key).chatModel("google/gemini-3.6-flash");
    try {
      const { text } = await generateText({
        model,
        system: `Eres editor académico médico de KotaMed (Perú), especializado en ${
          data.module === "casos" ? "casos clínicos" : "docencia médica"
        } de neonatología y pediatría.
Escribes en español clínico, preciso y estructurado, con evidencia vigente (MINSA, AAP, OMS, NRP,
Cloherty, Fanaroff, Nelson, NeoReviews). Sin emojis. Markdown ligero con títulos y viñetas.
No inventas datos del paciente: si faltan, los señalas como "no consignado".`,
        prompt: [
          data.path ? `Ubicación en el árbol académico: ${data.path}` : "",
          data.section ? `Sección a trabajar: ${data.section}` : "",
          data.context ? `\n## CONTENIDO ACTUAL\n${data.context}` : "",
          data.extra ? `\n## INDICACIÓN DEL DOCENTE\n${data.extra}` : "",
          `\n## TAREA\n${task}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return { text };
    } catch (error: any) {
      const msg = String(error?.message ?? error);
      if (msg.includes("429")) throw new Error("Límite de solicitudes alcanzado. Intenta en unos minutos.");
      if (msg.includes("402")) throw new Error("Créditos de IA agotados en el espacio de trabajo.");
      throw new Error(`KotaMed AI no pudo responder: ${msg}`);
    }
  });
