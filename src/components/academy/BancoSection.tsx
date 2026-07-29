/**
 * QBank profesional: banco personal (admin) + banco IA, importación desde
 * Excel/CSV/Word/PDF o texto pegado, generador masivo (100/500/1000) y modo
 * práctica con registro de intentos.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  Database,
  FileUp,
  Play,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { generateQuestions, parseQuestions } from "@/lib/academy-ai.functions";
import { Btn, Chip, Empty, Field, Input, Metric, Panel, Select, Textarea } from "./ui";
import { db, EXAM_TYPES, LEVELS, logStudy, readFilesAsText } from "./api";
import { Modal } from "./CasosSection";

type QRow = {
  id: string;
  stem: string;
  options: string[];
  answer_index: number;
  explanation: string | null;
  bibliography: string | null;
  level: string;
  exam_type: string;
  topic: string | null;
  subtopic: string | null;
  tags: string[];
  difficulty: number;
  time_seconds: number;
  bank: string;
};

export function BancoSection({ meta, isAdmin }: { meta: EnamAreaMeta; isAdmin: boolean }) {
  const accent = meta.accent;
  const qc = useQueryClient();
  const [bank, setBank] = useState<"all" | "personal" | "ia">("all");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [tool, setTool] = useState<null | "import" | "generate">(null);
  const [practice, setPractice] = useState(false);

  const list = useQuery({
    queryKey: ["academy-questions", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_questions")
        .select("*")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as QRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("academy_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-questions", meta.slug] }),
  });

  const rows = useMemo(() => {
    const all = list.data ?? [];
    const t = topic.trim().toLowerCase();
    return all.filter(
      (q) =>
        (bank === "all" || q.bank === bank) &&
        (!level || q.level === level) &&
        (!t ||
          q.stem.toLowerCase().includes(t) ||
          (q.topic ?? "").toLowerCase().includes(t) ||
          q.tags.join(" ").toLowerCase().includes(t)),
    );
  }, [list.data, bank, level, topic]);

  const personal = (list.data ?? []).filter((q) => q.bank === "personal").length;
  const ia = (list.data ?? []).filter((q) => q.bank === "ia").length;

  return (
    <Panel
      accent={accent}
      icon={<Database className="size-4" strokeWidth={2.25} />}
      title="Banco de preguntas"
      subtitle="Banco personal e IA con explicación, bibliografía, nivel, tema, etiquetas, dificultad y tiempo."
      actions={
        <>
          <Btn variant="solid" accent={accent} onClick={() => setPractice(true)}>
            <Play className="size-3" /> Practicar
          </Btn>
          {isAdmin && (
            <>
              <Btn onClick={() => setTool("import")}>
                <FileUp className="size-3" /> Importar
              </Btn>
              <Btn onClick={() => setTool("generate")}>
                <Wand2 className="size-3" /> Generar con IA
              </Btn>
            </>
          )}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total" value={list.data?.length ?? 0} accent={accent} />
        <Metric label="Banco personal" value={personal} accent={accent} />
        <Metric label="Banco IA" value={ia} accent={accent} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", "personal", "ia"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBank(b)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
              bank === b
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {b === "all" ? "Todos" : b === "personal" ? "Banco personal" : "Banco IA"}
          </button>
        ))}
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Buscar tema, etiqueta o enunciado…"
          className="flex-1 min-w-52"
        />
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="max-w-40">
          <option value="">Nivel</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 space-y-2">
        {rows.slice(0, 60).map((q) => (
          <details
            key={q.id}
            className="rounded-2xl border border-border/50 bg-background/40 p-3 group"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold flex items-start gap-2">
              <span className="flex-1">{q.stem}</span>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    del.mutate(q.id);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar pregunta"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </summary>
            <div className="mt-2 space-y-1 text-xs">
              {q.options.map((o, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-2.5 py-1.5 ${
                    i === q.answer_index ? "bg-emerald-500/10 font-semibold" : "bg-foreground/[0.03]"
                  }`}
                >
                  {o}
                </div>
              ))}
              {q.explanation && (
                <p className="mt-2 rounded-lg bg-foreground/[0.04] p-2.5 leading-relaxed">
                  {q.explanation}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Chip accent={accent}>{q.exam_type}</Chip>
                <Chip>{q.level}</Chip>
                {q.topic && <Chip>{q.topic}</Chip>}
                <Chip>Dif. {q.difficulty}</Chip>
                <Chip>{q.time_seconds}s</Chip>
              </div>
              {q.bibliography && (
                <p className="pt-1 text-[11px] text-muted-foreground">📚 {q.bibliography}</p>
              )}
            </div>
          </details>
        ))}
        {!list.isLoading && rows.length === 0 && (
          <Empty
            text={
              isAdmin
                ? "Banco vacío. Importa Excel/CSV/Word/PDF, pega preguntas o genera con IA."
                : "Todavía no hay preguntas publicadas."
            }
          />
        )}
        {rows.length > 60 && (
          <p className="text-[11px] text-muted-foreground">
            Mostrando 60 de {rows.length}. Usa el buscador para filtrar.
          </p>
        )}
      </div>

      {tool && (
        <QBankTool
          meta={meta}
          mode={tool}
          onClose={() => setTool(null)}
          onSaved={() => {
            setTool(null);
            qc.invalidateQueries({ queryKey: ["academy-questions", meta.slug] });
          }}
        />
      )}

      {practice && (
        <PracticeRunner
          areaSlug={meta.slug}
          accent={accent}
          questions={rows}
          onClose={() => setPractice(false)}
        />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function QBankTool({
  meta,
  mode,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  mode: "import" | "generate";
  onClose: () => void;
  onSaved: () => void;
}) {
  const accent = meta.accent;
  const gen = useServerFn(generateQuestions);
  const parse = useServerFn(parseQuestions);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("residentado");
  const [examType, setExamType] = useState<string>("ENAM");
  const [difficulty, setDifficulty] = useState(3);
  const [count, setCount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [drafts, setDrafts] = useState<any[]>([]);

  const persist = async (items: any[], source: "personal" | "ia") => {
    const payload = items.map((q) => ({
      area_slug: meta.slug,
      stem: q.stem,
      options: q.options,
      answer_index: q.answerIndex ?? 0,
      explanation: q.explanation ?? null,
      bibliography: q.bibliography ?? null,
      level: q.level ?? level,
      exam_type: q.examType ?? examType,
      topic: q.topic ?? topic ?? null,
      subtopic: q.subtopic ?? null,
      tags: q.tags ?? [],
      difficulty: Number(q.difficulty) || difficulty,
      time_seconds: Number(q.timeSeconds) || 60,
      bank: source,
    }));
    for (let i = 0; i < payload.length; i += 100) {
      const { error } = await db.from("academy_questions").insert(payload.slice(i, i + 100));
      if (error) throw new Error(error.message);
    }
  };

  const runImport = async () => {
    if (text.trim().length < 20) return toast.error("Carga o pega el material primero.");
    setBusy(true);
    try {
      const res = await parse({ data: { text, level, topic } });
      setDrafts(res as any[]);
      toast.success(`${res.length} preguntas reconocidas`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo procesar");
    } finally {
      setBusy(false);
    }
  };

  const runGenerate = async () => {
    setBusy(true);
    const batch = 20;
    const all: any[] = [];
    try {
      for (let done = 0; done < count; done += batch) {
        const n = Math.min(batch, count - done);
        setProgress(`Generando ${done + n} / ${count}…`);
        const res = await gen({
          data: {
            count: n,
            topic: topic || meta.title,
            level,
            examType,
            difficulty,
            specialty: meta.title,
            avoid: all.slice(-40).map((q) => q.stem),
          },
        });
        all.push(...(res as any[]));
        await persist(res as any[], "ia");
      }
      setProgress("");
      toast.success(`${all.length} preguntas generadas y guardadas`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={mode === "import" ? "Importar preguntas" : "Generador IA de preguntas"}
      onClose={onClose}
      wide
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tema">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej. Asma" />
        </Field>
        <Field label="Nivel">
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select value={examType} onChange={(e) => setExamType(e.target.value)}>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {mode === "import" ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-2 text-[11px] font-bold cursor-pointer hover:border-primary/40 w-fit">
            <FileUp className="size-3.5" /> Subir Excel / CSV / Word / PDF
            <input
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,.txt,.md"
              className="hidden"
              onChange={async (e) => {
                const t = await readFilesAsText(e.target.files);
                setText(t);
                toast.success(`${t.length.toLocaleString()} caracteres leídos`);
              }}
            />
          </label>
          <Field label="O pega las preguntas">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-40"
              placeholder="Pega aquí preguntas con sus opciones y respuestas…"
            />
          </Field>
          <Btn variant="solid" accent={accent} loading={busy} onClick={runImport}>
            <Sparkles className="size-3" /> Reconocer con IA
          </Btn>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cantidad">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
                {[100, 500, 1000].map((n) => (
                  <Btn key={n} onClick={() => setCount(n)}>
                    {n}
                  </Btn>
                ))}
              </div>
            </Field>
            <Field label="Dificultad (1-5)">
              <Input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Se generan en lotes de 20 y se guardan sobre la marcha, con explicación, bibliografía,
            flashcard, perla y error frecuente. {progress}
          </p>
          <Btn variant="solid" accent={accent} loading={busy} onClick={runGenerate}>
            <Wand2 className="size-3" /> Generar {count} preguntas
          </Btn>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-5 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold">{drafts.length} preguntas listas</p>
            <div className="flex-1" />
            <Btn
              variant="solid"
              accent={accent}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await persist(drafts, "personal");
                  toast.success("Guardadas en el banco personal");
                  onSaved();
                } catch (e: any) {
                  toast.error(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Guardar en banco personal
            </Btn>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-1.5">
            {drafts.map((q, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {i + 1}. {q.stem}
              </p>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function PracticeRunner({
  questions,
  accent,
  areaSlug,
  onClose,
}: {
  questions: QRow[];
  accent: string;
  areaSlug: string;
  onClose: () => void;
}) {
  const pool = useMemo(() => questions.slice(0, 40), [questions]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const q = pool[i];

  if (!q) {
    return (
      <Modal title="Práctica" onClose={onClose}>
        <Empty text="No hay preguntas disponibles con los filtros actuales." />
      </Modal>
    );
  }

  const answer = async (oi: number) => {
    if (picked !== null) return;
    setPicked(oi);
    const ok = oi === q.answer_index;
    if (ok) setScore((s) => s + 1);
    try {
      await db.from("academy_attempts").insert({
        question_id: q.id,
        area_slug: areaSlug,
        chosen_index: oi,
        is_correct: ok,
        seconds: Math.round((Date.now() - start) / 1000),
        topic: q.topic,
      });
    } catch {
      /* noop */
    }
  };

  return (
    <Modal title={`Práctica · ${i + 1} de ${pool.length}`} onClose={onClose} wide>
      <p className="text-sm font-semibold leading-relaxed">{q.stem}</p>
      <div className="mt-3 space-y-1.5">
        {q.options.map((o, oi) => {
          const show = picked !== null;
          const right = oi === q.answer_index;
          return (
            <button
              key={oi}
              onClick={() => answer(oi)}
              className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                show && right
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : show && picked === oi
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-border/50 bg-background/50 hover:border-primary/40"
              }`}
            >
              {show && right && <CheckCircle2 className="size-3.5 text-emerald-500" />}
              {show && picked === oi && !right && <XCircle className="size-3.5 text-destructive" />}
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-3 space-y-2">
          {q.explanation && (
            <p className="rounded-lg bg-foreground/[0.04] p-3 text-xs leading-relaxed">
              {q.explanation}
            </p>
          )}
          {q.bibliography && (
            <p className="text-[11px] text-muted-foreground">📚 {q.bibliography}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold">
              {score}/{i + 1} correctas
            </span>
            <div className="flex-1" />
            {i + 1 < pool.length ? (
              <Btn
                variant="solid"
                accent={accent}
                onClick={() => {
                  setI(i + 1);
                  setPicked(null);
                }}
              >
                Siguiente
              </Btn>
            ) : (
              <Btn
                variant="solid"
                accent={accent}
                onClick={() => {
                  logStudy({
                    areaSlug,
                    activity: "qbank",
                    minutes: Math.max(1, Math.round((Date.now() - start) / 60000)),
                    score: (score / pool.length) * 100,
                  });
                  toast.success(`Sesión terminada: ${score}/${pool.length}`);
                  onClose();
                }}
              >
                Terminar sesión
              </Btn>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
