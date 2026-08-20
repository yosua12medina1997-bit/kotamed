/** Primitivas visuales de Kota Emergency (Emergencia Pediátrica HNSEB). */
import type { ReactNode } from "react";
import { EMERG_STATUS, type EmergStatus } from "@/lib/emergency-os";

export { Modal, WardCard as EmergCard } from "@/components/ward/ui";

export function EmergDot({ status, size = 8 }: { status: EmergStatus; size?: number }) {
  const s = EMERG_STATUS[status] ?? EMERG_STATUS.estable;
  return (
    <span
      title={s.label}
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: s.color, boxShadow: `0 0 0 3px ${s.color}22` }}
    />
  );
}

export function EmergPill({ status, pulse }: { status: EmergStatus; pulse?: boolean }) {
  const s = EMERG_STATUS[status] ?? EMERG_STATUS.estable;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        pulse && status === "critico" ? "animate-pulse" : ""
      }`}
      style={{ background: `${s.color}18`, color: s.color }}
    >
      <EmergDot status={status} size={6} />
      {s.label}
    </span>
  );
}

/** Indicador compacto horizontal del panel de emergencia. */
export function EmergStat({
  label,
  value,
  hint,
  accent,
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left transition ${
        onClick ? "hover:border-border hover:shadow-sm" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-2xl font-black leading-none tracking-tight">{value}</div>
        {hint && <div className="mt-1 truncate text-[10.5px] text-muted-foreground">{hint}</div>}
      </div>
      {icon && (
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: `${accent}14`, color: accent }}
        >
          {icon}
        </span>
      )}
    </Tag>
  );
}

export function SoftBadge({
  children,
  color,
}: {
  children: ReactNode;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: `${color}16`, color }}
    >
      {children}
    </span>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-semibold">{value}</span>
    </div>
  );
}
