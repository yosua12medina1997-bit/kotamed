/**
 * KotaMed Dynamic Environment — entorno ambiental GLOBAL de la página.
 *
 * Convierte toda la navegación en un único laboratorio médico futurista:
 * el fondo se compone por capas (skyline → ventana → arquitectura → luz
 * ambiental → hologramas → decoración) que se desplazan con parallax sutil
 * mientras el contenido permanece legible por encima.
 *
 * El ambiente cambia según la hora local del visitante (7 estados) y puede
 * fijarse manualmente. Toda la configuración es editable por el administrador
 * desde KotaMed Studio (ver HeroEnvEditor / hero-env.ts).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Clock, SlidersHorizontal } from "lucide-react";
import envExtension from "@/assets/env-lab-extension.jpg";
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
  type EnvState,
  type HeroConfig,
} from "@/lib/hero-env";

const STORAGE_KEY = "kotamed:env";

type EnvContextValue = {
  cfg: HeroConfig;
  active: EnvState;
  auto: boolean;
  manual: EnvKey | null;
  setManual: (k: EnvKey | null) => void;
  clock: { hour: number; time: string; city: string };
  reduced: boolean;
  lowPerf: boolean;
  /** Duración CSS de las transiciones ambientales. */
  transition: string;
};

const EnvContext = createContext<EnvContextValue | null>(null);

/** Estado ambiental compartido. Si no hay provider, calcula uno local. */
export function useEnvironment(): EnvContextValue {
  const ctx = useContext(EnvContext);
  const fallback = useEnvironmentValue();
  return ctx ?? fallback;
}

function useEnvironmentValue(): EnvContextValue {
  const { data } = useHeroConfig();
  const cfg = data ?? DEFAULT_HERO_CONFIG;
  const clock = useLocalClock();
  const reduced = usePrefersReducedMotion();
  const lowPerf = useLowPerfMode();
  const [manual, setManualState] = useState<EnvKey | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== "auto" && ENV_BY_KEY[saved as EnvKey]) {
        setManualState(saved as EnvKey);
      }
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const setManual = (k: EnvKey | null) => {
    setManualState(k);
    try {
      window.localStorage.setItem(STORAGE_KEY, k ?? "auto");
    } catch {
      /* almacenamiento no disponible */
    }
  };

  const autoAllowed = cfg.envAuto && cfg.autoMode;
  const auto = manual === null && autoAllowed;
  const active = auto
    ? envForHour(clock.hour)
    : ENV_BY_KEY[manual ?? "noche"];
  const transition = `${reduced ? 1.2 : Math.max(2, cfg.transitionSeconds)}s ease-in-out`;

  return useMemo(
    () => ({ cfg, active, auto, manual, setManual, clock, reduced, lowPerf, transition }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg, active, auto, manual, clock.hour, clock.time, clock.city, reduced, lowPerf, transition],
  );
}

export function DynamicEnvironmentProvider({ children }: { children: ReactNode }) {
  const value = useEnvironmentValue();
  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
}

