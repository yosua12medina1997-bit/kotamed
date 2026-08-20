/**
 * Adjuntos clínicos universales: cualquier usuario (interno o admin) puede
 * subir fotos, PDF, documentos o cualquier archivo al expediente del paciente.
 */
import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { Btn, Empty } from "@/components/academy/ui";
import {
  humanBytes,
  signedFileUrl,
  useDeleteClinicalFile,
  useUploadClinicalFile,
  useWardFiles,
  type WardFile,
} from "@/lib/ward-clinical";

export function FileDrop({
  patientId,
  refKind = "general",
  refId = null,
  accent,
  label = "Adjuntar archivos (fotos, PDF, informes, cualquier formato)",
  compact,
  userId,
  isAdmin,
}: {
  patientId: string | null;
  refKind?: string;
  refId?: string | null;
  accent: string;
  label?: string;
  compact?: boolean;
  userId?: string;
  isAdmin?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: files = [] } = useWardFiles(patientId, refKind === "all" ? undefined : refKind);
  const upload = useUploadClinicalFile(patientId);
  const del = useDeleteClinicalFile(patientId);

  const visible = refId ? files.filter((f) => f.ref_id === refId) : files;

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    for (const file of Array.from(list)) {
      if (file.size > 40 * 1024 * 1024) {
        setError(`${file.name} supera 40 MB.`);
        continue;
      }
      try {
        await upload.mutateAsync({ file, refKind, refId });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      }
    }
  }

  async function open(file: WardFile) {
    try {
      const url = await signedFileUrl(file);
      window.open(url, "_blank", "noopener");
    } catch {
      setError("No se pudo abrir el archivo.");
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`grid place-items-center rounded-2xl border border-dashed px-4 text-center transition ${
          compact ? "py-4" : "py-7"
        }`}
        style={{
          borderColor: drag ? accent : undefined,
          background: drag ? `${accent}0f` : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Upload className="size-5" style={{ color: accent }} />
        <p className="mt-2 text-[12px] font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">Arrastra aquí o</p>
        <Btn
          className="mt-2"
          variant="outline"
          accent={accent}
          onClick={() => inputRef.current?.click()}
          disabled={!patientId || upload.isPending}
        >
          {upload.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
          Seleccionar archivos
        </Btn>
      </div>

      {error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}

      {visible.length === 0 ? (
        !compact && <Empty text="Sin archivos adjuntos todavía." />
      ) : (
        <ul className="space-y-1.5">
          {visible.map((f) => {
            const isImg = (f.mime ?? "").startsWith("image/");
            const canDelete = isAdmin || (userId && f.created_by === userId);
            return (
              <li
                key={f.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2"
              >
                <span
                  className="grid size-8 place-items-center rounded-lg"
                  style={{ background: `${accent}1a`, color: accent }}
                >
                  {isImg ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                </span>
                <button type="button" onClick={() => void open(f)} className="min-w-0 text-left">
                  <span className="block truncate text-[12px] font-bold">{f.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {humanBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleString("es-PE")}
                  </span>
                </button>
                {canDelete && (
                  <button
                    type="button"
                    title="Eliminar"
                    onClick={() => del.mutate(f)}
                    className="grid size-8 place-items-center rounded-lg border border-border/60 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
