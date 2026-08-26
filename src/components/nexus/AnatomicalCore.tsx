/**
 * KOTAMED ANATOMICAL CORE™ — experiencia visual central del panel del alumno.
 * Holograma anatómico del cuerpo humano suspendido sobre un pedestal de luz,
 * con latido sutil en la posición del corazón, flotación en microgravedad,
 * parallax con inercia y cinco especialidades en cápsulas circulares mínimas.
 * Solo presentación.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Baby, Brain, HeartPulse, Soup, Wind, type LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
  left: number;
  top: number;
  /** foco anatómico resaltado (posición en % de la figura) */
  fx: number;
  fy: number;
  color: string;
}

const SPECIALTIES: Specialty[] = [
  { key: "neurologia", label: "Neurología", hint: "Sistema nervioso", icon: Brain, left: 23, top: 13, fx: 50, fy: 7, color: "56,190,235" },
  { key: "cardiologia", label: "Cardiología", hint: "Circulación", icon: HeartPulse, left: 79, top: 25, fx: 51, fy: 25, color: "236,110,140" },
  { key: "pediatria", label: "Pediatría", hint: "Ciclo vital", icon: Baby, left: 15, top: 37, fx: 50, fy: 45, color: "90,190,220" },
  { key: "neumologia", label: "Neumología", hint: "Vía aérea", icon: Wind, left: 18, top: 65, fx: 48, fy: 24, color: "150,170,235" },
  { key: "gastroenterologia", label: "Gastroenterología", hint: "Digestivo", icon: Soup, left: 80, top: 64, fx: 50, fy: 41, color: "230,150,180" },
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
      fig.style.transform = `perspective(1400px) rotateY(${cur.x * 5}deg) rotateX(${-cur.y * 3}deg) translate3d(${cur.x * 8}px, ${cur.y * 5}px, 0)`;
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
    <div ref={hostRef} className="relative mx-auto w-full max-w-[640px]">
      {/* Entorno limpio: aura suave detrás de la figura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            base === "light"
              ? "radial-gradient(58% 48% at 50% 40%, rgba(214,238,246,0.65), rgba(238,247,251,0.28) 60%, transparent 78%)"
              : "radial-gradient(58% 48% at 50% 38%, rgba(16,44,72,0.7), rgba(6,14,26,0.35) 62%, transparent 80%)",
          transition: "background 1200ms ease",
        }}
      />

      <div className="relative aspect-[4/5] w-full">
        {/* Holograma anatómico */}
        <div
          ref={figureRef}
          className="absolute inset-0 z-10 will-change-transform"
          style={{ transition: reducedMotion ? undefined : "transform 900ms cubic-bezier(0.16,1,0.3,1)" }}
        >
          <div className={`relative h-full w-full ${reducedMotion ? "" : "animate-float-slow"}`}>
            <img
              src={holoBody}
              alt="Holograma anatómico interactivo del cuerpo humano"
              loading="lazy"
              width={1024}
              height={1536}
              className="absolute inset-0 mx-auto h-[94%] w-auto max-w-none select-none object-contain"
              style={{
                filter: `drop-shadow(0 26px 60px rgba(40,130,190,${0.22 * intensity})) saturate(${1 + 0.05 * intensity})`,
                opacity: base === "light" ? 0.98 : 0.94,
              }}
              draggable={false}
            />

            {/* Latido en la posición del corazón */}
            {!lowPower && (
              <span
                aria-hidden
                className={`pointer-events-none absolute size-[11%] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  reducedMotion ? "" : "nexus-heartbeat"
                }`}
                style={{
                  left: "51%",
                  top: "25%",
                  background:
                    "radial-gradient(circle, rgba(236,90,120,0.4), rgba(236,90,120,0.12) 55%, transparent 72%)",
                  filter: "blur(12px)",
                  opacity: 0.7 * intensity,
                }}
              />
            )}

            {/* Foco anatómico de la especialidad activa */}
            {active && (
              <span
                aria-hidden
                className="pointer-events-none absolute size-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700"
                style={{
                  left: `${active.fx}%`,
                  top: `${active.fy}%`,
                  background: `radial-gradient(circle, rgba(${active.color},0.32), transparent 70%)`,
                  filter: "blur(18px)",
                }}
              />
            )}
          </div>
        </div>

        {/* Pedestal holográfico: disco + anillos concéntricos */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 z-0 w-full -translate-x-1/2">
          <div
            className="absolute bottom-[3.5%] left-1/2 h-[9%] w-[46%] -translate-x-1/2 rounded-[50%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(200,235,242,0.55))",
              boxShadow: "0 18px 44px -22px rgba(47,180,200,0.55)",
            }}
          />
          <div
            className="absolute bottom-[1.5%] left-1/2 h-[8%] w-[58%] -translate-x-1/2 rounded-[50%] border"
            style={{ borderColor: "rgba(47,190,205,0.35)" }}
          />
          <div
            className="absolute bottom-[-1%] left-1/2 h-[8%] w-[74%] -translate-x-1/2 rounded-[50%] border"
            style={{ borderColor: "rgba(47,190,205,0.18)" }}
          />
          <div
            className="absolute bottom-[2%] left-1/2 h-[12%] w-[62%] -translate-x-1/2 rounded-[50%]"
            style={{
              background: "radial-gradient(50% 60% at 50% 50%, rgba(47,205,210,0.28), transparent 72%)",
              filter: "blur(16px)",
              opacity: 0.9 * intensity,
            }}
          />
        </div>

        {/* Especialidades: círculo con icono + etiqueta debajo */}
        {SPECIALTIES.map((s) => {
          const on = focus === s.key;
          const Icon = s.icon;
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
              <Link to="/programas" className="flex flex-col items-center gap-2 text-center">
                <span
                  className="flex size-14 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-500"
                  style={{
                    borderColor: on ? "rgba(47,200,210,0.75)" : "rgba(120,170,190,0.28)",
                    background:
                      base === "light"
                        ? on
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.72)"
                        : on
                          ? "rgba(255,255,255,0.16)"
                          : "rgba(255,255,255,0.07)",
                    boxShadow: on
                      ? "0 14px 34px -16px rgba(47,200,210,0.75)"
                      : "0 10px 26px -20px rgba(20,60,80,0.5)",
                    transform: on ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  <Icon
                    className="size-5"
                    strokeWidth={1.6}
                    style={{ color: on ? `rgb(${s.color})` : "color-mix(in oklab, currentColor 55%, transparent)" }}
                  />
                </span>
                <span className="leading-tight">
                  <span className="block text-[9.5px] font-black uppercase tracking-[0.16em]">
                    {s.label}
                  </span>
                  <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[0.14em] opacity-50">
                    {s.hint}
                  </span>
                </span>
              </Link>
              {/* Conexión de luz hacia la figura */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-7 origin-left"
                style={{
                  width: `${Math.hypot(50 - s.left, 40 - s.top) * 3.1}px`,
                  height: "1px",
                  transform: `rotate(${(Math.atan2(40 - s.top, 50 - s.left) * 180) / Math.PI}deg)`,
                  background: "linear-gradient(90deg, rgba(47,200,210,0.55), rgba(47,200,210,0))",
                  opacity: on ? 0.9 : 0,
                  transition: "opacity 600ms ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Identidad KOTAMED */}
      <div className="relative z-20 mt-1 text-center">
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