/** Progreso de scroll (0–1) y desplazamiento en px, con rAF. */
function useScrollDepth(enabled: boolean) {
  const [y, setY] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      if (raf.current) return;
      raf.current = window.requestAnimationFrame(() => {
        raf.current = 0;
        setY(window.scrollY || 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, [enabled]);
  return y;
}

/**
 * Fondo ambiental global. Se monta una sola vez por página, en position fixed
 * detrás del contenido (`-z-10`), de modo que todas las secciones comparten el
 * mismo espacio visual sin estirar la imagen original.
 */
export function GlobalEnvironment() {
  const { cfg, active, reduced, lowPerf, transition } = useEnvironment();
  const parallax = cfg.envParallax && !reduced;
  const y = useScrollDepth(parallax);
  const depth = parallax ? Math.max(0, Math.min(2, cfg.envDepth)) : 0;

  if (!cfg.envEnabled) return null;

  const base = cfg.envImage || envExtension;
  const scene = cfg.image || labScene.url;
  const opacity = Math.max(0.2, Math.min(1, cfg.envOpacity));
  const blur = Math.max(0, Math.min(24, cfg.envBlur));
  const overlay = Math.max(0, Math.min(0.95, cfg.envOverlay));
  // El escenario se "lava" en luz para que el contenido oscuro siga legible
  // sobre él, sin dejar de percibirse el laboratorio.
  const bright = (0.9 + active.ambient * 0.35) * cfg.lightIntensity;
  const wash = `saturate(${0.7 + active.glow * 0.3}) contrast(0.95)`;
  const glow = active.glow * cfg.glowIntensity;
  const accent = cfg.accent;

  // Desplazamientos por capa (px). Sutiles y con tope para no vaciar la escena.
  const cap = (v: number, max: number) => Math.max(-max, Math.min(max, v));
  const skylineY = cap(-y * 0.035 * depth, 90);
  const windowY = cap(-y * 0.015 * depth, 40);
  const labY = cap(-y * 0.06 * depth, 180);
  const holoY = cap(-y * 0.1 * depth, 260);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background: "oklch(0.14 0.04 262)",
        transition: `background ${transition}`,
      }}
    >
      {/* 1 · SKYLINE / EXTERIOR */}
      <div
        className="absolute -inset-x-[8%] -top-[8%] h-[70%] will-change-transform"
        style={{
          transform: `translate3d(0, ${skylineY}px, 0) scale(1.06)`,
          opacity: opacity * 0.9,
        }}
      >
        <img
          src={base}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-[50%_35%]"
          style={{
            filter: `brightness(${bright}) ${wash} blur(${Math.max(4, blur * 1.4)}px)`,
            transition: `filter ${transition}`,
          }}
        />
      </div>

      {/* 2 · VENTANA (cielo dinámico + retícula del ventanal) */}
      <div
        className="absolute inset-0 mix-blend-soft-light will-change-transform"
        style={{
          background: active.sky,
          transform: `translate3d(0, ${windowY}px, 0)`,
          transition: `background ${transition}`,
        }}
      />
      {!lowPerf && (
        <div
          className="absolute inset-x-0 top-0 h-[62%] opacity-25 will-change-transform"
          style={{
            transform: `translate3d(0, ${windowY}px, 0)`,
            backgroundImage:
              "linear-gradient(90deg, oklch(0.85 0.05 220 / 0.22) 1px, transparent 1px), linear-gradient(180deg, oklch(0.85 0.05 220 / 0.14) 1px, transparent 1px)",
            backgroundSize: "17% 34%",
            maskImage: "linear-gradient(180deg, black, transparent)",
          }}
        />
      )}

      {/* 3 · ARQUITECTURA DEL LABORATORIO (extensión inferior del escenario) */}
      <div
        className="absolute -inset-x-[10%] bottom-[-10%] h-[68%] will-change-transform"
        style={{
          transform: `translate3d(0, ${labY}px, 0)`,
          opacity: opacity,
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 22%, black 100%)",
        }}
      >
        <img
          src={base}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-[50%_85%]"
          style={{
            filter: `brightness(${bright * 1.05}) ${wash} blur(${Math.max(6, blur * 1.8)}px)`,
            transition: `filter ${transition}`,
          }}
        />
      </div>

      {/* Piso reflectante: refleja el ambiente activo */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: `linear-gradient(0deg, color-mix(in oklab, ${accent} ${Math.round(
            glow * 9,
          )}%, oklch(0.13 0.04 262)) 0%, transparent 100%)`,
          transition: `background ${transition}`,
        }}
      />

      {/* 4 · ILUMINACIÓN AMBIENTAL */}
      <div
        className="absolute inset-0"
        style={{ background: active.veil, transition: `background ${transition}` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 55% at 72% 18%, color-mix(in oklab, ${accent} ${Math.round(
            glow * 16,
          )}%, transparent), transparent 70%)`,
          transition: `background ${transition}`,
        }}
      />

      {/* 5 · HOLOGRAMAS (profundidad, se desplazan más rápido) */}
      {!lowPerf && (
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(0, ${holoY}px, 0)` }}
        >
          <div
            className="absolute left-[6%] top-[38%] size-[26rem] rounded-full blur-[130px] animate-aurora"
            style={{
              background: `color-mix(in oklab, ${accent} ${Math.round(glow * 14)}%, transparent)`,
            }}
          />
          <div
            className="absolute right-[4%] top-[68%] size-[22rem] rounded-full blur-[140px] animate-aurora"
            style={{
              background: "color-mix(in oklab, oklch(0.62 0.14 250) 14%, transparent)",
              animationDelay: "-9s",
            }}
          />
          <div
            className="absolute left-[38%] bottom-[4%] size-[24rem] rounded-full blur-[150px] animate-aurora"
            style={{
              background: "color-mix(in oklab, oklch(0.66 0.11 190) 12%, transparent)",
              animationDelay: "-16s",
            }}
          />
        </div>
      )}

      {/* 6 · ELEMENTOS DECORATIVOS: rejilla holográfica de piso + escaneo */}
      {!lowPerf && !reduced && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-[34%] opacity-[0.18]"
            style={{
              backgroundImage: `linear-gradient(90deg, ${accent}55 1px, transparent 1px), linear-gradient(180deg, ${accent}44 1px, transparent 1px)`,
              backgroundSize: "8% 14%",
              maskImage: "linear-gradient(0deg, black, transparent)",
              transform: "perspective(600px) rotateX(58deg)",
              transformOrigin: "bottom",
            }}
          />
          <div className="absolute inset-y-0 right-[8%] w-[36%] overflow-hidden">
            <span
              className="absolute inset-x-0 h-28 kotaro-spark"
              style={{
                background: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 16%, transparent), transparent)`,
              }}
            />
          </div>
        </>
      )}

      {/* Escena principal, apenas insinuada como profundidad lateral */}
      {!lowPerf && (
        <div
          className="absolute right-[-6%] top-0 hidden h-[80%] w-[46%] lg:block will-change-transform"
          style={{
            transform: `translate3d(0, ${labY * 0.5}px, 0)`,
            opacity: opacity * 0.16,
            maskImage:
              "radial-gradient(70% 70% at 60% 40%, black, transparent 75%)",
          }}
        >
          <img
            src={scene}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-[70%_40%]"
            style={{ filter: `${active.filter} blur(3px)` }}
          />
        </div>
      )}

      {/* 7 · OVERLAY DE LEGIBILIDAD — velo de cristal esmerilado.
          Se aclara/oscurece según el ambiente activo, pero nunca oculta el
          laboratorio: el escenario sigue siendo perceptible detrás. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, oklch(0.99 0.012 ${230 +
            (1 - active.ambient) * 30} / ${(0.22 + (1 - active.ambient) * 0.16) *
            (overlay / 0.72)}) 0%, oklch(0.98 0.014 ${230 +
            (1 - active.ambient) * 30} / ${(0.30 + (1 - active.ambient) * 0.18) *
            (overlay / 0.72)}) 55%, oklch(0.99 0.010 235 / ${(0.28 +
            (1 - active.ambient) * 0.18) *
            (overlay / 0.72)}) 100%)`,
          transition: `background ${transition}`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, transparent 45%, oklch(0.55 0.05 250 / 0.18) 100%)",
        }}
      />
    </div>
  );
}

