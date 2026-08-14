/**
 * KOTAMED ASSESSMENT ENGINE — capa RPC.
 * Todo el acceso al banco privado de preguntas ocurre aquí, en el servidor.
 * El navegador nunca recibe el banco, ni respuestas correctas antes de terminar.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildStudyPlan,
  clamp,
  isUuid,
  sanitizeExamConfig,
  validateImportRows,
} from "./apex-core";
import type { ExamGenConfig, ImportRow, QuestionStatus } from "./apex-types";

/* ------------------------------------------------------------------ */
/* BANCO DE PREGUNTAS (solo administradores)                           */
/* ------------------------------------------------------------------ */

export const apexBankStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();

    const count = async (filter?: (q: any) => any) => {
      let q = db.from("apex_questions").select("id", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count: c } = await q;
      return c ?? 0;
    };

    const [total, published, reviewed, draft, discarded, hidden] = await Promise.all([
      count(),
      count((q) => q.eq("status", "published")),
      count((q) => q.eq("status", "reviewed")),
      count((q) => q.eq("status", "draft")),
      count((q) => q.eq("status", "discarded")),
      count((q) => q.eq("status", "hidden")),
    ]);

    const { count: exams } = await db.from("apex_exams").select("id", { count: "exact", head: true });
    const { count: attempts } = await db
      .from("apex_attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted");
    const { data: scores } = await db
      .from("apex_attempts")
      .select("score")
      .eq("status", "submitted")
      .limit(2000);
    const avg =
      (scores ?? []).length > 0
        ? Math.round(
            (scores ?? []).reduce((a, s) => a + Number(s.score ?? 0), 0) / (scores ?? []).length,
          )
        : 0;
    const { count: openFlags } = await db
      .from("apex_flags")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    return {
      total,
      published,
      reviewed,
      draft,
      discarded,
      hidden,
      exams: exams ?? 0,
      attempts: attempts ?? 0,
      avgScore: avg,
      openFlags: openFlags ?? 0,
    };
  });

