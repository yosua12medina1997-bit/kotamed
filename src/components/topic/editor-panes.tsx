/**
 * Paneles adicionales del KOTARO LIVING EDITOR™ (solo admin).
 * Notebook IA, Plantillas, Versiones y catálogo de componentes.
 * Aditivo: no modifica la arquitectura ni el diseño existente.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  Clock,
  FileText,
  History,
  LayoutTemplate,
  Loader2,
  NotebookPen,
  RotateCcw,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import type { Slide, SlideKind, Topic } from "@/lib/topic-schema";
import { ALL_SLIDE_KINDS, SLIDE_KIND_LABEL, randomId } from "@/lib/topic-schema";
import { notebookCompose } from "@/lib/topic-ai.functions";

/* ------------------------------------------------------------------ */
/* Acciones IA por slide                                               */
/* ------------------------------------------------------------------ */

export type SlideAction =
  | "expand"
  | "summarize"
  | "improve"
  | "rewrite"
  | "level-student"
  | "level-resident"
  | "level-specialist"
  | "update-guidelines"
  | "update-aap"
  | "update-nelson"
  | "update-minsa"
  | "update-who"
  | "add-references"
  | "vancouver"
  | "to-table"
  | "to-comparison"
  | "to-flowchart"
  | "to-cards"
  | "to-case"
  | "to-timeline"
  | "to-steps"
  | "to-pearls"
  | "to-mistakes"
  | "to-summary"
  | "to-diagram";

