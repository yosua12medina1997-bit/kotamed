/**
 * Resultados de un intento: puntaje, mapa de dominio por materia/tema,
 * revisión pregunta por pregunta y acciones de IA (flashcards, resumen,
 * plan de estudio y examen de recuperación).
 */
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Brain, CheckCircle2, FileText, Loader2, RotateCcw, XCircle } from "lucide-react";
import type { AttemptAnalysis, ReviewItem } from "@/lib/apex-types";
import { useAttemptReview, useLearningActions, useMyAttempts } from "@/lib/apex";
import { Btn, Chip, Empty, MasteryBar, Panel, Stat } from "./ui";
import { cn } from "@/lib/utils";

export default function ResultsView({
  attemptId,
  userId,
  onStartAttempt,
  onBack,
}: {
  attemptId: string;
  userId: string | undefined;
  onStartAttempt: (id: string) => void;
  onBack: () => void;
}) {
  const attempts = useMyAttempts(userId);
  const attempt = (attempts.data ?? []).find((a) => a.id === attemptId);
  const review = useAttemptReview(attemptId);
  const actions = useLearningActions();
  const [tab, setTab] = useState<"mapa" | "revision">("mapa");

  const analysis = (attempt?.analysis ?? {}) as Partial<AttemptAnalysis>;
  const items: ReviewItem[] = ((review.data as any)?.items ?? []) as ReviewItem[];
  const resources: any[] = ((review.data as any)?.resources ?? []) as any[];

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(`${label} listo.`);
    } catch (e: any) {
      toast.error(e?.message ?? "La IA no pudo completar la acción.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={onBack}>← Volver</Btn>
        <div className="flex-1" />
        <Btn disabled={actions.flashcards.isPending} onClick={() => run("Flashcards", () => actions.flashcards.mutateAsync(attemptId))}>
          <Brain className="size-3.5" /> Generar flashcards
        </Btn>
        <Btn disabled={actions.summary.isPending} onClick={() => run("Resumen", () => actions.summary.mutateAsync(attemptId))}>
          <FileText className="size-3.5" /> Resumen inteligente
        </Btn>
        <Btn disabled={actions.plan.isPending} onClick={() => run("Plan de estudio", () => actions.plan.mutateAsync(attemptId))}>
          <BookOpen className="size-3.5" /> Plan de estudio
        </Btn>
        <Btn
          variant="primary"
          disabled={actions.recovery.isPending}
          onClick={async () => {
            try {
              const res: any = await actions.recovery.mutateAsync(attemptId);
              if (res?.attemptId) onStartAttempt(res.attemptId);
            } catch (e: any) {
              toast.error(e?.message ?? "No se pudo crear el examen de recuperación.");
            }
          }}
        >
          <RotateCcw className="size-3.5" /> Examen de recuperación
        </Btn>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Puntaje" value={`${Math.round(Number(attempt?.score ?? analysis.scorePercent ?? 0))}%`} tone="info" />
        <Stat label="Correctas" value={attempt?.correct_count ?? analysis.correct ?? 0} tone="good" />
        <Stat label="Incorrectas" value={attempt?.wrong_count ?? analysis.wrong ?? 0} tone="bad" />
        <Stat label="Sin responder" value={attempt?.unanswered_count ?? analysis.unanswered ?? 0} tone="warn" />
      </div>

      <div className="flex gap-2">
        {(["mapa", "revision"] as const).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "mapa" ? "Mapa de conocimiento" : "Revisión detallada"}
          </Chip>
        ))}
      </div>

      {tab === "mapa" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Dominio por materia">
            <div className="space-y-3">
              {(analysis.bySubject ?? []).map((r) => (
                <MasteryBar key={r.label} label={r.label} percent={r.percent} total={r.total} />
              ))}
              {(analysis.bySubject ?? []).length === 0 && <Empty title="Sin datos por materia" />}
            </div>
          </Panel>
          <Panel title="Dominio por tema">
            <div className="space-y-3">
              {(analysis.byTopic ?? []).map((r) => (
                <MasteryBar key={r.label} label={r.label} percent={r.percent} total={r.total} />
              ))}
              {(analysis.byTopic ?? []).length === 0 && <Empty title="Sin datos por tema" />}
            </div>
          </Panel>
          <Panel title="Áreas críticas a recuperar" subtitle="Prioriza estos temas en tu próximo bloque de estudio.">
            <div className="flex flex-wrap gap-2">
              {(analysis.weaknesses ?? []).map((w) => (
                <Chip key={w.label} className="border-rose-200 bg-rose-50 text-rose-600">
                  {w.label} · {w.percent}%
                </Chip>
              ))}
              {(analysis.weaknesses ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin brechas relevantes. Excelente desempeño.</p>}
            </div>
          </Panel>
          <Panel title="Recursos oficiales sugeridos">
            <div className="space-y-2">
              {resources.map((r) => (
                <a
                  key={r.id}
                  href={r.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-border p-3 text-xs hover:border-primary/50"
                >
                  <p className="font-bold">{r.title}</p>
                  {r.description && <p className="text-muted-foreground">{r.description}</p>}
                </a>
              ))}
              {resources.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay recursos vinculados a estos temas.</p>}
            </div>
          </Panel>
        </div>
      ) : (
        <Panel title="Revisión pregunta por pregunta" subtitle="Con explicación oficial y referencia bibliográfica.">
          {review.isLoading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <details key={it.itemId} className="rounded-2xl border border-border p-3">
                  <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-semibold">
                    {it.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                    )}
                    <span className="flex-1">
                      {it.position}. {it.stem}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {it.options.map((o) => (
                      <div
                        key={o.key}
                        className={cn(
                          "rounded-lg px-3 py-2",
                          it.correct.includes(o.key)
                            ? "bg-emerald-50 font-semibold text-emerald-700"
                            : it.chosen.includes(o.key)
                              ? "bg-rose-50 text-rose-700"
                              : "bg-muted/50",
                        )}
                      >
                        <span className="mr-2 font-bold uppercase">{o.key}</span>
                        {o.text}
                      </div>
                    ))}
                    {it.explanation && <p className="rounded-lg bg-muted/60 p-3 leading-relaxed">{it.explanation}</p>}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[it.subject, it.topic, it.chapter].filter(Boolean).map((l) => (
                        <Chip key={String(l)}>{l}</Chip>
                      ))}
                      <Chip>{it.seconds}s</Chip>
                    </div>
                    {it.reference && <p className="text-[11px] text-muted-foreground">📚 {it.reference}</p>}
                  </div>
                </details>
              ))}
              {items.length === 0 && <Empty title="Sin revisión disponible" hint="Envía el examen para desbloquear las explicaciones." />}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