export const apexListQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      difficulty?: string;
      subjectId?: string;
      topicId?: string;
      chapterId?: string;
      questionType?: string;
      program?: string;
      tag?: string;
    }) => ({
      page: clamp(Math.round(Number(input?.page ?? 1)), 1, 100000),
      pageSize: clamp(Math.round(Number(input?.pageSize ?? 10)), 5, 100),
      search: String(input?.search ?? "").slice(0, 160),
      status: String(input?.status ?? "").slice(0, 24),
      difficulty: String(input?.difficulty ?? "").slice(0, 24),
      subjectId: isUuid(input?.subjectId) ? input!.subjectId! : "",
      topicId: isUuid(input?.topicId) ? input!.topicId! : "",
      chapterId: isUuid(input?.chapterId) ? input!.chapterId! : "",
      questionType: String(input?.questionType ?? "").slice(0, 24),
      program: String(input?.program ?? "").slice(0, 60),
      tag: String(input?.tag ?? "").slice(0, 60),
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();

    const from = (data.page - 1) * data.pageSize;
    let q = db
      .from("apex_questions")
      .select(
        "id,question_code,stem,options,correct_answers,explanation,reference,source,difficulty,question_type,status,tags,program,year,subject_label,topic_label,subtopic_label,chapter_label,subject_id,topic_id,chapter_id,times_used,times_correct,times_wrong,total_seconds,flagged_count,version,updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .range(from, from + data.pageSize - 1);

    if (data.search) q = q.ilike("stem", `%${data.search}%`);
    if (data.status) q = q.eq("status", data.status);
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    if (data.topicId) q = q.eq("topic_id", data.topicId);
    if (data.chapterId) q = q.eq("chapter_id", data.chapterId);
    if (data.questionType) q = q.eq("question_type", data.questionType);
    if (data.program) q = q.eq("program", data.program);
    if (data.tag) q = q.contains("tags", [data.tag]);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const apexSaveQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string | null; patch: Record<string, unknown> }) => ({
    id: isUuid(input?.id) ? (input!.id as string) : null,
    patch: (input?.patch ?? {}) as Record<string, unknown>,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();

    const allowed = [
      "question_code",
      "stem",
      "options",
      "correct_answers",
      "explanation",
      "reference",
      "source",
      "subject_id",
      "topic_id",
      "subtopic_id",
      "chapter_id",
      "concept_id",
      "subject_label",
      "topic_label",
      "subtopic_label",
      "chapter_label",
      "difficulty",
      "question_type",
      "tags",
      "program",
      "year",
      "image_url",
      "status",
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data.patch) patch[key] = data.patch[key];
    }

    if (data.id) {
      const { data: prev } = await db.from("apex_questions").select("*").eq("id", data.id).maybeSingle();
      if (!prev) throw new Error("Pregunta no encontrada.");
      await db.from("apex_question_versions").insert({
        question_id: data.id,
        version: prev.version ?? 1,
        snapshot: prev as never,
        created_by: context.userId,
      } as never);
      const { error } = await db
        .from("apex_questions")
        .update({ ...patch, version: (prev.version ?? 1) + 1 } as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await db
      .from("apex_questions")
      .insert({ ...patch, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created!.id as string };
  });

export const apexBulkAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; action: string }) => ({
    ids: (input?.ids ?? []).filter(isUuid).slice(0, 5000),
    action: String(input?.action ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();
    if (data.ids.length === 0) return { affected: 0 };

    if (data.action === "delete") {
      const { error } = await db.from("apex_questions").delete().in("id", data.ids);
      if (error) throw new Error(error.message);
      return { affected: data.ids.length };
    }
    if (data.action === "duplicate") {
      const { data: rows } = await db.from("apex_questions").select("*").in("id", data.ids);
      const clones = (rows ?? []).map((r: any) => {
        const { id, created_at, updated_at, question_code, version, times_used, times_correct, times_wrong, total_seconds, flagged_count, ...rest } = r;
        return {
          ...rest,
          question_code: null,
          status: "draft",
          stem: `${rest.stem} (copia)`,
          created_by: context.userId,
        };
      });
      if (clones.length > 0) {
        const { error } = await db.from("apex_questions").insert(clones as never);
        if (error) throw new Error(error.message);
      }
      return { affected: clones.length };
    }

    const statuses: QuestionStatus[] = ["draft", "reviewed", "published", "hidden", "discarded"];
    if (!statuses.includes(data.action as QuestionStatus)) throw new Error("Acción inválida.");
    const { error } = await db
      .from("apex_questions")
      .update({ status: data.action } as never)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { affected: data.ids.length };
  });

export const apexQuestionVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { questionId: string }) => {
    if (!isUuid(input?.questionId)) throw new Error("ID inválido");
    return { questionId: input.questionId };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await admin()
      .from("apex_question_versions")
      .select("id,version,snapshot,created_at")
      .eq("question_id", data.questionId)
      .order("version", { ascending: false })
      .limit(30);
    return rows ?? [];
  });

