/**
 * KOTAMED PROGRAM ENVIRONMENTS™ — Hero inmersivo de cada programa.
 * Composición editorial: identidad del programa + progreso + núcleo visual
 * flotante con parallax, iluminación contextual y órbitas discretas.
 * Solo presentación; el SuperAdmin puede ajustar el ambiente (metadata.environment).
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Activity,
  Baby,
  Brain,
  HeartPulse,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  coreImage,
  CORE_LABELS,
  resolveProgramEnvironment,
  type CoreKey,
  type EnvironmentOverride,
  type ProgramEnvironment,
} from "@/lib/program-environments";

const ORBITS: { icon: LucideIcon; left: number; top: number }[] = [
  { icon: HeartPulse, left: 8, top: 16 },
  { icon: Baby, left: 88, top: 22 },
  { icon: Wind, left: 2, top: 52 },
  { icon: Shield, left: 94, top: 55 },
  { icon: Brain, left: 86, top: 84 },
];

export function ProgramEnvironmentHero({
  slug,
  title,
  subtitle,
  tagline,
  description,
  audience,
  progressPct,
  stats,
  continueTo,
  programNodeId,
  metadata,
  isAdmin = false,
  eyebrow = "Programa académico",
}: {
  slug: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  audience?: string;
  progressPct: number;
  stats: { value: string; label: string }[];
  continueTo?: { to: string; params?: Record<string, string>; label: string };
  programNodeId?: string;
  metadata?: Record<string, unknown>;
  isAdmin?: boolean;
  eyebrow?: string;
}) {
  const override = (metadata?.environment ?? null) as EnvironmentOverride;
  const env = resolveProgramEnvironment(slug, title, override);
  const [editing, setEditing] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  // Parallax con inercia sobre el núcleo visual
  useEffect(() => {
    const host = hostRef.current;
    const core = coreRef.current;
    if (!host || !core || env.motion <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target = {
        x: Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))),
      };
    };
    const onLeave = () => {
      target = { x: 0, y: 0 };
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.035;
      cur.y += (target.y - cur.y) * 0.035;
      const m = env.motion;
      core.style.transform = `perspective(1400px) rotateY(${cur.x * 7 * m}deg) rotateX(${-cur.y * 4 * m}deg) translate3d(${cur.x * 12 * m}px, ${cur.y * 8 * m}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [env.motion]);

  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));
  const ring = `conic-gradient(rgb(${env.accent}) ${pct * 3.6}deg, color-mix(in oklab, currentColor 10%, transparent) 0deg)`;
  const [t1, ...restTitle] = title.split(/\s+(?=\S+$)/);

  return (
    <section
      ref={hostRef}
      className="relative overflow-hidden rounded-[2rem] border border-white/40 animate-slide-up"
      style={{
        background: `linear-gradient(120deg, rgba(255,255,255,0.86), rgba(255,255,255,0.5) 45%, rgba(${env.accent2},0.14))`,
        boxShadow: `0 40px 90px -60px rgba(${env.accent2},0.6)`,
      }}
    >
      {/* Atmósfera ambiental */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(70% 90% at 78% 40%, rgba(${env.accent},${0.2 * env.light}), transparent 70%), radial-gradient(60% 70% at 10% 10%, rgba(${env.accent2},${0.13 * env.light}), transparent 70%)`,
          transition: "background 900ms ease",
        }}
      />
      {env.grid && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(70% 70% at 60% 40%, black, transparent)",
          }}
        />
      )}

      <div className="relative grid grid-cols-12 gap-6 p-7 md:p-10">
        {/* Columna editorial */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-6 flex flex-col">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ borderColor: `rgba(${env.accent},0.4)`, color: `rgb(${env.accent})`, background: `rgba(${env.accent},0.08)` }}
          >
            <Sparkles className="size-3" /> {eyebrow}
          </span>

          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold leading-[1.03] tracking-tight text-balance">
            {t1}{" "}
            {restTitle.length > 0 && (
              <span style={{ color: `rgb(${env.accent})` }}>{restTitle.join(" ")}</span>
            )}
          </h1>

          {tagline && (
            <p className="mt-4 max-w-md text-base text-foreground/80 font-medium text-pretty">
              {tagline}
            </p>
          )}
          {description && (
            <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed text-pretty">
              {description}
            </p>
          )}
          {audience && (
            <div className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="size-3.5" />
              <span className="font-semibold">Dirigido a:</span>
              <span>{audience}</span>
            </div>
          )}

          {/* Progreso integrado en el ambiente */}
          <div
            className="mt-7 rounded-3xl border border-white/60 bg-white/70 p-5 backdrop-blur-xl"
            style={{ boxShadow: `0 30px 60px -50px rgba(${env.accent2},0.8)` }}
          >
            <div className="flex items-center gap-5">
              <div className="relative size-[86px] shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: ring }} />
                <div className="absolute inset-[9px] rounded-full bg-white/95 flex items-center justify-center">
                  <span className="text-lg font-extrabold tracking-tight">{pct}%</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Tu progreso general
                </span>
                <p className="text-sm font-bold">Avance del programa</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgb(${env.accent2}), rgb(${env.accent}))` }}
                  />
                </div>
              </div>
            </div>

            {stats.length > 0 && (
              <div className="mt-5 grid grid-cols-3 divide-x divide-black/[0.06]">
                {stats.slice(0, 3).map((s) => (
                  <div key={s.label} className="px-3 first:pl-0">
                    <div className="text-xl font-extrabold tracking-tight">{s.value}</div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {continueTo && (
              <Link
                to={continueTo.to}
                params={continueTo.params as never}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: `linear-gradient(90deg, rgb(${env.accent2}), rgb(${env.accent}))` }}
              >
                {continueTo.label} <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Núcleo visual */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-6 relative min-h-[320px] md:min-h-[420px]">
          {env.rings && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 size-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{ borderColor: `rgba(${env.accent},0.22)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{ borderColor: `rgba(${env.accent},0.14)` }}
              />
            </>
          )}
          <div
            ref={coreRef}
            className="absolute inset-0 will-change-transform"
            style={{ transition: "transform 900ms cubic-bezier(0.16,1,0.3,1)" }}
          >
            <img
              src={coreImage(env)}
              alt={`Núcleo visual del programa ${title}`}
              loading="lazy"
              width={1024}
              height={1024}
              draggable={false}
              className={`absolute inset-0 mx-auto h-full w-auto max-w-none select-none object-contain ${
                env.motion > 0 ? "animate-float-slow" : ""
              }`}
              style={{
                filter: `drop-shadow(0 30px 60px rgba(${env.accent2},${0.35 * env.light})) saturate(${0.95 + 0.1 * env.light})`,
              }}
            />
          </div>

          {/* Órbitas discretas */}
          {ORBITS.map((o, i) => {
            const Icon = o.icon;
            return (
              <span
                key={i}
                aria-hidden
                className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md"
                style={{
                  left: `${o.left}%`,
                  top: `${o.top}%`,
                  borderColor: `rgba(${env.accent},0.3)`,
                  background: "rgba(255,255,255,0.72)",
                  boxShadow: `0 16px 40px -28px rgba(${env.accent2},0.9)`,
                  animation: env.motion > 0 ? `kotaro-float ${7 + i}s ease-in-out ${i * 0.4}s infinite` : undefined,
                }}
              >
                <Icon className="size-4" strokeWidth={1.6} style={{ color: `rgb(${env.accent})` }} />
              </span>
            );
          })}

          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
            <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: `rgb(${env.accent})` }}>
              {subtitle || env.mood}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && programNodeId && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md hover:bg-white"
        >
          <Settings2 className="size-3.5" /> Ambiente
        </button>
      )}

      {editing && programNodeId && (
        <EnvironmentEditor
          env={env}
          programNodeId={programNodeId}
          metadata={metadata ?? {}}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

const CORE_KEYS: CoreKey[] = ["child", "neonate", "heart", "brain", "lungs", "nodes", "body"];

function EnvironmentEditor({
  env,
  programNodeId,
  metadata,
  onClose,
}: {
  env: ProgramEnvironment;
  programNodeId: string;
  metadata: Record<string, unknown>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ProgramEnvironment>(env);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("content_nodes")
      .update({ metadata: { ...metadata, environment: draft } })
      .eq("id", programNodeId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/50 bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Program environment</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Núcleo visual
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CORE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, core: k }))}
              className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                draft.core === k ? "border-primary bg-primary/10" : "border-black/10 hover:bg-black/[0.03]"
              }`}
            >
              {CORE_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Acento principal (r,g,b)" value={draft.accent} onChange={(v) => setDraft((d) => ({ ...d, accent: v }))} />
          <Field label="Acento secundario (r,g,b)" value={draft.accent2} onChange={(v) => setDraft((d) => ({ ...d, accent2: v }))} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Range label={`Luz ambiental ${draft.light.toFixed(2)}`} value={draft.light} min={0.4} max={1.4} onChange={(v) => setDraft((d) => ({ ...d, light: v }))} />
          <Range label={`Movimiento ${draft.motion.toFixed(2)}`} value={draft.motion} min={0} max={1.4} onChange={(v) => setDraft((d) => ({ ...d, motion: v }))} />
        </div>

        <Field
          className="mt-4"
          label="Imagen personalizada (URL)"
          value={draft.coverUrl ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, coverUrl: v || null }))}
        />
        <Field className="mt-4" label="Atmósfera (texto)" value={draft.mood} onChange={(v) => setDraft((d) => ({ ...d, mood: v }))} />

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={draft.rings} onChange={(e) => setDraft((d) => ({ ...d, rings: e.target.checked }))} />
            Órbitas
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={draft.grid} onChange={(e) => setDraft((d) => ({ ...d, grid: e.target.checked }))} />
            Retícula
          </label>
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold hover:bg-black/5">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            <Activity className="size-3.5" /> {saving ? "Guardando…" : "Guardar ambiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-black/10 bg-background px-3 py-2 text-xs"
      />
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </div>
  );
}
