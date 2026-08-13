/**
 * Editor CMS de la experiencia post-matrícula (bienvenida).
 * Solo edita copy, visibilidad y mensajes por programa: nunca permisos,
 * autenticación ni datos de matrícula (esos vienen del sistema real).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  DEFAULT_WELCOME_CONFIG,
  useSaveWelcomeConfig,
  useWelcomeConfig,
  type WelcomeConfig,
} from "@/lib/welcome-cms";

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring";
const label = "text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

export function WelcomeEditor() {
  const { data } = useWelcomeConfig();
  const save = useSaveWelcomeConfig();
  const [cfg, setCfg] = useState<WelcomeConfig>(data ?? DEFAULT_WELCOME_CONFIG);

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const set = <K extends keyof WelcomeConfig>(k: K, v: WelcomeConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const onSave = async () => {
    try {
      await save.mutateAsync(cfg);
      toast.success("Experiencia post-matrícula actualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight">Bienvenida post-matrícula</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Textos y visibilidad de la pantalla que ve el alumno al confirmarse su matrícula
            (/bienvenida). Los datos de plan, programa y vigencia son reales.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCfg(DEFAULT_WELCOME_CONFIG)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <RotateCcw className="size-3.5" /> Restaurar
          </button>
          <button
            onClick={onSave}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Etiqueta superior">
          <input className={input} value={cfg.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
        </Field>
        <Field label="Título">
          <input className={input} value={cfg.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Subtítulo">
          <input className={input} value={cfg.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </Field>
        <Field label="Saludo (usa {nombre})">
          <input className={input} value={cfg.greeting} onChange={(e) => set("greeting", e.target.value)} />
        </Field>
        <Field label="Frase por defecto">
          <input className={input} value={cfg.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Texto del CTA principal">
          <input className={input} value={cfg.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} />
        </Field>
        <Field label="Título de progreso">
          <input
            className={input}
            value={cfg.progressTitle}
            onChange={(e) => set("progressTitle", e.target.value)}
          />
        </Field>
        <Field label="Mensaje sin progreso">
          <input
            className={input}
            value={cfg.progressEmpty}
            onChange={(e) => set("progressEmpty", e.target.value)}
          />
        </Field>
        <Field label="Ruta del centro de ayuda">
          <input className={input} value={cfg.helpUrl} onChange={(e) => set("helpUrl", e.target.value)} />
        </Field>
        <Field label="Confirmaciones (una por línea)">
          <textarea
            className={`${input} min-h-[76px]`}
            value={cfg.checks.join("\n")}
            onChange={(e) =>
              set(
                "checks",
                e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              )
            }
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-border/60 p-4">
        <div className={label}>Visibilidad de secciones</div>
        <div className="mt-3 flex flex-wrap gap-4">
          {(
            [
              ["showChecks", "Confirmaciones"],
              ["showPlanCard", "Plan y programa"],
              ["showQuickLinks", "Accesos rápidos"],
              ["showProgress", "Progreso inicial"],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="inline-flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={cfg[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              {text}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className={label}>Frases por programa</div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              La clave se compara con el slug o título del programa matriculado.
            </p>
          </div>
          <button
            onClick={() =>
              set("programMessages", [...cfg.programMessages, { key: "", label: "", message: "" }])
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Plus className="size-3.5" /> Añadir
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {cfg.programMessages.map((m, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[140px_160px_1fr_auto]">
              <input
                className={input}
                placeholder="clave (slug)"
                value={m.key}
                onChange={(e) => {
                  const next = [...cfg.programMessages];
                  next[i] = { ...m, key: e.target.value };
                  set("programMessages", next);
                }}
              />
              <input
                className={input}
                placeholder="etiqueta"
                value={m.label}
                onChange={(e) => {
                  const next = [...cfg.programMessages];
                  next[i] = { ...m, label: e.target.value };
                  set("programMessages", next);
                }}
              />
              <input
                className={input}
                placeholder="mensaje contextual"
                value={m.message}
                onChange={(e) => {
                  const next = [...cfg.programMessages];
                  next[i] = { ...m, message: e.target.value };
                  set("programMessages", next);
                }}
              />
              <button
                onClick={() =>
                  set(
                    "programMessages",
                    cfg.programMessages.filter((_, idx) => idx !== i),
                  )
                }
                className="rounded-xl border border-border px-3 text-muted-foreground hover:text-destructive"
                aria-label="Eliminar frase"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label: text, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className={label}>{text}</div>
      {children}
    </div>
  );
}