export const apexRestoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { versionId: string }) => {
    if (!isUuid(input?.versionId)) throw new Error("ID inválido");
    return { versionId: input.versionId };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();
    const { data: version } = await db
      .from("apex_question_versions")
      .select("question_id,snapshot")
      .eq("id", data.versionId)
      .maybeSingle();
    if (!version) throw new Error("Versión no encontrada.");
    const snap = version.snapshot as any;
    const {
      id,
      created_at,
      updated_at,
      version: _v,
      times_used,
      times_correct,
      times_wrong,
      total_seconds,
      flagged_count,
      ...rest
    } = snap;
    const { error } = await db
      .from("apex_questions")
      .update(rest as never)
      .eq("id", version.question_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* IMPORTACIÓN MASIVA                                                  */
/* ------------------------------------------------------------------ */

export const apexImportQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: ImportRow[]; commit?: boolean; defaultStatus?: string }) => {
    const rows = Array.isArray(input?.rows) ? input.rows.slice(0, 5000) : [];
    return {
      rows,
      commit: !!input?.commit,
      defaultStatus: String(input?.defaultStatus ?? "").slice(0, 24),
    };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();

    const codes = data.rows.map((r) => (r.question_id ?? "").trim()).filter(Boolean);
    const existingCodes = new Set<string>();
    if (codes.length > 0) {
      const { data: found } = await db
        .from("apex_questions")
        .select("question_code")
        .in("question_code", codes.slice(0, 3000));
      for (const f of found ?? []) if (f.question_code) existingCodes.add(f.question_code);
    }

    const { prepared, report } = validateImportRows(data.rows, {
      codes: existingCodes,
      stems: new Set(),
    });

    if (!data.commit) return { ...report, inserted: 0 };

    // Etiquetas → nodos de taxonomía (se crean si no existen)
    const { data: taxonomy } = await db.from("apex_taxonomy").select("id,name,level,parent_id");
    const taxIndex = new Map<string, { id: string; parent_id: string | null }>();
    for (const t of taxonomy ?? []) {
      taxIndex.set(`${t.level}::${String(t.name).toLowerCase()}`, { id: t.id, parent_id: t.parent_id });
    }

    const ensureTax = async (level: string, name: string | null, parentId: string | null) => {
      if (!name) return null;
      const key = `${level}::${name.toLowerCase()}`;
      const hit = taxIndex.get(key);
      if (hit) return hit.id;
      const slug =
        name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 48) || "nodo";
      const { data: created } = await db
        .from("apex_taxonomy")
        .insert({
          level,
          name,
          slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
          parent_id: parentId,
          created_by: context.userId,
        } as never)
        .select("id")
        .single();
      if (!created) return null;
      taxIndex.set(key, { id: created.id, parent_id: parentId });
      return created.id as string;
    };

    const payload: Record<string, unknown>[] = [];
    for (const p of prepared) {
      const subjectId = await ensureTax("subject", p.subject_label, null);
      const topicId = await ensureTax("topic", p.topic_label, subjectId);
      const subtopicId = await ensureTax("subtopic", p.subtopic_label, topicId);
      const chapterId = await ensureTax("chapter", p.chapter_label, subtopicId ?? topicId);
      payload.push({
        question_code: p.question_code,
        stem: p.stem,
        options: p.options,
        correct_answers: p.correct_answers,
        explanation: p.explanation,
        reference: p.reference,
        source: p.source,
        subject_id: subjectId,
        topic_id: topicId,
        subtopic_id: subtopicId,
        chapter_id: chapterId,
        subject_label: p.subject_label,
        topic_label: p.topic_label,
        subtopic_label: p.subtopic_label,
        chapter_label: p.chapter_label,
        difficulty: p.difficulty,
        question_type: p.question_type,
        tags: p.tags,
        program: p.program,
        year: p.year,
        status: data.defaultStatus || p.status,
        created_by: context.userId,
      });
    }

    let inserted = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error } = await db.from("apex_questions").insert(chunk as never);
      if (error) throw new Error(`Error al importar (fila ${i + 1}): ${error.message}`);
      inserted += chunk.length;
    }

    return { ...report, inserted };
  });

export const apexSuggestClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { samples: { stem: string; explanation?: string }[] }) => ({
    samples: (input?.samples ?? []).slice(0, 12).map((s) => ({
      stem: String(s?.stem ?? "").slice(0, 900),
      explanation: String(s?.explanation ?? "").slice(0, 600),
    })),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave de IA.");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const model = createLovableAiGatewayProvider(key).chatModel("google/gemini-3.6-flash");

    const { text } = await generateText({
      model,
      system:
        "Eres un clasificador académico médico de KotaMed. Devuelve SOLO un array JSON. " +
        "Para cada pregunta devuelve {subject, topic, subtopic, chapter, difficulty, tags}. " +
        "difficulty ∈ basica|intermedia|avanzada|experta. tags: máximo 4, en minúsculas. " +
        "Usa nomenclatura médica estándar en español. No inventes referencias.",
      prompt: JSON.stringify(data.samples),
    });
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      return JSON.parse(match[0]) as Record<string, unknown>[];
    } catch {
      return [];
    }
  });

/* ------------------------------------------------------------------ */
/* EXAMEN DEL USUARIO                                                  */
/* ------------------------------------------------------------------ */

