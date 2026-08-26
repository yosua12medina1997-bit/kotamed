/**
 * KOTAMED MEDICAL CORE™ — pieza anatómica digital interactiva.
 * Corazón estilizado con flotación, respiración, parallax de cursor,
 * pulsos de energía y nodos médicos conectados al núcleo.
 * Es únicamente presentación: recibe los nodos ya resueltos por el dashboard.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

export interface CoreNode {
  label: string;
  hint?: string;
  to?: string;
  params?: Record<string, string>;
  /** Ángulo en grados sobre la órbita (0 = arriba). */
  angle: number;
}

export function MedicalCore({
  nodes,
  intensity = 1,
  reducedMotion = false,
  lowPower = false,
  caption = "KOTAMED NEXUS",
  subcaption = "Tu centro de aprendizaje médico",
}: {
  nodes: CoreNode[];
  intensity?: number;
  reducedMotion?: boolean;
  lowPower?: boolean;
  caption?: string;
  subcaption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      setTilt({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => setPulse((p) => p + 1), 6000);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const radius = 44; // % del contenedor

  return (
    <div
      ref={ref}
      className="nexus-core relative mx-auto flex aspect-square w-full max-w-[560px] items-center justify-center"
      style={{ ["--core-intensity" as string]: String(intensity) }}
    >
      {/* Órbitas */}
      <div
        aria-hidden
        className={`absolute inset-[8%] rounded-full border border-current/10 ${
          reducedMotion ? "" : "animate-orbit"
        }`}
        style={{ borderStyle: "dashed", opacity: 0.35 }}
      />
      <div
        aria-hidden
        className={`absolute inset-[20%] rounded-full border border-current/10 ${
          reducedMotion ? "" : "animate-orbit-reverse"
        }`}
        style={{ opacity: 0.25 }}
      />

      {/* Halo del núcleo */}
      {!lowPower && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-[22%] rounded-full ${
            reducedMotion ? "" : "animate-halo"
          }`}
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(39,199,216,0.32), rgba(47,128,237,0.14) 55%, transparent 72%)",
            filter: "blur(26px)",
            opacity: 0.55 * intensity,
          }}
        />
      )}

      {/* Corazón anatómico estilizado */}
      <div
        className={`relative z-10 w-[46%] ${reducedMotion ? "" : "animate-float-slow"}`}
        style={{
          transform: `perspective(900px) rotateY(${tilt.x * 7}deg) rotateX(${-tilt.y * 6}deg)`,
          transition: "transform 400ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <HeartSvg reducedMotion={reducedMotion} focus={focus} intensity={intensity} />
      </div>

      {/* Pulso de energía */}
      {!reducedMotion && !lowPower && (
        <span
          key={pulse}
          aria-hidden
          className="nexus-pulse pointer-events-none absolute left-1/2 top-1/2 size-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        />
      )}

      {/* Base holográfica */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[10%] left-1/2 h-[16%] w-[52%] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, rgba(39,199,216,0.35), transparent 70%)",
          filter: "blur(10px)",
          opacity: 0.7 * intensity,
        }}
      />

      {/* Nodos médicos */}
      {nodes.slice(0, 5).map((n) => {
        const rad = ((n.angle - 90) * Math.PI) / 180;
        const left = 50 + Math.cos(rad) * radius;
        const top = 50 + Math.sin(rad) * radius;
        const active = focus === n.label;
        const inner = (
          <>
            <span className="text-[9px] font-black uppercase tracking-[0.14em] leading-tight">
              {n.label}
            </span>
            {n.hint && (
              <span className="text-[9px] font-semibold opacity-70">{n.hint}</span>
            )}
          </>
        );
        return (
          <div
            key={n.label}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
            onMouseEnter={() => setFocus(n.label)}
            onMouseLeave={() => setFocus(null)}
          >
            {n.to ? (
              <Link
                to={n.to}
                params={n.params as never}
                className={`nexus-node flex max-w-[150px] flex-col items-start gap-0.5 rounded-2xl px-3 py-2 text-left transition duration-300 ${
                  active ? "nexus-node-active" : ""
                }`}
              >
                {inner}
              </Link>
            ) : (
              <div
                className={`nexus-node flex max-w-[150px] flex-col items-start gap-0.5 rounded-2xl px-3 py-2 ${
                  active ? "nexus-node-active" : ""
                }`}
              >
                {inner}
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-[-2%] z-20 text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.34em] text-[color:var(--nexus-teal)]">
          {caption}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-55">
          {subcaption}
        </div>
      </div>
    </div>
  );
}

function HeartSvg({
  reducedMotion,
  focus,
  intensity,
}: {
  reducedMotion: boolean;
  focus: string | null;
  intensity: number;
}) {
  return (
    <svg
      viewBox="0 0 200 220"
      className={reducedMotion ? "" : "nexus-breathe"}
      style={{
        filter: `drop-shadow(0 18px 40px rgba(20,120,150,${0.28 * intensity}))`,
        transition: "filter 700ms ease",
      }}
      role="img"
      aria-label="Núcleo médico: corazón anatómico interactivo"
    >
      <defs>
        <linearGradient id="nx-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fe4ec" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#27c7d8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#2f80ed" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="nx-vessel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfeef5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#21b7b5" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="nx-inner" cx="42%" cy="34%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* grandes vasos */}
      <path
        d="M92 40c-4-16 4-28 16-30M108 40c6-14 18-18 28-12"
        fill="none"
        stroke="url(#nx-vessel)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* silueta anatómica */}
      <path
        d="M100 46c14-18 44-22 62-4 20 20 16 54-2 78-14 19-34 34-52 52-4 4-9 4-13 0-18-18-40-33-54-52-18-24-22-58-2-78 18-18 47-14 61 4z"
        fill="url(#nx-heart)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path
        d="M100 46c14-18 44-22 62-4 20 20 16 54-2 78-14 19-34 34-52 52-4 4-9 4-13 0-18-18-40-33-54-52-18-24-22-58-2-78 18-18 47-14 61 4z"
        fill="url(#nx-inner)"
      />
      {/* red coronaria */}
      <g
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={focus ? 0.95 : 0.6}
        style={{ transition: "opacity 500ms ease" }}
      >
        <path d="M100 60v96" />
        <path d="M100 84c-14 4-24 14-30 26M100 84c14 4 24 14 30 26" />
        <path d="M100 116c-10 6-16 14-20 26M100 116c10 6 16 14 20 26" />
        <path d="M84 96c-8 2-14 8-18 16M116 96c8 2 14 8 18 16" />
      </g>
      {/* trazo ECG del núcleo */}
      <path
        d="M40 168h28l8-16 10 30 10-42 10 28h44"
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="2"
        strokeLinecap="round"
        className={reducedMotion ? "" : "animate-ecg"}
      />
    </svg>
  );
}
