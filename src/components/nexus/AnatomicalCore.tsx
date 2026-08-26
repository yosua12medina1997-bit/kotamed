/**
 * KOTAMED ANATOMICAL CORE™ — experiencia visual central del panel del alumno.
 * Holograma anatómico del cuerpo humano suspendido en un entorno médico mínimo,
 * con latido sutil en la posición del corazón, flotación en microgravedad,
 * parallax con inercia y cinco especialidades en cápsulas discretas.
 * Solo presentación.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import holoBody from "@/assets/nexus/holo-body.png";

export type CoreFocus =
  | "cardiologia"
  | "pediatria"
  | "neurologia"
  | "neumologia"
  | "gastroenterologia"
  | null;

interface Specialty {
  key: Exclude<CoreFocus, null>;
  label: string;
  hint: string;
  left: number;
  top: number;
  /** foco anatómico resaltado (posición en % de la figura) */
  fx: number;
  fy: number;
  color: string;
}

const SPECIALTIES: Specialty[] = [
  { key: "neurologia", label: "Neurología", hint: "Sistema nervioso", left: 50, top: 4, fx: 50, fy: 6, color: "56,220,255" },
  { key: "pediatria", label: "Pediatría", hint: "Ciclo vital", left: 11, top: 30, fx: 50, fy: 45, color: "255,190,150" },
  { key: "cardiologia", label: "Cardiología", hint: "Circulación", left: 89, top: 30, fx: 51, fy: 26, color: "255,90,120" },
  { key: "neumologia", label: "Neumología", hint: "Vía aérea", left: 13, top: 72, fx: 48, fy: 25, color: "170,140,255" },
  { key: "gastroenterologia", label: "Gastroenterología", hint: "Digestivo", left: 87, top: 72, fx: 50, fy: 41, color: "255,140,190" },
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
  contextLabel?: string;
}) {
  const [focus, setFocus] = useState<CoreFocus>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);

  // Parallax con inercia (respuesta pesada y retardada)
  useEffect(() => {
    if (reducedMotion) return;
    const host = hostRef.current;
    const fig = figureRef.current;
    if (!host || !fig) return;
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
      cur.x += (target.x - cur.x) * 0.03;
      cur.y += (target.y - cur.y) * 0.03;
      fig.style.transform = `perspective(1300px) rotateY(${cur.x * 7}deg) rotateX(${-cur.y * 4.5}deg) translate3d(${cur.x * 10}px, ${cur.y * 6}px, 0)`;
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
  }, [reducedMotion]);

  const active = SPECIALTIES.find((s) => s.key === focus);

  return (
    <div ref={hostRef} className="relative mx-auto w-full max-w-[620px]">
      {/* Entorno médico profundo (mínimo) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3rem]"
        style={{
          background:
            base === "light"
              ? "radial-gradient(70% 58% at 50% 38%, rgba(226,238,250,0.95), rgba(240,246,252,0.55) 62%, transparent 80%)"
              : "radial-gradient(68% 58% at 50% 34%, rgba(12,26,48,0.95), rgba(5,11,22,0.7) 62%, transparent 82%)",
          transition: "background 1200ms ease",
        }}
      />

      <div className="relative aspect-[3/4] w-full">
        {/* Holograma anatómico */}
        <div
          ref={figureRef}
          className="absolute inset-0 will-change-transform"
          style={{ transition: reducedMotion ? undefined : "transform 900ms cubic-bezier(0.16,1,0.3,1)" }}
        >
          <div className={`relative h-full w-full ${reducedMotion ? "" : "animate-float-slow"}`}>
            <img
              src={holoBody}
              alt="Holograma anatómico interactivo del cuerpo humano"
              loading="lazy"
              width={1024}
              height={1536}
              className="absolute inset-0 mx-auto h-full w-auto max-w-none select-none object-contain"
              style={{
                filter: `drop-shadow(0 24px 60px rgba(30,120,190,${0.35 * intensity})) saturate(${1 + 0.08 * intensity}) brightness(${base === "light" ? 0.98 : 1.05})`,
                opacity: base === "light" ? 0.95 : 1,
                mixBlendMode: base === "light" ? "normal" : "screen",
              }}
              draggable={false}
            />

            {/* Latido en la posición del corazón */}
            {!lowPower && (
              <span
                aria-hidden
                className={`pointer-events-none absolute size-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  reducedMotion ? "" : "nexus-heartbeat"
                }`}
                style={{
                  left: "51%",
                  top: "26%",
                  background:
                    "radial-gradient(circle, rgba(255,90,120,0.55), rgba(255,90,120,0.18) 55%, transparent 72%)",
                  filter: "blur(10px)",
                  opacity: 0.9 * intensity,
                }}
              />
            )}

            {/* Foco anatómico de la especialidad activa */}
            {active && (
              <span
                aria-hidden
                className="pointer-events-none absolute size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700"
                style={{
                  left: `${active.fx}%`,
                  top: `${active.fy}%`,
                  background: `radial-gradient(circle, rgba(${active.color},0.4), transparent 70%)`,
                  filter: "blur(16px)",
                }}
              />
            )}
          </div>
        </div>

        {/* Pedestal holográfico KOTAMED */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[2%] left-1/2 h-[9%] w-[56%] -translate-x-1/2 rounded-[50%]"
          style={{
            background:
              "radial-gradient(50% 60% at 50% 50%, rgba(47,216,208,0.35), transparent 72%)",
            filter: "blur(14px)",
            opacity: 0.85 * intensity,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[3%] left-1/2 h-[6%] w-[42%] -translate-x-1/2 rounded-[50%] border"
          style={{ borderColor: "rgba(47,216,208,0.35)" }}
        />

        {/* Especialidades: cápsulas mínimas */}
        {SPECIALTIES.map((s) => {
          const on = focus === s.key;
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
                className="flex flex-col items-center gap-0.5 rounded-full border px-3.5 py-1.5 text-center transition-all duration-500"
                style={{
                  borderColor: on ? "rgba(47,216,208,0.7)" : "color-mix(in oklab, currentColor 18%, transparent)",
                  background: on ? "color-mix(in oklab, var(--nexus-teal) 14%, transparent)" : "transparent",
                  boxShadow: on ? "0 8px 30px -12px rgba(47,216,208,0.6)" : "none",
                  opacity: on ? 1 : 0.6,
                }}
              >
                <span className="text-[9px] font-black uppercase leading-none tracking-[0.18em]">
                  {s.label}
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] opacity-60">
                  {s.hint}
                </span>
              </Link>
              {/* Conexión de luz hacia la figura */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 origin-left"
                style={{
                  width: `${Math.hypot(50 - s.left, 40 - s.top) * 3.1}px`,
                  height: "1px",
                  transform: `rotate(${(Math.atan2(40 - s.top, 50 - s.left) * 180) / Math.PI}deg)`,
                  background: "linear-gradient(90deg, rgba(47,216,208,0.7), rgba(47,216,208,0))",
                  opacity: on ? 0.9 : 0,
                  transition: "opacity 600ms ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Identidad KOTAMED */}
      <div className="relative z-20 -mt-2 text-center">
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
