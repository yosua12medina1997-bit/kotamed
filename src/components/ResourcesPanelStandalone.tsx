/**
 * Panel de recursos autónomo (archivos, videos, enlaces, notas) para un
 * `content_nodes.id` dado. Reutilizable fuera de /admin/contenido.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/lib/session";
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type ResourceKind = "file" | "video" | "link" | "text" | "image" | "audio" | "embed";

type ContentResource = {
  id: string;
  node_id: string;
  kind: ResourceKind;
  title: string;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  content: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

const RESOURCE_LABEL: Record<ResourceKind, string> = {
  file: "Archivo",
  video: "Video",
  link: "Enlace",
  text: "Nota",
  image: "Imagen",
  audio: "Audio",
  embed: "Embed",
};

function ResourceIcon({ kind, className }: { kind: ResourceKind; className?: string }) {
  const cls = className ?? "size-4";
  if (kind === "video") return <Film className={cls} />;
  if (kind === "link" || kind === "embed") return <Link2 className={cls} />;
  if (kind === "text") return <FileText className={cls} />;
  if (kind === "image") return <ImageIcon className={cls} />;
  return <Paperclip className={cls} />;
}

export function ResourcesPanelStandalone({
  nodeId,
  nodeTitle,
}: {
  nodeId: string;
  nodeTitle: string;
}) {
  const user = useSupabaseUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"file" | "video" | "link" | "text">("file");
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["content-resources", nodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_resources")
        .select("*")
        .eq("node_id", nodeId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentResource[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (
      r: Partial<ContentResource> & { kind: ResourceKind; title: string },
    ) => {
      setError(null);
      const siblings = q.data ?? [];
      const { error } = await supabase.from("content_resources").insert({
        node_id: nodeId,
        kind: r.kind,
        title: r.title,
        url: r.url ?? null,
        storage_path: r.storage_path ?? null,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes ?? null,
        content: r.content ?? null,
        metadata: (r.metadata ?? {}) as never,
        sort_order: siblings.length,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo agregar."),
  });

  const updateMut = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ContentResource> }) => {
      setError(null);
      const { error } = await supabase
        .from("content_resources")
        .update(input.patch as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const deleteMut = useMutation({
    mutationFn: async (r: ContentResource) => {
      setError(null);
      if (r.storage_path) {
        await supabase.storage.from("content").remove([r.storage_path]);
      }
      const { error } = await supabase.from("content_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo eliminar."),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Recursos · {nodeTitle}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {q.data?.length ?? 0} elemento(s)
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-3">
        {(["file", "video", "link", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/60 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <ResourceIcon kind={t} className="size-3.5" />
            {t === "file"
              ? "Subir archivo"
              : t === "video"
                ? "Subir video"
                : t === "link"
                  ? "Insertar video / enlace"
                  : "Nota / texto"}
          </button>
        ))}
      </div>

      <div className="mb-4">
        {tab === "file" && (
          <UploadForm
            nodeId={nodeId}
            accept="*/*"
            kindHint="file"
            onDone={(payload) => createMut.mutateAsync(payload)}
            onError={(m) => setError(m)}
          />
        )}
        {tab === "video" && (
          <UploadForm
            nodeId={nodeId}
            accept="video/*"
            kindHint="video"
            onDone={(payload) => createMut.mutateAsync(payload)}
            onError={(m) => setError(m)}
          />
        )}
        {tab === "link" && <LinkForm onCreate={(p) => createMut.mutateAsync(p)} />}
        {tab === "text" && <TextForm onCreate={(p) => createMut.mutateAsync(p)} />}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
          {error}
        </div>
      )}

      {q.isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="text-[12px] text-muted-foreground italic">
          Aún no hay recursos. Sube archivos, videos o pega un enlace de YouTube.
        </p>
      ) : (
        <ul className="space-y-2">
          {q.data!.map((r) => (
            <ResourceRow
              key={r.id}
              r={r}
              onUpdate={(patch) => updateMut.mutateAsync({ id: r.id, patch })}
              onDelete={() => deleteMut.mutateAsync(r)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadForm({
  nodeId,
  accept,
  kindHint,
  onDone,
  onError,
}: {
  nodeId: string;
  accept: string;
  kindHint: "file" | "video";
  onDone: (
    payload: Partial<ContentResource> & { kind: ResourceKind; title: string },
  ) => Promise<unknown>;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  return (
    <label className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-dashed border-primary/40 bg-background/60 cursor-pointer hover:bg-primary/[0.04]">
      <Upload className="size-4 text-primary" />
      <span className="text-[12px] font-semibold text-foreground">
        {kindHint === "video" ? "Elegir video para subir" : "Elegir archivo(s)"}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {busy ? (progress ?? "Subiendo…") : "PDF, DOCX, PPTX, MP4, MP3, imágenes…"}
      </span>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          setBusy(true);
          try {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`);
              const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
              const path = `${nodeId}/${Date.now()}_${safe}`;
              const { error: upErr } = await supabase.storage
                .from("content")
                .upload(path, file, {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: file.type || undefined,
                });
              if (upErr) throw upErr;
              const isVideo = file.type.startsWith("video/") || kindHint === "video";
              const isImage = file.type.startsWith("image/");
              const isAudio = file.type.startsWith("audio/");
              const kind: ResourceKind = isVideo
                ? "video"
                : isImage
                  ? "image"
                  : isAudio
                    ? "audio"
                    : "file";
              await onDone({
                kind,
                title: file.name,
                storage_path: path,
                mime_type: file.type || null,
                size_bytes: file.size,
              });
            }
          } catch (err) {
            onError(err instanceof Error ? err.message : "Error al subir archivo.");
          } finally {
            setBusy(false);
            setProgress(null);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
      {busy && <Loader2 className="size-4 animate-spin text-primary" />}
    </label>
  );
}

function LinkForm({
  onCreate,
}: {
  onCreate: (
    payload: Partial<ContentResource> & { kind: ResourceKind; title: string },
  ) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const detectKind = (u: string): ResourceKind => {
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|player\.|\.mp4($|\?)/i.test(u))
      return "video";
    return "link";
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!url.trim()) return;
        setBusy(true);
        try {
          await onCreate({
            kind: detectKind(url),
            title: title.trim() || url.trim(),
            url: url.trim(),
          });
          setTitle("");
          setUrl("");
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-border bg-background/60"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[160px]"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtube.com/… o cualquier URL"
        className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[220px] font-mono"
      />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Agregar
      </button>
    </form>
  );
}

function TextForm({
  onCreate,
}: {
  onCreate: (
    payload: Partial<ContentResource> & { kind: ResourceKind; title: string },
  ) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() && !content.trim()) return;
        setBusy(true);
        try {
          await onCreate({ kind: "text", title: title.trim() || "Nota", content });
          setTitle("");
          setContent("");
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-2 p-3 rounded-lg border border-border bg-background/60"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la nota"
        className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Escribe teoría, algoritmos, perlas… (soporta Markdown)"
        className="bg-background border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-mono leading-relaxed"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Guardar nota
        </button>
      </div>
    </form>
  );
}

function toYouTubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function toVimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/i);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

function ResourceRow({
  r,
  onUpdate,
  onDelete,
}: {
  r: ContentResource;
  onUpdate: (patch: Partial<ContentResource>) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [url, setUrl] = useState(r.url ?? "");
  const [content, setContent] = useState(r.content ?? "");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function getSigned() {
    if (!r.storage_path || signedUrl) return;
    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(r.storage_path, 60 * 60);
    if (!error && data) setSignedUrl(data.signedUrl);
  }
  useEffect(() => {
    if (r.storage_path) getSigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.storage_path]);

  const sizeLabel = r.size_bytes
    ? r.size_bytes > 1024 * 1024
      ? `${(r.size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(r.size_bytes / 1024))} KB`
    : null;

  const embedUrl = r.url ? (toYouTubeEmbed(r.url) ?? toVimeoEmbed(r.url)) : null;

  /** Documento visualizable en ventana (PDF u otro archivo/enlace no multimedia). */
  const docUrl =
    r.kind === "file" || r.kind === "link" || r.kind === "text"
      ? (signedUrl ?? (r.url && !embedUrl ? r.url : null))
      : null;
  const isPdf =
    (r.mime_type ?? "").includes("pdf") ||
    /\.pdf(\?|$)/i.test(r.storage_path ?? r.url ?? "");
  const canExpand = !!docUrl || r.kind === "text";

  return (
    <li className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ResourceIcon kind={r.kind} className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-foreground/[0.04] text-muted-foreground border border-border">
              {RESOURCE_LABEL[r.kind]}
            </span>
            <span className="text-sm font-bold truncate">{r.title}</span>
            {!r.is_published && (
              <span className="text-[9px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Borrador
              </span>
            )}
            {sizeLabel && (
              <span className="text-[10px] text-muted-foreground">{sizeLabel}</span>
            )}
          </div>
          {r.url && (
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline break-all inline-flex items-center gap-1 mt-0.5"
            >
              <ExternalLink className="size-3" /> {r.url}
            </a>
          )}
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
            >
              <Download className="size-3" /> Abrir archivo
            </a>
          )}
          {r.content && !editing && (
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-foreground/80 leading-relaxed max-h-40 overflow-auto bg-background/40 rounded p-2 border border-border/60">
              {r.content}
            </pre>
          )}
          {embedUrl && (
            <div className="mt-2 aspect-video w-full max-w-xl rounded-lg overflow-hidden border border-border">
              <iframe
                src={embedUrl}
                title={r.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
          {signedUrl && r.kind === "video" && (
            <video src={signedUrl} controls className="mt-2 max-w-xl w-full rounded-lg" />
          )}
          {signedUrl && r.kind === "image" && (
            <img
              src={signedUrl}
              alt={r.title}
              className="mt-2 max-w-xl w-full rounded-lg border border-border"
            />
          )}
          {docUrl && (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setInlineOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                >
                  {inlineOpen ? <Minimize2 className="size-3" /> : <Eye className="size-3" />}
                  {inlineOpen ? "Ocultar vista previa" : "Vista previa"}
                </button>
                <button
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/[0.06] px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10"
                >
                  <Maximize2 className="size-3" /> Abrir en ventana grande
                </button>
              </div>
              {inlineOpen && (
                <div className="mt-2 h-[26rem] w-full overflow-hidden rounded-lg border border-border bg-background">
                  <iframe src={docUrl} title={r.title} className="h-full w-full" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canExpand && (
            <button
              onClick={() => setExpanded(true)}
              title="Ventana grande"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}
          <button
            onClick={() => onUpdate({ is_published: !r.is_published })}
            title={r.is_published ? "Ocultar" : "Publicar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
          >
            {r.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            title="Editar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar "${r.title}"?`)) return;
              setBusy(true);
              try {
                await onDelete();
              } finally {
                setBusy(false);
              }
            }}
            title="Eliminar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
            disabled={busy}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          {(r.kind === "link" || r.kind === "video" || r.kind === "embed") && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL"
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          )}
          {r.kind === "text" && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="bg-background border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring font-mono min-h-56"
            />
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setTitle(r.title);
                setUrl(r.url ?? "");
                setContent(r.content ?? "");
                setEditing(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-foreground/[0.05]"
            >
              <X className="size-3.5" /> Cancelar
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await onUpdate({
                    title,
                    url: url || null,
                    content: content || null,
                  });
                  setEditing(false);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      )}
      {expanded && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur">,
        document.body,
      )}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ResourceIcon kind={r.kind} className="size-3.5" />
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-extrabold outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-ring"
            />
            {isPdf && <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PDF</span>}
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" /> Nueva pestaña
              </a>
            )}
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await onUpdate({ title, url: url || null, content: content || null });
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/[0.05]"
              aria-label="Cerrar ventana"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid min-h-0 flex-1 grid-rows-[1.4fr_1fr] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-rows-1">
            <div className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
              {docUrl ? (
                <iframe src={docUrl} title={r.title} className="h-full w-full bg-background" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                  Este recurso no tiene archivo asociado. Usa el panel de la derecha para editar su
                  contenido.
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-col gap-2 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {r.kind === "text" ? "Contenido" : "Notas y transcripción"}
              </span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe aquí resúmenes, apuntes o el texto extraído del PDF…"
                className="min-h-0 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring"
              />
              {(r.kind === "link" || r.kind === "video" || r.kind === "embed") && (
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="URL"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
