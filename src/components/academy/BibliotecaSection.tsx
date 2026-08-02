/**
 * Biblioteca inteligente: libros, guías, artículos, PDF, videos, protocolos,
 * normas, presentaciones e infografías, indexados por especialidad, tema,
 * subtema, autor, año y palabras clave. Incluye el generador de videos IA
 * (storyboard, escenas, narración, subtítulos y material descargable).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  Film,
  Library,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { generateVideoScript } from "@/lib/academy-ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Chip, Empty, Field, Input, Panel, Select, Textarea } from "./ui";
import { db } from "./api";
import { Modal } from "./CasosSection";
import { ComicCreator, ComicEditor, ComicReader, type ComicDoc } from "./ComicWorkspace";

const KINDS = [
  "libro",
  "guía",
  "artículo",
  "pdf",
  "video",
  "protocolo",
  "norma",
  "presentación",
  "infografía",
] as const;

type Item = {
  id: string;
  kind: string;
  title: string;
  author: string | null;
  year: number | null;
  topic: string | null;
  subtopic: string | null;
  keywords: string[];
  url: string | null;
  storage_path: string | null;
  summary: string | null;
};

type VideoRow = {
  id: string;
  title: string;
  storyboard: any;
};

export function BibliotecaSection({ meta, isAdmin }: { meta: EnamAreaMeta; isAdmin: boolean }) {
  const accent = meta.accent;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"biblioteca" | "videos" | "comics">("biblioteca");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [adding, setAdding] = useState(false);
  const [genVideo, setGenVideo] = useState(false);
  const [genComic, setGenComic] = useState(false);
  const [openVideo, setOpenVideo] = useState<VideoRow | null>(null);
  const [openComic, setOpenComic] = useState<VideoRow | null>(null);
  const [editComic, setEditComic] = useState<VideoRow | null>(null);

  const items = useQuery({
    queryKey: ["academy-library", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_library_items")
        .select("*")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const videos = useQuery({
    queryKey: ["academy-videos", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_video_scripts")
        .select("id,title,storyboard")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

  const delVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("academy_video_scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-videos", meta.slug] }),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("academy_library_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-library", meta.slug] }),
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items.data ?? []).filter(
      (i) =>
        (!kind || i.kind === kind) &&
        (!t ||
          i.title.toLowerCase().includes(t) ||
          (i.author ?? "").toLowerCase().includes(t) ||
          (i.topic ?? "").toLowerCase().includes(t) ||
          i.keywords.join(" ").toLowerCase().includes(t)),
    );
  }, [items.data, q, kind]);

  return (
    <Panel
      accent={accent}
      icon={<Library className="size-4" strokeWidth={2.25} />}
      title="KotaMed Library"
      subtitle="Todo el material indexado por especialidad, tema, autor, año y palabras clave."
      actions={
        isAdmin && (
          <>
            {tab === "biblioteca" && (
              <Btn variant="solid" accent={accent} onClick={() => setAdding(true)}>
                <Plus className="size-3" /> Añadir material
              </Btn>
            )}
            {tab === "videos" && (
              <Btn variant="solid" accent={accent} onClick={() => setGenVideo(true)}>
                <Sparkles className="size-3" /> Generar video IA
              </Btn>
            )}
            {tab === "comics" && (
              <Btn variant="solid" accent={accent} onClick={() => setGenComic(true)}>
                <Sparkles className="size-3" /> Generar cómic IA
              </Btn>
            )}
          </>
        )
      }
    >
      <div className="flex flex-wrap gap-2">
        {(["biblioteca", "videos", "comics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold capitalize transition ${
              tab === t
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "videos"
              ? "Generador de videos"
              : t === "comics"
                ? "Cómic interactivo"
                : "Material"}
          </button>
        ))}
      </div>

      {tab === "biblioteca" && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título, autor, tema o palabra clave…"
                className="pl-9"
              />
            </div>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} className="max-w-44">
              <option value="">Todo tipo</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {filtered.map((i) => (
              <div key={i.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip accent={accent}>{i.kind}</Chip>
                      {i.year && <Chip>{i.year}</Chip>}
                      {i.topic && <Chip>{i.topic}</Chip>}
                    </div>
                    <h3 className="mt-2 text-sm font-bold tracking-tight">{i.title}</h3>
                    {i.author && <p className="text-[11px] text-muted-foreground">{i.author}</p>}
                    {i.summary && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{i.summary}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => delItem.mutate(i.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar material"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {i.url && (
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-[11px] font-bold hover:border-primary/40"
                    >
                      Abrir enlace
                    </a>
                  )}
                  {i.storage_path && (
                    <Btn
                      onClick={async () => {
                        const { data, error } = await supabase.storage
                          .from("content")
                          .createSignedUrl(i.storage_path!, 3600);
                        if (error || !data) return toast.error("No se pudo abrir el archivo");
                        window.open(data.signedUrl, "_blank");
                      }}
                    >
                      <Download className="size-3" /> Descargar
                    </Btn>
                  )}
                </div>
              </div>
            ))}
            {!items.isLoading && filtered.length === 0 && (
              <div className="md:col-span-2">
                <Empty
                  text={
                    isAdmin
                      ? "Añade libros, guías, protocolos, PDF o videos y quedarán indexados."
                      : "Todavía no hay material en la biblioteca."
                  }
                />
              </div>
            )}
          </div>
        </>
      )}

      {tab === "videos" && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(videos.data ?? []).filter((v) => v.storyboard?.kind !== "comic").map((v) => (
            <div key={v.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="flex flex-wrap gap-1.5">
                <Chip accent={accent}>
                  <Film className="size-3" /> storyboard
                </Chip>
                <Chip>{v.storyboard?.scenes?.length ?? 0} escenas</Chip>
                <Chip>{v.storyboard?.durationMinutes ?? "?"} min</Chip>
              </div>
              <h3 className="mt-2 text-sm font-bold tracking-tight">{v.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {v.storyboard?.logline}
              </p>
              <div className="mt-3">
                <Btn variant="solid" accent={accent} onClick={() => setOpenVideo(v)}>
                  Ver storyboard
                </Btn>
              </div>
            </div>
          ))}
          {!videos.isLoading && (videos.data ?? []).length === 0 && (
            <div className="md:col-span-2">
              <Empty
                text={
                  isAdmin
                    ? 'Escribe "Reanimación neonatal" y la IA creará escenas, narración, subtítulos y material descargable.'
                    : "Aún no hay guiones de video publicados."
                }
              />
            </div>
          )}
        </div>
      )}

      {tab === "comics" && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(videos.data ?? [])
            .filter((v) => v.storyboard?.kind === "comic")
            .map((v) => (
              <div key={v.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="flex flex-wrap gap-1.5">
                  <Chip accent={accent}>
                    <BookOpen className="size-3" /> cómic interactivo
                  </Chip>
                  <Chip>{v.storyboard?.nodes?.length ?? 0} nodos</Chip>
                </div>
                <h3 className="mt-2 text-sm font-bold tracking-tight">{v.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {v.storyboard?.logline}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn variant="solid" accent={accent} onClick={() => setOpenComic(v)}>
                    Leer cómic
                  </Btn>
                  {isAdmin && (
                    <>
                      <Btn onClick={() => setEditComic(v)}>Editar todo</Btn>
                      <Btn onClick={() => delVideo.mutate(v.id)}>
                        <Trash2 className="size-3" /> Eliminar
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            ))}
          {!videos.isLoading &&
            (videos.data ?? []).filter((v) => v.storyboard?.kind === "comic").length === 0 && (
              <div className="md:col-span-2">
                <Empty
                  text={
                    isAdmin
                      ? 'Escribe "Shock séptico en lactante" y la IA creará un cómic ilustrado donde el usuario toma decisiones clínicas.'
                      : "Aún no hay cómics interactivos publicados."
                  }
                />
              </div>
            )}
        </div>
      )}

      {adding && (
        <LibraryForm
          meta={meta}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["academy-library", meta.slug] });
          }}
        />
      )}

      {genVideo && (
        <VideoCreator
          meta={meta}
          onClose={() => setGenVideo(false)}
          onSaved={() => {
            setGenVideo(false);
            qc.invalidateQueries({ queryKey: ["academy-videos", meta.slug] });
          }}
        />
      )}

      {genComic && (
        <ComicCreator
          meta={meta}
          onClose={() => setGenComic(false)}
          onSaved={() => {
            setGenComic(false);
            qc.invalidateQueries({ queryKey: ["academy-videos", meta.slug] });
          }}
        />
      )}

      {openVideo && (
        <Modal title={openVideo.title} onClose={() => setOpenVideo(null)} wide>
          <StoryboardView content={openVideo.storyboard} accent={accent} title={openVideo.title} />
        </Modal>
      )}

      {openComic && (
        <Modal title={openComic.title} onClose={() => setOpenComic(null)} full>
          <ComicReader
            doc={openComic.storyboard as ComicDoc}
            accent={accent}
            isAdmin={isAdmin}
            rowId={openComic.id}
            areaSlug={meta.slug}
          />

        </Modal>
      )}

      {editComic && (
        <Modal title={`Editar · ${editComic.title}`} onClose={() => setEditComic(null)} wide>
          <ComicEditor
            meta={meta}
            id={editComic.id}
            title={editComic.title}
            doc={editComic.storyboard as ComicDoc}
            onSaved={() => {
              setEditComic(null);
              qc.invalidateQueries({ queryKey: ["academy-videos", meta.slug] });
            }}
          />
        </Modal>
      )}

    </Panel>
  );
}

function LibraryForm({
  meta,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    kind: "guía",
    title: "",
    author: "",
    year: new Date().getFullYear(),
    topic: "",
    subtopic: "",
    keywords: "",
    url: "",
    summary: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return toast.error("El material necesita un título.");
    setBusy(true);
    try {
      let storagePath: string | null = null;
      if (file) {
        const path = `biblioteca/${meta.slug}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("content").upload(path, file);
        if (error) throw new Error(error.message);
        storagePath = path;
      }
      const { error } = await db.from("academy_library_items").insert({
        area_slug: meta.slug,
        kind: form.kind,
        title: form.title,
        author: form.author || null,
        year: Number(form.year) || null,
        topic: form.topic || null,
        subtopic: form.subtopic || null,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        url: form.url || null,
        storage_path: storagePath,
        summary: form.summary || null,
      });
      if (error) throw new Error(error.message);
      toast.success("Material añadido");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Añadir material" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Año">
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Título">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Autor / institución">
            <Input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </Field>
          <Field label="Tema">
            <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </Field>
        </div>
        <Field label="Palabras clave (separadas por coma)">
          <Input
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          />
        </Field>
        <Field label="Enlace (opcional)">
          <Input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Archivo (opcional)">
          <label className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-2 text-[11px] font-bold cursor-pointer hover:border-primary/40 w-fit">
            <Upload className="size-3.5" /> {file ? file.name : "Subir archivo"}
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
        <Field label="Resumen">
          <Textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </Field>
        <Btn variant="solid" accent={meta.accent} loading={busy} onClick={save}>
          Guardar
        </Btn>
      </div>
    </Modal>
  );
}

function VideoCreator({
  meta,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const gen = useServerFn(generateVideoScript);
  const [prompt, setPrompt] = useState("");
  const [minutes, setMinutes] = useState(6);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!prompt.trim()) return toast.error("Escribe el tema del video.");
    setBusy(true);
    try {
      const res: any = await gen({ data: { prompt, minutes } });
      const { title, ...storyboard } = res;
      const { error } = await db.from("academy_video_scripts").insert({
        area_slug: meta.slug,
        title,
        topic: prompt,
        storyboard,
      });
      if (error) throw new Error(error.message);
      toast.success("Storyboard generado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Generador de videos IA" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Tema">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ej. "Reanimación neonatal"'
          />
        </Field>
        <Field label="Duración (minutos)">
          <Input
            type="number"
            min={2}
            max={30}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </Field>
        <Btn variant="solid" accent={meta.accent} loading={busy} onClick={run}>
          <Sparkles className="size-3" /> Construir storyboard
        </Btn>
      </div>
    </Modal>
  );
}

function StoryboardView({
  content,
  accent,
  title,
}: {
  content: any;
  accent: string;
  title: string;
}) {
  const download = () => {
    const md = [
      `# ${title}`,
      content?.logline ?? "",
      "",
      ...(content?.scenes ?? []).map(
        (s: any) =>
          `## Escena ${s.n}. ${s.title} (${s.seconds}s)\n\n**Visual:** ${s.visual}\n\n**Animación:** ${s.animation}\n\n**Texto en pantalla:** ${s.onScreenText}\n\n**Narración:** ${s.narration}\n\n**Subtítulo:** ${s.subtitle}\n`,
      ),
      `\n## Notas de voz\n${content?.voiceOverNotes ?? ""}`,
      `\n## Material descargable\n${(content?.downloadables ?? []).map((d: string) => `- ${d}`).join("\n")}`,
      `\n## Referencias\n${(content?.references ?? []).map((d: string) => `- ${d}`).join("\n")}`,
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-storyboard.md`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1">{content?.logline}</p>
        <Btn variant="solid" accent={accent} onClick={download}>
          <Download className="size-3" /> Descargar guion
        </Btn>
      </div>
      <div className="space-y-3">
        {(content?.scenes ?? []).map((s: any) => (
          <div key={s.n} className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="flex flex-wrap gap-1.5">
              <Chip accent={accent}>Escena {s.n}</Chip>
              <Chip>{s.seconds}s</Chip>
            </div>
            <h4 className="mt-2 text-sm font-bold">{s.title}</h4>
            <dl className="mt-2 space-y-1 text-xs">
              <Row k="Visual" v={s.visual} />
              <Row k="Animación" v={s.animation} />
              <Row k="Texto en pantalla" v={s.onScreenText} />
              <Row k="Narración" v={s.narration} />
              <Row k="Subtítulo" v={s.subtitle} />
            </dl>
          </div>
        ))}
      </div>
      {content?.voiceOverNotes && (
        <p className="text-xs text-muted-foreground">🎙 {content.voiceOverNotes}</p>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}
