/**
 * HERO principal de KotaMed — "KotaMed Dynamic Environment".
 *
 * Escena de laboratorio médico futurista que evoluciona según la hora local del
 * usuario (7 estados ambientales con transiciones suaves), con control manual de
 * ambiente, indicador de hora, paneles holográficos, hotspots de especialidades
 * sobre el cuerpo humano y efectos premium (parallax, glow, partículas, ECG).
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clock,
  Crown,
  Play,
  Rocket,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import labScene from "@/assets/kotamed-lab-hero.png.asset.json";
import {
  DEFAULT_HERO_CONFIG,
  ENV_BY_KEY,
  ENV_STATES,
  envForHour,
  useHeroConfig,
  useLocalClock,
  useLowPerfMode,
  usePrefersReducedMotion,
  type EnvKey,
} from "@/lib/hero-env";

export function DynamicLabHero() {
  const { data } = useHeroConfig();
  const cfg = data ?? DEFAULT_HERO_CONFIG;
  const clock = useLocalClock();
  const reduced = usePrefersReducedMotion();
  const lowPerf = useLowPerfMode();

  const [manual, setManual] = useState<EnvKey | null>(null);
  const [openPicker, setOpenPicker] = useState(false);
  const auto = manual === null && cfg.autoMode;
  const active = auto ? envForHour(clock.hour) : ENV_BY_KEY[manual ?? "noche"];

  const sceneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hot, setHot] = useState<string | null>(null);

  useEffect(() => {
    if (reduced || lowPerf) return;
    const el = sceneRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setTilt({
        x: ((e.clientX - r.left) / r.width - 0.5) * 2,
        y: ((e.clientY - r.top) / r.height - 0.5) * 2,
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, lowPerf]);

  const transition = `${reduced ? 1.2 : Math.max(2, cfg.transitionSeconds)}s ease-in-out`;
  const glow = active.glow * cfg.glowIntensity;
  const bright = 0.75 + active.ambient * 0.45 * cfg.lightIntensity;
  const image = cfg.image || labScene.url;

  return (
    <section className="relative mx-auto max-w-7xl px-6 lg:px-10 pt-12 pb-10 lg:pt-16 lg:pb-20">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-white/12 shadow-[0_50px_120px_-60px_oklch(0.2_0.05_260_/_0.8)]"
        style={{ background: "oklch(0.16 0.05 262)" }}
      >
        {/* ---- Escena base ---- */}
        <div ref={sceneRef} className="relative min-h-[620px] lg:min-h-[700px]">
          <img
            src={image}
            alt="Médico interactuando con un holograma 3D del cuerpo humano en el laboratorio futurista de KotaMed"
            loading="eager"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
            style={{
              filter: `${active.filter} brightness(${bright})`,
              transform: reduced
                ? undefined
                : `scale(1.06) translate3d(${tilt.x * -8}px, ${tilt.y * -6}px, 0)`,
              transition: `filter ${transition}, transform 900ms cubic-bezier(0.16,1,0.3,1)`,
              willChange: "filter, transform",
            }}
          />

          {/* Cielo / exterior dinámico */}
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-soft-light"
            style={{ background: active.sky, transition: `background ${transition}` }}
          />
          {/* Velo cromático del ambiente */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: active.veil, transition: `background ${transition}` }}
          />
          {/* Glow holográfico */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(60% 60% at 68% 45%, color-mix(in oklab, ${cfg.accent} ${Math.round(
                glow * 26,
              )}%, transparent), transparent 70%)`,
              transition: `background ${transition}`,
            }}
          />
          {/* Legibilidad del texto (izquierda) */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, oklch(0.14 0.04 262 / 0.92) 0%, oklch(0.14 0.04 262 / 0.72) 38%, oklch(0.14 0.04 262 / 0.18) 62%, transparent 80%)",
            }}
          />
          {/* Línea de escaneo + partículas */}
          {!reduced && !lowPerf && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-[46%] w-[54%] overflow-hidden"
              >
                <span
                  className="absolute inset-x-0 h-24 kotaro-spark"
                  style={{
                    background: `linear-gradient(180deg, transparent, color-mix(in oklab, ${cfg.accent} 22%, transparent), transparent)`,
                  }}
                />
              </div>
              <Particles accent={cfg.accent} />
            </>
          )}

          {/* ---- Hotspots de especialidades ---- */}
          {cfg.organInteraction &&
            cfg.specialties.map((s) => (
              <div
                key={s.key}
                className="absolute hidden lg:block"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                onMouseEnter={() => setHot(s.key)}
                onMouseLeave={() => setHot((h) => (h === s.key ? null : h))}
              >
                <button
                  type="button"
                  aria-label={`${s.label} · ${s.organ}`}
                  className="grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform hover:scale-125"
                  style={{
                    background: `color-mix(in oklab, ${cfg.accent} 70%, transparent)`,
                    boxShadow: `0 0 0 6px color-mix(in oklab, ${cfg.accent} 14%, transparent), 0 0 22px color-mix(in oklab, ${cfg.accent} 55%, transparent)`,
                  }}
                >
                  <span className="size-1.5 rounded-full bg-white/90" />
                </button>
                {hot === s.key && (
                  <div className="absolute left-4 top-2 w-60 rounded-2xl border border-white/15 bg-[oklch(0.18_0.04_262_/_0.72)] p-3.5 text-white backdrop-blur-xl">
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: cfg.accent }}
                    >
                      {s.organ}
                    </div>
                    <div className="mt-0.5 text-sm font-extrabold tracking-tight">{s.label}</div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/70">
                      {s.description}
                    </p>
                    <Link
                      to={s.href || "/programas"}
                      className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: cfg.accent }}
                    >
                      Explorar área
                      <ArrowRight className="size-3" strokeWidth={2.5} />
                    </Link>
                  </div>
                )}
              </div>
            ))}

          {/* ---- Paneles holográficos flotantes ---- */}
          <div className="pointer-events-none absolute inset-y-16 right-6 hidden xl:flex xl:flex-col xl:justify-between">
            {cfg.panels.slice(0, 6).map((p, i) => (
              <HoloPanel key={p} label={p} accent={cfg.accent} delay={i * 0.6} animate={!reduced} />
            ))}
          </div>

          {/* ---- Contenido textual ---- */}
          <div className="relative z-10 flex min-h-[620px] flex-col justify-center px-7 py-14 sm:px-10 lg:min-h-[700px] lg:max-w-[54%] lg:px-14">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
              <Crown className="size-3.5" strokeWidth={2.5} style={{ color: cfg.accent }} />
              KotaMed · Laboratorio médico del futuro
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.03] tracking-tighter text-white text-balance sm:text-5xl lg:text-[3.9rem]">
              {cfg.title.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}{" "}
              <span style={{ color: cfg.accent }}>{cfg.highlight}.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-white/72 text-pretty">
              {cfg.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={cfg.primaryHref}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold text-[oklch(0.16_0.04_262)] transition-all hover:-translate-y-0.5"
                style={{
                  background: cfg.accent,
                  boxShadow: `0 22px 60px -26px color-mix(in oklab, ${cfg.accent} 75%, transparent)`,
                }}
              >
                <Rocket className="size-4" strokeWidth={2.25} />
                {cfg.primaryLabel}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={2.5}
                />
              </Link>
              <Link
                to={cfg.secondaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/16"
              >
                <span className="grid size-6 place-items-center rounded-full border border-white/30">
                  <Play className="size-3 fill-current" strokeWidth={0} />
                </span>
                {cfg.secondaryLabel}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[11.5px] font-semibold text-white/70">
              {cfg.chips.map((c) => (
                <span key={c} className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5" strokeWidth={2.5} style={{ color: cfg.accent }} />
                  {c}
                </span>
              ))}
            </div>

            {/* Tarjetas de especialidad en móvil/tablet */}
            {cfg.organInteraction && (
              <div className="mt-8 flex flex-wrap gap-2 xl:hidden">
                {cfg.specialties.slice(0, 4).map((s) => (
                  <span
                    key={s.key}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10.5px] font-bold text-white/80 backdrop-blur-md"
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ---- Barra inferior: hora + control de ambiente ---- */}
          <div className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 sm:inset-x-7 sm:bottom-6">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.16_0.04_262_/_0.55)] px-3.5 py-2 text-[11px] font-semibold text-white/75 backdrop-blur-md">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: cfg.accent,
                  boxShadow: `0 0 10px ${cfg.accent}`,
                }}
              />
              <Clock className="size-3.5" strokeWidth={2.25} />
              {clock.time}
              {clock.city ? ` · ${clock.city}` : ""}
              <span className="hidden text-white/45 sm:inline">
                · {auto ? "Ambiente sincronizado" : `Ambiente ${active.label.toLowerCase()}`}
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenPicker((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.16_0.04_262_/_0.55)] px-3.5 py-2 text-[11px] font-bold text-white/80 backdrop-blur-md transition-colors hover:bg-white/15"
              >
                <SlidersHorizontal className="size-3.5" strokeWidth={2.25} />
                Modo ambiente
                <span style={{ color: cfg.accent }}>{active.emoji}</span>
              </button>
              {openPicker && (
                <div className="absolute bottom-11 right-0 w-56 overflow-hidden rounded-2xl border border-white/15 bg-[oklch(0.17_0.04_262_/_0.85)] p-1.5 text-white backdrop-blur-xl">
                  {ENV_STATES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => {
                        setManual(s.key);
                        setOpenPicker(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition-colors hover:bg-white/10"
                    >
                      <span>{s.emoji}</span>
                      {s.label}
                      {!auto && active.key === s.key && (
                        <Check className="ml-auto size-3.5" strokeWidth={2.5} style={{ color: cfg.accent }} />
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setManual(null);
                      setOpenPicker(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-white/10 px-3 py-2 text-left text-[12px] font-bold transition-colors hover:bg-white/10"
                  >
                    ⚙️ Sincronizar con mi hora
                    {auto && (
                      <Check className="ml-auto size-3.5" strokeWidth={2.5} style={{ color: cfg.accent }} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Frase ambiental */}
          <span
            className="pointer-events-none absolute left-7 top-5 z-10 hidden text-[10px] font-bold uppercase tracking-[0.28em] text-white/40 lg:block sm:left-10 lg:left-14"
            style={{ transition: `opacity ${transition}` }}
          >
            {active.caption}
          </span>
        </div>
      </div>
    </section>
  );
}

function HoloPanel({
  label,
  accent,
  delay,
  animate,
}: {
  label: string;
  accent: string;
  delay: number;
  animate: boolean;
}) {
  return (
    <div
      className={`w-52 rounded-2xl border border-white/15 bg-[oklch(0.2_0.04_262_/_0.42)] p-3.5 backdrop-blur-xl ${
        animate ? "animate-float-slow" : ""
      }`}
      style={{ animationDelay: `-${delay}s` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11.5px] font-extrabold tracking-tight text-white">
          {label}
        </span>
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
      </div>
      <svg viewBox="0 0 120 24" className="mt-2 w-full" fill="none" aria-hidden>
        <path
          d="M0 14h26l5-9 6 18 5-9h22l4-6 5 12 4-6h43"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinecap="round"
          className={animate ? "animate-ecg" : ""}
          opacity="0.85"
        />
      </svg>
      <div className="mt-1.5 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{
              background: `color-mix(in oklab, ${accent} ${18 + i * 12}%, transparent)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Particles({ accent }: { accent: string }) {
  const dots = [
    { x: 52, y: 22, d: 0 },
    { x: 74, y: 30, d: 1.4 },
    { x: 60, y: 62, d: 2.6 },
    { x: 80, y: 58, d: 3.8 },
    { x: 66, y: 76, d: 4.9 },
    { x: 88, y: 40, d: 5.6 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute size-1 rounded-full animate-float-slow"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            background: accent,
            opacity: 0.5,
            boxShadow: `0 0 12px ${accent}`,
            animationDelay: `-${d.d}s`,
          }}
        />
      ))}
    </div>
  );
}
