/**
 * Editor de tema (solo admin). Se abre como drawer full-screen.
 * Estructura + editor por slide + acciones IA + importación desde texto.
 */
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type { Slide, SlideKind, Topic } from "@/lib/topic-schema";
import {
  ALL_SLIDE_KINDS,
  SLIDE_KIND_LABEL,
  createEmptyTopic,
  randomId,
} from "@/lib/topic-schema";
import {
  generateTopic,
  slidesFromText,
  transformSlide,
} from "@/lib/topic-ai.functions";
import { SlideRenderer } from "./slides";
import { ResourcesPanelStandalone } from "@/components/ResourcesPanelStandalone";
import {
  NotebookPane,
  SlideCatalog,
  SLIDE_ACTION_GROUPS,
  TemplatesPane,
  VersionsPane,
  templateSlides,
  useTopicVersions,
  type SlideAction,
} from "./editor-panes";

interface Props {
  initialTopic: Topic | null;
  fallbackTitle: string;
  accent: string;
  onSave: (topic: Topic) => Promise<void> | void;
  onClose: () => void;
  saving?: boolean;
  /** Nodo de contenido asociado (habilita la pestaña Recursos). */
  nodeId?: string | null;
  nodeTitle?: string;
}

type Tab =
  | "structure"
  | "slide"
  | "ai"
  | "notebook"
  | "import"
  | "templates"
  | "resources"
  | "versions";

