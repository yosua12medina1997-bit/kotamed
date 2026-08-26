/**
 * KOTAMED ANATOMICAL CORE™ — experiencia visual central del panel del alumno.
 * Compone el motor 3D del corazón (HeartScene) con un entorno médico mínimo,
 * cinco especialidades orbitando en cápsulas discretas y un pedestal
 * holográfico con la identidad KOTAMED. Solo presentación.
 */
import { Suspense, lazy, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import type { CoreFocus } from "./HeartScene";

const HeartScene = lazy(() => import("./HeartScene"));

interface Specialty {
  key: Exclude<CoreFocus, null>;
  label: string;
  hint: string;
  /** posición en % del contenedor */
  left: number;
  top: number;
}

const SPECIALTIES: Specialty[] = [
  { key: "neurologia", label: "Neurología", hint: "Sistema nervioso", left: 50, top: 7 },
  { key: "pediatria", label: "Pediatría", hint: "Ciclo vital", left: 13, top: 33 },
  { key: "cardiologia", label: "Cardiología", hint: "Circulación", left: 87, top: 33 },
  { key: "neumologia", label: "Neumología", hint: "Vía aérea", left: 17, top: 80 },
  {
    key: "gastroenterologia",
    label: "Gastroenterología",
    hint: "Digestivo",
    left: 83,
    top: 80,
  },
];

export function AnatomicalCore({
  intensity = 1,
  base = "dark",
  reducedMotion = false,
  lowPower = false,
  caption = "KOTAMED ANATOMICAL CORE",
  subcaption = "Entorno de inteligencia médica",
  contextLabel,
}: {
  intensity?: number;
  base?: "light" | "dark";
  reducedMotion?: boolean;
  lowPower?: boolean;
  caption?: string;
  subcaption?: string;
  /** Contexto de aprendizaje actual (segunda jerarquía visual). */
  contextLabel?: string;
}) {
  const [focus, setFocus] = useState<CoreFocus>(null);

  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      {/* Entorno médico profundo (mínimo, sin neones ni grillas) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3rem]"
        style={{
          background:
            base === "light"
              ? "radial-gradient(75% 60% at 50% 35%, rgba(226,238,248,0.95), rgba(238,244,250,0.6) 60%, transparent 78%)"
              : "radial-gradient(70% 60% at 50% 32%, rgba(14,26,46,0.95), rgba(6,12,24,0.75) 62%, transparent 80%)",
          transition: "background 1200ms ease",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] bottom-[16%] h-[22%] rounded-[50%]"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, rgba(47,216,208,0.22), transparent 72%)",
          filter: "blur(26px)",
          opacity: 0.8 * intensity,
        }}
      />

      <div className="relative aspect-square w-full">
        {/* Núcleo anatómico 3D */}
        <ClientOnly
          fallback={
            <div className="absolute inset-0 grid place-items-center text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              Cargando núcleo anatómico…
            </div>
          }
        >
          <Suspense fallback={null}>
            <HeartScene
              focus={focus}
              intensity={intensity}
              base={base}
              reducedMotion={reducedMotion}
              lowPower={lowPower}
            />
          </Suspense>
        </ClientOnly>

        {/* Especialidades: cápsulas mínimas, jamás tarjetas grandes */}
        {SPECIALTIES.map((s) => {
          const active = focus === s.key;
          return (
            <div
              key={s.key}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.left}%`, top: `${s.top}%` }}
              onMouseEnter={() => setFocus(s.key)}
              onMouseLeave={() => setFocus((f) => (f === s.key ? null : f))}
              onFocus={() => setFocus(s.key)}
              onBlur={() => setFocus((f) => (f === s.key ? null : f))}
            >
              <Link
                to="/programas"
                className="group flex flex-col items-center gap-0.5 rounded-full px-3.5 py-1.5 text-center transition-all duration-500"
                style={{
                  border: `1px solid ${active ? "rgba(47,216,208,0.75)" : "currentColor"}`,
                  borderColor: active ? "rgba(47,216,208,0.75)" : undefined,
                  background: active
                    ? "color-mix(in oklab, var(--nexus-teal) 14%, transparent)"
                    : "transparent",
                  boxShadow: active ? "0 8px 30px -12px rgba(47,216,208,0.65)" : "none",
                  opacity: active ? 1 : 0.55,
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-[0.18em] leading-none">
                  {s.label}
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60">
                  {s.hint}
                </span>
              </Link>
              {/* Conexión de luz hacia el corazón */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 origin-left"
                style={{
                  width: `${Math.hypot(50 - s.left, 46 - s.top) * 3.4}px`,
                  height: "1px",
                  transform: `rotate(${(Math.atan2(46 - s.top, 50 - s.left) * 180) / Math.PI}deg)`,
                  background:
                    "linear-gradient(90deg, rgba(47,216,208,0.75), rgba(47,216,208,0))",
                  opacity: active ? 0.9 : 0,
                  transition: "opacity 600ms ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Identidad KOTAMED bajo el pedestal */}
      <div className="relative z-20 -mt-4 text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--nexus-teal)]">
          {caption}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-50">
          {contextLabel ?? subcaption}
        </div>
      </div>
    </div>
  );
}
