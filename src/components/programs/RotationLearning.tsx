/**
 * Secciones académicas premium bajo "Contenido del programa" en
 * /programas/rotacion-pediatria-hnseb:
 *  1) Recursos por capítulo (centros de aprendizaje compactos)
 *  2) Estructura de cada capítulo (Clinical Learning Path)
 *  3) Progreso académico de la rotación
 * Reutiliza la misma lógica existente (metadata en content_nodes).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type RotationMeta = {
  chapterFeatures?: string[];
  chapterTemplate?: string[];
};

const TEAL = "oklch(0.62 0.11 195)";
const VIOLET = "oklch(0.55 0.19 300)";

/* ---------------------------------------------------------------- helpers */

type ResourceStyle = {
  icon: typeof BookOpen;
  color: string;
  emoji: string;
  detail: string;
};

const RESOURCE_MAP: { test: RegExp; style: ResourceStyle }[] = [
  {
    test: /te[oó]ric|contenido|apunte|resumen|lectura/,
    style: { icon: BookOpen, color: TEAL, emoji: "📚", detail: "12 temas disponibles" },
  },
  {
    test: /caso/,
    style: { icon: Stethoscope, color: VIOLET, emoji: "🩺", detail: "8 casos para resolver" },
  },
  {
    test: /flashcard|tarjeta/,
    style: { icon: Brain, color: "oklch(0.6 0.13 165)", emoji: "🧠", detail: "60 flashcards activas" },
  },
  {
    test: /pregunta|banco|examen|quiz/,
    style: { icon: FileQuestion, color: "oklch(0.62 0.15 35)", emoji: "📝", detail: "120 preguntas" },
  },
  {
    test: /simulad|simulaci|escenario/,
    style: { icon: Zap, color: "oklch(0.68 0.15 85)", emoji: "⚡", detail: "4 simuladores clínicos" },
  },
  {
    test: /tutor|\bia\b|inteligencia|copilot/,
    style: { icon: Bot, color: "oklch(0.58 0.16 265)", emoji: "🤖", detail: "Disponible 24/7" },
  },
];

function styleFor(label: string, i: number): ResourceStyle {
  const norm = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hit = RESOURCE_MAP.find((r) => r.test.test(norm));
  if (hit) return hit.style;
  const fallback = RESOURCE_MAP[i % RESOURCE_MAP.length]!.style;
  return { ...fallback, detail: "Recurso académico" };
}

const FLOW_META = [
  { kind: "Introducción", time: "5 min" },
  { kind: "Contenido", time: "25 min" },
  { kind: "Caso clínico", time: "15 min" },
  { kind: "Repaso", time: "10 min" },
  { kind: "Evaluación", time: "12 min" },
  { kind: "Simulación", time: "20 min" },
];

function flowDescription(title: string) {
  const t = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/introduc|objetiv/.test(t)) return "Contexto clínico, objetivos de aprendizaje y competencias esperadas.";
  if (/contenido|academic|teor/.test(t)) return "Desarrollo académico con evidencia, algoritmos y guías vigentes.";
  if (/caso/.test(t)) return "Resolución interactiva paso a paso con decisiones clínicas reales.";
  if (/clave|flashcard/.test(t)) return "Puntos clave de alto rendimiento y repaso espaciado.";
  if (/evaluaci|pregunta/.test(t)) return "Preguntas tipo examen con retroalimentación inmediata.";
  if (/simulaci|tutor|ia/.test(t)) return "Escenario simulado acompañado por el tutor inteligente KotaMed.";
  return "Bloque académico del capítulo dentro de la ruta de aprendizaje clínico.";
}

function useMeta(programNodeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (metadata: RotationMeta) => {
      if (!programNodeId) throw new Error("Programa no inicializado");
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: metadata as never })
        .eq("id", programNodeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-node"] }),
  });
}