export const SLIDE_ACTION_GROUPS: { group: string; actions: [SlideAction, string][] }[] = [
  {
    group: "Redacción",
    actions: [
      ["expand", "Expandir"],
      ["summarize", "Resumir"],
      ["improve", "Mejorar redacción"],
      ["rewrite", "Reescribir"],
    ],
  },
  {
    group: "Nivel académico",
    actions: [
      ["level-student", "Para estudiantes"],
      ["level-resident", "Para residentes"],
      ["level-specialist", "Para especialistas"],
    ],
  },
  {
    group: "Evidencia",
    actions: [
      ["update-guidelines", "Actualizar guías"],
      ["update-aap", "Según AAP"],
      ["update-nelson", "Según Nelson 21ed"],
      ["update-minsa", "Según MINSA"],
      ["update-who", "Según OMS"],
      ["add-references", "Añadir referencias"],
      ["vancouver", "Referencias Vancouver"],
    ],
  },
  {
    group: "Transformar componente",
    actions: [
      ["to-table", "→ Tabla"],
      ["to-comparison", "→ Comparación"],
      ["to-flowchart", "→ Algoritmo"],
      ["to-diagram", "→ Diagrama"],
      ["to-cards", "→ Tarjetas"],
      ["to-timeline", "→ Cronología"],
      ["to-steps", "→ Pasos"],
      ["to-case", "→ Caso clínico"],
      ["to-pearls", "→ Perlas"],
      ["to-mistakes", "→ Errores frecuentes"],
      ["to-summary", "→ Resumen"],
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Catálogo de componentes (Agregar slide)                             */
/* ------------------------------------------------------------------ */

const KIND_HINT: Partial<Record<SlideKind, string>> = {
  title: "Portada del tema",
  objectives: "Competencias y objetivos de aprendizaje",
  concepts: "Definiciones y conceptos clave",
  intro: "Texto introductorio",
  epidemiology: "Prevalencia, incidencia y factores de riesgo",
  diagram: "Diagrama conceptual / fisiopatología",
  table: "Tabla de datos",
  comparison: "Comparación entre entidades",
  flowchart: "Algoritmo diagnóstico o terapéutico",
  cards: "Clasificaciones en tarjetas",
  timeline: "Historia natural / cronología",
  steps: "Procedimiento paso a paso",
  drugs: "Dosis y fármacos",
  image: "Imagen clínica o radiológica",
  case: "Caso clínico interactivo",
  pearls: "Perlas clínicas",
  mistakes: "Errores frecuentes",
  tips: "Tips prácticos",
  summary: "Resumen ejecutivo",
  takehome: "Mensajes para llevar",
  references: "Bibliografía",
};

export function SlideCatalog({
  onPick,
  onClose,
}: {
  onPick: (kind: SlideKind) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      ALL_SLIDE_KINDS.filter((k) =>
        (SLIDE_KIND_LABEL[k] + " " + (KIND_HINT[k] ?? "")).toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  return (
    <div className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-xl flex items-start justify-center p-4 md:p-10 animate-in fade-in">
      <div className="w-full max-w-3xl rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <LayoutTemplate className="size-4 text-primary" />
          <span className="text-sm font-bold">Catálogo de componentes</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/[0.06]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar componente…"
            className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 max-h-[55vh] overflow-y-auto">
            {list.map((k) => (
              <button
                key={k}
                onClick={() => onPick(k)}
                className="text-left rounded-xl border border-border/40 bg-background/40 p-3 hover:border-primary/40 transition"
              >
                <div className="text-xs font-bold">{SLIDE_KIND_LABEL[k]}</div>
                <div className="text-[11px] text-muted-foreground">{KIND_HINT[k] ?? ""}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notebook IA                                                         */
/* ------------------------------------------------------------------ */

type SourceDoc = { id: string; name: string; text: string };

const TEXT_EXT = /\.(txt|md|markdown|csv|json|rtf|html?|xml|srt|vtt)$/i;

export function NotebookPane({
  topic,
  onTopic,
}: {
  topic: Topic;
  onTopic: (t: Topic) => void;
}) {
  const [docs, setDocs] = useState<SourceDoc[]>([]);
  const [pasted, setPasted] = useState("");
  const [instruction, setInstruction] = useState(
    "Redacta el tema completo basándote únicamente en estas fuentes, con enfoque clínico y estructura estándar.",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const composeFn = useServerFn(notebookCompose);

  const mut = useMutation({
    mutationFn: (payload: { title: string; instruction: string; sources: string }) =>
      composeFn({ data: payload }),
    onSuccess: (t) => {
      onTopic(t);
      toast.success("Tema compuesto desde tus fuentes");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falló la composición"),
  });

  const totalChars =
    docs.reduce((n, d) => n + d.text.length, 0) + pasted.trim().length;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: SourceDoc[] = [];
    for (const f of Array.from(files)) {
      if (!TEXT_EXT.test(f.name) && !f.type.startsWith("text/")) {
        toast.error(
          `${f.name}: solo se indexan documentos de texto (txt, md, csv, json, html). Sube PDFs/videos en la pestaña Recursos.`,
        );
        continue;
      }
      const text = await f.text();
      next.push({ id: randomId(), name: f.name, text });
    }
    if (next.length) setDocs((d) => [...d, ...next]);
  };

  const compose = () => {
    const sources = [
      ...docs.map((d) => `### ${d.name}\n${d.text}`),
      pasted.trim() ? `### Notas pegadas\n${pasted.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (sources.length < 20) {
      toast.error("Añade al menos un documento o pega texto suficiente.");
      return;
    }
    mut.mutate({ title: topic.title, instruction, sources });
  };

  const PRESETS = [
    "Redacta el tema completo con estructura estándar.",
    "Extrae y estructura solo los algoritmos y flujos de decisión.",
    "Genera un resumen ejecutivo + perlas + errores frecuentes.",
    "Convierte las fuentes en un caso clínico con preguntas razonadas.",
    "Construye tablas comparativas de tratamiento y dosis.",
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2 max-w-6xl">
      <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <NotebookPen className="size-4 text-primary" />
          <span className="text-sm font-bold">Notebook IA · fuentes indexadas</span>
        </div>
        <p className="text-xs text-muted-foreground">
          La IA responderá <b>solo</b> con el contenido de estas fuentes. Ideal para guías, normas
          MINSA, apuntes o capítulos que ya tengas en texto.
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <Upload className="size-3.5" /> Añadir documentos de texto
        </button>

        <div className="mt-3 space-y-1.5">
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-2 py-1.5"
            >
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold truncate flex-1">{d.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {(d.text.length / 1000).toFixed(1)}k
              </span>
              <button
                onClick={() => setDocs((x) => x.filter((y) => y.id !== d.id))}
                className="p-1 text-destructive/70 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Pegar texto adicional
        </label>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder="Pega aquí guías, apuntes o transcripciones…"
          className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-1 text-[10px] text-muted-foreground">
          {totalChars.toLocaleString()} caracteres indexados
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="size-4 text-primary" />
          <span className="text-sm font-bold">Instrucción</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setInstruction(p)}
              className="rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-[11px] font-semibold hover:border-primary/40"
            >
              {p.slice(0, 34)}…
            </button>
          ))}
        </div>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={compose}
          disabled={mut.isPending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          {mut.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Wand2 className="size-3.5" />
          )}
          Componer tema desde las fuentes
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Sobrescribe las diapositivas actuales hasta que guardes.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plantillas                                                          */
/* ------------------------------------------------------------------ */

type TemplateDef = { key: string; label: string; desc: string; kinds: SlideKind[] };

export const TOPIC_TEMPLATES: TemplateDef[] = [
  {
    key: "estandar",
    label: "Tema clínico estándar",
    desc: "Secuencia completa: objetivos → algoritmo → caso → referencias.",
    kinds: [
      "title","objectives","concepts","epidemiology","diagram","table","flowchart",
      "steps","drugs","case","pearls","mistakes","summary","takehome","references",
    ],
  },
  {
    key: "urgencia",
    label: "Emergencia pediátrica",
    desc: "Enfoque de manejo rápido en emergencia.",
    kinds: ["title","objectives","intro","flowchart","steps","drugs","case","mistakes","takehome","references"],
  },
  {
    key: "farmaco",
    label: "Farmacología",
    desc: "Fármacos, dosis y comparaciones.",
    kinds: ["title","objectives","concepts","drugs","table","comparison","pearls","mistakes","references"],
  },
  {
    key: "repaso",
    label: "Repaso ENAM express",
    desc: "Repaso corto de alto rendimiento.",
    kinds: ["title","concepts","table","pearls","mistakes","summary","takehome"],
  },
  {
    key: "procedimiento",
    label: "Procedimiento / técnica",
    desc: "Paso a paso con errores frecuentes.",
    kinds: ["title","objectives","intro","steps","timeline","tips","mistakes","references"],
  },
];

export function TemplatesPane({
  onApply,
  onAppend,
}: {
  onApply: (kinds: SlideKind[]) => void;
  onAppend: (kinds: SlideKind[]) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 max-w-6xl">
      {TOPIC_TEMPLATES.map((t) => (
        <div key={t.key} className="rounded-2xl border border-border/40 bg-background/40 p-4">
          <div className="text-sm font-bold">{t.label}</div>
          <div className="text-[11px] text-muted-foreground">{t.desc}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {t.kinds.map((k, i) => (
              <span
                key={k + i}
                className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
              >
                {SLIDE_KIND_LABEL[k]}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => onApply(t.kinds)}
              className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-[11px] font-bold"
            >
              Reemplazar
            </button>
            <button
              onClick={() => onAppend(t.kinds)}
              className="rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-bold"
            >
              Añadir al final
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function templateSlides(kinds: SlideKind[]): Slide[] {
  return kinds.map((k) => ({
    id: randomId(),
    kind: k,
    title: SLIDE_KIND_LABEL[k],
    body: "",
  }));
}

/* ------------------------------------------------------------------ */
/* Versiones (snapshots locales)                                       */
/* ------------------------------------------------------------------ */

type Version = { id: string; at: string; label: string; topic: Topic };

function storageKey(title: string) {
  return `kotaro:topic-versions:${title.toLowerCase().trim()}`;
}

export function useTopicVersions(title: string) {
  const [versions, setVersions] = useState<Version[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey(title));
      setVersions(raw ? (JSON.parse(raw) as Version[]) : []);
    } catch {
      setVersions([]);
    }
  }, [title]);

  const persist = (next: Version[]) => {
    setVersions(next);
    try {
      window.localStorage.setItem(storageKey(title), JSON.stringify(next.slice(0, 20)));
    } catch {
      /* cuota llena: se ignora */
    }
  };

  return {
    versions,
    snapshot: (topic: Topic, label: string) =>
      persist([
        { id: randomId(), at: new Date().toISOString(), label, topic },
        ...versions,
      ]),
    remove: (id: string) => persist(versions.filter((v) => v.id !== id)),
  };
}

export function VersionsPane({
  versions,
  onRestore,
  onSnapshot,
  onRemove,
}: {
  versions: { id: string; at: string; label: string; topic: Topic }[];
  onRestore: (t: Topic) => void;
  onSnapshot: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-3">
        <History className="size-4 text-primary" />
        <span className="text-sm font-bold">Historial de versiones</span>
        <div className="flex-1" />
        <button
          onClick={onSnapshot}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-[11px] font-bold"
        >
          <Check className="size-3" /> Guardar versión actual
        </button>
      </div>
      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aún no hay versiones. Guarda una antes de generar con IA para poder volver atrás.
        </p>
      ) : (
        <div className="space-y-1.5">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2"
            >
              <Clock className="size-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{v.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(v.at).toLocaleString()} · {v.topic.slides.length} slides
                </div>
              </div>
              <button
                onClick={() => onRestore(v.topic)}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
              >
                <RotateCcw className="size-3" /> Restaurar
              </button>
              <button
                onClick={() => onRemove(v.id)}
                className="p-1 text-destructive/70 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
