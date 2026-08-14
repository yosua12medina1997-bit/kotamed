/**
 * KOTAMED ASSESSMENT ENGINE — tipos y constantes compartidas (cliente + servidor).
 * Nada de este archivo contiene respuestas correctas ni acceso al banco.
 */

export const APEX_PROGRAM_SLUG = "kotamed-apex";

export type TaxLevel = "program" | "subject" | "topic" | "subtopic" | "chapter" | "concept";

export const TAX_LEVELS: TaxLevel[] = [
  "program",
  "subject",
  "topic",
  "subtopic",
  "chapter",
  "concept",
];

export const TAX_LABEL: Record<TaxLevel, string> = {
  program: "Programa",
  subject: "Materia",
  topic: "Tema",
  subtopic: "Subtema",
  chapter: "Capítulo",
  concept: "Concepto",
};

export const TAX_CHILD: Record<TaxLevel, TaxLevel | null> = {
  program: "subject",
  subject: "topic",
  topic: "subtopic",
  subtopic: "chapter",
  chapter: "concept",
  concept: null,
};

export type Difficulty = "basica" | "intermedia" | "avanzada" | "experta";

export const DIFFICULTIES: Difficulty[] = ["basica", "intermedia", "avanzada", "experta"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  basica: "Básica",
  intermedia: "Intermedia",
  avanzada: "Avanzada",
  experta: "Experta",
};

export type QuestionType =
  | "single"
  | "multiple"
  | "truefalse"
  | "clinical_case"
  | "ordering"
  | "matching"
  | "image"
  | "lab"
  | "ecg"
  | "xray";

export const QUESTION_TYPES: QuestionType[] = [
  "single",
  "multiple",
  "truefalse",
  "clinical_case",
  "ordering",
  "matching",
  "image",
  "lab",
  "ecg",
  "xray",
];

/** Tipos habilitados en esta fase (la arquitectura soporta los demás). */
export const ENABLED_QUESTION_TYPES: QuestionType[] = [
  "single",
  "multiple",
  "truefalse",
  "clinical_case",
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single: "Opción múltiple (respuesta única)",
  multiple: "Múltiples respuestas",
  truefalse: "Verdadero / Falso",
  clinical_case: "Caso clínico",
  ordering: "Ordenamiento",
  matching: "Relación de conceptos",
  image: "Interpretación de imagen",
  lab: "Interpretación de laboratorio",
  ecg: "Interpretación de ECG",
  xray: "Interpretación de radiografía",
};

export type QuestionStatus = "draft" | "reviewed" | "published" | "hidden" | "discarded";

export const QUESTION_STATUSES: QuestionStatus[] = [
  "draft",
  "reviewed",
  "published",
  "hidden",
  "discarded",
];

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  draft: "Borrador",
  reviewed: "Revisada",
  published: "Publicada",
  hidden: "Oculta",
  discarded: "Descartada",
};

export const STATUS_TONE: Record<QuestionStatus, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  reviewed: "bg-sky-50 text-sky-700 border-sky-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  hidden: "bg-slate-100 text-slate-600 border-slate-200",
  discarded: "bg-rose-50 text-rose-700 border-rose-200",
};

export type ExamMode = "practice" | "simulacro" | "real" | "review";

export const EXAM_MODE_LABEL: Record<ExamMode, string> = {
  practice: "Práctica",
  simulacro: "Simulacro",
  real: "Examen real",
  review: "Repaso de errores",
};

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];
export const MAX_DURATION_MINUTES = 240;
export const MAX_BLOCK_MINUTES = 120;

export const OPTION_KEYS = ["a", "b", "c", "d", "e"] as const;

