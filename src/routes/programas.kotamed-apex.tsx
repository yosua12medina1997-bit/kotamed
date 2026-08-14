/**
 * KotaMed Apex — hub de evaluaciones inteligentes.
 * Estudiante: simulacros, examen personalizado, historial, flashcards,
 * resúmenes y plan de estudio. Admin: acceso al Apex Studio.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarCheck,
  FileText,
  Gauge,
  Loader2,
  Play,
  Settings2,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  DURATION_OPTIONS,
  EXAM_MODE_LABEL,
  type ExamMode,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Difficulty,
} from "@/lib/apex-types";
import {
  useApexAdmin,
  useExamBlueprints,
  useMyAttempts,
  useMyFlashcards,
  useMyStudyPlan,
  useMySummaries,
  useReviewFlashcard,
  useStartExam,
  useTaxonomy,
  useTogglePlanItem,
} from "@/lib/apex";
import ExamRunner from "@/components/apex/ExamRunner";
import ResultsView from "@/components/apex/ResultsView";
import ApexStudio from "@/components/apex/ApexStudio";
import { Btn, Chip, Empty, Field, inputClass, Modal, Panel, Stat } from "@/components/apex/ui";

export const Route = createFileRoute("/programas/kotamed-apex")({
  component: ApexHub,
  head: () => ({
    meta: [
      { title: "KotaMed Apex | Motor de exámenes inteligentes" },
      {
        name: "description",
        content:
          "Simulacros ENAM, ESSALUD y Residentado con banco masivo de preguntas, análisis de dominio por tema y plan de estudio generado con IA.",
      },
      { property: "og:title", content: "KotaMed Apex | Motor de exámenes inteligentes" },
      {
        property: "og:description",
        content:
          "Practica con simulacros cronometrados, revisa explicaciones oficiales y recibe tu plan de recuperación personalizado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type View =
  | { kind: "hub" }
  | { kind: "exam"; attemptId: string }
  | { kind: "results"; attemptId: string }
  | { kind: "studio" };

function ApexHub() {
  const { userId, isAdmin, loading } = useApexAdmin();
  const [view, setView] = useState<View>({ kind: "hub" });
  const [customOpen, setCustomOpen] = useState(false);

  const blueprints = useExamBlueprints();
  const attempts = useMyAttempts(userId);
  const start = useStartExam();

  const published = (blueprints.data ?? []).filter((b) => b.is_published || isAdmin);
  const done = (attempts.data ?? []).filter((a) => a.status !== "in_progress");
  const avg = done.length
    ? Math.round(done.reduce((s, a) => s + Number(a.score ?? 0), 0) / done.length)
    : 0;

  const launch = async (input: { examId?: string | null; config?: Record<string, unknown> }) => {
    try {
      const res: any = await start.mutateAsync(input);
      if (!res?.attemptId) throw new Error("No se pudo iniciar el examen.");
      setCustomOpen(false);
      setView({ kind: "exam", attemptId: res.attemptId });
    } catch (e: any) {
      toast.error(e?.message ?? "No hay suficientes preguntas disponibles.");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <Panel title="KotaMed Apex" subtitle="Inicia sesión para acceder al motor de exámenes.">
          <Link to="/auth" className="inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            Acceder
          </Link>
        </Panel>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/programas" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Programas
        </Link>
        <div className="flex-1" />
        {isAdmin && (
          <Btn
            variant={view.kind === "studio" ? "primary" : "ghost"}
            onClick={() => setView(view.kind === "studio" ? { kind: "hub" } : { kind: "studio" })}
          >
            <Settings2 className="size-3.5" /> Apex Studio
          </Btn>
        )}
      </header>

      <h1 className="text-3xl font-black tracking-tight">KotaMed Apex</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Motor de exámenes inteligentes: simulacros cronometrados, análisis de dominio por materia y tema, y
        recuperación guiada con IA.
      </p>

      <div className="mt-6">
        {view.kind === "exam" ? (
          <ExamRunner
            attemptId={view.attemptId}
            onFinished={(id) => setView({ kind: "results", attemptId: id })}
            onExit={() => setView({ kind: "hub" })}
          />
        ) : view.kind === "results" ? (
          <ResultsView
            attemptId={view.attemptId}
            userId={userId}
            onStartAttempt={(id) => setView({ kind: "exam", attemptId: id })}
            onBack={() => setView({ kind: "hub" })}
          />
        ) : view.kind === "studio" ? (
          <ApexStudio />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Exámenes rendidos" value={done.length} icon={<Gauge className="size-4" />} tone="info" />
              <Stat label="Promedio global" value={`${avg}%`} icon={<BarChart3 className="size-4" />} tone="good" />
              <Stat
                label="Simulacros disponibles"
                value={published.length}
                icon={<Timer className="size-4" />}
                tone="default"
              />
              <Stat
                label="Último puntaje"
                value={done[0] ? `${Math.round(Number(done[0].score ?? 0))}%` : "—"}
                icon={<Sparkles className="size-4" />}
                tone="warn"
              />
            </div>

            <Panel
              title="Simulacros y exámenes"
              subtitle="Cronometrados, con bloques y calificación automática en servidor."
              right={
                <Btn variant="primary" onClick={() => setCustomOpen(true)}>
                  <Sparkles className="size-3.5" /> Examen personalizado
                </Btn>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {published.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-border p-4">
                    <p className="text-sm font-bold">{b.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {EXAM_MODE_LABEL[b.mode as ExamMode]} · {b.question_count} preguntas · {b.duration_minutes} min
                    </p>
                    {b.description && <p className="mt-2 text-xs text-muted-foreground">{b.description}</p>}
                    <Btn
                      variant="primary"
                      className="mt-3"
                      disabled={start.isPending}
                      onClick={() => launch({ examId: b.id })}
                    >
                      <Play className="size-3.5" /> Iniciar
                    </Btn>
                  </div>
                ))}
                {published.length === 0 && (
                  <Empty title="Sin simulacros publicados" hint="Crea tu examen personalizado mientras se publican los oficiales." />
                )}
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <HistoryPanel
                attempts={done}
                onOpen={(id) => setView({ kind: "results", attemptId: id })}
                onResume={(id) => setView({ kind: "exam", attemptId: id })}
                inProgress={(attempts.data ?? []).filter((a) => a.status === "in_progress")}
              />
              <StudyPlanPanel userId={userId} />
              <FlashcardsPanel userId={userId} />
              <SummariesPanel userId={userId} />
            </div>
          </div>
        )}
      </div>

      {customOpen && <CustomExamModal onClose={() => setCustomOpen(false)} onLaunch={launch} busy={start.isPending} />}
    </main>
  );
}

/* ------------------------------ Sub-paneles ------------------------------ */

