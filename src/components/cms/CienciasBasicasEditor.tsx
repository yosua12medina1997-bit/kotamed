/**
 * CMS Studio → módulo "Ciencias Básicas".
 * Edita todo el contenido de /p/ciencias-basicas: hero, cifras, secciones,
 * áreas (crear, duplicar, ocultar, ordenar, eliminar), IA, 3D, CTA y SEO.
 * Solo administradores pueden guardar (RLS de ui_menu_prefs).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  CB_SECTION_LABEL,
  DEFAULT_CB_CONFIG,
  useCbConfig,
  useSaveCbConfig,
  type CbArea,
  type CbConfig,
  type CbSectionId,
} from "@/lib/ciencias-basicas-cms";

const input =
  "w-full rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60";
const label = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

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
    <label className="block space-y-1">
      <span className={label}>{title}</span>
      {area ? (
        <textarea className={`${input} min-h-[64px]`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function StringList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className={label}>{title}</span>
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            className={input}
            value={it}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded-lg border border-border/70 px-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2 py-1 text-[11px] font-bold hover:bg-muted/50"
      >
        <Plus className="size-3" /> Añadir
      </button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background p-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-primary">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function CienciasBasicasEditor() {
  const { data, isLoading } = useCbConfig();
  const save = useSaveCbConfig();
  const [cfg, setCfg] = useState<CbConfig | null>(null);

  useEffect(() => {
    if (data && !cfg) setCfg(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading || !cfg) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const patch = (p: Partial<CbConfig>) => setCfg({ ...cfg, ...p });
  const areas = cfg.areas.items;
  const setAreas = (items: CbArea[]) => patch({ areas: { ...cfg.areas, items } });
  const moveArea = (i: number, dir: -1 | 1) => {
    const next = [...areas];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setAreas(next);
  };
  const moveSection = (i: number, dir: -1 | 1) => {
    const next = [...cfg.order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    patch({ order: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background p-3">
        <div>
          <h2 className="text-sm font-black tracking-tight">Ciencias Básicas · /p/ciencias-basicas</h2>
          <p className="text-[11px] text-muted-foreground">
            Página pública. Los cambios se aplican al guardar; solo administradores pueden editar.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/p/ciencias-basicas"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 px-3 py-2 text-xs font-bold hover:bg-muted/50"
          >
            <Eye className="size-3.5" /> Ver página
          </a>
          <button
            type="button"
            onClick={() => setCfg(DEFAULT_CB_CONFIG)}
            className="rounded-xl border border-border/70 px-3 py-2 text-xs font-bold hover:bg-muted/50"
          >
            Restaurar por defecto
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() =>
              save
                .mutateAsync(cfg)
                .then(() => toast.success("Ciencias Básicas actualizada"))
                .catch((e) => toast.error(e.message ?? "No se pudo guardar"))
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Hero">
          <Field title="Ruta / breadcrumb" value={cfg.hero.breadcrumb} onChange={(v) => patch({ hero: { ...cfg.hero, breadcrumb: v } })} />
          <Field title="Badge" value={cfg.hero.badge} onChange={(v) => patch({ hero: { ...cfg.hero, badge: v } })} />
          <Field title="Título" value={cfg.hero.title} onChange={(v) => patch({ hero: { ...cfg.hero, title: v } })} />
          <Field title="Palabra destacada" value={cfg.hero.highlight} onChange={(v) => patch({ hero: { ...cfg.hero, highlight: v } })} />
          <Field area title="Descripción" value={cfg.hero.description} onChange={(v) => patch({ hero: { ...cfg.hero, description: v } })} />
          <div className="grid grid-cols-2 gap-2">
            <Field title="CTA principal" value={cfg.hero.primaryLabel} onChange={(v) => patch({ hero: { ...cfg.hero, primaryLabel: v } })} />
            <Field title="Ruta CTA principal" value={cfg.hero.primaryHref} onChange={(v) => patch({ hero: { ...cfg.hero, primaryHref: v } })} />
            <Field title="CTA secundario" value={cfg.hero.secondaryLabel} onChange={(v) => patch({ hero: { ...cfg.hero, secondaryLabel: v } })} />
            <Field title="Ruta CTA secundario" value={cfg.hero.secondaryHref} onChange={(v) => patch({ hero: { ...cfg.hero, secondaryHref: v } })} />
          </div>
          <StringList title="Indicadores" items={cfg.hero.chips} onChange={(chips) => patch({ hero: { ...cfg.hero, chips } })} />
          <Field title="Imagen ambiental (URL, vacío = Home)" value={cfg.hero.image} onChange={(v) => patch({ hero: { ...cfg.hero, image: v } })} />
          <label className="flex items-center gap-2 text-[11px] font-semibold">
            <input
              type="checkbox"
              checked={cfg.hero.showEnvControls}
              onChange={(e) => patch({ hero: { ...cfg.hero, showEnvControls: e.target.checked } })}
            />
            Mostrar control de ambiente dinámico (solo administradores)
          </label>
        </Card>

        <Card title="Secciones · orden y visibilidad">
          {cfg.order.map((id: CbSectionId, i) => (
            <div key={id} className="flex items-center gap-2 rounded-xl border border-border/60 px-2.5 py-1.5">
              <span className="flex-1 truncate text-xs font-bold">{CB_SECTION_LABEL[id]}</span>
              <button type="button" onClick={() => moveSection(i, -1)} className="text-muted-foreground hover:text-foreground">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" onClick={() => moveSection(i, 1)} className="text-muted-foreground hover:text-foreground">
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => patch({ visible: { ...cfg.visible, [id]: !cfg.visible[id] } })}
                className="text-muted-foreground hover:text-foreground"
              >
                {cfg.visible[id] ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-destructive" />}
              </button>
            </div>
          ))}
        </Card>

        <Card title="Barra de valor">
          {cfg.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_auto] items-end gap-2">
              <Field title="Valor" value={s.value} onChange={(v) => patch({ stats: cfg.stats.map((x, j) => (j === i ? { ...x, value: v } : x)) })} />
              <Field title="Etiqueta" value={s.label} onChange={(v) => patch({ stats: cfg.stats.map((x, j) => (j === i ? { ...x, label: v } : x)) })} />
              <button
                type="button"
                onClick={() => patch({ stats: cfg.stats.filter((_, j) => j !== i) })}
                className="rounded-lg border border-border/70 px-2 py-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => patch({ stats: [...cfg.stats, { value: "", label: "" }] })}
            className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2 py-1 text-[11px] font-bold hover:bg-muted/50"
          >
            <Plus className="size-3" /> Añadir cifra
          </button>
        </Card>

        <Card title="¿Qué son las Ciencias Básicas?">
          <Field title="Título" value={cfg.intro.title} onChange={(v) => patch({ intro: { ...cfg.intro, title: v } })} />
          <Field area title="Subtítulo" value={cfg.intro.subtitle} onChange={(v) => patch({ intro: { ...cfg.intro, subtitle: v } })} />
          <div className="grid grid-cols-2 gap-2">
            <Field title="Botón" value={cfg.intro.moreLabel} onChange={(v) => patch({ intro: { ...cfg.intro, moreLabel: v } })} />
            <Field title="Ruta" value={cfg.intro.moreHref} onChange={(v) => patch({ intro: { ...cfg.intro, moreHref: v } })} />
          </div>
          {cfg.intro.steps.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Field
                title={`Etapa ${i + 1}`}
                value={s.label}
                onChange={(v) => patch({ intro: { ...cfg.intro, steps: cfg.intro.steps.map((x, j) => (j === i ? { ...x, label: v } : x)) } })}
              />
              <Field
                title="Detalle"
                value={s.text}
                onChange={(v) => patch({ intro: { ...cfg.intro, steps: cfg.intro.steps.map((x, j) => (j === i ? { ...x, text: v } : x)) } })}
              />
            </div>
          ))}
        </Card>

        <Card title="Ruta de aprendizaje">
          {cfg.path.stages.map((s, i) => (
            <div key={i} className="grid grid-cols-[60px_1fr] gap-2">
              <Field
                title="Nº"
                value={s.n}
                onChange={(v) => patch({ path: { ...cfg.path, stages: cfg.path.stages.map((x, j) => (j === i ? { ...x, n: v } : x)) } })}
              />
              <div className="space-y-2">
                <Field
                  title="Título"
                  value={s.title}
                  onChange={(v) => patch({ path: { ...cfg.path, stages: cfg.path.stages.map((x, j) => (j === i ? { ...x, title: v } : x)) } })}
                />
                <Field
                  title="Descripción"
                  value={s.text}
                  onChange={(v) => patch({ path: { ...cfg.path, stages: cfg.path.stages.map((x, j) => (j === i ? { ...x, text: v } : x)) } })}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card title="¿Qué aprenderás? · Metodología">
          <Field title="Título" value={cfg.learn.title} onChange={(v) => patch({ learn: { ...cfg.learn, title: v } })} />
          <StringList title="Aprendizajes" items={cfg.learn.items} onChange={(items) => patch({ learn: { ...cfg.learn, items } })} />
          <Field title="Imagen (URL)" value={cfg.learn.image} onChange={(v) => patch({ learn: { ...cfg.learn, image: v } })} />
          <Field title="Metodología · subtítulo" value={cfg.method.subtitle} onChange={(v) => patch({ method: { ...cfg.method, subtitle: v } })} />
          {cfg.method.steps.map((s, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Field
                title={`Paso ${i + 1}`}
                value={s.title}
                onChange={(v) => patch({ method: { ...cfg.method, steps: cfg.method.steps.map((x, j) => (j === i ? { ...x, title: v } : x)) } })}
              />
              <Field
                title="Detalle"
                value={s.text}
                onChange={(v) => patch({ method: { ...cfg.method, steps: cfg.method.steps.map((x, j) => (j === i ? { ...x, text: v } : x)) } })}
              />
            </div>
          ))}
        </Card>

        <Card title="KotaMed AI">
          <Field title="Título" value={cfg.ai.title} onChange={(v) => patch({ ai: { ...cfg.ai, title: v } })} />
          <Field title="Subtítulo" value={cfg.ai.subtitle} onChange={(v) => patch({ ai: { ...cfg.ai, subtitle: v } })} />
          <StringList title="Beneficios" items={cfg.ai.benefits} onChange={(benefits) => patch({ ai: { ...cfg.ai, benefits } })} />
          <div className="grid grid-cols-2 gap-2">
            <Field title="CTA" value={cfg.ai.ctaLabel} onChange={(v) => patch({ ai: { ...cfg.ai, ctaLabel: v } })} />
            <Field title="Ruta" value={cfg.ai.ctaHref} onChange={(v) => patch({ ai: { ...cfg.ai, ctaHref: v } })} />
          </div>
          <Field title="Imagen (URL)" value={cfg.ai.image} onChange={(v) => patch({ ai: { ...cfg.ai, image: v } })} />
        </Card>

        <Card title="Exploración 3D">
          <Field title="Título" value={cfg.three.title} onChange={(v) => patch({ three: { ...cfg.three, title: v } })} />
          <Field title="Subtítulo" value={cfg.three.subtitle} onChange={(v) => patch({ three: { ...cfg.three, subtitle: v } })} />
          <StringList title="Sistemas visibles" items={cfg.three.systems} onChange={(systems) => patch({ three: { ...cfg.three, systems } })} />
          <div className="grid grid-cols-2 gap-2">
            <Field title="CTA" value={cfg.three.ctaLabel} onChange={(v) => patch({ three: { ...cfg.three, ctaLabel: v } })} />
            <Field title="Ruta" value={cfg.three.ctaHref} onChange={(v) => patch({ three: { ...cfg.three, ctaHref: v } })} />
          </div>
          <Field title="Modelo / imagen (URL)" value={cfg.three.image} onChange={(v) => patch({ three: { ...cfg.three, image: v } })} />
        </Card>

        <Card title="¿Para quién es? · CTA final">
          <Field title="Título audiencia" value={cfg.audience.title} onChange={(v) => patch({ audience: { ...cfg.audience, title: v } })} />
          {cfg.audience.items.map((it, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Field
                title={`Perfil ${i + 1}`}
                value={it.title}
                onChange={(v) => patch({ audience: { ...cfg.audience, items: cfg.audience.items.map((x, j) => (j === i ? { ...x, title: v } : x)) } })}
              />
              <Field
                title="Detalle"
                value={it.text}
                onChange={(v) => patch({ audience: { ...cfg.audience, items: cfg.audience.items.map((x, j) => (j === i ? { ...x, text: v } : x)) } })}
              />
            </div>
          ))}
          <Field title="CTA · título" value={cfg.cta.title} onChange={(v) => patch({ cta: { ...cfg.cta, title: v } })} />
          <Field title="CTA · subtítulo" value={cfg.cta.subtitle} onChange={(v) => patch({ cta: { ...cfg.cta, subtitle: v } })} />
          <div className="grid grid-cols-2 gap-2">
            <Field title="Botón principal" value={cfg.cta.primaryLabel} onChange={(v) => patch({ cta: { ...cfg.cta, primaryLabel: v } })} />
            <Field title="Ruta" value={cfg.cta.primaryHref} onChange={(v) => patch({ cta: { ...cfg.cta, primaryHref: v } })} />
            <Field title="Botón secundario" value={cfg.cta.secondaryLabel} onChange={(v) => patch({ cta: { ...cfg.cta, secondaryLabel: v } })} />
            <Field title="Ruta" value={cfg.cta.secondaryHref} onChange={(v) => patch({ cta: { ...cfg.cta, secondaryHref: v } })} />
          </div>
        </Card>

        <Card title="SEO">
          <Field title="Meta título" value={cfg.seo.title} onChange={(v) => patch({ seo: { ...cfg.seo, title: v } })} />
          <Field area title="Meta descripción" value={cfg.seo.description} onChange={(v) => patch({ seo: { ...cfg.seo, description: v } })} />
          <Field title="Imagen social (URL absoluta)" value={cfg.seo.ogImage} onChange={(v) => patch({ seo: { ...cfg.seo, ogImage: v } })} />
        </Card>
      </div>

      <Card title="Áreas fundamentales">
        <div className="grid grid-cols-2 gap-2">
          <Field title="Título" value={cfg.areas.title} onChange={(v) => patch({ areas: { ...cfg.areas, title: v } })} />
          <Field title="Subtítulo" value={cfg.areas.subtitle} onChange={(v) => patch({ areas: { ...cfg.areas, subtitle: v } })} />
          <Field title="Enlace “ver todas”" value={cfg.areas.allLabel} onChange={(v) => patch({ areas: { ...cfg.areas, allLabel: v } })} />
          <Field title="Ruta" value={cfg.areas.allHref} onChange={(v) => patch({ areas: { ...cfg.areas, allHref: v } })} />
        </div>

        <div className="space-y-2">
          {areas.map((a, i) => (
            <div key={i} className="rounded-xl border border-border/60 p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="flex-1 truncate text-xs font-bold">
                  {a.n} · {a.title}
                </span>
                <button type="button" onClick={() => moveArea(i, -1)} className="text-muted-foreground hover:text-foreground">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" onClick={() => moveArea(i, 1)} className="text-muted-foreground hover:text-foreground">
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAreas([...areas.slice(0, i + 1), { ...a, title: `${a.title} (copia)` }, ...areas.slice(i + 1)])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAreas(areas.map((x, j) => (j === i ? { ...x, visible: x.visible === false } : x)))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {a.visible === false ? <EyeOff className="size-3.5 text-destructive" /> : <Eye className="size-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setAreas(areas.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <Field title="Nº" value={a.n} onChange={(v) => setAreas(areas.map((x, j) => (j === i ? { ...x, n: v } : x)))} />
                <Field title="Nombre" value={a.title} onChange={(v) => setAreas(areas.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                <Field title="Descripción" value={a.text} onChange={(v) => setAreas(areas.map((x, j) => (j === i ? { ...x, text: v } : x)))} />
                <Field title="Ruta" value={a.href} onChange={(v) => setAreas(areas.map((x, j) => (j === i ? { ...x, href: v } : x)))} />
                <div className="md:col-span-4">
                  <Field title="Imagen (URL)" value={a.image} onChange={(v) => setAreas(areas.map((x, j) => (j === i ? { ...x, image: v } : x)))} />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAreas([...areas, { n: String(areas.length + 1).padStart(2, "0"), title: "Nueva área", text: "", image: "", href: "/programas" }])}
            className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted/50"
          >
            <Plus className="size-3" /> Añadir área
          </button>
        </div>
      </Card>
    </div>
  );
}