/** Plantilla oficial de importación. */
export const IMPORT_COLUMNS = [
  "question_id",
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "correct_answer",
  "explanation",
  "subject",
  "topic",
  "subtopic",
  "chapter",
  "difficulty",
  "question_type",
  "source",
  "reference",
  "tags",
  "program",
  "year",
  "status",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export type ImportRow = Partial<Record<ImportColumn, string>>;

export type ImportIssue = {
  row: number;
  code:
    | "missing_question"
    | "missing_options"
    | "missing_answer"
    | "invalid_answer"
    | "duplicate_id"
    | "duplicate_stem"
    | "invalid_format";
  message: string;
};

export const IMPORT_ISSUE_LABEL: Record<ImportIssue["code"], string> = {
  missing_question: "Pregunta vacía",
  missing_options: "Opciones incompletas",
  missing_answer: "Sin respuesta correcta",
  invalid_answer: "Respuesta correcta inválida",
  duplicate_id: "ID duplicado",
  duplicate_stem: "Enunciado duplicado",
  invalid_format: "Formato inválido",
};

export type ImportReport = {
  total: number;
  valid: number;
  invalid: number;
  issues: ImportIssue[];
  inserted?: number;
  updated?: number;
};

/** Pregunta tal como se sirve al estudiante: SIN respuesta correcta ni explicación. */
export type ExamQuestion = {
  itemId: string;
  position: number;
  block: number;
  type: QuestionType;
  stem: string;
  options: { key: string; text: string }[];
  imageUrl?: string | null;
  chosen: string[];
  flagged: boolean;
  seconds: number;
};

export type AttemptState = {
  id: string;
  title: string;
  mode: ExamMode;
  status: "in_progress" | "submitted" | "expired";
  questionCount: number;
  durationMinutes: number;
  blocks: number;
  startedAt: string;
  expiresAt: string | null;
  secondsRemaining: number;
  questions: ExamQuestion[];
};

export type MasteryLevel = "mastered" | "developing" | "weak";

export type MasteryRow = {
  label: string;
  level: TaxLevel | "unknown";
  total: number;
  correct: number;
  percent: number;
  mastery: MasteryLevel;
};

export type Weakness = {
  label: string;
  level: TaxLevel | "unknown";
  percent: number;
  wrong: number;
  total: number;
};

export type AttemptAnalysis = {
  scorePercent: number;
  correct: number;
  wrong: number;
  unanswered: number;
  secondsUsed: number;
  bySubject: MasteryRow[];
  byTopic: MasteryRow[];
  byChapter: MasteryRow[];
  weaknesses: Weakness[];
};

export type ReviewItem = {
  itemId: string;
  position: number;
  stem: string;
  options: { key: string; text: string }[];
  chosen: string[];
  correct: string[];
  isCorrect: boolean | null;
  explanation: string | null;
  reference: string | null;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  chapter: string | null;
  difficulty: string;
  seconds: number;
  questionId: string;
};

export type ExamGenConfig = {
  title?: string;
  mode: ExamMode;
  questionCount: number;
  durationMinutes: number;
  blocks: 1 | 2;
  subjectIds?: string[];
  topicIds?: string[];
  chapterIds?: string[];
  difficulties?: Difficulty[];
  questionTypes?: QuestionType[];
  tags?: string[];
  program?: string | null;
  /** Distribución porcentual por materia: { [subjectId]: percent } */
  distribution?: Record<string, number>;
  /** Reglas de repetición. */
  avoidRecentDays?: number;
  onlyFailed?: boolean;
  onlyDifficult?: boolean;
  allowNavigation?: boolean;
  shuffleOptions?: boolean;
};

export function masteryOf(percent: number): MasteryLevel {
  if (percent >= 80) return "mastered";
  if (percent >= 60) return "developing";
  return "weak";
}

export const MASTERY_META: Record<MasteryLevel, { label: string; dot: string; text: string; bar: string }> = {
  mastered: {
    label: "Dominado",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
  },
  developing: {
    label: "En desarrollo",
    dot: "bg-amber-500",
    text: "text-amber-600",
    bar: "bg-amber-500",
  },
  weak: { label: "Débil", dot: "bg-rose-500", text: "text-rose-600", bar: "bg-rose-500" },
};

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function normalizeDifficulty(raw?: string | null): Difficulty {
  const v = (raw ?? "").toLowerCase().trim();
  if (/^(b|1|easy|f[aá]cil|basic)/.test(v)) return "basica";
  if (/^(a|3|hard|difficult|avanz)/.test(v)) return "avanzada";
  if (/^(e|4|expert)/.test(v)) return "experta";
  return "intermedia";
}

export function normalizeStatus(raw?: string | null): QuestionStatus {
  const v = (raw ?? "").toLowerCase().trim();
  if (/^(pub|activ|活)/.test(v)) return "published";
  if (/^(rev)/.test(v)) return "reviewed";
  if (/^(hid|ocult)/.test(v)) return "hidden";
  if (/^(desc|disc|anul)/.test(v)) return "discarded";
  return "draft";
}

export function normalizeType(raw?: string | null): QuestionType {
  const v = (raw ?? "").toLowerCase().trim();
  if (/mult/.test(v) && /resp/.test(v)) return "multiple";
  if (/^(m|multiple)$/.test(v)) return "multiple";
  if (/(vf|verdadero|true)/.test(v)) return "truefalse";
  if (/(caso|case|cl[ií]nic)/.test(v)) return "clinical_case";
  if (/ecg/.test(v)) return "ecg";
  if (/(rx|radiog|xray)/.test(v)) return "xray";
  if (/(lab)/.test(v)) return "lab";
  if (/(imag|image)/.test(v)) return "image";
  if (/(orden|order)/.test(v)) return "ordering";
  if (/(relac|match)/.test(v)) return "matching";
  return "single";
}
