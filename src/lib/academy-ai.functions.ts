/**
 * Server functions IA del ecosistema académico: casos clínicos, banco de
 * preguntas, simuladores, guiones de video, flashcards, tutor y recomendador.
 * Escritura/generación masiva restringida a admin; tutor y recomendador
 * disponibles para cualquier usuario autenticado.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: solo admin puede usar esta acción.");
}

function model() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Falta LOVABLE_API_KEY.");
  return createLovableAiGatewayProvider(key, { structuredOutputs: true }).chatModel("google/gemini-3.6-flash");
}

const SYSTEM = `Eres un editor médico académico senior (Pediatría y Neonatología) que produce material educativo en español (Perú / Latinoamérica).
Basas todo en evidencia oficial vigente: AAP, WHO/OMS, MINSA Perú, Nelson 21ed, ESPGHAN, IDSA, NRP/PALS, UpToDate.
Escribes de forma concisa, clínica, sin emojis y sin markdown pesado.`;

async function structured<T>(schema: z.ZodType<T>, prompt: string, system = SYSTEM): Promise<T> {
  try {
    const { output } = await generateText({
      model: model(),
      system,
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

/* ------------------------------------------------------------------ */
/*  CASOS CLÍNICOS                                                     */
/* ------------------------------------------------------------------ */

const caseSchema = z.object({
  title: z.string(),
  level: z.string(),
  specialty: z.string().nullable(),
  subspecialty: z.string().nullable(),
  topic: z.string().nullable(),
  difficulty: z.number(),
  tags: z.array(z.string()),
  presentation: z.string(),
  history: z.string(),
  exam: z.string(),
  labs: z.array(z.object({ label: z.string(), value: z.string() })),
  questions: z.array(
    z.object({
      q: z.string(),
      options: z.array(z.string()),
      answerIndex: z.number(),
      feedback: z.string(),
    }),
  ),
  discussion: z.string(),
  differential: z.array(z.object({ dx: z.string(), why: z.string() })),
  treatment: z.array(z.string()),
  complications: z.array(z.string()),
  takeHome: z.array(z.string()),
  pearls: z.array(z.string()),
  mistakes: z.array(z.string()),
  references: z.array(z.string()),
});

export type AcademyCaseContent = z.infer<typeof caseSchema>;

export const generateCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(3),
        level: z.string().default("residentado"),
        sourceText: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const src = data.sourceText
      ? `\n\nUSA EXCLUSIVAMENTE este material como fuente:\n---\n${data.sourceText.slice(0, 100000)}\n---`
      : "";
    return structured(
      caseSchema,
      `Construye un caso clínico pediátrico completo e interactivo sobre: "${data.prompt}".
Nivel objetivo: ${data.level} (internado / enam / residentado / especialidad / subespecialidad).
Incluye 3-5 preguntas de opción múltiple con 4 opciones y retroalimentación razonada,
discusión, diagnóstico diferencial, tratamiento, complicaciones, take home, perlas,
errores frecuentes y 4-8 referencias reales.${src}`,
    );
  });

/* ------------------------------------------------------------------ */
/*  BANCO DE PREGUNTAS                                                 */
/* ------------------------------------------------------------------ */

const questionSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number(),
  explanation: z.string(),
  bibliography: z.string(),
  level: z.string(),
  examType: z.string(),
  topic: z.string(),
  subtopic: z.string().nullable(),
  tags: z.array(z.string()),
  difficulty: z.number(),
  timeSeconds: z.number(),
  flashcardFront: z.string().nullable(),
  flashcardBack: z.string().nullable(),
  pearl: z.string().nullable(),
  mistake: z.string().nullable(),
});

const questionsSchema = z.object({ questions: z.array(questionSchema) });
export type AcademyQuestionDraft = z.infer<typeof questionSchema>;

/** Genera un lote de preguntas. La UI llama repetidamente para volúmenes altos. */
export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        count: z.number(),
        topic: z.string().default("Pediatría general"),
        level: z.string().default("residentado"),
        examType: z.string().default("ENAM"),
        difficulty: z.number().default(2),
        specialty: z.string().default("Pediatría & Neonatología"),
        avoid: z.array(z.string()).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const avoid = data.avoid.length
      ? `\nNo repitas estos enunciados ya existentes:\n- ${data.avoid.slice(0, 60).join("\n- ")}`
      : "";
    const out = await structured(
      questionsSchema,
      `Genera exactamente ${data.count} preguntas de opción múltiple, ORIGINALES y distintas entre sí.
Tema: ${data.topic}. Especialidad: ${data.specialty}. Nivel: ${data.level}.
Tipo de examen/formato: ${data.examType} (puede ser ENAM, Residentado, MIR, USMLE, ABP, AAP, PALS, caso clínico, imagen, ECG, radiografía, gasometría, laboratorio o interpretación).
Dificultad 1-5: ${data.difficulty}.
Cada pregunta: 4 o 5 opciones, answerIndex (0-based) correcto, explicación razonada de por qué la correcta lo es y por qué fallan las demás,
bibliografía concreta (guía, libro, año), etiquetas, tiempo estimado en segundos,
y además una flashcard (frente/reverso), una perla clínica y un error frecuente.${avoid}`,
    );
    return out.questions;
  });

/** Reconoce preguntas dentro de texto pegado o extraído de Word/PDF/Excel/CSV. */
export const parseQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().min(10),
        level: z.string().default("residentado"),
        topic: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const out = await structured(
      questionsSchema,
      `Reconoce y estructura TODAS las preguntas contenidas en el siguiente material.
Detecta automáticamente: enunciado, opciones, respuesta correcta, explicación, bibliografía, nivel, especialidad, tema, subtema, etiquetas, dificultad y tiempo.
Si falta la explicación o la bibliografía, complétalas con evidencia oficial. Nivel por defecto: ${data.level}. Tema por defecto: ${data.topic || "detéctalo"}.
No inventes preguntas que no estén en el material.

--- MATERIAL ---
${data.text.slice(0, 120000)}
--- FIN ---`,
    );
    return out.questions;
  });