export const apexStartExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { examId?: string | null; config?: Partial<ExamGenConfig> }) => ({
    examId: isUuid(input?.examId) ? (input!.examId as string) : null,
    config: (input?.config ?? {}) as Partial<ExamGenConfig>,
  }))
  .handler(async ({ data, context }) => {
    const { admin, createAttempt } = await import("./apex-engine.server");
    const db = admin();

    let config = data.config;
    if (data.examId) {
      const { data: exam } = await db
        .from("apex_exams")
        .select("id,title,mode,question_count,duration_minutes,blocks,config,is_published")
        .eq("id", data.examId)
        .maybeSingle();
      if (!exam) throw new Error("Examen no encontrado.");
      const { isAdminUser } = await import("./apex-engine.server");
      if (!exam.is_published && !(await isAdminUser(context.supabase, context.userId))) {
        throw new Error("Este examen no está disponible.");
      }
      config = {
        ...((exam.config ?? {}) as Partial<ExamGenConfig>),
        title: exam.title,
        mode: exam.mode as any,
        questionCount: exam.question_count,
        durationMinutes: exam.duration_minutes,
        blocks: exam.blocks as 1 | 2,
      };
    }

    const attemptId = await createAttempt(db, context.userId, config, data.examId);
    return { attemptId };
  });

export const apexGetAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin, loadAttemptForStudent } = await import("./apex-engine.server");
    return loadAttemptForStudent(admin(), data.attemptId, context.userId);
  });

export const apexSaveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { attemptId: string; itemId: string; chosen?: string[]; seconds?: number; flagged?: boolean }) => {
      if (!isUuid(input?.attemptId) || !isUuid(input?.itemId)) throw new Error("ID inválido");
      return {
        attemptId: input.attemptId,
        itemId: input.itemId,
        chosen: (input.chosen ?? []).map((c) => String(c).slice(0, 4)).slice(0, 8),
        seconds: clamp(Math.round(Number(input.seconds ?? 0)), 0, 60 * 60 * 5),
        flagged: !!input.flagged,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { admin } = await import("./apex-engine.server");
    const db = admin();
    const { data: attempt } = await db
      .from("apex_attempts")
      .select("id,user_id,status,expires_at")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.user_id !== context.userId) throw new Error("Forbidden");
    if (attempt.status !== "in_progress") throw new Error("El examen ya fue enviado.");

    const { error } = await db
      .from("apex_attempt_items")
      .update({
        chosen: data.chosen.length > 0 ? data.chosen : null,
        seconds: data.seconds,
        flagged: data.flagged,
        answered_at: data.chosen.length > 0 ? new Date().toISOString() : null,
      } as never)
      .eq("id", data.itemId)
      .eq("attempt_id", data.attemptId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apexSubmitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin, gradeAttempt } = await import("./apex-engine.server");
    return gradeAttempt(admin(), data.attemptId, context.userId);
  });

export const apexReviewAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin, loadReview, findResources } = await import("./apex-engine.server");
    const db = admin();
    const items = await loadReview(db, data.attemptId, context.userId);
    const labels = [
      ...new Set(
        items
          .filter((i) => i.isCorrect !== true)
          .flatMap((i) => [i.chapter, i.subtopic, i.topic, i.subject])
          .filter(Boolean)
          .map((l) => String(l).toLowerCase()),
      ),
    ];
    const resources = await findResources(db, labels);
    return { items, resources };
  });

