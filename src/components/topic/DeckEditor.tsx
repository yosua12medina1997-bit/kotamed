/**
 * Editor de "Contenido visual del tema" — exclusivo para SUPER_ADMIN.
 * Subida múltiple de imágenes/diapositivas, reordenamiento drag & drop,
 * reemplazo/eliminación, guardado como borrador, previsualización y publicación.
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Archive, Eye, GripVertical, Loader2, Trash2, Upload, X } from "lucide-react";
import { DeckViewer } from "@/components/topic/DeckViewer";
import {
  DECK_STATUS_LABEL,
  emptyDeck,
  removeDeckImage,
  saveDeck,
  uploadDeckImages,
  type DeckStatus,
  type TopicDeck,
} from "@/lib/topic-deck";
import { publishNodeBranch } from "@/lib/content-publish";

interface Props {
  nodeId: string;
  nodeTitle: string;
  metadata: Record<string, unknown> | null | undefined;
  initialDeck: TopicDeck | null;
  accent: string;
  onClose: () => void;
  onSaved: (deck: TopicDeck) => void;
}

export function DeckEditor({
  nodeId,
  nodeTitle,
  metadata,
  initialDeck,
  accent,
  onClose,
  onSaved,
}: Props) {
  const [deck, setDeck] = useState<TopicDeck>(initialDeck ?? emptyDeck());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<number | null>(null);

  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setBusy(true);
    try {
      const slides = await uploadDeckImages(nodeId, list);
      setDeck((d) => ({ ...d, slides: [...d.slides, ...slides] }));
      toast.success(`${slides.length} diapositiva(s) añadida(s)`);
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  };

  const replaceAt = async (files: FileList | null) => {
    const file = Array.from(files ?? [])[0];
    const i = replaceTarget.current;
    replaceTarget.current = null;
    if (!file || i == null) return;
    setBusy(true);
    try {
      const [slide] = await uploadDeckImages(nodeId, [file]);
      const old = deck.slides[i];
      setDeck((d) => ({
        ...d,
        slides: d.slides.map((s, k) => (k === i ? { ...slide, caption: s.caption } : s)),
      }));
      if (old?.path) await removeDeckImage(old.path);
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo reemplazar");
    } finally {
      setBusy(false);
    }
  };

  const removeAt = async (i: number) => {
    const s = deck.slides[i];
    setDeck((d) => ({ ...d, slides: d.slides.filter((_, k) => k !== i) }));
    if (s?.path) await removeDeckImage(s.path).catch(() => undefined);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    setDeck((d) => {
      const next = [...d.slides];
      const [item] = next.splice(from, 1);
      if (item) next.splice(to, 0, item);
      return { ...d, slides: next };
    });
  };

  const persist = async (status: DeckStatus) => {
    if (status === "published" && deck.slides.length === 0) {
      toast.error("Añade al menos una diapositiva antes de publicar.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveDeck(nodeId, metadata, { ...deck, status });
      // Al publicar, el tema y sus ancestros quedan visibles para los alumnos.
      if (status === "published") await publishNodeBranch(nodeId);
      setDeck(saved);
      onSaved(saved);
      toast.success(
        status === "published"
          ? "Tema publicado: las diapositivas ya están disponibles"
          : status === "archived"
            ? "Presentación archivada"
            : "Borrador guardado",
      );
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-background p-5 shadow-2xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Contenido visual del tema · Super Admin
            </div>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">{nodeTitle}</h3>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Estado actual:{" "}
              <span className="font-bold text-foreground">{DECK_STATUS_LABEL[deck.status]}</span> ·{" "}
              {deck.slides.length} diapositiva(s)
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/60">
            <X className="size-4" />
          </button>
        </div>

        {/* Zona de subida */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(e.dataTransfer.files);
          }}
          className="mt-5 rounded-2xl border-2 border-dashed border-border/70 bg-background/40 p-6 text-center"
        >
          <Upload className="mx-auto size-5 text-primary" />
          <p className="mt-2 text-sm font-semibold">Arrastra imágenes, transparencias o diapositivas</p>
          <p className="text-[11px] text-muted-foreground">PNG, JPG o WEBP · selección múltiple</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
            style={{ background: accent }}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />} Subir imágenes
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void addFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void replaceAt(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {/* Lista ordenable */}
        <div className="mt-5 space-y-2">
          {deck.slides.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx != null) move(dragIdx, i);
                setDragIdx(null);
              }}
              className={`flex items-center gap-3 rounded-2xl border bg-background/60 p-2 ${
                dragIdx === i ? "border-primary" : "border-border/60"
              }`}
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
              <span className="w-6 shrink-0 text-center text-xs font-black">{i + 1}</span>
              <img src={s.url} alt="" className="h-14 w-20 shrink-0 rounded-lg bg-black/80 object-contain" />
              <input
                value={s.caption ?? ""}
                onChange={(e) =>
                  setDeck((d) => ({
                    ...d,
                    slides: d.slides.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)),
                  }))
                }
                placeholder="Leyenda opcional…"
                className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-xs outline-none"
              />
              <button
                onClick={() => {
                  replaceTarget.current = i;
                  replaceRef.current?.click();
                }}
                className="rounded-lg border border-border/60 px-2 py-1 text-[10px] font-bold hover:border-primary/40"
              >
                Reemplazar
              </button>
              <button
                onClick={() => void removeAt(i)}
                className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                aria-label="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {deck.slides.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Todavía no hay diapositivas visuales para este tema.
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <button
            onClick={() => void persist("draft")}
            disabled={busy}
            className="rounded-xl border border-border/60 px-3 py-2 text-xs font-bold hover:border-primary/40 disabled:opacity-60"
          >
            Guardar borrador
          </button>
          <button
            onClick={() => {
              if (deck.slides.length === 0) {
                toast.info("Sube diapositivas para previsualizar.");
                return;
              }
              setPreview(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-bold hover:border-primary/40"
          >
            <Eye className="size-3.5" /> Previsualizar como usuario
          </button>
          <button
            onClick={() => void persist("archived")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-bold hover:border-primary/40 disabled:opacity-60"
          >
            <Archive className="size-3.5" /> Archivar
          </button>
          <button
            onClick={() => void persist("published")}
            disabled={busy}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-60"
            style={{ background: accent }}
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />} Publicar tema
          </button>
        </div>
      </div>
    </div>

    {preview && (
      <DeckViewer
        deck={deck}
        title={nodeTitle}
        accent={accent}
        badge="Previsualización"
        onClose={() => setPreview(false)}
      />
    )}
  );
}