function HistoryPanel({
  attempts,
  inProgress,
  onOpen,
  onResume,
}: {
  attempts: any[];
  inProgress: any[];
  onOpen: (id: string) => void;
  onResume: (id: string) => void;
}) {
  return (
    <Panel title="Historial de intentos" subtitle="Revisa explicaciones y mapas de dominio.">
      <div className="space-y-2">
        {inProgress.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="min-w-40 flex-1">
              <p className="text-xs font-bold">{a.title}</p>
              <p className="text-[11px] text-amber-700">En curso</p>
            </div>
            <Btn variant="primary" onClick={() => onResume(a.id)}>
              Continuar
            </Btn>
          </div>
        ))}
        {attempts.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
            <div className="min-w-40 flex-1">
              <p className="text-xs font-bold">{a.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(a.submitted_at ?? a.started_at).toLocaleDateString("es-PE")} · {a.correct_count}/
                {a.question_count} correctas
              </p>
            </div>
            <Chip className="border-primary/40 bg-primary/10 text-primary">{Math.round(Number(a.score ?? 0))}%</Chip>
            <Btn onClick={() => onOpen(a.id)}>Ver resultados</Btn>
          </div>
        ))}
        {attempts.length === 0 && inProgress.length === 0 && <Empty title="Aún no has rendido exámenes" />}
      </div>
    </Panel>
  );
}

