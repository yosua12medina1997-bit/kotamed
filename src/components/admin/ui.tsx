/** Primitivas visuales compartidas por el Command Center administrativo. */
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground/80 mt-1">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full bg-background/60 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function Btn({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
      : variant === "danger"
        ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
        : "bg-background/60 border border-border text-foreground hover:bg-muted/50";
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "ok" | "warn" | "bad" | "muted" }) {
  const map = {
    ok: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warn: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    bad: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    muted: "bg-muted/50 text-muted-foreground border-border",
  } as const;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${map[tone]}`}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-background/70 backdrop-blur-sm overflow-y-auto">
      <div className={`glass rounded-3xl w-full ${wide ? "max-w-5xl" : "max-w-2xl"} p-6 my-4`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/60" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