export function TopicEditor({
  initialTopic,
  fallbackTitle,
  accent,
  onSave,
  onClose,
  saving,
  nodeId,
  nodeTitle,
}: Props) {
  const [topic, setTopic] = useState<Topic>(() => initialTopic ?? createEmptyTopic(fallbackTitle));
  const [tab, setTab] = useState<Tab>("structure");
  const [activeIdx, setActiveIdx] = useState(0);
  const [importText, setImportText] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { versions, snapshot, remove } = useTopicVersions(fallbackTitle);


  const generateFn = useServerFn(generateTopic);
  const importFn = useServerFn(slidesFromText);
  const transformFn = useServerFn(transformSlide);

  const genMut = useMutation({
    mutationFn: (payload: { title: string; context?: string }) =>
      generateFn({ data: payload }),
    onSuccess: (t) => {
      setTopic(t);
      setActiveIdx(0);
      toast.success("Tema generado con IA");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falló la generación"),
  });

  const importMut = useMutation({
    mutationFn: (payload: { title: string; text: string }) => importFn({ data: payload }),
    onSuccess: (t) => {
      setTopic(t);
      setActiveIdx(0);
      setImportText("");
      setTab("structure");
      toast.success("Texto convertido en tema");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falló la importación"),
  });

  const transformMut = useMutation({
    mutationFn: (payload: {
      action: SlideAction;
      slide: Slide;
      topicTitle: string;
    }) => transformFn({ data: payload }),

    onSuccess: (updated) => {
      setTopic((t) => {
        const next = { ...t, slides: [...t.slides] };
        next.slides[activeIdx] = { ...updated, id: t.slides[activeIdx].id };
        return next;
      });
      toast.success("Slide actualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falló la transformación"),
  });

  const active = topic.slides[activeIdx];

  const patchSlide = (patch: Partial<Slide>) => {
    setTopic((t) => {
      const slides = [...t.slides];
      slides[activeIdx] = { ...slides[activeIdx], ...patch };
      return { ...t, slides };
    });
  };

  const addSlide = (kind: SlideKind = "intro") => {
    setTopic((t) => ({
      ...t,
      slides: [
        ...t.slides,
        { id: randomId(), kind, title: SLIDE_KIND_LABEL[kind], body: "" },
      ],
    }));
    setActiveIdx(topic.slides.length);
    setTab("slide");
  };

  const duplicateAt = (i: number) => {
    setTopic((t) => {
      const src = t.slides[i];
      const clone = { ...src, id: randomId() };
      const slides = [...t.slides];
      slides.splice(i + 1, 0, clone);
      return { ...t, slides };
    });
  };
  const removeAt = (i: number) => {
    setTopic((t) => {
      const slides = t.slides.filter((_, idx) => idx !== i);
      return { ...t, slides: slides.length ? slides : t.slides };
    });
    setActiveIdx((n) => Math.max(0, Math.min(n, topic.slides.length - 2)));
  };
  const move = (i: number, dir: -1 | 1) => {
    setTopic((t) => {
      const j = i + dir;
      if (j < 0 || j >= t.slides.length) return t;
      const slides = [...t.slides];
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...t, slides };
    });
    setActiveIdx((n) => (n === i ? i + dir : n));
  };

  const previewAccent = accent;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col animate-in fade-in">
      <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/40">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
            Editor de tema · IA
          </div>
          <input
            value={topic.title}
            onChange={(e) => setTopic((t) => ({ ...t, title: e.target.value }))}
            className="w-full bg-transparent text-lg md:text-xl font-extrabold tracking-tight outline-none"
          />
        </div>
        <button
          onClick={() => onSave(topic)}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Guardar
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/[0.06]"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 md:px-6 pt-2 border-b border-border/40 overflow-x-auto">
        {(
          [
            ["structure", "Estructura"],
            ["slide", "Editar slide"],
            ["ai", "IA"],
            ["notebook", "Notebook IA"],
            ["import", "Fuente"],
            ["templates", "Plantillas"],
            ...(nodeId ? ([["resources", "Recursos"]] as const) : []),
            ["versions", "Versiones"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2 text-xs font-bold rounded-t-lg transition ${
              tab === id
                ? "bg-background border border-b-background border-border/40 -mb-px text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>


      <div className="flex-1 overflow-hidden grid md:grid-cols-[minmax(280px,340px)_1fr]">
        {/* Left: slide list */}
        <aside className="border-r border-border/40 overflow-y-auto p-3 space-y-1.5">
          {topic.slides.map((s, i) => (
            <div
              key={s.id}
              className={`group rounded-lg border p-2 flex items-center gap-2 cursor-pointer transition ${
                activeIdx === i
                  ? "bg-primary/5 border-primary/40"
                  : "border-border/40 bg-background/40 hover:bg-background/60"
              }`}
              onClick={() => {
                setActiveIdx(i);
                if (tab === "structure") setTab("slide");
              }}
            >
              <span
                className="inline-flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                style={{ background: accent }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                  {SLIDE_KIND_LABEL[s.kind]}
                </div>
                <div className="text-xs font-semibold truncate">{s.title || "Sin título"}</div>
              </div>
              <div className="flex flex-col opacity-60 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    move(i, -1);
                  }}
                  className="p-0.5 hover:text-foreground text-muted-foreground"
                  title="Subir"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    move(i, 1);
                  }}
                  className="p-0.5 hover:text-foreground text-muted-foreground"
                  title="Bajar"
                >
                  <ArrowDown className="size-3" />
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateAt(i);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100"
                title="Duplicar"
              >
                <Copy className="size-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                className="p-1 rounded text-destructive/70 hover:text-destructive opacity-60 group-hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setCatalogOpen(true)}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-background/40"
          >
            <Plus className="size-3.5" /> Agregar slide
          </button>
        </aside>

        {/* Right: content by tab */}
        <main className="overflow-y-auto p-4 md:p-6">
          {tab === "structure" && (
            <StructurePane
              topic={topic}
              accent={previewAccent}
              activeIdx={activeIdx}
              onActivate={(i) => {
                setActiveIdx(i);
                setTab("slide");
              }}
            />
          )}
          {tab === "slide" && active && (
            <SlideForm
              slide={active}
              accent={previewAccent}
              onPatch={patchSlide}
              onTransform={(action) =>
                transformMut.mutate({ action, slide: active, topicTitle: topic.title })
              }
              transforming={transformMut.isPending}
            />
          )}
          {tab === "ai" && (
            <AiPane
              topic={topic}
              generating={genMut.isPending}
              onGenerate={(ctx) => genMut.mutate({ title: topic.title, context: ctx })}
            />
          )}
          {tab === "notebook" && (
            <NotebookPane
              topic={topic}
              onTopic={(t) => {
                snapshot(topic, "Antes de Notebook IA");
                setTopic(t);
                setActiveIdx(0);
                setTab("structure");
              }}
            />
          )}
          {tab === "import" && (
            <ImportPane
              text={importText}
              onChange={setImportText}
              onImport={() => importMut.mutate({ title: topic.title, text: importText })}
              importing={importMut.isPending}
            />
          )}
          {tab === "templates" && (
            <TemplatesPane
              onApply={(kinds) => {
                snapshot(topic, "Antes de aplicar plantilla");
                setTopic((t) => ({ ...t, slides: templateSlides(kinds) }));
                setActiveIdx(0);
                setTab("structure");
                toast.success("Plantilla aplicada");
              }}
              onAppend={(kinds) => {
                setTopic((t) => ({ ...t, slides: [...t.slides, ...templateSlides(kinds)] }));
                setTab("structure");
                toast.success("Plantilla añadida");
              }}
            />
          )}
          {tab === "resources" && nodeId && (
            <ResourcesPanelStandalone nodeId={nodeId} nodeTitle={nodeTitle ?? topic.title} />
          )}
          {tab === "versions" && (
            <VersionsPane
              versions={versions}
              onSnapshot={() => {
                snapshot(topic, `Versión manual · ${topic.slides.length} slides`);
                toast.success("Versión guardada");
              }}
              onRestore={(t) => {
                setTopic(t);
                setActiveIdx(0);
                setTab("structure");
                toast.success("Versión restaurada");
              }}
              onRemove={remove}
            />
          )}
        </main>
      </div>

      {catalogOpen && (
        <SlideCatalog
          onClose={() => setCatalogOpen(false)}
          onPick={(kind) => {
            addSlide(kind);
            setCatalogOpen(false);
          }}
        />
      )}
    </div>
  );
}


function StructurePane({
  topic,
  accent,
  activeIdx,
  onActivate,
}: {
  topic: Topic;
  accent: string;
  activeIdx: number;
  onActivate: (i: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {topic.slides.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onActivate(i)}
          className={`text-left rounded-2xl border p-3 transition hover:border-primary/40 ${
            activeIdx === i ? "border-primary/50 bg-primary/[0.03]" : "border-border/40 bg-background/40"
          }`}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: accent }}
          >
            {i + 1} · {SLIDE_KIND_LABEL[s.kind]}
          </div>
          <div className="mt-1 font-bold text-sm line-clamp-2">{s.title}</div>
          {s.body && (
            <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{s.body}</div>
          )}
        </button>
      ))}
    </div>
  );
}

