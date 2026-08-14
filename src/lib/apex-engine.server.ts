/**
 * MOTOR SERVIDOR del KotaMed Assessment Engine.
 * Aquí vive todo lo que jamás puede llegar al navegador: acceso privilegiado al
 * banco de preguntas, selección aleatoria, calificación y análisis.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  blockOf,
  buildAnalysis,
  isAnswerCorrect,
  sanitizeExamConfig,
} from "./apex-core";
import type { ExamGenConfig, ExamQuestion, QuestionType, ReviewItem } from "./apex-types";

type Admin = typeof supabaseAdmin;

export function admin(): Admin {
  return supabaseAdmin;
}

const ADMIN_ROLES = ["admin", "super_admin", "academic_admin"];

/** Verifica el rol usando el cliente del usuario (RLS activa). */
export async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("No se pudo verificar el rol.");
  const ok = (data ?? []).some((r: { role: string }) => ADMIN_ROLES.includes(r.role));
  if (!ok) throw new Error("Forbidden: acción reservada a administradores de KotaMed.");
}

export async function isAdminUser(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: { role: string }) => ADMIN_ROLES.includes(r.role));
}

/* ------------------------------------------------------------------ */
/* Selección de preguntas (siempre en servidor)                        */
/* ------------------------------------------------------------------ */

const POOL_COLUMNS =
  "id,subject_id,topic_id,chapter_id,difficulty,question_type,subject_label,topic_label,chapter_label";

type PoolRow = {
  id: string;
  subject_id: string | null;
  topic_id: string | null;
  chapter_id: string | null;
  difficulty: string;
  question_type: string;
};

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Devuelve los IDs de preguntas para un examen aplicando filtros, distribución
 * porcentual y reglas de repetición. Nunca expone contenido de preguntas.
 */
export async function pickQuestionIds(
  db: Admin,
  userId: string,
  cfg: ExamGenConfig,
): Promise<string[]> {
  const excluded = new Set<string>();
  const failed = new Set<string>();

  if ((cfg.avoidRecentDays ?? 0) > 0 || cfg.onlyFailed) {
    const since = new Date(Date.now() - (cfg.avoidRecentDays ?? 3650) * 86400000).toISOString();
    const { data: history } = await db
      .from("apex_attempt_items")
      .select("question_id,is_correct,created_at,apex_attempts!inner(user_id)")
      .eq("apex_attempts.user_id", userId)
      .gte("created_at", since)
      .limit(20000);
    for (const h of (history ?? []) as any[]) {
      if (h.is_correct === false) failed.add(h.question_id);
      else if ((cfg.avoidRecentDays ?? 0) > 0) excluded.add(h.question_id);
    }
  }

  if (cfg.onlyFailed) {
    const { data: allFailed } = await db
      .from("apex_attempt_items")
      .select("question_id,is_correct,apex_attempts!inner(user_id)")
      .eq("apex_attempts.user_id", userId)
      .eq("is_correct", false)
      .limit(20000);
    for (const h of (allFailed ?? []) as any[]) failed.add(h.question_id);
  }

  const base = () => {
    let q = db.from("apex_questions").select(POOL_COLUMNS).eq("status", "published");
    if (cfg.subjectIds?.length) q = q.in("subject_id", cfg.subjectIds);
    if (cfg.topicIds?.length) q = q.in("topic_id", cfg.topicIds);
    if (cfg.chapterIds?.length) q = q.in("chapter_id", cfg.chapterIds);
    if (cfg.difficulties?.length) q = q.in("difficulty", cfg.difficulties);
    if (cfg.questionTypes?.length) q = q.in("question_type", cfg.questionTypes);
    if (cfg.tags?.length) q = q.overlaps("tags", cfg.tags);
    if (cfg.program) q = q.eq("program", cfg.program);
    if (cfg.onlyDifficult) q = q.in("difficulty", ["avanzada", "experta"]);
    return q;
  };

  // Muestra amplia y aleatorización en memoria (rápida y segura hasta bancos enormes,
  // porque solo se leen columnas de clasificación con índice).
  let query = base().limit(6000);
  if (cfg.onlyFailed && failed.size > 0) {
    query = base().in("id", [...failed].slice(0, 500)).limit(600);
  }
  const { data, error } = await query;
  if (error) throw new Error(`No se pudo construir el examen: ${error.message}`);

  let pool = (data ?? []) as unknown as PoolRow[];
  if (excluded.size > 0 && !cfg.onlyFailed) {
    const filtered = pool.filter((p) => !excluded.has(p.id));
    if (filtered.length >= cfg.questionCount) pool = filtered;
  }
  if (pool.length === 0) return [];

  const target = Math.min(cfg.questionCount, pool.length);
  const chosen: string[] = [];
  const used = new Set<string>();

  // Distribución porcentual por materia
  if (cfg.distribution && Object.keys(cfg.distribution).length > 0) {
    const totalPct = Object.values(cfg.distribution).reduce((a, b) => a + b, 0) || 100;
    for (const [subjectId, pct] of Object.entries(cfg.distribution)) {
      const want = Math.round((pct / totalPct) * target);
      const bucket = shuffle(pool.filter((p) => p.subject_id === subjectId && !used.has(p.id)));
      for (const row of bucket.slice(0, want)) {
        used.add(row.id);
        chosen.push(row.id);
      }
    }
  }

  // Prioriza preguntas falladas en modo repaso
  if (cfg.mode === "review" || cfg.onlyFailed) {
    for (const row of shuffle(pool.filter((p) => failed.has(p.id) && !used.has(p.id)))) {
      if (chosen.length >= target) break;
      used.add(row.id);
      chosen.push(row.id);
    }
  }

  for (const row of shuffle(pool.filter((p) => !used.has(p.id)))) {
    if (chosen.length >= target) break;
    used.add(row.id);
    chosen.push(row.id);
  }

  return shuffle(chosen).slice(0, target);
}

