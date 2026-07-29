/**
 * Server functions IA para generar y transformar temas clínicos.
 * Gated a rol admin dentro del handler. Modelo: Lovable AI Gateway.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { Topic, Slide, SlideKind } from "./topic-schema";
import { randomId } from "./topic-schema";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: solo admin puede usar IA.");
}

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Falta LOVABLE_API_KEY.");
  return createLovableAiGatewayProvider(key, { structuredOutputs: true }).chatModel("google/gemini-3.6-flash");
}

// Schema Zod lean, sin bounds. Los límites van en el prompt.
const slideSchema = z.object({
  kind: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  bullets: z.array(z.string()).nullable(),
  cards: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .nullable(),
  tableHeaders: z.array(z.string()).nullable(),
  tableRows: z.array(z.array(z.string())).nullable(),
  steps: z
    .array(z.object({ title: z.string(), body: z.string().nullable() }))
    .nullable(),
  timeline: z
    .array(
      z.object({
        time: z.string(),
        label: z.string(),
        body: z.string().nullable(),
      }),
    )
    .nullable(),
  flowchartNodes: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .nullable(),
  flowchartEdges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().nullable(),
      }),
    )
    .nullable(),
  caseText: z.string().nullable(),
  caseQuestions: z
    .array(z.object({ q: z.string(), a: z.string() }))
    .nullable(),
  references: z
    .array(z.object({ label: z.string(), source: z.string().nullable() }))
    .nullable(),
});

const topicSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable(),
  slides: z.array(slideSchema),
});

type RawSlide = z.infer<typeof slideSchema>;
type RawTopic = z.infer<typeof topicSchema>;

const KINDS = new Set([
  "title","objectives","intro","concepts","image","diagram","table","comparison",
  "flowchart","cards","timeline","steps","drugs","epidemiology","summary","case",
  "pearls","takehome","mistakes","tips","references",
]);

function normalizeKind(k: string): SlideKind {
  const key = k.toLowerCase().trim();
  return (KINDS.has(key) ? key : "intro") as SlideKind;
}

function toSlide(raw: RawSlide): Slide {
  const slide: Slide = {
    id: randomId(),
    kind: normalizeKind(raw.kind),
    title: raw.title || "",
    body: raw.body ?? undefined,
    bullets: raw.bullets ?? undefined,
    cards: raw.cards ?? undefined,
    steps: raw.steps
      ? raw.steps.map((s) => ({ title: s.title, body: s.body ?? undefined }))
      : undefined,
    timeline: raw.timeline
      ? raw.timeline.map((t) => ({
          time: t.time,
          label: t.label,
          body: t.body ?? undefined,
        }))
      : undefined,
    references: raw.references
      ? raw.references.map((r) => ({ label: r.label, source: r.source ?? undefined }))
      : undefined,
  };
  if (raw.tableHeaders && raw.tableRows) {
    slide.table = { headers: raw.tableHeaders, rows: raw.tableRows };
  }
  if (raw.flowchartNodes && raw.flowchartEdges) {
    slide.flowchart = {
      nodes: raw.flowchartNodes,
      edges: raw.flowchartEdges.map((e) => ({
        from: e.from,
        to: e.to,
        label: e.label ?? undefined,
      })),
    };
  }
  if (raw.caseText) {
    slide.clinicalCase = {
      presentation: raw.caseText,
      questions: raw.caseQuestions ?? [],
    };
  }
  return slide;
}

function toTopic(raw: RawTopic): Topic {
  return {
    version: 1,
    title: raw.title,
    subtitle: raw.subtitle ?? undefined,
    slides: raw.slides.map(toSlide),
    meta: { updatedAt: new Date().toISOString(), generatedBy: "gemini-3.6-flash" },
  };
}

const SYSTEM_PROMPT_TOPIC = `Eres un editor médico académico senior generando material educativo clínico para estudiantes de medicina, internos y residentes en español (Latinoamérica / Perú).

Tu salida es un JSON de "tema" que se renderiza como presentación secuencial (una diapositiva por sección).

Reglas:
- Usa evidencia oficial: AAP, WHO, MINSA (Perú), ESPGHAN, Nelson 21ed, UpToDate, IDSA, PALS. Cita en la sección "references".
- Genera entre 10 y 16 diapositivas, en este orden aproximado: title → objectives → concepts → intro → epidemiology → diagram (fisiopatología) → table/comparison → flowchart (algoritmo diagnóstico o terapéutico) → steps o drugs → case (caso clínico interactivo con 2-3 preguntas) → pearls → mistakes → summary → takehome → references.
- "kind" DEBE ser uno de: title, objectives, intro, concepts, image, diagram, table, comparison, flowchart, cards, timeline, steps, drugs, epidemiology, summary, case, pearls, takehome, mistakes, tips, references.
- Cada diapositiva DEBE tener "title". Rellena solo los campos relevantes al "kind" y deja los demás en null.
- "bullets" para objectives / pearls / mistakes / tips / concepts (3-6 items breves).
- "cards" para clasificaciones o tarjetas (2-6 tarjetas cortas).
- "tableHeaders"/"tableRows" para tablas y comparaciones (2-5 columnas).
- "steps" para procedimientos (3-8 pasos).
- "flowchartNodes"/"flowchartEdges" para algoritmos (usa IDs cortos: n1, n2…).
- "caseText"/"caseQuestions" para el caso clínico (viñeta breve + 2-3 preguntas con respuesta razonada).
- "references" con 4-8 fuentes reales y actuales.
- Texto conciso, clínico, en español. Sin markdown pesado. Sin emojis.
- NO uses HTML.`;

export const generateTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1),
        context: z.string().optional(),
        level: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const model = getGateway();
    const prompt = `Genera el tema clínico completo para: "${data.title}".${
      data.context ? `\nContexto adicional: ${data.context}` : ""
    }${data.level ? `\nNivel objetivo: ${data.level}` : ""}\n\nDevuelve entre 10 y 16 diapositivas siguiendo la plantilla estándar.`;

    try {
      const { output } = await generateText({
        model,
        system: SYSTEM_PROMPT_TOPIC,
        prompt,
        output: Output.object({ schema: topicSchema }),
      });
      return toTopic(output);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          const parsed = JSON.parse(error.text ?? "{}") as RawTopic;
          return toTopic(parsed);
        } catch {
          throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
        }
      }
      throw error;
    }
  });

export const slidesFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ title: z.string(), text: z.string().min(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const model = getGateway();
    try {
      const { output } = await generateText({
        model,
        system: SYSTEM_PROMPT_TOPIC,
        prompt: `Convierte el siguiente texto/borrador en un tema estructurado para "${data.title}". Detecta automáticamente tablas, comparaciones, algoritmos y casos. Mantén la evidencia mencionada.\n\n---\n${data.text}\n---`,
        output: Output.object({ schema: topicSchema }),
      });
      return toTopic(output);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          return toTopic(JSON.parse(error.text ?? "{}") as RawTopic);
        } catch {
          throw new Error("La IA devolvió un formato inválido.");
        }
      }
      throw error;
    }
  });

const SLIDE_ACTIONS = [
  "expand",
  "summarize",
  "improve",
  "rewrite",
  "level-student",
  "level-resident",
  "level-specialist",
  "update-guidelines",
  "update-aap",
  "update-nelson",
  "update-minsa",
  "update-who",
  "add-references",
  "vancouver",
  "to-table",
  "to-comparison",
  "to-flowchart",
  "to-cards",
  "to-case",
  "to-timeline",
  "to-steps",
  "to-pearls",
  "to-mistakes",
  "to-summary",
  "to-diagram",
] as const;


export const transformSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum(SLIDE_ACTIONS),
        slide: z.any(),
        topicTitle: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const model = getGateway();

    const actionDesc: Record<(typeof SLIDE_ACTIONS)[number], string> = {
      expand: "Expande el contenido con más detalle clínico manteniendo el mismo kind.",
      summarize: "Resume el contenido a lo esencial manteniendo el mismo kind.",
      improve: "Mejora la redacción, claridad y rigor médico manteniendo el mismo kind.",
      "update-guidelines":
        "Actualiza el contenido con las guías más recientes (AAP, WHO, MINSA, ESPGHAN, Nelson 21ed).",
      "add-references":
        "Cambia el kind a 'references' y añade 5-8 referencias bibliográficas actuales relevantes al tema y al slide actual.",
      "to-table":
        "Convierte el contenido en una tabla (kind='table') con tableHeaders y tableRows.",
      "to-flowchart":
        "Convierte el contenido en un algoritmo (kind='flowchart') con flowchartNodes (ids cortos) y flowchartEdges.",
      "to-cards": "Convierte el contenido en tarjetas (kind='cards') con 3-6 cards.",
      "to-case":
        "Convierte el contenido en un caso clínico (kind='case') con caseText breve y 2-3 caseQuestions.",
      rewrite: "Reescribe el contenido con otro enfoque didáctico manteniendo el mismo kind.",
      "level-student":
        "Reescribe el contenido para estudiantes de pregrado: lenguaje claro, conceptos base.",
      "level-resident":
        "Reescribe el contenido para residentes: enfoque práctico, manejo y toma de decisiones.",
      "level-specialist":
        "Reescribe el contenido para especialistas: matices, evidencia reciente y controversias.",
      "update-aap": "Actualiza el contenido según las recomendaciones vigentes de la AAP.",
      "update-nelson": "Actualiza el contenido según Nelson Textbook of Pediatrics 21ed.",
      "update-minsa": "Actualiza el contenido según normas y guías del MINSA (Perú).",
      "update-who": "Actualiza el contenido según las guías de la OMS/WHO.",
      vancouver:
        "Cambia el kind a 'references' y devuelve 5-8 referencias en formato Vancouver correcto.",
      "to-comparison":
        "Convierte el contenido en una comparación (kind='comparison') con tableHeaders y tableRows.",
      "to-timeline":
        "Convierte el contenido en una cronología (kind='timeline') con 4-8 hitos.",
      "to-steps": "Convierte el contenido en pasos numerados (kind='steps') con 3-8 pasos.",
      "to-pearls": "Convierte el contenido en perlas clínicas (kind='pearls') con 4-6 bullets.",
      "to-mistakes":
        "Convierte el contenido en errores frecuentes (kind='mistakes') con 4-6 bullets.",
      "to-summary": "Convierte el contenido en un resumen ejecutivo (kind='summary').",
      "to-diagram":
        "Convierte el contenido en un diagrama conceptual (kind='diagram') usando flowchartNodes y flowchartEdges.",
    };


    try {
      const { output } = await generateText({
        model,
        system: SYSTEM_PROMPT_TOPIC,
        prompt: `Tema: "${data.topicTitle}".\nAcción: ${actionDesc[data.action]}\n\nSlide original (JSON):\n${JSON.stringify(data.slide)}\n\nDevuelve UN solo slide en el mismo formato.`,
        output: Output.object({ schema: slideSchema }),
      });
      return toSlide(output);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          return toSlide(JSON.parse(error.text ?? "{}") as RawSlide);
        } catch {
          throw new Error("La IA devolvió un formato inválido.");
        }
      }
      throw error;
    }
  });

/**
 * Notebook IA: compone un tema completo usando EXCLUSIVAMENTE las fuentes
 * (documentos indexados) que envía el administrador.
 */
export const notebookCompose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1),
        instruction: z.string().min(3),
        sources: z.string().min(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const model = getGateway();
    const sources = data.sources.slice(0, 120000);
    try {
      const { output } = await generateText({
        model,
        system: `${SYSTEM_PROMPT_TOPIC}\n\nMODO NOTEBOOK: responde EXCLUSIVAMENTE con información contenida en las FUENTES entregadas por el usuario. No inventes datos que no estén en las fuentes. En "references" cita únicamente los documentos fuente proporcionados.`,
        prompt: `Tema: "${data.title}".\nInstrucción del administrador: ${data.instruction}\n\n=== FUENTES ===\n${sources}\n=== FIN FUENTES ===`,
        output: Output.object({ schema: topicSchema }),
      });
      return toTopic(output);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        try {
          return toTopic(JSON.parse(error.text ?? "{}") as RawTopic);
        } catch {
          throw new Error("La IA devolvió un formato inválido.");
        }
      }
      throw error;
    }
  });
