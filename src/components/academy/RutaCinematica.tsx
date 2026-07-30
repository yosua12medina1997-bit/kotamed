/**
 * Ruta Académica cinematográfica: recorrido vertical con línea de energía viva,
 * nodos de progresión (completado / actual / bloqueado), partículas sutiles y
 * tarjetas de nivel. Solo capa visual — no altera datos ni arquitectura.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpenCheck,
  Brain,
  Check,
  Crown,
  Dna,
  Flame,
  HeartPulse,
  Hospital,
  Lock,
  Rocket,
  Siren,
  Sparkles,
  Stethoscope,
  Target,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { db, fmtMinutes } from "./api";

/* ---------- identidad visual por etapa ---------- */

const ICON_RULES: { re: RegExp; icon: LucideIcon; rank: string }[] = [
  { re: /(introduc|bienven|inicio)/i, icon: Rocket, rank: "Médico en Formación" },
  { re: /(fundament|básic|basic)/i, icon: Dna, rank: "Clínico Junior" },
  { re: /(ambulator|consult)/i, icon: Stethoscope, rank: "Pediatra en Desarrollo" },
  { re: /(hospital|intermedi)/i, icon: Hospital, rank: "Pediatra Hospitalario" },
  { re: /(emergenc|urgenc)/i, icon: Siren, rank: "Especialista en Emergencias" },
  { re: /(intensiv|crític|uci)/i, icon: HeartPulse, rank: "Intensivista" },
  { re: /(subespecial|avanzad)/i, icon: Brain, rank: "Subespecialista" },
  { re: /(evidenc|banco|pregunt|investig)/i, icon: BookOpenCheck, rank: "Investigador Clínico" },
  { re: /(caso)/i, icon: Activity, rank: "Clínico Avanzado" },
  { re: /(simulad)/i, icon: Target, rank: "Estratega Clínico" },
  { re: /(dominio|expert|maestr)/i, icon: Crown, rank: "Kotaro Expert" },
];

function identity(stage: string, idx: number, total: number) {
  const hit = ICON_RULES.find((r) => r.re.test(stage));
  if (hit) return hit;
  if (idx === total - 1) return { icon: Crown, rank: "Kotaro Expert" };
  return { icon: Sparkles, rank: "Nivel Profesional" };
}

const BLURB = [
  "Orientación, objetivos y mapa general del recorrido.",
  "Bases fisiológicas y semiológicas imprescindibles.",
  "Manejo estructurado de los cuadros más frecuentes.",
  "Razonamiento clínico aplicado a escenarios reales.",
  "Decisiones complejas, comorbilidad y alta exigencia.",
  "Integración diagnóstica con casos interactivos.",
  "Consolidación mediante preguntas comentadas.",
  "Simulacros cronometrados en condiciones de examen.",
  "Dominio completo del área y evaluación final.",
];

/* ---------- observador de aparición ---------- */

function useReveal<T extends HTMLElement>(onSeen?: () => void) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    // Failsafe: si el observador no dispara (contenedores con transform/scroll),
    // el contenido se muestra igualmente.
    const fallback = window.setTimeout(() => setSeen(true), 900);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            onSeen?.();
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, seen };
}


/* ---------- métricas ---------- */

type Ev = { minutes: number; created_at: string; score: number | null };
type Attempt = { is_correct: boolean };

const MIN_PER_STAGE = 120;

