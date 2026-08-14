/**
 * Lógica pura del Assessment Engine (sin acceso a base de datos).
 * Se usa en el servidor (calificación, análisis) y en el cliente (parseo de
 * archivos de importación y validación previa).
 */
import {
  DIFFICULTIES,
  IMPORT_COLUMNS,
  MAX_BLOCK_MINUTES,
  MAX_DURATION_MINUTES,
  OPTION_KEYS,
  masteryOf,
  normalizeDifficulty,
  normalizeStatus,
  normalizeType,
  type AttemptAnalysis,
  type Difficulty,
  type ExamGenConfig,
  type ExamMode,
  type ImportIssue,
  type ImportReport,
  type ImportRow,
  type MasteryRow,
  type TaxLevel,
  type Weakness,
} from "./apex-types";

/* ------------------------------------------------------------------ */
/* Parseo de archivos de importación                                   */
/* ------------------------------------------------------------------ */

/** Divide una línea CSV respetando comillas dobles. */
export function splitCsvLine(line: string, delimiter = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(header: string) {
  const counts: [string, number][] = [
    [",", (header.match(/,/g) ?? []).length],
    [";", (header.match(/;/g) ?? []).length],
    ["\t", (header.match(/\t/g) ?? []).length],
    ["|", (header.match(/\|/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ",";
}

const HEADER_ALIASES: Record<string, string> = {
  id: "question_id",
  codigo: "question_id",
  pregunta: "question",
  enunciado: "question",
  a: "option_a",
  b: "option_b",
  c: "option_c",
  d: "option_d",
  e: "option_e",
  opcion_a: "option_a",
  opcion_b: "option_b",
  opcion_c: "option_c",
  opcion_d: "option_d",
  opcion_e: "option_e",
  respuesta: "correct_answer",
  respuesta_correcta: "correct_answer",
  correcta: "correct_answer",
  explicacion: "explanation",
  materia: "subject",
  tema: "topic",
  subtema: "subtopic",
  capitulo: "chapter",
  dificultad: "difficulty",
  tipo: "question_type",
  fuente: "source",
  referencia: "reference",
  etiquetas: "tags",
  programa: "program",
  anio: "year",
  año: "year",
  estado: "status",
};

function normHeader(h: string) {
  const key = h
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
  const alias = HEADER_ALIASES[key] ?? key;
  return (IMPORT_COLUMNS as readonly string[]).includes(alias) ? alias : "";
}

/** CSV / TSV / TXT delimitado → filas normalizadas. */
export function parseDelimitedQuestions(text: string): ImportRow[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let buf = "";
  let quotes = 0;
  for (const line of clean.split("\n")) {
    buf = buf ? `${buf}\n${line}` : line;
    quotes += (line.match(/"/g) ?? []).length;
    if (quotes % 2 === 0) {
      lines.push(buf);
      buf = "";
    }
  }
  if (buf) lines.push(buf);

  const delimiter = detectDelimiter(lines[0]!);
  const headers = splitCsvLine(lines[0]!, delimiter).map(normHeader);
  const rows: ImportRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = splitCsvLine(line, delimiter);
    const row: ImportRow = {};
    headers.forEach((h, i) => {
      if (!h) return;
      const value = (cells[i] ?? "").replace(/^"|"$/g, "").trim();
      if (value) (row as Record<string, string>)[h] = value;
    });
    if (Object.keys(row).length > 0) rows.push(row);
  }
  return rows;
}

/** JSON (array de objetos) → filas normalizadas. */
export function parseJsonQuestions(text: string): ImportRow[] {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : [];
  return list.map((raw: Record<string, unknown>) => {
    const row: ImportRow = {};
    for (const [k, v] of Object.entries(raw ?? {})) {
      const h = normHeader(k);
      if (!h) continue;
      if (Array.isArray(v)) (row as Record<string, string>)[h] = v.join("|");
      else if (v !== null && v !== undefined && String(v).trim())
        (row as Record<string, string>)[h] = String(v).trim();
    }
    // Soporte para { options: ["...","..."] }
    if (Array.isArray((raw as any)?.options)) {
      ((raw as any).options as unknown[]).forEach((opt, i) => {
        const key = OPTION_KEYS[i];
        if (key) (row as Record<string, string>)[`option_${key}`] = String(opt);
      });
    }
    return row;
  });
}

/* ------------------------------------------------------------------ */
/* Validación de importación                                           */
/* ------------------------------------------------------------------ */

export type PreparedQuestion = {
  question_code: string | null;
  stem: string;
  options: { key: string; text: string }[];
  correct_answers: string[];
  explanation: string | null;
  reference: string | null;
  source: string | null;
  subject_label: string | null;
  topic_label: string | null;
  subtopic_label: string | null;
  chapter_label: string | null;
  difficulty: Difficulty;
  question_type: string;
  tags: string[];
  program: string | null;
  year: number | null;
  status: string;
};

function parseAnswers(raw: string, options: { key: string; text: string }[]): string[] {
  const tokens = raw
    .split(/[,;|/\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const keys = options.map((o) => o.key);
  const out = new Set<string>();
  for (const t of tokens) {
    if (keys.includes(t)) {
      out.add(t);
      continue;
    }
    const asNumber = Number(t);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
      out.add(options[asNumber - 1]!.key);
      continue;
    }
    // Coincidencia por texto de la opción
    const match = options.find((o) => o.text.toLowerCase().trim() === t);
    if (match) out.add(match.key);
  }
  if (out.size === 0) {
    const whole = raw.trim().toLowerCase();
    const match = options.find((o) => o.text.toLowerCase().trim() === whole);
    if (match) out.add(match.key);
  }
  return [...out];
}

export function validateImportRows(
  rows: ImportRow[],
  existing: { codes: Set<string>; stems: Set<string> } = { codes: new Set(), stems: new Set() },
): { prepared: PreparedQuestion[]; report: ImportReport } {
  const issues: ImportIssue[] = [];
  const prepared: PreparedQuestion[] = [];
  const seenCodes = new Set<string>();
  const seenStems = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // + encabezado
    const stem = (row.question ?? "").trim();
    if (!stem) {
      issues.push({ row: rowNumber, code: "missing_question", message: "La fila no tiene enunciado." });
      return;
    }
    const options = OPTION_KEYS.map((k) => ({
      key: k,
      text: (row[`option_${k}` as keyof ImportRow] ?? "").trim(),
    })).filter((o) => o.text.length > 0);

    const type = normalizeType(row.question_type);
    const isTF = type === "truefalse";
    if (options.length < 2 && !isTF) {
      issues.push({
        row: rowNumber,
        code: "missing_options",
        message: `Se requieren al menos 2 opciones (encontradas: ${options.length}).`,
      });
      return;
    }
    const finalOptions =
      options.length >= 2
        ? options
        : [
            { key: "a", text: "Verdadero" },
            { key: "b", text: "Falso" },
          ];

    const rawAnswer = (row.correct_answer ?? "").trim();
    if (!rawAnswer) {
      issues.push({ row: rowNumber, code: "missing_answer", message: "Sin respuesta correcta." });
      return;
    }
    const answers = parseAnswers(rawAnswer, finalOptions);
    if (answers.length === 0) {
      issues.push({
        row: rowNumber,
        code: "invalid_answer",
        message: `"${rawAnswer}" no coincide con ninguna opción.`,
      });
      return;
    }

    const code = (row.question_id ?? "").trim() || null;
    if (code) {
      if (seenCodes.has(code) || existing.codes.has(code)) {
        issues.push({ row: rowNumber, code: "duplicate_id", message: `ID duplicado: ${code}.` });
        return;
      }
      seenCodes.add(code);
    }
    const stemKey = stem.toLowerCase().replace(/\s+/g, " ").slice(0, 240);
    if (seenStems.has(stemKey) || existing.stems.has(stemKey)) {
      issues.push({
        row: rowNumber,
        code: "duplicate_stem",
        message: "Posible duplicado: el enunciado ya existe en el banco.",
      });
      return;
    }
    seenStems.add(stemKey);

    const year = Number((row.year ?? "").replace(/\D/g, ""));

    prepared.push({
      question_code: code,
      stem,
      options: finalOptions,
      correct_answers: answers,
      explanation: (row.explanation ?? "").trim() || null,
      reference: (row.reference ?? "").trim() || null,
      source: (row.source ?? "").trim() || null,
      subject_label: (row.subject ?? "").trim() || null,
      topic_label: (row.topic ?? "").trim() || null,
      subtopic_label: (row.subtopic ?? "").trim() || null,
      chapter_label: (row.chapter ?? "").trim() || null,
      difficulty: normalizeDifficulty(row.difficulty),
      question_type: answers.length > 1 && type === "single" ? "multiple" : type,
      tags: (row.tags ?? "")
        .split(/[|,;]/)
        .map((t) => t.trim())
        .filter(Boolean),
      program: (row.program ?? "").trim() || null,
      year: Number.isFinite(year) && year > 1900 ? year : null,
      status: normalizeStatus(row.status),
    });
  });

  return {
    prepared,
    report: {
      total: rows.length,
      valid: prepared.length,
      invalid: issues.length,
      issues: issues.slice(0, 400),
    },
  };
}

/** Plantilla CSV oficial descargable. */
export function importTemplateCsv() {
  const header = IMPORT_COLUMNS.join(",");
  const example = [
    "Q000001",
    '"¿Cuál es el principal mecanismo de compensación en la insuficiencia cardíaca?"',
    '"Activación del sistema renina-angiotensina-aldosterona"',
    '"Vasodilatación periférica"',
    '"Bradicardia refleja"',
    '"Disminución del tono simpático"',
    "",
    "a",
    '"La caída del gasto cardíaco activa el SRAA y el sistema simpático."',
    "Cardiología",
    "Insuficiencia cardíaca",
    "Fisiopatología",
    "Remodelado ventricular",
    "avanzada",
    "single",
    "Harrison 21e",
    "Cap. 252",
    "cardiologia|fisiopatologia",
    "ciencias-clinicas",
    "2025",
    "published",
  ].join(",");
  return `${header}\n${example}\n`;
}

/* ------------------------------------------------------------------ */
/* Configuración de examen                                             */
/* ------------------------------------------------------------------ */

export function sanitizeExamConfig(input: Partial<ExamGenConfig>): ExamGenConfig {
  const questionCount = clamp(Math.round(Number(input.questionCount ?? 20)), 1, 500);
  const blocks = input.blocks === 2 ? 2 : 1;
  const maxDuration = blocks === 2 ? MAX_DURATION_MINUTES : MAX_BLOCK_MINUTES * 2;
  const durationMinutes = clamp(
    Math.round(Number(input.durationMinutes ?? 30)),
    5,
    Math.min(maxDuration, MAX_DURATION_MINUTES),
  );
  const mode: ExamMode = (["practice", "simulacro", "real", "review"] as ExamMode[]).includes(
    input.mode as ExamMode,
  )
    ? (input.mode as ExamMode)
    : "practice";
  return {
    title: (input.title ?? "").toString().slice(0, 140) || undefined,
    mode,
    questionCount,
    durationMinutes,
    blocks,
    subjectIds: uuidList(input.subjectIds),
    topicIds: uuidList(input.topicIds),
    chapterIds: uuidList(input.chapterIds),
    difficulties: (input.difficulties ?? []).filter((d) => DIFFICULTIES.includes(d)),
    questionTypes: (input.questionTypes ?? []).filter((t) => typeof t === "string").slice(0, 12),
    tags: (input.tags ?? []).map((t) => String(t).slice(0, 60)).slice(0, 20),
    program: input.program ? String(input.program).slice(0, 60) : null,
    distribution: sanitizeDistribution(input.distribution),
    avoidRecentDays: clamp(Math.round(Number(input.avoidRecentDays ?? 0)), 0, 365),
    onlyFailed: !!input.onlyFailed,
    onlyDifficult: !!input.onlyDifficult,
    allowNavigation: input.allowNavigation !== false,
    shuffleOptions: !!input.shuffleOptions,
  };
}

function sanitizeDistribution(dist?: Record<string, number>) {
  if (!dist) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(dist)) {
    if (!isUuid(k)) continue;
    const num = Number(v);
    if (Number.isFinite(num) && num > 0) out[k] = Math.min(100, num);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown) {
  return typeof v === "string" && UUID_RE.test(v);
}
function uuidList(list?: string[]) {
  return (list ?? []).filter(isUuid).slice(0, 200);
}
export function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Reparto de preguntas por bloque (máx. 2 horas por bloque). */
export function blockOf(position: number, total: number, blocks: number) {
  if (blocks <= 1) return 1;
  const half = Math.ceil(total / 2);
  return position <= half ? 1 : 2;
}

/* ------------------------------------------------------------------ */
/* Calificación y análisis                                             */
/* ------------------------------------------------------------------ */

export function isAnswerCorrect(chosen: string[] | null, correct: string[]) {
  if (!chosen || chosen.length === 0) return null;
  const a = [...new Set(chosen.map((c) => c.toLowerCase()))].sort();
  const b = [...new Set(correct.map((c) => c.toLowerCase()))].sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

type GradedRow = {
  isCorrect: boolean | null;
  seconds: number;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  chapter: string | null;
};

function groupMastery(rows: GradedRow[], pick: (r: GradedRow) => string | null, level: TaxLevel): MasteryRow[] {
  const map = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const label = pick(r);
    if (!label) continue;
    const entry = map.get(label) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (r.isCorrect) entry.correct += 1;
    map.set(label, entry);
  }
  return [...map.entries()]
    .map(([label, v]) => {
      const percent = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
      return { label, level, total: v.total, correct: v.correct, percent, mastery: masteryOf(percent) };
    })
    .sort((a, b) => a.percent - b.percent || b.total - a.total);
}

export function buildAnalysis(rows: GradedRow[]): AttemptAnalysis {
  const correct = rows.filter((r) => r.isCorrect === true).length;
  const answered = rows.filter((r) => r.isCorrect !== null).length;
  const wrong = answered - correct;
  const unanswered = rows.length - answered;
  const bySubject = groupMastery(rows, (r) => r.subject, "subject");
  const byTopic = groupMastery(rows, (r) => r.topic ?? r.subtopic, "topic");
  const byChapter = groupMastery(rows, (r) => r.chapter, "chapter");

  const weaknessPool = [...byTopic, ...byChapter, ...bySubject]
    .filter((r) => r.percent < 70 && r.total > 0)
    .sort((a, b) => a.percent - b.percent || b.total - a.total);
  const seen = new Set<string>();
  const weaknesses: Weakness[] = [];
  for (const w of weaknessPool) {
    if (seen.has(w.label)) continue;
    seen.add(w.label);
    weaknesses.push({
      label: w.label,
      level: w.level,
      percent: w.percent,
      wrong: w.total - w.correct,
      total: w.total,
    });
    if (weaknesses.length >= 8) break;
  }

  return {
    scorePercent: rows.length > 0 ? Math.round((correct / rows.length) * 100) : 0,
    correct,
    wrong,
    unanswered,
    secondsUsed: rows.reduce((a, r) => a + (r.seconds || 0), 0),
    bySubject,
    byTopic,
    byChapter,
    weaknesses,
  };
}

/** Plan de recuperación determinista (5 días) a partir de las debilidades. */
export function buildStudyPlan(weaknesses: Weakness[]) {
  const top = weaknesses.slice(0, 3);
  const plan: { day_number: number; title: string; detail: string; kind: string; minutes: number; taxonomy_label: string | null }[] = [];
  top.forEach((w, i) => {
    plan.push({
      day_number: i + 1,
      title: `Repasar ${w.label}`,
      detail: `Rendimiento actual ${w.percent}%. Estudia el contenido oficial vinculado y vuelve a intentar las preguntas falladas.`,
      kind: "study",
      minutes: w.percent < 45 ? 40 : 25,
      taxonomy_label: w.label,
    });
  });
  const base = plan.length;
  plan.push({
    day_number: base + 1,
    title: "Flashcards de mis errores",
    detail: "Sesión de repaso espaciado con las tarjetas generadas desde tus errores.",
    kind: "flashcards",
    minutes: 20,
    taxonomy_label: null,
  });
  plan.push({
    day_number: base + 2,
    title: "Examen de recuperación",
    detail: "Nuevo examen enfocado en tus temas débiles, con dificultad progresiva.",
    kind: "exam",
    minutes: 45,
    taxonomy_label: null,
  });
  return plan;
}

/** SM-2 simplificado para repaso espaciado. */
export function scheduleReview(
  card: { ease: number; interval_days: number; repetitions: number },
  grade: number,
) {
  let { ease, interval_days: interval, repetitions } = card;
  if (grade < 3) {
    repetitions = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    repetitions += 1;
    ease = Math.min(2.8, ease + (grade === 5 ? 0.1 : grade === 4 ? 0.05 : -0.05));
    interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(interval * ease) || 3;
  }
  interval = clamp(interval, 1, 180);
  const due = new Date(Date.now() + interval * 86400000).toISOString();
  const state = repetitions === 0 ? "learning" : interval >= 21 ? "mastered" : "learning";
  return { ease, interval_days: interval, repetitions, due_at: due, state, last_grade: grade };
}

export const SPACED_STEPS = [0, 1, 3, 7, 14, 30];