/* ------------------------------------------------------------------ */
/* Creación y lectura de intentos                                      */
/* ------------------------------------------------------------------ */

export async function createAttempt(
  db: Admin,
  userId: string,
  rawConfig: Partial<ExamGenConfig>,
  examId?: string | null,
) {
  const cfg = sanitizeExamConfig(rawConfig);
  const ids = await pickQuestionIds(db, userId, cfg);
  if (ids.length === 0) {
    throw new Error(
      "No hay preguntas publicadas que cumplan esos criterios. Ajusta los filtros o publica más preguntas en el banco.",
    );
  }

  const expires = new Date(Date.now() + cfg.durationMinutes * 60000).toISOString();
  const { data: attempt, error } = await db
    .from("apex_attempts")
    .insert({
      user_id: userId,
      exam_id: examId ?? null,
      title: cfg.title ?? "Examen KotaMed Apex",
      mode: cfg.mode,
      status: "in_progress",
      question_count: ids.length,
      duration_minutes: cfg.durationMinutes,
      blocks: cfg.blocks,
      config: cfg as never,
      expires_at: expires,
    })
    .select("id")
    .single();
  if (error || !attempt) throw new Error(`No se pudo iniciar el examen: ${error?.message}`);

  const items = ids.map((questionId, i) => ({
    attempt_id: attempt.id,
    question_id: questionId,
    position: i + 1,
    block: blockOf(i + 1, ids.length, cfg.blocks),
  }));
  const { error: itemsError } = await db.from("apex_attempt_items").insert(items as never);
  if (itemsError) throw new Error(`No se pudo preparar el examen: ${itemsError.message}`);

  await db
    .from("apex_questions")
    .update({ times_used: 1 } as never)
    .in("id", [])
    .then(() => undefined);

  return attempt.id as string;
}

/** Estado del examen para el estudiante: sin respuestas correctas ni explicaciones. */
export async function loadAttemptForStudent(db: Admin, attemptId: string, userId: string) {
  const { data: attempt, error } = await db
    .from("apex_attempts")
    .select(
      "id,user_id,title,mode,status,question_count,duration_minutes,blocks,started_at,expires_at,config",
    )
    .eq("id", attemptId)
    .maybeSingle();
  if (error || !attempt) throw new Error("Examen no encontrado.");
  if (attempt.user_id !== userId) throw new Error("Forbidden");

  const { data: items } = await db
    .from("apex_attempt_items")
    .select("id,position,block,chosen,flagged,seconds,question_id")
    .eq("attempt_id", attemptId)
    .order("position", { ascending: true });

  const ids = (items ?? []).map((i) => i.question_id);
  const { data: questions } = await db
    .from("apex_questions")
    .select("id,stem,options,question_type,image_url")
    .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));

  const shuffleOptions = !!(attempt.config as any)?.shuffleOptions;

  const list: ExamQuestion[] = (items ?? []).map((item) => {
    const q = byId.get(item.question_id) as any;
    let options: { key: string; text: string }[] = Array.isArray(q?.options) ? q.options : [];
    options = options.map((o: any, i: number) => ({
      key: String(o?.key ?? String.fromCharCode(97 + i)),
      text: String(o?.text ?? o ?? ""),
    }));
    if (shuffleOptions) options = shuffle(options);
    return {
      itemId: item.id,
      position: item.position,
      block: item.block,
      type: (q?.question_type ?? "single") as QuestionType,
      stem: String(q?.stem ?? ""),
      options,
      imageUrl: q?.image_url ?? null,
      chosen: (item.chosen ?? []) as string[],
      flagged: !!item.flagged,
      seconds: item.seconds ?? 0,
    };
  });

  const expiresAt = attempt.expires_at ? new Date(attempt.expires_at).getTime() : null;
  const secondsRemaining = expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) : 0;

  return {
    id: attempt.id,
    title: attempt.title,
    mode: attempt.mode as any,
    status: attempt.status as any,
    questionCount: attempt.question_count,
    durationMinutes: attempt.duration_minutes,
    blocks: attempt.blocks,
    startedAt: attempt.started_at,
    expiresAt: attempt.expires_at,
    secondsRemaining,
    questions: list,
  };
}

/* ------------------------------------------------------------------ */
/* Calificación (siempre en servidor)                                  */
/* ------------------------------------------------------------------ */

