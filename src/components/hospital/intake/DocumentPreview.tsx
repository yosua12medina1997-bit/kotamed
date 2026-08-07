/** Vista del documento original con zona resaltable del campo seleccionado. */
import { FileText } from "lucide-react";

export interface IntakeDoc {
  id: string;
  file: File;
  url: string;
  isPdf: boolean;
}

export function DocumentPreview({
  docs,
  index,
  onIndex,
  highlightLabel,
  accent,
}: {
  docs: IntakeDoc[];
  index: number;
  onIndex: (i: number) => void;
  highlightLabel?: string | null;
  accent: string;
}) {
  const doc = docs[index];
  if (!doc) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Documento original
        </div>
        {docs.length > 1 && (
          <div className="flex gap-1">
            {docs.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onIndex(i)}
                className="size-6 rounded-lg border text-[10px] font-bold"
                style={{
                  borderColor: i === index ? accent : "hsl(var(--border) / 0.6)",
                  color: i === index ? accent : undefined,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative mt-2 max-h-[70vh] overflow-auto rounded-xl border border-border/40 bg-black/20">
        {doc.isPdf ? (
          <object data={doc.url} type="application/pdf" className="h-[60vh] w-full">
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-5" />
              {doc.file.name}
            </div>
          </object>
        ) : (
          <img src={doc.url} alt={doc.file.name} className="w-full object-contain" />
        )}

        {highlightLabel && !doc.isPdf && (
          <div
            className="pointer-events-none absolute inset-x-4 top-4 rounded-lg border-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              borderColor: accent,
              color: accent,
              background: "rgb(0 0 0 / 0.35)",
              boxShadow: `0 0 24px -4px ${accent}`,
            }}
          >
            Origen aproximado · {highlightLabel}
          </div>
        )}
      </div>
      <div className="mt-2 truncate text-[11px] text-muted-foreground">{doc.file.name}</div>
    </div>
  );
}
