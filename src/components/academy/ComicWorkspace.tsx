/**
 * Cómic médico interactivo: generación IA ramificada, lectura con decisiones
 * del usuario e edición total (nodos, viñetas, diálogos, opciones e imágenes).
 * Las imágenes se generan con IA y se guardan en el bucket privado "content".
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  ChevronRight,
  ImageIcon,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { generateComic, generatePanelImage } from "@/lib/academy-ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "./ui";
import { db } from "./api";
import { Modal } from "./CasosSection";

export type ComicPanel = {
  caption: string;
  dialogue: string;
  imagePrompt: string;
  imagePath?: string | null;
  /** Imagen generada en vivo durante la lectura ilimitada (no persistida). */
  imageDataUrl?: string | null;
};
export type ComicChoice = { text: string; next: string; correct: boolean; feedback: string };
export type ComicNode = {
  id: string;
  title: string;
  situation: string;
  panels: ComicPanel[];
  question: string;
  choices: ComicChoice[];
  ending: string | null;
};
export type ComicDoc = {
  kind: "comic";
  logline: string;
  style: string;
  characters: { name: string; role: string; look: string }[];
  startId: string;
  nodes: ComicNode[];
  references: string[];
  /** Historia sin final: se expande con IA a medida que el lector avanza. */
  endless?: boolean;
  level?: string;
};

const DEFAULT_STYLE =
  "modern American comic book art, bold ink lines, flat saturated colors, halftone shading, dramatic lighting";


/* ------------------------------------------------------------------ */
/*  Imagen firmada                                                     */
/* ------------------------------------------------------------------ */

export function PanelImage({
  path,
  alt,
  dataUrl,
}: {
  path?: string | null;
  alt: string;
  dataUrl?: string | null;
}) {
  const q = useQuery({
    queryKey: ["signed-comic", path],
    enabled: !!path && !dataUrl,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("content").createSignedUrl(path!, 3600);
      if (error || !data) throw new Error(error?.message ?? "sin url");
      return data.signedUrl;
    },
  });
  const src = dataUrl || q.data;
  if (!path && !dataUrl)
    return (
      <div className="aspect-[4/3] w-full rounded-xl border border-dashed border-border/60 bg-background/40 grid place-items-center text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="size-3.5" /> Sin ilustración
        </span>
      </div>
    );
  if (!src)
    return <div className="aspect-[4/3] w-full rounded-xl bg-foreground/5 animate-pulse" />;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-xl object-cover border border-border/50"
    />
  );
}