function StudyPlanPanel({ userId }: { userId: string }) {
  const plan = useMyStudyPlan(userId);
  const toggle = useTogglePlanItem();
  return (
    <Panel title="Plan de estudio" subtitle="Generado desde tus brechas reales.">
      <div className="space-y-2">
        {(plan.data ?? []).map((p) => (
          <label key={p.id} className="flex items-start gap-2 rounded-xl border border-border p-3 text-xs">
            <input
              type="checkbox"
              checked={p.is_done}
              onChange={(e) => toggle.mutate({ id: p.id, done: e.target.checked })}
              className="mt-0.5"
            />
            <span className="flex-1">
              <span className="font-bold">
                Día {p.day_number} · {p.title}
              </span>
              {p.detail && <span className="block text-muted-foreground">{p.detail}</span>}
              <span className="mt-1 flex flex-wrap gap-1.5">
                <Chip>
                  <CalendarCheck className="size-3" /> {p.minutes} min
                </Chip>
                {p.taxonomy_label && <Chip>{p.taxonomy_label}</Chip>}
              </span>
            </span>
          </label>
        ))}
        {(plan.data ?? []).length === 0 && (
          <Empty title="Sin plan activo" hint="Genera tu plan desde los resultados de un examen." />
        )}
      </div>
    </Panel>
  );
}

function FlashcardsPanel({ userId }: { userId: string }) {
  const cards = useMyFlashcards(userId);
  const review = useReviewFlashcard();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Panel title="Flashcards" subtitle="Repetición espaciada sobre tus errores.">
      <div className="space-y-2">
        {(cards.data ?? []).slice(0, 12).map((c) => (
          <div key={c.id} className="rounded-xl border border-border p-3 text-xs">
            <button className="w-full text-left font-bold" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <Brain className="mr-1.5 inline size-3.5" /> {c.front}
            </button>
            {open === c.id && (
              <>
                <p className="mt-2 rounded-lg bg-muted/60 p-2 leading-relaxed">{c.back}</p>
                <div className="mt-2 flex gap-1.5">
                  {[
                    { q: 1, label: "Difícil" },
                    { q: 3, label: "Bien" },
                    { q: 5, label: "Fácil" },
                  ].map((b) => (
                    <Btn key={b.q} onClick={() => review.mutate({ card: c, quality: b.q })}>
                      {b.label}
                    </Btn>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        {(cards.data ?? []).length === 0 && <Empty title="Sin flashcards" hint="Genéralas al terminar un examen." />}
      </div>
    </Panel>
  );
}

function SummariesPanel({ userId }: { userId: string }) {
  const summaries = useMySummaries(userId);
  return (
    <Panel title="Resúmenes inteligentes" subtitle="Síntesis de los temas que fallaste.">
      <div className="space-y-2">
        {(summaries.data ?? []).map((s: any) => (
          <details key={s.id} className="rounded-xl border border-border p-3 text-xs">
            <summary className="cursor-pointer list-none font-bold">
              <FileText className="mr-1.5 inline size-3.5" /> {s.title}
            </summary>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">{s.content}</p>
          </details>
        ))}
        {(summaries.data ?? []).length === 0 && <Empty title="Sin resúmenes" />}
      </div>
    </Panel>
  );
}

function CustomExamModal({
  onClose,
  onLaunch,
  busy,
}: {
  onClose: () => void;
  onLaunch: (input: { examId?: string | null; config?: Record<string, unknown> }) => void;
  busy: boolean;
}) {
  const tax = useTaxonomy();
  const subjects = (tax.data ?? []).filter((n) => n.level === "subject");
  const [count, setCount] = useState(50);
  const [minutes, setMinutes] = useState(60);
  const [mode, setMode] = useState<ExamMode>("practice");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [subject, setSubject] = useState("");

  return (
    <Modal open title="Examen personalizado" subtitle="Elige materia, dificultad, número de preguntas y tiempo." onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Materia">
          <select className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Todas las materias</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dificultad">
          <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}>
            <option value="">Mixta</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modalidad">
          <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value as ExamMode)}>
            {(["practice", "simulacro", "review"] as ExamMode[]).map((m) => (
              <option key={m} value={m}>
                {EXAM_MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Número de preguntas">
          <input
            type="number"
            min={5}
            max={200}
            className={inputClass}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </Field>
        <Field label="Duración">
          <select className={inputClass} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="primary"
          disabled={busy}
          onClick={() =>
            onLaunch({
              examId: null,
              config: {
                title: subject ? `Práctica de ${subject}` : "Examen personalizado",
                mode,
                questionCount: Math.max(5, Math.min(200, count)),
                durationMinutes: minutes,
                blocks: 1,
                subjects: subject ? [subject] : [],
                difficulties: difficulty ? [difficulty] : [],
              },
            })
          }
        >
          <Play className="size-3.5" /> Iniciar examen
        </Btn>
      </div>
    </Modal>
  );
}
