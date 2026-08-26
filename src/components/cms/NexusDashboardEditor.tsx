/**
 * Editor CMS del Dashboard Nexus (panel del alumno).
 * Edita copy, visibilidad de paneles y accesos rápidos. No toca matrículas,
 * permisos ni roles: esos datos siempre provienen del sistema real.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  DEFAULT_NEXUS_DASHBOARD,
  useNexusDashboardConfig,
  useSaveNexusDashboardConfig,
  type DashboardAction,
  type NexusDashboardConfig,
} from "@/lib/nexus-dashboard-cms";

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring";
const labelCls = "text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

const ICONS: DashboardAction["icon"][] = ["book", "case", "brain", "calc", "library", "spark"];
const ICON_LABEL: Record<DashboardAction["icon"], string> = {
  book: "Clase / libro",
  case: "Caso clínico",
  brain: "Flashcards",
  calc: "Calculadora",
  library: "Biblioteca",
  spark: "IA / destacado",
};

export function NexusDashboardEditor() {
  const { data } = useNexusDashboardConfig();
  const save = useSaveNexusDashboardConfig();
  const [cfg, setCfg] = useState<NexusDashboardConfig>(data ?? DEFAULT_NEXUS_DASHBOARD);

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const set = <K extends keyof NexusDashboardConfig>(k: K, v: NexusDashboardConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const setAction = (i: number, patch: Partial<DashboardAction>) =>
    setCfg((c) => ({
      ...c,
      todayActions: c.todayActions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    }));

  const onSave = async () => {
    try {
      await save.mutateAsync(cfg);
      toast.success("Dashboard Nexus actualizado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight">Dashboard Nexus (alumno)</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Controla el 100% de los textos, accesos y paneles visibles del panel del alumno
            (/dashboard). El progreso, las matrículas y los programas siguen siendo reales.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <ExternalLink className="size-3.5" /> Previsualizar
          </a>
          <button
            onClick={() => setCfg(DEFAULT_NEXUS_DASHBOARD)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <RotateCcw className="size-3.5" /> Restaurar
          </button>
          <button
            onClick={onSave}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Guardar
          </button>
        </div>
      </header>

      <Section title="Cabecera">
        <Field label="Titular (usa {saludo} y {nombre})">
          <input className={input} value={cfg.headline} onChange={(e) => set("headline", e.target.value)} />
        </Field>
        <Field label="Subtítulo (cuando no hay programas)">
          <input className={input} value={cfg.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </Field>
      </Section>

      <Section title="Continúa donde lo dejaste">
        <Field label="Etiqueta">
          <input
            className={input}
            value={cfg.continueEyebrow}
            onChange={(e) => set("continueEyebrow", e.target.value)}
          />
        </Field>
        <Field label="Título sin programa">
          <input
            className={input}
            value={cfg.continueEmptyTitle}
            onChange={(e) => set("continueEmptyTitle", e.target.value)}
          />
        </Field>
        <Field label="Botón principal">
          <input
            className={input}
            value={cfg.continueCta}
            onChange={(e) => set("continueCta", e.target.value)}
          />
        </Field>
        <Field label="Botón sin programa">
          <input
            className={input}
            value={cfg.continueEmptyCta}
            onChange={(e) => set("continueEmptyCta", e.target.value)}
          />
        </Field>
        <Field label="Etiqueta de avance">
          <input
            className={input}
            value={cfg.completedLabel}
            onChange={(e) => set("completedLabel", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Cursos y progreso">
        <Field label="Título de cursos">
          <input
            className={input}
            value={cfg.coursesTitle}
            onChange={(e) => set("coursesTitle", e.target.value)}
          />
        </Field>
        <Field label="Enlace “ver todos”">
          <input
            className={input}
            value={cfg.coursesLinkLabel}
            onChange={(e) => set("coursesLinkLabel", e.target.value)}
          />
        </Field>
        <Field label="Máximo de tarjetas (1–12)">
          <input
            type="number"
            min={1}
            max={12}
            className={input}
            value={cfg.coursesMax}
            onChange={(e) => set("coursesMax", Number(e.target.value) || 3)}
          />
        </Field>
        <Field label="Título de progreso">
          <input
            className={input}
            value={cfg.progressTitle}
            onChange={(e) => set("progressTitle", e.target.value)}
          />
        </Field>
        <Field label="Botón de progreso">
          <input
            className={input}
            value={cfg.progressCta}
            onChange={(e) => set("progressCta", e.target.value)}
          />
        </Field>
        <Field label="Etiqueta de nivel">
          <input
            className={input}
            value={cfg.levelLabel}
            onChange={(e) => set("levelLabel", e.target.value)}
          />
        </Field>
        <Field label="Nodos del Medical Core (3–8)">
          <input
            type="number"
            min={3}
            max={8}
            className={input}
            value={cfg.coreMaxNodes}
            onChange={(e) => set("coreMaxNodes", Number(e.target.value) || 5)}
          />
        </Field>
      </Section>

      <Section title="Kota AI">
        <Field label="Título">
          <input className={input} value={cfg.aiTitle} onChange={(e) => set("aiTitle", e.target.value)} />
        </Field>
        <Field label="Subtítulo">
          <input
            className={input}
            value={cfg.aiSubtitle}
            onChange={(e) => set("aiSubtitle", e.target.value)}
          />
        </Field>
        <Field label="Botón">
          <input className={input} value={cfg.aiCta} onChange={(e) => set("aiCta", e.target.value)} />
        </Field>
        <Field label="Destino (ruta interna)">
          <input className={input} value={cfg.aiTo} onChange={(e) => set("aiTo", e.target.value)} />
        </Field>
      </Section>

      <section className="rounded-2xl border border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold">{cfg.todayTitle || "Hoy para ti"}</h3>
            <p className="text-[12px] text-muted-foreground">
              Accesos rápidos del panel lateral. Deja el destino vacío para que apunte al programa
              activo del alumno.
            </p>
          </div>
          <button
            onClick={() =>
              set("todayActions", [
                ...cfg.todayActions,
                { title: "Nuevo acceso", hint: "", to: "/programas", icon: "spark" },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Plus className="size-3.5" /> Añadir acceso
          </button>
        </div>
        <div className="mt-3">
          <Field label="Título del bloque">
            <input
              className={input}
              value={cfg.todayTitle}
              onChange={(e) => set("todayTitle", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-3 space-y-2">
          {cfg.todayActions.map((a, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-border/60 p-2 sm:grid-cols-[1fr_1fr_1fr_150px_auto]"
            >
              <input
                className={input}
                placeholder="Título"
                value={a.title}
                onChange={(e) => setAction(i, { title: e.target.value })}
              />
              <input
                className={input}
                placeholder="Descripción"
                value={a.hint}
                onChange={(e) => setAction(i, { hint: e.target.value })}
              />
              <input
                className={input}
                placeholder="/ruta (vacío = programa activo)"
                value={a.to}
                onChange={(e) => setAction(i, { to: e.target.value })}
              />
              <select
                className={input}
                value={a.icon}
                onChange={(e) => setAction(i, { icon: e.target.value as DashboardAction["icon"] })}
              >
                {ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ICON_LABEL[ic]}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  set(
                    "todayActions",
                    cfg.todayActions.filter((_, idx) => idx !== i),
                  )
                }
                className="inline-flex items-center justify-center rounded-xl border border-border px-3 text-destructive"
                aria-label="Eliminar acceso"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 p-4">
        <h3 className="text-sm font-extrabold">Paneles visibles</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle
            label="Continúa donde lo dejaste"
            value={cfg.showContinue}
            onChange={(v) => set("showContinue", v)}
          />
          <Toggle label="Medical Core" value={cfg.showCore} onChange={(v) => set("showCore", v)} />
          <Toggle
            label="Cursos en progreso"
            value={cfg.showCourses}
            onChange={(v) => set("showCourses", v)}
          />
          <Toggle
            label="Progreso general"
            value={cfg.showProgress}
            onChange={(v) => set("showProgress", v)}
          />
          <Toggle label="Hoy para ti" value={cfg.showToday} onChange={(v) => set("showToday", v)} />
          <Toggle label="Tarjeta Kota AI" value={cfg.showAi} onChange={(v) => set("showAi", v)} />
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 p-4">
      <h3 className="text-sm font-extrabold">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-[12.5px] font-semibold">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