export const apexFlagQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { questionId: string; reason: string; note?: string }) => {
    if (!isUuid(input?.questionId)) throw new Error("ID inválido");
    return {
      questionId: input.questionId,
      reason: String(input?.reason ?? "otro").slice(0, 60),
      note: String(input?.note ?? "").slice(0, 600),
    };
  })
  .handler(async ({ data, context }) => {
    const { admin } = await import("./apex-engine.server");
    const db = admin();
    await db.from("apex_flags").insert({
      question_id: data.questionId,
      user_id: context.userId,
      reason: data.reason,
      note: data.note || null,
    } as never);
    const { data: q } = await db
      .from("apex_questions")
      .select("flagged_count")
      .eq("id", data.questionId)
      .maybeSingle();
    await db
      .from("apex_questions")
      .update({ flagged_count: (q?.flagged_count ?? 0) + 1 } as never)
      .eq("id", data.questionId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* "KOTAMED, ENSÉÑAME LO QUE NO SÉ"                                    */
/* ------------------------------------------------------------------ */

export const apexGenerateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin, loadReview } = await import("./apex-engine.server");
    const db = admin();
    const items = (await loadReview(db, data.attemptId, context.userId)).filter(
      (i) => i.isCorrect !== true,
    );
    if (items.length === 0) return { created: 0, pending: 0 };

    let created = 0;
    let pending = 0;
    const rows: Record<string, unknown>[] = [];
    for (const item of items) {
      const correctText = item.options
        .filter((o) => item.correct.includes(o.key))
        .map((o) => o.text)
        .join(" · ");
      if (!correctText && !item.explanation) {
        pending += 1;
        continue;
      }
      const deck = item.subject ? `Flashcards de ${item.subject}` : "Flashcards de mis errores";
      rows.push({
        user_id: context.userId,
        attempt_id: data.attemptId,
        question_id: item.questionId,
        deck,
        front: item.stem,
        back: [correctText && `Respuesta: ${correctText}`, item.explanation, item.reference && `Referencia: ${item.reference}`]
          .filter(Boolean)
          .join("\n\n"),
        source: item.reference ?? "Explicación oficial de la pregunta",
      });
    }
    if (rows.length > 0) {
      const { error } = await db.from("apex_flashcards").insert(rows as never);
      if (error) throw new Error(error.message);
      created = rows.length;
    }
    return { created, pending };
  });

export const apexGenerateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin, loadReview } = await import("./apex-engine.server");
    const db = admin();
    const wrong = (await loadReview(db, data.attemptId, context.userId)).filter(
      (i) => i.isCorrect !== true,
    );
    if (wrong.length === 0) {
      return { id: null, content: "", message: "¡Sin errores en este examen! No hay resumen que generar." };
    }

    const material = wrong
      .slice(0, 40)
      .map(
        (i) =>
          `TEMA: ${[i.subject, i.topic, i.subtopic, i.chapter].filter(Boolean).join(" > ")}\nPREGUNTA: ${i.stem}\nCORRECTA: ${i.options
            .filter((o) => i.correct.includes(o.key))
            .map((o) => o.text)
            .join(" | ")}\nEXPLICACIÓN OFICIAL: ${i.explanation ?? "(sin explicación cargada)"}\nREFERENCIA: ${i.reference ?? "-"}`,
      )
      .join("\n\n---\n\n");

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta la clave de IA.");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const model = createLovableAiGatewayProvider(key).chatModel("google/gemini-3.6-flash");

    const { text } = await generateText({
      model,
      system:
        "Eres el tutor académico de KotaMed. Redacta un resumen personalizado en español, en Markdown, " +
        "usando ÚNICAMENTE el material entregado (explicaciones oficiales de las preguntas falladas). " +
        "No inventes capítulos, guías ni referencias que no aparezcan en el material. " +
        "Si falta información para un tema, escribe: 'Contenido de repaso pendiente de publicación.' " +
        "Estructura: ## Conceptos clave, ## Errores frecuentes, ## Mecanismos, ## Datos importantes, ## Perlas clínicas.",
      prompt: material,
    });

    const title = `Resumen personalizado — ${wrong[0]!.subject ?? "Mis errores"}`;
    const { data: created, error } = await db
      .from("apex_summaries")
      .insert({
        user_id: context.userId,
        attempt_id: data.attemptId,
        title,
        content: text,
        sources: wrong
          .slice(0, 40)
          .map((w) => ({ question_id: w.questionId, reference: w.reference })) as never,
      } as never)
      .select("id,content,title")
      .single();
    if (error) throw new Error(error.message);
    return { id: created!.id as string, content: created!.content as string, message: "" };
  });

export const apexGenerateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin } = await import("./apex-engine.server");
    const db = admin();
    const { data: attempt } = await db
      .from("apex_attempts")
      .select("id,user_id,analysis")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.user_id !== context.userId) throw new Error("Forbidden");

    const weaknesses = ((attempt.analysis as any)?.weaknesses ?? []) as {
      label: string;
      percent: number;
      level: string;
    }[];
    const plan = buildStudyPlan(weaknesses as never);

    await db.from("apex_study_plan").delete().eq("attempt_id", data.attemptId).eq("user_id", context.userId);
    const rows = plan.map((p) => ({ ...p, user_id: context.userId, attempt_id: data.attemptId }));
    const { error } = await db.from("apex_study_plan").insert(rows as never);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