export function RutaCinematica({
  meta,
  stages,
}: {
  meta: EnamAreaMeta;
  stages: string[];
}) {
  const accent = meta.accent;

  const events = useQuery({
    queryKey: ["ruta-events", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_study_events")
        .select("minutes,created_at,score")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Ev[];
    },
  });

  const attempts = useQuery({
    queryKey: ["ruta-attempts", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_attempts")
        .select("is_correct")
        .eq("area_slug", meta.slug)
        .limit(3000);
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const stats = useMemo(() => {
    const evs = events.data ?? [];
    const totalMinutes = evs.reduce((s, e) => s + (e.minutes ?? 0), 0);
    const byDay = new Set(evs.map((e) => e.created_at.slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const k = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (byDay.has(k)) streak++;
      else if (i > 0) break;
    }
    const completed = Math.min(stages.length, Math.floor(totalMinutes / MIN_PER_STAGE));
    const xp = totalMinutes * 5 + (attempts.data?.filter((a) => a.is_correct).length ?? 0) * 10;
    const partial = Math.min(
      100,
      Math.round(((totalMinutes % MIN_PER_STAGE) / MIN_PER_STAGE) * 100),
    );
    return {
      totalMinutes,
      streak,
      completed,
      xp,
      partial,
      sessions: evs.length,
      overall: stages.length
        ? Math.min(100, Math.round(((completed + partial / 100) / stages.length) * 100))
        : 0,
    };
  }, [events.data, attempts.data, stages.length]);

  const currentIdx = Math.min(stages.length - 1, stats.completed);
  const currentRank = identity(stages[currentIdx] ?? "", currentIdx, stages.length).rank;
  const nextGoal = stages[Math.min(stages.length - 1, currentIdx + (stats.partial ? 0 : 0))];

  /* progreso de la línea según scroll */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [linePct, setLinePct] = useState(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.62 - r.top) / Math.max(1, r.height);
      setLinePct(Math.max(0, Math.min(1, p)) * 100);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stages.length]);

  return (
    <section className="relative overflow-hidden rounded-3xl">
      {/* ambiente vivo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-24 left-1/4 size-[26rem] rounded-full blur-3xl opacity-[0.18] animate-aurora"
          style={{ background: accent }}
        />
        <div
          className="absolute bottom-0 right-0 size-[22rem] rounded-full blur-3xl opacity-[0.12] animate-aurora"
          style={{ background: accent, animationDelay: "-7s" }}
        />
      </div>

      {/* barra superior de progreso */}
      <header className="glass rounded-3xl p-6 md:p-7 animate-slide-up">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2" style={{ color: accent }}>
              <Trophy className="size-4" strokeWidth={2.25} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ruta académica
              </span>
            </div>
            <h2 className="mt-2 truncate text-2xl md:text-3xl font-extrabold tracking-tight">
              El viaje del especialista
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cada nivel es una estación del recorrido. Avanza, desbloquea y consolida tu
              dominio clínico.
            </p>
          </div>
          <div
            className="shrink-0 rounded-2xl border px-4 py-3 text-center"
            style={{ borderColor: `${accent}33`, background: `${accent}0f` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Rango actual
            </div>
            <div className="mt-0.5 text-sm font-extrabold" style={{ color: accent }}>
              {currentRank}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-muted-foreground">Progreso total</span>
            <span style={{ color: accent }}>{stats.overall}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/[0.07]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${stats.overall}%`,
                background: `linear-gradient(90deg, ${accent}66, ${accent})`,
                boxShadow: `0 0 16px ${accent}66`,
              }}
            />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={Timer} label="Horas" value={fmtMinutes(stats.totalMinutes)} accent={accent} />
          <Stat icon={Check} label="Niveles" value={`${stats.completed}/${stages.length}`} accent={accent} />
          <Stat icon={Activity} label="Sesiones" value={stats.sessions} accent={accent} />
          <Stat icon={Flame} label="Racha" value={`${stats.streak} d`} accent={accent} />
          <Stat icon={Sparkles} label="XP" value={stats.xp.toLocaleString("es")} accent={accent} />
          <Stat icon={Target} label="Próximo" value={nextGoal ?? "—"} accent={accent} />
        </dl>
      </header>

      {/* recorrido */}
      <div ref={trackRef} className="relative mt-8 pb-10 pl-10 md:pl-0">
        {/* línea de energía */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 top-0 w-[3px] left-[13px] md:left-1/2 md:-translate-x-1/2"
        >
          <div className="absolute inset-0 rounded-full bg-foreground/[0.07]" />
          <div
            className="absolute left-0 top-0 w-full rounded-full transition-[height] duration-300 ease-out"
            style={{
              height: `${linePct}%`,
              background: `linear-gradient(180deg, ${accent}22, ${accent})`,
              boxShadow: `0 0 14px ${accent}88, 0 0 34px ${accent}44`,
            }}
          />
          <div
            className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full opacity-70 kotaro-spark"
            style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
          />
          <div
            className="absolute left-1/2 w-1 -translate-x-1/2 rounded-full opacity-50 kotaro-spark"
            style={{ background: accent, animationDelay: "-3.5s", boxShadow: `0 0 10px ${accent}` }}
          />
        </div>

        <ol className="space-y-8 md:space-y-12">
          {stages.map((stage, idx) => {
            const state: "done" | "current" | "locked" =
              idx < stats.completed ? "done" : idx === stats.completed ? "current" : "locked";
            return (
              <StageNode
                key={`${idx}-${stage}`}
                idx={idx}
                total={stages.length}
                stage={stage}
                accent={accent}
                state={state}
                percent={state === "done" ? 100 : state === "current" ? stats.partial : 0}
              />
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/50 bg-background/40 p-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3 shrink-0" style={{ color: accent }} />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1 truncate text-sm font-extrabold">{value}</dd>
    </div>
  );
}

function StageNode({
  idx,
  total,
  stage,
  accent,
  state,
  percent,
}: {
  idx: number;
  total: number;
  stage: string;
  accent: string;
  state: "done" | "current" | "locked";
  percent: number;
}) {
  const { ref, seen } = useReveal<HTMLLIElement>();
  const { icon: Icon, rank } = identity(stage, idx, total);
  const left = idx % 2 === 0;
  const locked = state === "locked";

  const classes = Math.max(4, 6 + ((idx * 3) % 9));
  const hours = 2 + ((idx * 2) % 5);

  return (
    <li
      ref={ref}
      className="relative md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6"
      style={{
        opacity: seen ? 1 : 0,
        filter: seen ? "blur(0)" : "blur(6px)",
        transform: seen
          ? "translateY(0) scale(1)"
          : `translateY(28px) scale(0.975) translateX(${left ? -14 : 14}px)`,
        transition: "opacity .7s var(--ease-out-expo), transform .7s var(--ease-out-expo), filter .7s var(--ease-out-expo)",
        transitionDelay: `${Math.min(idx, 6) * 60}ms`,
        willChange: "transform, opacity",
      }}
    >
      {/* nodo */}
      <span
        aria-hidden
        className={`absolute -left-10 top-3 md:static md:col-start-2 md:row-start-1 inline-flex size-[34px] items-center justify-center rounded-2xl border backdrop-blur ${
          state === "current" ? "kotaro-breathe" : ""
        }`}
        style={{
          borderColor: locked ? "var(--border)" : `${accent}66`,
          background: locked ? "color-mix(in oklab, var(--muted) 70%, transparent)" : `${accent}1f`,
          boxShadow: locked ? "none" : `0 0 0 6px ${accent}12, 0 8px 28px ${accent}3d`,
          color: locked ? "var(--muted-foreground)" : accent,
          opacity: locked ? 0.55 : 1,
        }}
      >
        {state === "done" ? (
          <Check className="size-4" strokeWidth={3} />
        ) : locked ? (
          <Lock className="size-3.5" strokeWidth={2.5} />
        ) : (
          <Icon className="size-4" strokeWidth={2.4} />
        )}
      </span>

      {/* tarjeta */}
      <article
        className={`group glass rounded-3xl p-5 transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] focus-within:-translate-y-0.5 active:scale-[0.995] ${
          left ? "md:col-start-1 md:row-start-1" : "md:col-start-3 md:row-start-1"
        }`}
        style={{
          boxShadow: locked ? "none" : `0 18px 50px -34px ${accent}`,
          opacity: locked ? 0.92 : 1,
          filter: locked ? "saturate(0.75)" : undefined,
        }}

      >
        <div className="flex items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl"
            style={{
              background: locked ? "var(--muted)" : `${accent}14`,
              color: locked ? "var(--muted-foreground)" : accent,
            }}
          >
            <Icon className="size-5" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Nivel {idx + 1}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{rank}</span>
            </div>
            <h3 className="mt-0.5 truncate text-base font-extrabold tracking-tight">{stage}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {BLURB[idx % BLURB.length]}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              borderColor: locked ? "var(--border)" : `${accent}44`,
              color: locked ? "var(--muted-foreground)" : accent,
            }}
          >
            {state === "done" ? "Completado" : state === "current" ? "En curso" : "Bloqueado"}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
            <span>
              {classes} clases · ~{hours} h
            </span>
            <span>{percent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background: `linear-gradient(90deg, ${accent}55, ${accent})`,
                boxShadow: percent ? `0 0 12px ${accent}66` : undefined,
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={locked}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: locked ? "var(--muted-foreground)" : accent }}
          >
            {locked ? (
              <>
                <Lock className="size-3" /> Bloqueado
              </>
            ) : state === "done" ? (
              <>
                <Check className="size-3" /> Repasar
              </>
            ) : (
              <>
                <Rocket className="size-3" /> Continuar
              </>
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[11px] font-bold transition hover:border-primary/40 active:scale-[0.97]"
          >
            Explorar
          </button>

        </div>
      </article>
    </li>
  );
}
