/**
 * CMS Studio → módulo "Programas (Hub)".
 * Permite editar hero, etapas, programas (título, texto, icono, imagen, ruta,
 * planes, destacado, orden, visibilidad), cifras, CTA, ventajas y SEO
 * de la página pública /programas.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_HUB_CONFIG,
  HUB_SECTION_LABEL,
  useHubConfig,
  useSaveHubConfig,
  type HubConfig,
  type HubProgram,
  type HubSectionId,
} from "@/lib/programas-cms";

const input =
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60";
const label = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1";
const card = "rounded-2xl border border-border/60 bg-background p-3 space-y-3";

function Field({
  title,
  value,
  onChange,
  area,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
}) {
  return (
    <div>
      <span className={label}>{title}</span>
      {area ? (
        <textarea className={`${input} min-h-[64px]`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function ProgramHubEditor() {
  const { data, isLoading } = useHubConfig();
  const save = useSaveHubConfig();
  const [cfg, setCfg] = useState<HubConfig | null>(null);

  useEffect(() => {
    if (data && !cfg) setCfg(structuredClone(data));
  }, [data, cfg]);

  if (isLoading || !cfg) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando hub de programas…
      </div>
    );
  }

  const patch = (fn: (c: HubConfig) => void) =>
    setCfg((prev) => {
      const next = structuredClone(prev!);
      fn(next);
      return next;
    });

  const moveSection = (i: number, dir: -1 | 1) =>
    patch((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.order.length) return;
      [c.order[i], c.order[j]] = [c.order[j]!, c.order[i]!];
    });

  const moveProgram = (id: string, dir: -1 | 1) =>
    patch((c) => {
      const i = c.programs.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.programs.length) return;
      [c.programs[i], c.programs[j]] = [c.programs[j]!, c.programs[i]!];
    });

  const addProgram = () =>
    patch((c) => {
      const stage = c.stages[0]?.id ?? "fundamentos";
      const p: HubProgram = {
        id: `prog-${Date.now()}`,
        stage,
        title: "Nuevo programa",
        text: "Describe este programa.",
        icon: "GraduationCap",
        image: "",
        href: "/programas",
        ctaLabel: "Explorar",
        plans: [],
        visible: true,
      };
      c.programs.push(p);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background p-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Programas (Hub) · /programas</h2>
          <p className="text-[11px] text-muted-foreground">
            Página pública informativa. Los planes se gestionan aparte.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCfg(structuredClone(DEFAULT_HUB_CONFIG))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
          >
            <RotateCcw className="size-3.5" /> Restaurar
          </button>
          <button
            onClick={() =>
              save.mutate(cfg, {
                onSuccess: () => toast.success("Hub de programas publicado"),
                onError: (e: unknown) => toast.error((e as Error).message),
              })
            }
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar y publicar
          </button>
        </div>
      </div>

      {/* Orden y visibilidad de secciones */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Secciones</h3>
        <div className="space-y-1.5">
          {cfg.order.map((id, i) => (
            <div key={id} className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5">
              <span className="flex-1 text-xs font-semibold">{HUB_SECTION_LABEL[id as HubSectionId]}</span>
              <button onClick={() => moveSection(i, -1)} className="rounded p-1 hover:bg-muted">
                <ArrowUp className="size-3.5" />
              </button>
              <button onClick={() => moveSection(i, 1)} className="rounded p-1 hover:bg-muted">
                <ArrowDown className="size-3.5" />
              </button>
              <button
                onClick={() => patch((c) => (c.visible[id] = !c.visible[id]))}
                className="rounded p-1 hover:bg-muted"
                title="Mostrar / ocultar"
              >
                {cfg.visible[id] ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hero</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field title="Etiqueta superior" value={cfg.hero.breadcrumb} onChange={(v) => patch((c) => (c.hero.breadcrumb = v))} />
          <Field title="Resaltado" value={cfg.hero.highlight} onChange={(v) => patch((c) => (c.hero.highlight = v))} />
        </div>
        <Field title="Título" value={cfg.hero.title} onChange={(v) => patch((c) => (c.hero.title = v))} area />
        <Field title="Descripción" value={cfg.hero.description} onChange={(v) => patch((c) => (c.hero.description = v))} area />
        <div className="grid gap-2 md:grid-cols-2">
          <Field title="CTA principal" value={cfg.hero.primaryLabel} onChange={(v) => patch((c) => (c.hero.primaryLabel = v))} />
          <Field title="Ruta CTA principal" value={cfg.hero.primaryHref} onChange={(v) => patch((c) => (c.hero.primaryHref = v))} />
          <Field title="CTA secundario" value={cfg.hero.secondaryLabel} onChange={(v) => patch((c) => (c.hero.secondaryLabel = v))} />
          <Field title="Ruta CTA secundario" value={cfg.hero.secondaryHref} onChange={(v) => patch((c) => (c.hero.secondaryHref = v))} />
          <Field title="Imagen de fondo (URL, opcional)" value={cfg.hero.image} onChange={(v) => patch((c) => (c.hero.image = v))} />
        </div>
        <div className="space-y-1.5">
          <span className={label}>Chips (icono · texto)</span>
          {cfg.hero.chips.map((ch, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${input} max-w-[150px]`}
                value={ch.icon}
                onChange={(e) => patch((c) => (c.hero.chips[i]!.icon = e.target.value))}
              />
              <input
                className={input}
                value={ch.label}
                onChange={(e) => patch((c) => (c.hero.chips[i]!.label = e.target.value))}
              />
              <button onClick={() => patch((c) => c.hero.chips.splice(i, 1))} className="rounded p-1.5 hover:bg-destructive/10">
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </div>
          ))}
          <button
            onClick={() => patch((c) => c.hero.chips.push({ icon: "Sparkles", label: "Nuevo" }))}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:bg-muted/50"
          >
            <Plus className="size-3" /> Añadir chip
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={cfg.hero.showEnvControls}
            onChange={(e) => patch((c) => (c.hero.showEnvControls = e.target.checked))}
          />
          Mostrar control de ambiente (solo administradores)
        </label>
      </div>

      {/* Intro + línea de evolución */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Línea de evolución</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field title="Título" value={cfg.intro.title} onChange={(v) => patch((c) => (c.intro.title = v))} />
          <Field title="Resaltado" value={cfg.intro.highlight} onChange={(v) => patch((c) => (c.intro.highlight = v))} />
          <Field title="Subtítulo" value={cfg.intro.subtitle} onChange={(v) => patch((c) => (c.intro.subtitle = v))} />
          <Field title="Botón mapa" value={cfg.intro.mapLabel} onChange={(v) => patch((c) => (c.intro.mapLabel = v))} />
          <Field title="Ruta del botón" value={cfg.intro.mapHref} onChange={(v) => patch((c) => (c.intro.mapHref = v))} />
        </div>
        <div className="space-y-1.5">
          <span className={label}>Hitos</span>
          {cfg.timeline.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input className={input} value={t} onChange={(e) => patch((c) => (c.timeline[i] = e.target.value))} />
              <button onClick={() => patch((c) => c.timeline.splice(i, 1))} className="rounded p-1.5 hover:bg-destructive/10">
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </div>
          ))}
          <button
            onClick={() => patch((c) => c.timeline.push("Nueva etapa"))}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:bg-muted/50"
          >
            <Plus className="size-3" /> Añadir hito
          </button>
        </div>
      </div>

      {/* Etapas */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Etapas</h3>
        {cfg.stages.map((s, i) => (
          <div key={s.id} className="space-y-2 rounded-xl border border-border/50 p-2">
            <div className="flex items-center gap-2">
              <input
                className={`${input} max-w-[70px]`}
                value={s.n}
                onChange={(e) => patch((c) => (c.stages[i]!.n = e.target.value))}
              />
              <input
                className={input}
                value={s.label}
                onChange={(e) => patch((c) => (c.stages[i]!.label = e.target.value))}
              />
              <input
                className={`${input} max-w-[150px]`}
                value={s.icon}
                onChange={(e) => patch((c) => (c.stages[i]!.icon = e.target.value))}
              />
              <button
                onClick={() => patch((c) => (c.stages[i]!.visible = c.stages[i]!.visible === false))}
                className="rounded p-1.5 hover:bg-muted"
              >
                {s.visible === false ? <EyeOff className="size-3.5 text-muted-foreground" /> : <Eye className="size-3.5" />}
              </button>
              <button onClick={() => patch((c) => c.stages.splice(i, 1))} className="rounded p-1.5 hover:bg-destructive/10">
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </div>
            <input
              className={input}
              value={s.text}
              onChange={(e) => patch((c) => (c.stages[i]!.text = e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground">ID técnico: {s.id}</p>
          </div>
        ))}
        <button
          onClick={() =>
            patch((c) =>
              c.stages.push({
                id: `etapa-${Date.now()}`,
                n: String(c.stages.length + 1).padStart(2, "0"),
                label: "Nueva etapa",
                text: "Describe esta etapa.",
                icon: "Layers",
                visible: true,
              }),
            )
          }
          className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:bg-muted/50"
        >
          <Plus className="size-3" /> Añadir etapa
        </button>
      </div>

      {/* Programas */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Programas</h3>
          <button
            onClick={addProgram}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:bg-muted/50"
          >
            <Plus className="size-3" /> Añadir programa
          </button>
        </div>
        <div className="space-y-2">
          {cfg.programs.map((p, i) => (
            <div key={p.id} className="space-y-2 rounded-xl border border-border/50 p-2">
              <div className="flex items-center gap-2">
                <input
                  className={input}
                  value={p.title}
                  onChange={(e) => patch((c) => (c.programs[i]!.title = e.target.value))}
                />
                <select
                  className={`${input} max-w-[170px]`}
                  value={p.stage}
                  onChange={(e) => patch((c) => (c.programs[i]!.stage = e.target.value))}
                >
                  {cfg.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button onClick={() => moveProgram(p.id, -1)} className="rounded p-1 hover:bg-muted">
                  <ArrowUp className="size-3.5" />
                </button>
                <button onClick={() => moveProgram(p.id, 1)} className="rounded p-1 hover:bg-muted">
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  onClick={() => patch((c) => (c.programs[i]!.visible = c.programs[i]!.visible === false))}
                  className="rounded p-1 hover:bg-muted"
                >
                  {p.visible === false ? <EyeOff className="size-3.5 text-muted-foreground" /> : <Eye className="size-3.5" />}
                </button>
                <button onClick={() => patch((c) => c.programs.splice(i, 1))} className="rounded p-1 hover:bg-destructive/10">
                  <Trash2 className="size-3.5 text-destructive" />
                </button>
              </div>
              <input
                className={input}
                value={p.text}
                onChange={(e) => patch((c) => (c.programs[i]!.text = e.target.value))}
              />
              <div className="grid gap-2 md:grid-cols-2">
                <Field title="Icono (lucide)" value={p.icon} onChange={(v) => patch((c) => (c.programs[i]!.icon = v))} />
                <Field title="Imagen (URL)" value={p.image} onChange={(v) => patch((c) => (c.programs[i]!.image = v))} />
                <Field title="Ruta" value={p.href} onChange={(v) => patch((c) => (c.programs[i]!.href = v))} />
                <Field title="Texto del botón" value={p.ctaLabel} onChange={(v) => patch((c) => (c.programs[i]!.ctaLabel = v))} />
                <Field
                  title="Planes (separados por coma)"
                  value={p.plans.join(", ")}
                  onChange={(v) =>
                    patch(
                      (c) =>
                        (c.programs[i]!.plans = v
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)),
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={!!p.featured}
                  onChange={(e) => patch((c) => (c.programs[i]!.featured = e.target.checked))}
                />
                Destacado
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Cifras */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cifras</h3>
        {cfg.stats.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={`${input} max-w-[110px]`}
              value={s.value}
              onChange={(e) => patch((c) => (c.stats[i]!.value = e.target.value))}
            />
            <input className={input} value={s.label} onChange={(e) => patch((c) => (c.stats[i]!.label = e.target.value))} />
            <input
              className={`${input} max-w-[150px]`}
              value={s.icon}
              onChange={(e) => patch((c) => (c.stats[i]!.icon = e.target.value))}
            />
            <button onClick={() => patch((c) => c.stats.splice(i, 1))} className="rounded p-1.5 hover:bg-destructive/10">
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          </div>
        ))}
        <button
          onClick={() => patch((c) => c.stats.push({ value: "0", label: "Nueva cifra", icon: "Sparkles" }))}
          className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:bg-muted/50"
        >
          <Plus className="size-3" /> Añadir cifra
        </button>
      </div>

      {/* CTA final */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Banner final</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <Field title="Título" value={cfg.cta.title} onChange={(v) => patch((c) => (c.cta.title = v))} />
          <Field title="Resaltado" value={cfg.cta.highlight} onChange={(v) => patch((c) => (c.cta.highlight = v))} />
          <Field title="Cierre" value={cfg.cta.tail} onChange={(v) => patch((c) => (c.cta.tail = v))} />
        </div>
        <Field title="Subtítulo" value={cfg.cta.subtitle} onChange={(v) => patch((c) => (c.cta.subtitle = v))} area />
        <div className="grid gap-2 md:grid-cols-2">
          <Field title="CTA principal" value={cfg.cta.primaryLabel} onChange={(v) => patch((c) => (c.cta.primaryLabel = v))} />
          <Field title="Ruta principal" value={cfg.cta.primaryHref} onChange={(v) => patch((c) => (c.cta.primaryHref = v))} />
          <Field title="CTA secundario" value={cfg.cta.secondaryLabel} onChange={(v) => patch((c) => (c.cta.secondaryLabel = v))} />
          <Field title="Ruta secundaria" value={cfg.cta.secondaryHref} onChange={(v) => patch((c) => (c.cta.secondaryHref = v))} />
          <Field title="Imagen" value={cfg.cta.image} onChange={(v) => patch((c) => (c.cta.image = v))} />
        </div>
      </div>

      {/* Ventajas */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ventajas</h3>
        {cfg.features.map((f, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={`${input} max-w-[150px]`}
              value={f.icon}
              onChange={(e) => patch((c) => (c.features[i]!.icon = e.target.value))}
            />
            <input
              className={`${input} max-w-[190px]`}
              value={f.title}
              onChange={(e) => patch((c) => (c.features[i]!.title = e.target.value))}
            />
            <input className={input} value={f.text} onChange={(e) => patch((c) => (c.features[i]!.text = e.target.value))} />
            <button onClick={() => patch((c) => c.features.splice(i, 1))} className="rounded p-1.5 hover:bg-destructive/10">
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          </div>
        ))}
        <button
          onClick={() => patch((c) => c.features.push({ icon: "Sparkles", title: "Nueva ventaja", text: "Detalle." }))}
          className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:bg-muted/50"
        >
          <Plus className="size-3" /> Añadir ventaja
        </button>
      </div>

      {/* SEO */}
      <div className={card}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">SEO</h3>
        <Field title="Título" value={cfg.seo.title} onChange={(v) => patch((c) => (c.seo.title = v))} />
        <Field title="Descripción" value={cfg.seo.description} onChange={(v) => patch((c) => (c.seo.description = v))} area />
        <Field title="Imagen OG (URL absoluta)" value={cfg.seo.ogImage} onChange={(v) => patch((c) => (c.seo.ogImage = v))} />
      </div>
    </div>
  );
}