/** Control discreto del ambiente: automático o manual (7 estados). */
export function EnvironmentSwitcher({ className = "" }: { className?: string }) {
  const { cfg, active, auto, clock, setManual } = useEnvironment();
  const [open, setOpen] = useState(false);
  if (!cfg.envEnabled) return null;

  return (
    <div className={`relative ${className}`}>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-52 overflow-hidden rounded-2xl border border-white/15 bg-[oklch(0.16_0.04_262_/_0.92)] p-1.5 backdrop-blur-xl">
          {ENV_STATES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setManual(s.key);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-semibold text-white/80 hover:bg-white/10"
            >
              <span>{s.emoji}</span>
              {s.label}
              {!auto && active.key === s.key && (
                <Check className="ml-auto size-3.5" strokeWidth={2.5} />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setManual(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-bold text-white hover:bg-white/10"
          >
            ⚙️ Automático
            {auto && <Check className="ml-auto size-3.5" strokeWidth={2.5} />}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.16_0.04_262_/_0.6)] px-3.5 py-2 text-[11px] font-semibold text-white/80 backdrop-blur-md transition-colors hover:bg-[oklch(0.16_0.04_262_/_0.85)]"
      >
        <span
          className="size-1.5 rounded-full"
          style={{ background: cfg.accent, boxShadow: `0 0 10px ${cfg.accent}` }}
        />
        {auto ? "Ambiente automático" : `${active.emoji} ${active.label}`}
        <span className="mx-1 hidden items-center gap-1 text-white/55 sm:inline-flex">
          <Clock className="size-3" strokeWidth={2.5} /> {clock.time} · {clock.city}
        </span>
        <SlidersHorizontal className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
