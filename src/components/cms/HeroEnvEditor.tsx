/**
 * Editor del HERO dinámico (KotaMed Dynamic Environment) para CMS Studio.
 * Permite al administrador configurar imagen base, textos, CTA, paneles
 * holográficos, especialidades interactivas, intensidades y transición.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";
import {
  DEFAULT_HERO_CONFIG,
  ENV_STATES,
  useHeroConfig,
  useSaveHeroConfig,
  type HeroConfig,
} from "@/lib/hero-env";

const input =
  "w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring";
const label = "text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

export function HeroEnvEditor() {
  const { data } = useHeroConfig();
  const save = useSaveHeroConfig();
  const [cfg, setCfg] = useState<HeroConfig>(data ?? DEFAULT_HERO_CONFIG);

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const set = <K extends keyof HeroConfig>(k: K, v: HeroConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight">Hero dinámico</h2>
          <p className="text-[12.5px] text-muted-foreground">
            KotaMed Dynamic Environment · 7 ambientes según la hora local del visitante.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCfg(DEFAULT_HERO_CONFIG)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/70 px-3.5 py-2 text-[12px] font-bold"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.5} />
            Restablecer
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() =>
              save
                .mutateAsync(cfg)
                .then(() => toast.success("Hero actualizado"))
                .catch((e) => toast.error(e?.message ?? "No se pudo guardar"))
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" strokeWidth={2.5} />
            )}
            Guardar
          </button>
        </div>
      </header>

      <section className="glass rounded-3xl bg-white/70 p-6">
        <h3 className="text-[13px] font-extrabold">Contenido</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className={label}>Título (usa saltos de línea)</div>
            <textarea
              rows={3}
              className={input}
              value={cfg.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <div>
              <div className={label}>Palabra destacada</div>
              <input className={input} value={cfg.highlight} onChange={(e) => set("highlight", e.target.value)} />
            </div>
            <div>
              <div className={label}>Color de acento</div>
              <input
                type="color"
                className="h-10 w-20 rounded-xl border border-border bg-white/80"
                value={cfg.accent}
                onChange={(e) => set("accent", e.target.value)}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className={label}>Descripción</div>
            <textarea
              rows={3}
              className={input}
              value={cfg.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div>
            <div className={label}>CTA principal</div>
            <input className={input} value={cfg.primaryLabel} onChange={(e) => set("primaryLabel", e.target.value)} />
            <input
              className={`${input} mt-2`}
              value={cfg.primaryHref}
              onChange={(e) => set("primaryHref", e.target.value)}
            />
          </div>
          <div>
            <div className={label}>CTA secundario</div>
            <input
              className={input}
              value={cfg.secondaryLabel}
              onChange={(e) => set("secondaryLabel", e.target.value)}
            />
            <input
              className={`${input} mt-2`}
              value={cfg.secondaryHref}
              onChange={(e) => set("secondaryHref", e.target.value)}
            />
          </div>
          <div>
            <div className={label}>Etiquetas inferiores (una por línea)</div>
            <textarea
              rows={4}
              className={input}
              value={cfg.chips.join("\n")}
              onChange={(e) => set("chips", e.target.value.split("\n").filter(Boolean))}
            />
          </div>
          <div>
            <div className={label}>Paneles holográficos (una por línea)</div>
            <textarea
              rows={4}
              className={input}
              value={cfg.panels.join("\n")}
              onChange={(e) => set("panels", e.target.value.split("\n").filter(Boolean))}
            />
          </div>
          <div className="md:col-span-2">
            <div className={label}>Imagen base (URL, opcional)</div>
            <input
              className={input}
              placeholder="Deja vacío para usar la escena por defecto"
              value={cfg.image ?? ""}
              onChange={(e) => set("image", e.target.value || null)}
            />
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl bg-white/70 p-6">
        <h3 className="text-[13px] font-extrabold">Ambiente e iluminación</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <Slider
            label={`Intensidad de luz · ${cfg.lightIntensity.toFixed(2)}`}
            min={0.5}
            max={1.5}
            step={0.05}
            value={cfg.lightIntensity}
            onChange={(v) => set("lightIntensity", v)}
          />
          <Slider
            label={`Intensidad del glow · ${cfg.glowIntensity.toFixed(2)}`}
            min={0}
            max={2}
            step={0.05}
            value={cfg.glowIntensity}
            onChange={(v) => set("glowIntensity", v)}
          />
          <Slider
            label={`Transición · ${cfg.transitionSeconds}s`}
            min={2}
            max={15}
            step={1}
            value={cfg.transitionSeconds}
            onChange={(v) => set("transitionSeconds", v)}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-5">
          <Toggle
            label="Modo automático según la hora"
            checked={cfg.autoMode}
            onChange={(v) => set("autoMode", v)}
          />
          <Toggle
            label="Interacción con órganos"
            checked={cfg.organInteraction}
            onChange={(v) => set("organInteraction", v)}
          />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ENV_STATES.map((s) => (
            <div key={s.key} className="rounded-2xl border border-border bg-white/60 p-3">
              <div className="text-[12px] font-extrabold">
                {s.emoji} {s.label}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Desde {String(Math.floor(s.from)).padStart(2, "0")}:
                {String(Math.round((s.from % 1) * 60)).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl bg-white/70 p-6">
        <h3 className="text-[13px] font-extrabold">Especialidades interactivas</h3>
        <p className="text-[12px] text-muted-foreground">
          Posición en porcentaje sobre la escena (X horizontal, Y vertical).
        </p>
        <div className="mt-4 space-y-3">
          {cfg.specialties.map((s, i) => (
            <div key={s.key} className="grid gap-2 rounded-2xl border border-border bg-white/60 p-3 md:grid-cols-[1fr_1fr_5rem_5rem_auto]">
              <input
                className={input}
                value={s.label}
                onChange={(e) => {
                  const next = [...cfg.specialties];
                  next[i] = { ...s, label: e.target.value };
                  set("specialties", next);
                }}
              />
              <input
                className={input}
                value={s.description}
                onChange={(e) => {
                  const next = [...cfg.specialties];
                  next[i] = { ...s, description: e.target.value };
                  set("specialties", next);
                }}
              />
              <input
                type="number"
                className={input}
                value={s.x}
                onChange={(e) => {
                  const next = [...cfg.specialties];
                  next[i] = { ...s, x: Number(e.target.value) };
                  set("specialties", next);
                }}
              />
              <input
                type="number"
                className={input}
                value={s.y}
                onChange={(e) => {
                  const next = [...cfg.specialties];
                  next[i] = { ...s, y: Number(e.target.value) };
                  set("specialties", next);
                }}
              />
              <button
                type="button"
                onClick={() => set("specialties", cfg.specialties.filter((x) => x.key !== s.key))}
                className="rounded-xl border border-border px-3 py-2 text-[11.5px] font-bold text-destructive"
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set("specialties", [
                ...cfg.specialties,
                {
                  key: `esp-${Date.now()}`,
                  label: "Nueva especialidad",
                  organ: "Órgano",
                  description: "Descripción breve.",
                  x: 66,
                  y: 40,
                  href: "/programas",
                },
              ])
            }
            className="rounded-xl border border-border bg-white/70 px-3.5 py-2 text-[12px] font-bold"
          >
            + Agregar especialidad
          </button>
        </div>
      </section>
    </div>
  );
}

function Slider({
  label: text,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className={label}>{text}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--primary)]"
      />
    </div>
  );
}

function Toggle({
  label: text,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[12.5px] font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--primary)]"
      />
      {text}
    </label>
  );
}