function SlideForm({
  slide,
  accent,
  onPatch,
  onTransform,
  transforming,
}: {
  slide: Slide;
  accent: string;
  onPatch: (patch: Partial<Slide>) => void;
  onTransform: (
    a:
      | "expand"
      | "summarize"
      | "improve"
      | "update-guidelines"
      | "add-references"
      | "to-table"
      | "to-flowchart"
      | "to-cards"
      | "to-case",
  ) => void;
  transforming: boolean;
}) {
  const bullets = slide.bullets ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tipo
          </label>
          <select
            value={slide.kind}
            onChange={(e) => onPatch({ kind: e.target.value as SlideKind })}
            className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            {ALL_SLIDE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SLIDE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Título
          </label>
          <input
            value={slide.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Texto principal
          </label>
          <textarea
            value={slide.body ?? ""}
            onChange={(e) => onPatch({ body: e.target.value })}
            rows={5}
            className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Bullets (uno por línea)
            </label>
          </div>
          <textarea
            value={bullets.join("\n")}
            onChange={(e) =>
              onPatch({
                bullets: e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            rows={5}
            className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* IA actions on this slide */}
        <div className="pt-2 border-t border-border/40">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Acciones IA sobre este slide
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["expand", "Expandir"],
                ["summarize", "Resumir"],
                ["improve", "Mejorar redacción"],
                ["update-guidelines", "Actualizar guías"],
                ["add-references", "Añadir referencias"],
                ["to-table", "→ Tabla"],
                ["to-flowchart", "→ Algoritmo"],
                ["to-cards", "→ Tarjetas"],
                ["to-case", "→ Caso clínico"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                onClick={() => onTransform(action)}
                disabled={transforming}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40 disabled:opacity-50"
              >
                {transforming ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Wand2 className="size-3" />
                )}
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Para tablas, algoritmos, casos y referencias detalladas, usa las acciones IA — se generan
            automáticamente y podrás refinarlas.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Vista previa
        </div>
        <div className="rounded-2xl border border-border/40 bg-background/40 p-4 max-h-[70vh] overflow-y-auto">
          <SlideRenderer slide={slide} accent={accent} />
        </div>
      </div>
    </div>
  );
}

function AiPane({
  topic,
  generating,
  onGenerate,
}: {
  topic: Topic;
  generating: boolean;
  onGenerate: (ctx?: string) => void;
}) {
  const [ctx, setCtx] = useState("");
  return (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-bold">Generar tema completo con IA</span>
        </div>
        <p className="text-xs text-muted-foreground">
          La IA generará entre 10 y 16 diapositivas para "{topic.title}" siguiendo la plantilla
          estándar (objetivos, fisiopatología, algoritmo, caso clínico, perlas, referencias…).
        </p>
        <div className="mt-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Contexto adicional (opcional)
          </label>
          <textarea
            value={ctx}
            onChange={(e) => setCtx(e.target.value)}
            rows={4}
            placeholder="Ej. enfoque para internos, énfasis en manejo en emergencia, edad pediátrica objetivo…"
            className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => onGenerate(ctx || undefined)}
          disabled={generating}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wand2 className="size-3.5" />
          )}
          Generar tema con IA
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Sobrescribirá las diapositivas actuales hasta que guardes.
        </p>
      </div>
    </div>
  );
}

function ImportPane({
  text,
  onChange,
  onImport,
  importing,
}: {
  text: string;
  onChange: (s: string) => void;
  onImport: () => void;
  importing: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="size-4 text-primary" />
          <span className="text-sm font-bold">Convertir texto en diapositivas</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pega apuntes, notas o borradores. La IA detectará tablas, comparaciones, algoritmos y
          casos, y las convertirá en el formato del tema.
        </p>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          placeholder="Pega aquí tu borrador o apuntes…"
          className="mt-3 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={onImport}
          disabled={importing || text.trim().length < 20}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wand2 className="size-3.5" />
          )}
          Convertir a diapositivas
        </button>
      </div>
    </div>
  );
}
