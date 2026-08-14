/** Piezas visuales compartidas del KotaMed Assessment Engine. */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MASTERY_META, masteryOf } from "@/lib/apex-types";

export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>
      {(title || right) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "info";
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground",
    good: "bg-emerald-50 text-emerald-600",
    warn: "bg-amber-50 text-amber-600",
    bad: "bg-rose-50 text-rose-600",
    info: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {icon && (
        <div className={cn("mb-3 grid size-9 place-items-center rounded-xl", tones[tone])}>{icon}</div>
      )}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Chip({
  children,
  className,
  onClick,
  active,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/60 text-muted-foreground",
        onClick && "transition hover:border-primary/60 hover:text-foreground",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function MasteryBar({ percent, label, total }: { percent: number; label: string; total?: number }) {
  const meta = MASTERY_META[masteryOf(percent)];
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-medium">
          <span className={cn("size-2 rounded-full", meta.dot)} />
          {label}
        </span>
        <span className={cn("font-semibold tabular-nums", meta.text)}>
          {percent}%{total ? <span className="ml-1 text-muted-foreground">({total})</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const window: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i < start + 5 && i <= pages; i++) window.push(i);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "rounded-lg border border-border px-2.5 py-1 text-xs disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        Mostrando {from} a {to} de {total.toLocaleString("es-PE")} preguntas
      </span>
      <div className="flex items-center gap-1">
        <button className={btn} onClick={() => onPage(1)} disabled={page === 1}>
          «
        </button>
        <button className={btn} onClick={() => onPage(page - 1)} disabled={page === 1}>
          ‹
        </button>
        {window.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs",
              p === page ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            {p}
          </button>
        ))}
        <button className={btn} onClick={() => onPage(page + 1)} disabled={page >= pages}>
          ›
        </button>
        <button className={btn} onClick={() => onPage(pages)} disabled={page >= pages}>
          »
        </button>
      </div>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    ghost: "border border-border bg-background hover:bg-muted",
    soft: "bg-muted text-foreground hover:bg-muted/70",
    danger: "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm sm:p-8">
      <div
        className={cn(
          "mx-auto w-full rounded-3xl border border-border bg-card p-5 shadow-xl",
          wide ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Cerrar">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