export const apexCreateRecoveryExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!isUuid(input?.attemptId)) throw new Error("ID inválido");
    return { attemptId: input.attemptId };
  })
  .handler(async ({ data, context }) => {
    const { admin, createAttempt } = await import("./apex-engine.server");
    const db = admin();
    const { data: attempt } = await db
      .from("apex_attempts")
      .select("id,user_id,analysis,config,question_count")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.user_id !== context.userId) throw new Error("Forbidden");

    const weaknessLabels = (((attempt.analysis as any)?.weaknesses ?? []) as { label: string }[]).map(
      (w) => w.label.toLowerCase(),
    );

    // Materias/temas débiles → IDs de taxonomía
    const { data: tax } = await db.from("apex_taxonomy").select("id,name,level");
    const weakIds = (tax ?? [])
      .filter((t) => weaknessLabels.includes(String(t.name).toLowerCase()))
      .reduce(
        (acc, t) => {
          if (t.level === "subject") acc.subjects.push(t.id);
          else if (t.level === "topic") acc.topics.push(t.id);
          else if (t.level === "chapter") acc.chapters.push(t.id);
          return acc;
        },
        { subjects: [] as string[], topics: [] as string[], chapters: [] as string[] },
      );

    const baseConfig = sanitizeExamConfig({
      ...((attempt.config ?? {}) as Partial<ExamGenConfig>),
      title: "Examen de recuperación · KotaMed Apex",
      mode: "review",
      questionCount: Math.min(40, Math.max(10, attempt.question_count)),
      durationMinutes: 45,
      blocks: 1,
      subjectIds: weakIds.subjects,
      topicIds: weakIds.topics,
      chapterIds: weakIds.chapters,
      distribution: undefined,
      avoidRecentDays: 0,
      onlyFailed: false,
    });

    try {
      const attemptId = await createAttempt(db, context.userId, baseConfig);
      return { attemptId };
    } catch {
      // Sin preguntas equivalentes: repaso de las falladas
      const attemptId = await createAttempt(db, context.userId, {
        ...baseConfig,
        subjectIds: [],
        topicIds: [],
        chapterIds: [],
        onlyFailed: true,
      });
      return { attemptId };
    }
  });

/* ------------------------------------------------------------------ */
/* ANALÍTICA DEL ADMINISTRADOR                                         */
/* ------------------------------------------------------------------ */

export const apexAdminAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, admin } = await import("./apex-engine.server");
    await assertAdmin(context.supabase, context.userId);
    const db = admin();

    const { data: worst } = await db
      .from("apex_questions")
      .select("id,stem,times_used,times_correct,times_wrong,total_seconds,flagged_count,status,subject_label,topic_label")
      .gt("times_used", 0)
      .order("times_wrong", { ascending: false })
      .limit(15);

    const { data: slowest } = await db
      .from("apex_questions")
      .select("id,stem,times_used,total_seconds,subject_label")
      .gt("times_used", 0)
      .order("total_seconds", { ascending: false })
      .limit(10);

    const { data: attempts } = await db
      .from("apex_attempts")
      .select("id,title,mode,score,correct_count,wrong_count,submitted_at,analysis,user_id")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(200);

    const topicAgg = new Map<string, { total: number; correct: number }>();
    for (const a of attempts ?? []) {
      for (const row of (((a.analysis as any)?.byTopic ?? []) as any[])) {
        const e = topicAgg.get(row.label) ?? { total: 0, correct: 0 };
        e.total += row.total ?? 0;
        e.correct += row.correct ?? 0;
        topicAgg.set(row.label, e);
      }
    }
    const hardestTopics = [...topicAgg.entries()]
      .map(([label, v]) => ({
        label,
        percent: v.total ? Math.round((v.correct / v.total) * 100) : 0,
        total: v.total,
      }))
      .filter((t) => t.total >= 3)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 10);

    const { data: flags } = await db
      .from("apex_flags")
      .select("id,question_id,reason,note,status,created_at")
      .order("created_at", { ascending: false })
      .limit(40);

    return {
      worst: worst ?? [],
      slowest: slowest ?? [],
      recentAttempts: (attempts ?? []).slice(0, 25),
      hardestTopics,
      flags: flags ?? [],
    };
  });