function Shell({
  eyebrow,
  title,
  hint,
  icon,
  actions,
  children,
  delay,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  delay?: string;
}) {
  return (
    <section
      className="animate-slide-up relative overflow-hidden rounded-[28px] border border-border/60 bg-background/80 p-6 md:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_45px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl"
      style={{ animationDelay: delay }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-2xl"
            style={{ background: `${TEAL}14`, color: TEAL }}
          >
            {icon}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </span>
            <span className="text-lg font-extrabold tracking-tight">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hint && (
            <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
              {hint}
            </span>
          )}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}

function GhostButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-[11px] font-bold text-foreground/80 transition hover:bg-background hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------- 1. Recursos por capítulo */

export function RotationResources({
  features,
  programNodeId,
  metadata,
  isAdmin,
}: {
  features: string[];
  programNodeId: string | undefined;
  metadata: RotationMeta;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<string[]>(features);
  const [draft, setDraft] = useState("");
  const save = useMeta(programNodeId);

  useEffect(() => setList(features), [features.join("|")]);

  const commit = (next: string[]) => {
    setList(next);
    save.mutate({ ...metadata, chapterFeatures: next });
  };

  return (
    <Shell
      delay="120ms"
      icon={<Layers className="size-4" strokeWidth={2.3} />}
      eyebrow="Centro de aprendizaje"
      title="Recursos por capítulo"
      hint={`${list.length} recursos`}
      actions={
        isAdmin && programNodeId ? (
          <GhostButton onClick={() => setEditing((v) => !v)}>
            {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Cerrar" : "Gestionar recursos"}
          </GhostButton>
        ) : null
      }
    >
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
        Cada capítulo de la rotación funciona como un pequeño centro de aprendizaje con todos sus
        recursos clínicos listos para usar.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((label, i) => {
          const s = styleFor(label, i);
          const Icon = s.icon;
          return (
            <div
              key={`${label}-${i}`}
              className="group relative flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl text-[15px]"
                style={{ background: `${s.color}14`, color: s.color }}
              >
                <Icon className="size-4" strokeWidth={2.3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold tracking-tight">
                  <span className="mr-1.5">{s.emoji}</span>
                  {label}
                </p>
                <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">{s.detail}</p>
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => commit(list.filter((_, j) => j !== i))}
                  title="Quitar recurso"
                  className="grid size-6 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = draft.trim();
            if (v) {
              commit([...list, v]);
              setDraft("");
            }
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nuevo recurso (ej. Videoclase)…"
            className="flex-1 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Añadir
          </button>
        </form>
      )}

      {save.isPending && (
        <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Guardando…
        </p>
      )}
    </Shell>
  );
}

/* --------------------------------------- 2. Estructura / Learning Flow */

export function RotationLearningFlow({
  template,
  defaults,
  programNodeId,
  metadata,
  isAdmin,
}: {
  template: string[];
  defaults: string[];
  programNodeId: string | undefined;
  metadata: RotationMeta;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<string[]>(template);
  const [draft, setDraft] = useState("");
  const save = useMeta(programNodeId);

  useEffect(() => setList(template), [template.join("|")]);

  const commit = (next: string[]) => {
    setList(next);
    save.mutate({ ...metadata, chapterTemplate: next });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    commit(next);
  };

  return (
    <Shell
      delay="180ms"
      icon={<ClipboardList className="size-4" strokeWidth={2.3} />}
      eyebrow="Clinical learning path"
      title="Estructura de cada capítulo"
      hint={`${list.length} etapas`}
      actions={
        isAdmin && programNodeId ? (
          <>
            {editing && (
              <GhostButton onClick={() => commit(defaults)}>
                <RotateCcw className="size-3.5" /> Restaurar
              </GhostButton>
            )}
            <GhostButton onClick={() => setEditing((v) => !v)}>
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Cerrar" : "Configurar estructura"}
            </GhostButton>
          </>
        ) : null
      }
    >
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
        Toda la rotación sigue una misma ruta de aprendizaje clínico: desde los objetivos hasta la
        simulación acompañada por el tutor IA.
      </p>

      <ol className="relative mt-6 space-y-2.5">
        {list.map((title, i) => {
          const m = FLOW_META[i % FLOW_META.length]!;
          const color = i % 2 === 0 ? TEAL : VIOLET;
          const last = i === list.length - 1;
          return (
            <li key={`${title}-${i}`} className="relative pl-14">
              <span
                className="absolute left-0 top-2 grid size-10 place-items-center rounded-2xl text-[12px] font-black tabular-nums"
                style={{ background: `${color}14`, color }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[19px] top-13 h-[calc(100%-1rem)] w-px"
                  style={{ background: `linear-gradient(to bottom, ${color}55, transparent)` }}
                />
              )}

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {editing ? (
                    <FlowEditRow
                      value={title}
                      index={i}
                      total={list.length}
                      onChange={(v) => {
                        const next = [...list];
                        next[i] = v;
                        commit(next);
                      }}
                      onDelete={() => commit(list.filter((_, j) => j !== i))}
                      onMoveUp={() => move(i, -1)}
                      onMoveDown={() => move(i, 1)}
                    />
                  ) : (
                    <>
                      <p className="text-[13.5px] font-bold tracking-tight">{title}</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                          style={{ background: `${color}12`, color }}
                        >
                          {m.kind}
                        </span>
                        <span className="text-[10.5px] font-semibold text-muted-foreground tabular-nums">
                          {m.time}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {!editing && (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    {flowDescription(title)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = draft.trim();
            if (v) {
              commit([...list, v]);
              setDraft("");
            }
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nueva etapa (ej. Casos avanzados)…"
            className="flex-1 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-3.5" /> Agregar etapa
          </button>
        </form>
      )}

      {save.isPending && (
        <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Guardando…
        </p>
      )}
    </Shell>
  );
}

function FlowEditRow({
  value,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  value: string;
  index: number;
  total: number;
  onChange: (v: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const dirty = local !== value;
  return (
    <div className="flex w-full items-center gap-2">
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background/80 px-3 py-1.5 text-[12.5px] font-semibold outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5 disabled:opacity-30"
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5 disabled:opacity-30"
        >
          <ArrowDown className="size-3" />
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => onChange(local.trim())}
            className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            <Save className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="grid size-7 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ 3. Progreso */

export function RotationProgress({
  modulesTotal,
  modulesDone,
  chaptersTotal,
  stages,
}: {
  modulesTotal: number;
  modulesDone: number;
  chaptersTotal: number;
  stages: string[];
}) {
  const metrics = useMemo(
    () => [
      { label: "Módulos completados", value: `${modulesDone}/${modulesTotal}`, color: TEAL },
      { label: "Capítulos estudiados", value: `0/${chaptersTotal}`, color: VIOLET },
      { label: "Casos clínicos resueltos", value: "0", color: "oklch(0.6 0.13 165)" },
      { label: "Preguntas respondidas", value: "0", color: "oklch(0.62 0.15 35)" },
      { label: "Flashcards revisadas", value: "0", color: "oklch(0.58 0.16 265)" },
    ],
    [modulesDone, modulesTotal, chaptersTotal],
  );

  const overall = modulesTotal > 0 ? Math.round((modulesDone / modulesTotal) * 100) : 0;
  const next = stages[Math.min(modulesDone, Math.max(stages.length - 1, 0))] ?? "Contenido académico";

  return (
    <Shell
      delay="150ms"
      icon={<Sparkles className="size-4" strokeWidth={2.3} />}
      eyebrow="Tu avance en esta rotación"
      title="Progreso académico"
      hint={`${overall}%`}
    >
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(overall, 3)}%`, background: `linear-gradient(90deg, ${TEAL}, ${VIOLET})` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border/60 bg-background/70 p-3.5">
            <p className="text-xl font-extrabold tabular-nums tracking-tight" style={{ color: m.color }}>
              {m.value}
            </p>
            <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-muted-foreground">
              {m.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11.5px] font-semibold">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-muted-foreground">
          <CheckCircle2 className="size-3.5" style={{ color: TEAL }} /> Dónde estoy: etapa {overall}%
        </span>
        <span className="text-muted-foreground/50">→</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: `${VIOLET}12`, color: VIOLET }}
        >
          Qué sigue: {next}
        </span>
      </div>
    </Shell>
  );
}