/* ------------------------------------------------------------------ */
/*  SIMULADORES                                                        */
/* ------------------------------------------------------------------ */

const simulatorSchema = z.object({
  title: z.string(),
  summary: z.string(),
  scenario: z.string(),
  history: z.string(),
  vitals: z.array(z.object({ label: z.string(), value: z.string() })),
  monitors: z.array(z.object({ label: z.string(), value: z.string() })),
  exams: z.array(z.object({ name: z.string(), result: z.string() })),
  imaging: z.array(z.object({ name: z.string(), finding: z.string() })),
  bloodGas: z.array(z.object({ label: z.string(), value: z.string() })),
  labs: z.array(z.object({ label: z.string(), value: z.string() })),
  events: z.array(
    z.object({
      minute: z.number(),
      event: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      feedback: z.string(),
    }),
  ),
  complications: z.array(z.string()),
  debrief: z.string(),
  references: z.array(z.string()),
});

export const generateSimulator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(3),
        level: z.string().default("residentado"),
        mode: z.string().default("tutor"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return structured(
      simulatorSchema,
      `Construye un simulador clínico de alta fidelidad a partir de: "${data.prompt}".
Nivel: ${data.level}. Modo: ${data.mode} (tutor, evaluación, libre o cronometrado).
Incluye escenario, historia, monitores y signos vitales iniciales, exámenes, radiografías/ecografía,
gasometría, laboratorio, 5-9 eventos en tiempo real (cada uno con decisión de 3-4 opciones, opción correcta y retroalimentación),
complicaciones posibles, debrief final y referencias.`,
    );
  });

/* ------------------------------------------------------------------ */
/*  GENERADOR DE VIDEOS                                                */
/* ------------------------------------------------------------------ */

const videoSchema = z.object({
  title: z.string(),
  logline: z.string(),
  durationMinutes: z.number(),
  scenes: z.array(
    z.object({
      n: z.number(),
      title: z.string(),
      seconds: z.number(),
      visual: z.string(),
      animation: z.string(),
      onScreenText: z.string(),
      narration: z.string(),
      subtitle: z.string(),
    }),
  ),
  voiceOverNotes: z.string(),
  downloadables: z.array(z.string()),
  references: z.array(z.string()),
});

export const generateVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ prompt: z.string().min(3), minutes: z.number().default(6) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return structured(
      videoSchema,
      `Construye el storyboard completo de un video educativo médico sobre: "${data.prompt}".
Duración objetivo: ${data.minutes} minutos. Divide en 6-14 escenas con visual, animación sugerida,
texto en pantalla, narración lista para voice-over y subtítulo. Añade notas de voz (tono, ritmo),
material descargable sugerido y referencias.`,
    );
  });

/* ------------------------------------------------------------------ */
/*  FLASHCARDS                                                         */
/* ------------------------------------------------------------------ */

const flashcardsSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      topic: z.string(),
      tags: z.array(z.string()),
      difficulty: z.number(),
    }),
  ),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(2),
        count: z.number().default(20),
        level: z.string().default("residentado"),
        sourceText: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const src = data.sourceText
      ? `\nBasa las tarjetas exclusivamente en este material:\n---\n${data.sourceText.slice(0, 80000)}\n---`
      : "";
    const out = await structured(
      flashcardsSchema,
      `Crea ${data.count} flashcards estilo Anki (active recall) sobre "${data.topic}" para nivel ${data.level}.
Frente: pregunta corta y concreta. Reverso: respuesta precisa con el dato clave (dosis, criterio, cifra).
Evita tarjetas ambiguas o de doble respuesta.${src}`,
    );
    return out.cards;
  });

/* ------------------------------------------------------------------ */
/*  TUTOR IA                                                           */
/* ------------------------------------------------------------------ */

export const tutorAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(2),
        topic: z.string().default(""),
        level: z.string().default("residentado"),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const convo = data.history
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Estudiante" : "Tutor"}: ${m.content}`)
      .join("\n");
    const { text } = await generateText({
      model: model(),
      system: `${SYSTEM}
Eres el Tutor IA del tema "${data.topic || "Pediatría & Neonatología"}".
Adaptas la profundidad al nivel del estudiante: ${data.level} (internado, residentado o especialista).
Puedes explicar imágenes descritas, radiografías, laboratorios, gasometrías y algoritmos, generar ejemplos y analogías.
SIEMPRE citas la fuente oficial al final en una línea "Fuente: ...". Si no hay evidencia clara, lo dices.
Respondes en markdown breve y ordenado.`,
      prompt: convo ? `${convo}\nEstudiante: ${data.question}` : data.question,
    });
    return { answer: text };
  });

/* ------------------------------------------------------------------ */
/*  RECOMENDADOR IA                                                    */
/* ------------------------------------------------------------------ */

const recommendSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  actions: z.array(
    z.object({
      kind: z.string(),
      title: z.string(),
      why: z.string(),
      priority: z.number(),
    }),
  ),
});

export const recommendPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ stats: z.string().min(2) }).parse(input),
  )
  .handler(async ({ data }) =>
    structured(
      recommendSchema,
      `Analiza el desempeño de este estudiante y devuelve un plan.
Cada acción tiene kind: "estudiar", "repasar", "video", "flashcards", "simulador" o "caso"; priority 1 (máxima) a 5.
Entrega 5-8 acciones concretas y accionables.

DATOS:
${data.stats}`,
    ),
  );