async function uploadDataUrl(slug: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `comics/${slug}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("content")
    .upload(path, blob, { contentType: "image/png" });
  if (error) throw new Error(error.message);
  return path;
}

/* ------------------------------------------------------------------ */
/*  Generador                                                          */
/* ------------------------------------------------------------------ */

export function ComicCreator({
  meta,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const gen = useServerFn(generateComic);
  const img = useServerFn(generatePanelImage);
  const [prompt, setPrompt] = useState("");
  const [level, setLevel] = useState("residentado");
  const [nodes, setNodes] = useState(7);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [withArt, setWithArt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");

  const run = async () => {
    if (!prompt.trim()) return toast.error("Escribe el tema del cómic.");
    setBusy(true);
    try {
      setStep("Escribiendo la historia ramificada…");
      const res: any = await gen({ data: { prompt, level, nodes, style } });
      const { title, ...rest } = res;
      const doc: ComicDoc = { kind: "comic", ...rest, style: rest.style || style };

      if (withArt) {
        const all = doc.nodes.flatMap((n) => n.panels.map((p) => ({ n, p })));
        let i = 0;
        for (const { p } of all) {
          i++;
          setStep(`Ilustrando viñeta ${i} de ${all.length}…`);
          try {
            const { dataUrl } = await img({ data: { prompt: p.imagePrompt, style: doc.style } });
            p.imagePath = await uploadDataUrl(meta.slug, dataUrl);
          } catch {
            p.imagePath = null;
          }
        }
      }

      setStep("Guardando…");
      const { error } = await db.from("academy_video_scripts").insert({
        area_slug: meta.slug,
        title,
        topic: prompt,
        storyboard: doc,
      });
      if (error) throw new Error(error.message);
      toast.success("Cómic interactivo creado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
    } finally {
      setBusy(false);
      setStep("");
    }
  };

  return (
    <Modal title="Generador de cómic interactivo IA" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Tema clínico">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ej. "Shock séptico en lactante de 8 meses"'
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nivel">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {["internado", "enam", "residentado", "especialidad"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nodos de la historia">
            <Input
              type="number"
              min={3}
              max={14}
              value={nodes}
              onChange={(e) => setNodes(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Estilo gráfico">
          <Textarea value={style} onChange={(e) => setStyle(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={withArt}
            onChange={(e) => setWithArt(e.target.checked)}
            className="size-3.5"
          />
          Ilustrar todas las viñetas con IA (tarda más)
        </label>
        {busy && step && <p className="text-[11px] text-muted-foreground">{step}</p>}
        <Btn variant="solid" accent={meta.accent} loading={busy} onClick={run}>
          <Sparkles className="size-3" /> Crear cómic
        </Btn>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Lector interactivo                                                 */
/* ------------------------------------------------------------------ */

export function ComicReader({ doc, accent }: { doc: ComicDoc; accent: string }) {
  const map = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes]);
  const [current, setCurrent] = useState(doc.startId || doc.nodes[0]?.id);
  const [path, setPath] = useState<string[]>([]);
  const [picked, setPicked] = useState<ComicChoice | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });

  useEffect(() => {
    setCurrent(doc.startId || doc.nodes[0]?.id);
    setPath([]);
    setPicked(null);
    setScore({ ok: 0, total: 0 });
  }, [doc]);

  const node = map.get(current) ?? doc.nodes[0];
  if (!node) return <Empty text="Este cómic no tiene nodos." />;

  const choose = (c: ComicChoice) => {
    if (picked) return;
    setPicked(c);
    setScore((s) => ({ ok: s.ok + (c.correct ? 1 : 0), total: s.total + 1 }));
  };
  const advance = () => {
    if (!picked) return;
    const next = map.get(picked.next) ? picked.next : null;
    setPath((p) => [...p, node.id]);
    setPicked(null);
    if (next) setCurrent(next);
  };
  const restart = () => {
    setCurrent(doc.startId || doc.nodes[0].id);
    setPath([]);
    setPicked(null);
    setScore({ ok: 0, total: 0 });
  };

  return (
    <div className="space-y-4 mx-auto w-full max-w-6xl">

      <div className="flex flex-wrap items-center gap-2">
        <Chip accent={accent}>
          <BookOpen className="size-3" /> Nodo {path.length + 1}
        </Chip>
        <Chip>
          Decisiones acertadas {score.ok}/{score.total}
        </Chip>
        <div className="flex-1" />
        <Btn onClick={restart}>
          <RotateCcw className="size-3" /> Reiniciar
        </Btn>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
        <h3 className="text-base font-extrabold tracking-tight">{node.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{node.situation}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {node.panels.map((p, i) => (
            <figure key={i} className="rounded-2xl border border-border/50 bg-background/60 p-2">
              <PanelImage path={p.imagePath} alt={p.caption} />
              <figcaption className="mt-2 space-y-1 px-1 pb-1">
                {p.caption && <p className="text-[11px] leading-relaxed">{p.caption}</p>}
                {p.dialogue && (
                  <p
                    className="text-[11px] font-bold leading-relaxed rounded-lg px-2 py-1"
                    style={{ background: `color-mix(in oklab, ${accent} 12%, transparent)` }}
                  >
                    {p.dialogue}
                  </p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>

        {node.ending ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Desenlace
            </p>
            <p className="mt-1 text-sm">{node.ending}</p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-bold">{node.question}</p>
            <div className="mt-2 grid gap-2">
              {node.choices.map((c, i) => {
                const active = picked === c;
                return (
                  <button
                    key={i}
                    onClick={() => choose(c)}
                    className={`text-left rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      picked
                        ? c.correct
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : active
                            ? "border-destructive/60 bg-destructive/10"
                            : "border-border/50 opacity-60"
                        : "border-border/60 bg-background/60 hover:border-primary/40"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {picked && c.correct && <Check className="size-3.5" />}
                      {c.text}
                    </span>
                    {picked && (active || c.correct) && (
                      <p className="mt-1 text-[11px] font-normal text-muted-foreground">
                        {c.feedback}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="mt-3">
                <Btn variant="solid" accent={accent} onClick={advance}>
                  Continuar <ChevronRight className="size-3" />
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>

      {doc.references?.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          <p className="font-bold">Referencias</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {doc.references.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor total                                                       */
/* ------------------------------------------------------------------ */

export function ComicEditor({
  meta,
  id,
  title,
  doc,
  onSaved,
}: {
  meta: EnamAreaMeta;
  id: string;
  title: string;
  doc: ComicDoc;
  onSaved: () => void;
}) {
  const img = useServerFn(generatePanelImage);
  const [t, setT] = useState(title);
  const [d, setD] = useState<ComicDoc>(() => JSON.parse(JSON.stringify(doc)));
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState<string | null>(null);

  const node = d.nodes[sel];
  const patchNode = (patch: Partial<ComicNode>) =>
    setD((prev) => {
      const nodes = [...prev.nodes];
      nodes[sel] = { ...nodes[sel], ...patch };
      return { ...prev, nodes };
    });

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await db
        .from("academy_video_scripts")
        .update({ title: t, storyboard: d })
        .eq("id", id);
      if (error) throw new Error(error.message);
      toast.success("Cómic guardado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const illustrate = async (pi: number) => {
    const p = node.panels[pi];
    if (!p.imagePrompt.trim()) return toast.error("Escribe la descripción visual primero.");
    setGen(`${sel}-${pi}`);
    try {
      const { dataUrl } = await img({ data: { prompt: p.imagePrompt, style: d.style } });
      const path = await uploadDataUrl(meta.slug, dataUrl);
      const panels = [...node.panels];
      panels[pi] = { ...p, imagePath: path };
      patchNode({ panels });
      toast.success("Viñeta ilustrada");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo ilustrar");
    } finally {
      setGen(null);
    }
  };

  const uploadOwn = async (pi: number, file: File) => {
    try {
      const path = `comics/${meta.slug}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("content").upload(path, file);
      if (error) throw new Error(error.message);
      const panels = [...node.panels];
      panels[pi] = { ...panels[pi], imagePath: path };
      patchNode({ panels });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-56">
          <Field label="Título">
            <Input value={t} onChange={(e) => setT(e.target.value)} />
          </Field>
        </div>
        <Btn variant="solid" accent={meta.accent} loading={busy} onClick={save}>
          <Save className="size-3" /> Guardar cambios
        </Btn>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Logline">
          <Textarea value={d.logline} onChange={(e) => setD({ ...d, logline: e.target.value })} />
        </Field>
        <Field label="Estilo gráfico (usado por la IA)">
          <Textarea value={d.style} onChange={(e) => setD({ ...d, style: e.target.value })} />
        </Field>
      </div>

      <Field label="Nodo inicial">
        <Select value={d.startId} onChange={(e) => setD({ ...d, startId: e.target.value })}>
          {d.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.id} · {n.title}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-wrap gap-1.5">
        {d.nodes.map((n, i) => (
          <button
            key={n.id + i}
            onClick={() => setSel(i)}
            className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
              i === sel
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {n.id}
          </button>
        ))}
        <button
          onClick={() => {
            const id2 = `nodo-${d.nodes.length + 1}`;
            setD({
              ...d,
              nodes: [
                ...d.nodes,
                {
                  id: id2,
                  title: "Nuevo nodo",
                  situation: "",
                  panels: [],
                  question: "",
                  choices: [],
                  ending: null,
                },
              ],
            });
            setSel(d.nodes.length);
          }}
          className="rounded-lg border border-dashed border-border px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3 inline" /> Nodo
        </button>
      </div>

      {node && (
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ID">
              <Input value={node.id} onChange={(e) => patchNode({ id: e.target.value })} />
            </Field>
            <Field label="Título del nodo">
              <Input value={node.title} onChange={(e) => patchNode({ title: e.target.value })} />
            </Field>
          </div>
          <Field label="Situación">
            <Textarea
              value={node.situation}
              onChange={(e) => patchNode({ situation: e.target.value })}
            />
          </Field>

          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Viñetas
          </p>
          <div className="space-y-3">
            {node.panels.map((p, pi) => (
              <div key={pi} className="rounded-2xl border border-border/50 bg-background/60 p-3">
                <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <PanelImage path={p.imagePath} alt={p.caption} />
                    <div className="flex flex-wrap gap-1.5">
                      <Btn
                        loading={gen === `${sel}-${pi}`}
                        accent={meta.accent}
                        onClick={() => illustrate(pi)}
                      >
                        <Wand2 className="size-3" /> Ilustrar
                      </Btn>
                      <label className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[11px] font-bold cursor-pointer hover:border-primary/40">
                        Subir
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadOwn(pi, f);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Field label="Narración">
                      <Textarea
                        value={p.caption}
                        onChange={(e) => {
                          const panels = [...node.panels];
                          panels[pi] = { ...p, caption: e.target.value };
                          patchNode({ panels });
                        }}
                      />
                    </Field>
                    <Field label="Diálogo">
                      <Input
                        value={p.dialogue}
                        onChange={(e) => {
                          const panels = [...node.panels];
                          panels[pi] = { ...p, dialogue: e.target.value };
                          patchNode({ panels });
                        }}
                      />
                    </Field>
                    <Field label="Descripción visual (prompt de la imagen)">
                      <Textarea
                        value={p.imagePrompt}
                        onChange={(e) => {
                          const panels = [...node.panels];
                          panels[pi] = { ...p, imagePrompt: e.target.value };
                          patchNode({ panels });
                        }}
                      />
                    </Field>
                    <Btn
                      onClick={() =>
                        patchNode({ panels: node.panels.filter((_, x) => x !== pi) })
                      }
                    >
                      <Trash2 className="size-3" /> Quitar viñeta
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
            <Btn
              onClick={() =>
                patchNode({
                  panels: [
                    ...node.panels,
                    { caption: "", dialogue: "", imagePrompt: "", imagePath: null },
                  ],
                })
              }
            >
              <Plus className="size-3" /> Añadir viñeta
            </Btn>
          </div>

          <Field label="Pregunta / decisión">
            <Input value={node.question} onChange={(e) => patchNode({ question: e.target.value })} />
          </Field>

          <div className="space-y-2">
            {node.choices.map((c, ci) => (
              <div
                key={ci}
                className="rounded-2xl border border-border/50 bg-background/60 p-3 space-y-2"
              >
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={c.text}
                      placeholder="Texto de la opción"
                      onChange={(e) => {
                        const choices = [...node.choices];
                        choices[ci] = { ...c, text: e.target.value };
                        patchNode({ choices });
                      }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      patchNode({ choices: node.choices.filter((_, x) => x !== ci) })
                    }
                    className="p-1 rounded text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar opción"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Lleva al nodo">
                    <Select
                      value={c.next}
                      onChange={(e) => {
                        const choices = [...node.choices];
                        choices[ci] = { ...c, next: e.target.value };
                        patchNode({ choices });
                      }}
                    >
                      {d.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.id}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <label className="flex items-end gap-2 text-xs font-semibold pb-2">
                    <input
                      type="checkbox"
                      checked={c.correct}
                      onChange={(e) => {
                        const choices = [...node.choices];
                        choices[ci] = { ...c, correct: e.target.checked };
                        patchNode({ choices });
                      }}
                    />
                    Decisión correcta
                  </label>
                </div>
                <Field label="Retroalimentación">
                  <Textarea
                    value={c.feedback}
                    onChange={(e) => {
                      const choices = [...node.choices];
                      choices[ci] = { ...c, feedback: e.target.value };
                      patchNode({ choices });
                    }}
                  />
                </Field>
              </div>
            ))}
            <Btn
              onClick={() =>
                patchNode({
                  choices: [
                    ...node.choices,
                    { text: "", next: d.nodes[0]?.id ?? "", correct: false, feedback: "" },
                  ],
                })
              }
            >
              <Plus className="size-3" /> Añadir opción
            </Btn>
          </div>

          <Field label="Desenlace (deja vacío si no es final)">
            <Textarea
              value={node.ending ?? ""}
              onChange={(e) => patchNode({ ending: e.target.value || null })}
            />
          </Field>

          <Btn
            onClick={() => {
              setD({ ...d, nodes: d.nodes.filter((_, i) => i !== sel) });
              setSel(0);
            }}
          >
            <Trash2 className="size-3" /> Eliminar nodo
          </Btn>
        </div>
      )}
    </div>
  );
}