export async function gradeAttempt(db: Admin, attemptId: string, userId: string) {
  const { data: attempt } = await db
    .from("apex_attempts")
    .select("id,user_id,status,started_at,question_count")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) throw new Error("Examen no encontrado.");
  if (attempt.user_id !== userId) throw new Error("Forbidden");

  const { data: items } = await db
    .from("apex_attempt_items")
    .select("id,question_id,chosen,seconds")
    .eq("attempt_id", attemptId);

  const ids = (items ?? []).map((i) => i.question_id);
  const { data: questions } = await db
    .from("apex_questions")
    .select(
      "id,correct_answers,subject_label,topic_label,subtopic_label,chapter_label,times_used,times_correct,times_wrong,total_seconds",
    )
    .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));

  const graded = (items ?? []).map((item) => {
    const q = byId.get(item.question_id) as any;
    const correct = (q?.correct_answers ?? []) as string[];
    const isCorrect = isAnswerCorrect((item.chosen ?? null) as string[] | null, correct);
    return {
      itemId: item.id,
      questionId: item.question_id,
      isCorrect,
      seconds: item.seconds ?? 0,
      subject: q?.subject_label ?? null,
      topic: q?.topic_label ?? null,
      subtopic: q?.subtopic_label ?? null,
      chapter: q?.chapter_label ?? null,
    };
  });

  // Persistir corrección por ítem
  for (const g of graded) {
    await db
      .from("apex_attempt_items")
      .update({ is_correct: g.isCorrect } as never)
      .eq("id", g.itemId);
  }

  const analysis = buildAnalysis(graded);

  await db
    .from("apex_attempts")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score: analysis.scorePercent,
      correct_count: analysis.correct,
      wrong_count: analysis.wrong,
      unanswered_count: analysis.unanswered,
      seconds_used: Math.max(
        analysis.secondsUsed,
        Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000),
      ),
      analysis: analysis as never,
    } as never)
    .eq("id", attemptId);

  // Métricas por pregunta (dificultad real)
  for (const g of graded) {
    const q = byId.get(g.questionId) as any;
    if (!q) continue;
    await db
      .from("apex_questions")
      .update({
        times_used: (q.times_used ?? 0) + 1,
        times_correct: (q.times_correct ?? 0) + (g.isCorrect === true ? 1 : 0),
        times_wrong: (q.times_wrong ?? 0) + (g.isCorrect === false ? 1 : 0),
        total_seconds: (q.total_seconds ?? 0) + (g.seconds ?? 0),
      } as never)
      .eq("id", g.questionId);
  }

  return analysis;
}

/** Revisión post-examen: aquí sí se entregan respuestas y explicaciones. */
export async function loadReview(db: Admin, attemptId: string, userId: string): Promise<ReviewItem[]> {
  const { data: attempt } = await db
    .from("apex_attempts")
    .select("id,user_id,status")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) throw new Error("Examen no encontrado.");
  if (attempt.user_id !== userId) throw new Error("Forbidden");
  if (attempt.status === "in_progress") {
    throw new Error("La revisión está disponible únicamente al finalizar el examen.");
  }

  const { data: items } = await db
    .from("apex_attempt_items")
    .select("id,position,chosen,is_correct,seconds,question_id")
    .eq("attempt_id", attemptId)
    .order("position", { ascending: true });

  const ids = (items ?? []).map((i) => i.question_id);
  const { data: questions } = await db
    .from("apex_questions")
    .select(
      "id,stem,options,correct_answers,explanation,reference,subject_label,topic_label,subtopic_label,chapter_label,difficulty",
    )
    .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));

  return (items ?? []).map((item) => {
    const q = byId.get(item.question_id) as any;
    const options = (Array.isArray(q?.options) ? q.options : []).map((o: any, i: number) => ({
      key: String(o?.key ?? String.fromCharCode(97 + i)),
      text: String(o?.text ?? o ?? ""),
    }));
    return {
      itemId: item.id,
      questionId: item.question_id,
      position: item.position,
      stem: String(q?.stem ?? ""),
      options,
      chosen: (item.chosen ?? []) as string[],
      correct: (q?.correct_answers ?? []) as string[],
      isCorrect: item.is_correct,
      explanation: q?.explanation ?? null,
      reference: q?.reference ?? null,
      subject: q?.subject_label ?? null,
      topic: q?.topic_label ?? null,
      subtopic: q?.subtopic_label ?? null,
      chapter: q?.chapter_label ?? null,
      difficulty: q?.difficulty ?? "intermedia",
      seconds: item.seconds ?? 0,
    };
  });
}

/** Recursos oficiales de KotaMed vinculados a las etiquetas indicadas. */
export async function findResources(db: Admin, labels: string[]) {
  if (labels.length === 0) return [];
  const { data } = await db
    .from("apex_resource_links")
    .select("id,title,description,kind,url,node_id,resource_id,label_match,taxonomy_id")
    .eq("is_published", true)
    .in("label_match", labels.map((l) => l.toLowerCase()))
    .limit(60);
  return data ?? [];
}
