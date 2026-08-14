/**
 * Selector universal de imágenes del CMS KotaMed.
 * Cuatro fuentes en un solo control: Subir archivo, URL externa, Biblioteca de
 * medios (cms_assets) y Generación con IA. Incluye vista previa, reemplazo y
 * eliminación. Se reutiliza en todos los editores del Studio.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Library, Link2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Btn, Field, Input } from "@/components/academy/ui";
import { useCmsAssets, useUploadAsset } from "@/lib/cms-assets";
import { uploadCmsMedia } from "@/lib/cms";

type Source = "upload" | "url" | "library" | "ai";

const TABS: { id: Source; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Subir", icon: Upload },
  { id: "url", label: "URL", icon: Link2 },
  { id: "library", label: "Biblioteca", icon: Library },
  { id: "ai", label: "IA", icon: Sparkles },
];

/** Genera una imagen con IA y la deja subida al almacén del CMS. */
export async function generateCmsImage(prompt: string, filename = "cms.png") {
  const res = await fetch("/api/cms-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("La IA no devolvió una imagen.");
  const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
  return uploadCmsMedia(blob, filename);
}

export function ImagePicker({
  label = "Imagen",
  value,
  onChange,
  aiHint,
  compact,
}: {
  label?: string;
  value?: string | null;
  onChange: (url: string) => void;
  aiHint?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Source>("upload");
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState(aiHint ?? "");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const assets = useCmsAssets();
  const upload = useUploadAsset();

  const images = (assets.data ?? []).filter(
    (a) =>
      (a.type === "image" || a.type === "svg") &&
      (!q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setUrl("");
  };

  const doUpload = async (file: File) => {
    setBusy(true);
    try {
      const asset = await upload.mutateAsync(file);
      pick(asset.url);
      toast.success("Imagen subida a la biblioteca");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const doAi = async () => {
    if (prompt.trim().length < 3) {
      toast.error("Describe la imagen que quieres generar.");
      return;
    }
    setBusy(true);
    try {
      pick(await generateCmsImage(prompt.trim()));
      toast.success("Imagen generada con IA");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card/60 p-2">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
              tab === t.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <t.icon className="size-3" /> {t.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(false)}
          className="ml-auto text-muted-foreground hover:text-foreground"
          title="Cerrar"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {tab === "upload" && (
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-border/70 px-3 py-5 text-center text-[11px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground">
          <Upload className="size-4" />
          {busy ? "Subiendo…" : "Elegir archivo del dispositivo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doUpload(f);
            }}
          />
        </label>
      )}

      {tab === "url" && (
        <div className="flex gap-1.5">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… o /pg/imagen.jpg"
          />
          <Btn variant="solid" onClick={() => url.trim() && pick(url.trim())}>
            Usar
          </Btn>
        </div>
      )}

      {tab === "library" && (
        <div className="space-y-1.5">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en la biblioteca…"
          />
          <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto">
            {assets.isLoading ? (
              <p className="col-span-3 py-4 text-center text-[11px] text-muted-foreground">
                Cargando…
              </p>
            ) : images.length === 0 ? (
              <p className="col-span-3 py-4 text-center text-[11px] text-muted-foreground">
                Aún no hay imágenes en la biblioteca.
              </p>
            ) : (
              images.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pick(a.url)}
                  className="group overflow-hidden rounded-lg border border-border/60 hover:border-primary"
                  title={a.name}
                >
                  <img
                    src={a.url}
                    alt={a.alt ?? a.name}
                    className="aspect-video w-full object-cover"
                  />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-1.5">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe la imagen (estilo KotaMed premium)"
          />
          <Btn variant="solid" loading={busy} onClick={doAi}>
            <Sparkles className="size-3" /> Generar imagen
          </Btn>
        </div>
      )}
    </div>
  );

  const control = (
    <div className="space-y-1.5">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border/60">
          <img
            src={value}
            alt=""
            className={compact ? "h-16 w-full object-cover" : "h-28 w-full object-cover"}
          />
          <button
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1.5 rounded-lg bg-background/80 p-1 text-muted-foreground backdrop-blur hover:text-destructive"
            title="Quitar imagen"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid h-16 place-items-center rounded-xl border border-dashed border-border/70 text-[11px] text-muted-foreground">
          Sin imagen
        </div>
      )}
      <div className="flex gap-1.5">
        <Btn variant="outline" onClick={() => setOpen((v) => !v)}>
          <ImageIcon className="size-3" /> {value ? "Reemplazar" : "Elegir imagen"}
        </Btn>
      </div>
      {open && body}
    </div>
  );

  return compact ? control : <Field label={label}>{control}</Field>;
}
