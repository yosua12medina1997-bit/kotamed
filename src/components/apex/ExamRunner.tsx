/**
 * Exam Runner: cronómetro, navegación por bloques, autoguardado por pregunta,
 * marcado para revisión y envío con calificación en servidor.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, Flag, Loader2, Send } from "lucide-react";
import { fmtClock, type AttemptState, type ExamQuestion } from "@/lib/apex-types";
import { useAttempt, useSaveAnswer, useSubmitAttempt } from "@/lib/apex";
import { Btn, Panel } from "./ui";
import { cn } from "@/lib/utils";

export default function ExamRunner({
  attemptId,
  onFinished,
  onExit,
}: {
  attemptId: string;
  onFinished: (attemptId: string) => void;
  onExit: () => void;
}) {
  const attemptQuery = useAttempt(attemptId);
  const attempt = attemptQuery.data as AttemptState | undefined;
  const saveAnswer = useSaveAnswer();
  const submit = useSubmitAttempt();

  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const startedRef = useRef(Date.now());

  useEffect(() => {
    if (!attempt) return;
    const a: Record<string, string[]> = {};
    const f: Record<string, boolean> = {};
    for (const q of attempt.questions) {
      a[q.itemId] = q.chosen ?? [];
      f[q.itemId] = !!q.flagged;
    }
    setAnswers(a);
    setFlags(f);
    setRemaining(attempt.secondsRemaining);
  }, [attempt]);

  useEffect(() => {
    if (remaining === null) return;
    const id = setInterval(() => setRemaining((r) => (r === null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(id);
  }, [remaining === null]);

  const questions = attempt?.questions ?? [];
  const current: ExamQuestion | undefined = questions[index];
  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v && v.length > 0).length,
    [answers],
  );

  const doSubmit = async () => {
    try {
      await submit.mutateAsync(attemptId);
      toast.success("Examen enviado y calificado.");
      onFinished(attemptId);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo enviar el examen.");
    }
  };

  useEffect(() => {
    if (remaining === 0 && attempt?.status === "in_progress" && !submit.isPending) void doSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const persist = (itemId: string, chosen: string[], flagged: boolean) => {
    saveAnswer.mutate({
      attemptId,
      itemId,
      chosen,
      seconds: Math.round((Date.now() - startedRef.current) / 1000),
      flagged,
    });
  };

  const choose = (q: ExamQuestion, key: string) => {
    const multi = q.type === "multiple";
    const prev = answers[q.itemId] ?? [];
    const next = multi ? (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]) : [key];
    setAnswers((a) => ({ ...a, [q.itemId]: next }));
    persist(q.itemId, next, !!flags[q.itemId]);
  };

  if (attemptQuery.isLoading || !attempt) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <Panel
          title={attempt.title}
          subtitle={`Pregunta ${index + 1} de ${questions.length} · Bloque ${current?.block ?? 1} de ${attempt.blocks}`}
          right={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-sm font-extrabold tabular-nums">
                <Clock className="size-3.5" /> {fmtClock(remaining ?? 0)}
              </span>
            </div>
          }
        >
          {current ? (
            <>
              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{current.stem}</p>
              {current.imageUrl && (
                <img src={current.imageUrl} alt="Imagen clínica de la pregunta" className="mt-3 max-h-72 rounded-xl border border-border" loading="lazy" />
              )}
              <div className="mt-4 space-y-2">
                {current.options.map((o) => {
                  const picked = (answers[current.itemId] ?? []).includes(o.key);
                  return (
                    <button
                      key={o.key}
                      onClick={() => choose(current, o.key)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition",
                        picked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-lg border text-[11px] font-bold uppercase",
                          picked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {o.key}
                      </span>
                      <span>{o.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Btn
                  onClick={() => {
                    const next = !flags[current.itemId];
                    setFlags((f) => ({ ...f, [current.itemId]: next }));
                    persist(current.itemId, answers[current.itemId] ?? [], next);
                  }}
                  variant={flags[current.itemId] ? "soft" : "ghost"}
                >
                  <Flag className="size-3.5" /> {flags[current.itemId] ? "Marcada" : "Marcar para revisar"}
                </Btn>
                <div className="flex-1" />
                <Btn disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                  Anterior
                </Btn>
                {index + 1 < questions.length ? (
                  <Btn variant="primary" onClick={() => setIndex((i) => i + 1)}>
                    Siguiente
                  </Btn>
                ) : (
                  <Btn variant="primary" disabled={submit.isPending} onClick={doSubmit}>
                    <Send className="size-3.5" /> Enviar examen
                  </Btn>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Este intento no tiene preguntas disponibles.</p>
          )}
        </Panel>
      </div>

      <aside className="space-y-4">
        <Panel title="Mapa del examen" subtitle={`${answeredCount} de ${questions.length} respondidas`}>
          <div className="grid grid-cols-6 gap-1.5">
            {questions.map((q, i) => {
              const done = (answers[q.itemId] ?? []).length > 0;
              return (
                <button
                  key={q.itemId}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border text-[11px] font-bold tabular-nums",
                    i === index && "ring-2 ring-primary/40",
                    flags[q.itemId]
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : done
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            <Btn variant="primary" className="w-full" disabled={submit.isPending} onClick={doSubmit}>
              <Send className="size-3.5" /> Enviar y calificar
            </Btn>
            <Btn className="w-full" onClick={onExit}>
              Guardar y salir
            </Btn>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
