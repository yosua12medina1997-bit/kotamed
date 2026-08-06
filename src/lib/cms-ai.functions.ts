/**
 * KotaMed Studio AI — generación de contenido para el CMS visual.
 * Devuelve JSON listo para poblar bloques (título, subtítulos, listas, FAQ, etc.).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const SYSTEM = `Eres el editor de contenido de KotaMed, plataforma peruana de educación médica premium con IA.
Escribes en español profesional, claro y persuasivo pero sin exageraciones ni promesas falsas.
Nunca inventas cifras verificables (precios, número de alumnos, acreditaciones): si hacen falta, usa marcadores editables.
Sin emojis. Respondes ÚNICAMENTE con JSON válido, sin texto adicional ni bloques de código.`;

function parseJson(text: string) {
  const clean = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = clean.search(/[[{]/);
  const slice = start >= 0 ? clean.slice(start) : clean;
  try {
    return JSON.parse(slice);
  } catch {
    const end = Math.max(slice.lastIndexOf("}"), slice.lastIndexOf("]"));
    if (end > 0) return JSON.parse(slice.slice(0, end + 1));
    throw new Error("La IA no devolvió un JSON válido. Intenta de nuevo.");
  }
}

function friendly(error: unknown): never {
  const msg = String((error as { message?: string })?.message ?? error);
  if (msg.includes("429")) throw new Error("Límite de solicitudes de IA alcanzado. Intenta en unos minutos.");
  if (msg.includes("402")) throw new Error("Créditos de IA agotados en el espacio de trabajo.");
  throw new Error(`KotaMed Studio AI no pudo responder: ${msg}`);
}

function model() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta LOVABLE_API_KEY.");
  return createLovableAiGatewayProvider(key).chatModel("google/gemini-3.6-flash");
}

/** Genera/mejora el contenido de un bloque concreto. */
export const generateCmsBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        blockType: z.string().max(40),
        pageTitle: z.string().max(200).optional(),
        pageKind: z.string().max(40).optional(),
        instruction: z.string().max(2000).optional(),
        current: z.string().max(8000).optional(),
        itemCount: z.number().min(1).max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { text } = await generateText({
        model: model(),
        system: SYSTEM,
        prompt: `Genera el contenido de un bloque "${data.blockType}" para la página "${
          data.pageTitle ?? "KotaMed"
        }" (tipo: ${data.pageKind ?? "page"}).

Devuelve un objeto JSON con estas claves opcionales, usando solo las que apliquen al bloque:
{"eyebrow":"","title":"","subtitle":"","description":"","primaryLabel":"","primaryHref":"","secondaryLabel":"","secondaryHref":"","items":[{"title":"","subtitle":"","text":"","value":"","label":"","icon":"","badge":"","price":"","features":[""]}]}

Reglas:
- "icon" debe ser un nombre de icono de lucide-react (ej. Stethoscope, Brain, Users, Layers, ShieldCheck, Sparkles, Calendar, Trophy).
- Para contadores usa "value" + "label". Para preguntas frecuentes usa "title" (pregunta) + "text" (respuesta).
- Para cronogramas usa "label" (mes o etapa) + "title" + "text".
- ${data.itemCount ?? 4} elementos en "items" cuando el bloque sea de lista.
${data.instruction ? `\nIndicación del administrador: ${data.instruction}` : ""}
${data.current ? `\nContenido actual a mejorar:\n${data.current}` : ""}`,
      });
      return { props: parseJson(text) as Record<string, unknown> };
    } catch (error) {
      friendly(error);
    }
  });

/** Genera la estructura completa de una landing (lista ordenada de bloques). */
export const generateCmsPagePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        brief: z.string().min(4).max(2000),
        pageKind: z.string().max(40).optional(),
        allowed: z.array(z.string().max(30)).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { text } = await generateText({
        model: model(),
        system: SYSTEM,
        prompt: `Diseña una landing académica completa de KotaMed a partir de este pedido: "${data.brief}".
Tipo de página: ${data.pageKind ?? "landing"}.

Devuelve un JSON: {"seo":{"title":"","description":"","keywords":""},"blocks":[{"type":"","props":{...}}]}

Tipos de bloque permitidos: ${data.allowed.join(", ")}.
Incluye entre 7 y 11 bloques en un orden con buena jerarquía (hero primero, cta al final).
Cada "props" sigue el esquema:
{"eyebrow":"","title":"","subtitle":"","description":"","primaryLabel":"","primaryHref":"","secondaryLabel":"","secondaryHref":"","items":[{"title":"","subtitle":"","text":"","value":"","label":"","icon":"","badge":"","price":"","features":[""]}]}
Los iconos son nombres de lucide-react. No inventes cifras verificables.`,
      });
      const parsed = parseJson(text) as {
        seo?: Record<string, unknown>;
        blocks?: { type: string; props: Record<string, unknown> }[];
      };
      return { seo: parsed.seo ?? {}, blocks: parsed.blocks ?? [] };
    } catch (error) {
      friendly(error);
    }
  });
