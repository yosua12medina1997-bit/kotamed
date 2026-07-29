/** Primitivas visuales compartidas por las secciones académicas. */
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function Panel({
  title,
  subtitle,
  icon,
  accent,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-6 md:p-8 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2" style={{ color: accent }}>
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Kotaro Academy
            </span>
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  accent,
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost" | "outline";
  accent?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition disabled:opacity-40 disabled:pointer-events-none";
  const styles =
    variant === "solid"
      ? "text-white shadow-sm"
      : variant === "outline"
        ? "border border-primary/40 bg-primary/[0.06] text-primary hover:bg-primary/10"
        : "border border-border/60 bg-background/60 hover:border-primary/40";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles} ${className}`}
      style={variant === "solid" ? { background: accent } : undefined}
    >
      {loading && <Loader2 className="size-3 animate-spin" />}
      {children}
    </button>
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${inputCls} min-h-24 resize-y ${props.className ?? ""}`} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function Chip({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={accent ? { color: accent, borderColor: `${accent}44` } : undefined}
    >
      {children}
    </span>
  );
}

export function Metric({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
