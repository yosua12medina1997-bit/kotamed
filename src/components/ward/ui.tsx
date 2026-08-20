/** Primitivas visuales del Ward OS (Rotación Pediatría HNSEB). */
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { PATIENT_STATUS, type PatientStatus } from "@/lib/ward-os";

export function WardCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-border/60 bg-background/70 p-5 shadow-sm backdrop-blur ${className}`}
    >
      {(title || actions) && (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-black tracking-tight">
                {icon}
                <span className="truncate">{title}</span>
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={title || actions ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function StatusDot({ status, size = 8 }: { status: PatientStatus; size?: number }) {
  const s = PATIENT_STATUS[status] ?? PATIENT_STATUS.estable;
  return (
    <span
      title={s.label}
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: s.color,
        boxShadow: `0 0 0 3px ${s.color}22`,
      }}
    />
  );
}

export function StatusPill({ status }: { status: PatientStatus }) {
  const s = PATIENT_STATUS[status] ?? PATIENT_STATUS.estable;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: `${s.color}1a`, color: s.color }}
    >
      <StatusDot status={status} size={6} />
      {s.label}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full blur-2xl"
        style={{ background: `${accent}26` }}
      />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight" style={{ color: accent }}>
            {value}
          </div>
          {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl"
            style={{ background: `${accent}1a`, color: accent }}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm">
      <div
        className={`my-8 w-full ${wide ? "max-w-4xl" : "max-w-2xl"} rounded-3xl border border-border/60 bg-background p-6 shadow-2xl animate-scale-in`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-border/60 hover:bg-muted/60"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function Bar({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: accent }}
      />
    </div>
  );
}
