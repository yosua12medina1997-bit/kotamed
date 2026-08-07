/**
 * Asistente de Registro Inteligente con IA (4 pasos):
 * 1) Subida de documentos · 2) Análisis inteligente · 3) OCR + interpretación
 * 4) Formulario autocompletado (reutiliza el formulario de ingreso existente).
 */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Btn, Empty } from "@/components/academy/ui";
import { analyzeNeoIntakeDocuments } from "@/lib/neo-intake.functions";
import {
  ACCEPTED_INTAKE_TYPES,
  AI_INTAKE_FIELDS,
  checkDuplicateHc,
  readAsDataUrl,
  validateIntake,
  type AiIntakeResult,
} from "@/lib/neo-intake";
import { PatientReviewPanel } from "./PatientReviewPanel";
import type { IntakeDoc } from "./DocumentPreview";

const STEPS = ["Documentos", "Análisis", "Interpretación", "Formulario"];

const PHRASES = [
  "Analizando documento…",
  "Detectando texto…",
  "Reconociendo datos clínicos…",
  "Interpretando abreviaturas…",
  "Validando información…",
  "Preparando formulario…",
];

export function AIUploadWizard({
  mode,
  unit,
  accent,
  onCancel,
  onApply,
}: {
  mode: "camera" | "upload";
  unit: string;
  accent: string;
  onCancel: () => void;
  onApply: (payload: {
    values: Record<string, string>;
    result: AiIntakeResult;
    docs: File[];
    warnings: string[];
  }) => void;
}) {
  const [step, setStep] = useState(0);
  const [docs, setDocs] = useState<IntakeDoc[]>([]);
  const [progress, setProgress] = useState(0);
  const [phrase, setPhrase] = useState(PHRASES[0]!);
  const [result, setResult] = useState<AiIntakeResult | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzeNeoIntakeDocuments);

  useEffect(() => () => docs.forEach((d) => URL.revokeObjectURL(d.url)), []);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next: IntakeDoc[] = [];
    for (const file of Array.from(list).slice(0, 6 - docs.length)) {
      next.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        url: URL.createObjectURL(file),
        isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
      });
    }
    setDocs((d) => [...d, ...next]);
  };

  const removeDoc = (id: string) => {
    setDocs((d) => {
      const gone = d.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return d.filter((x) => x.id !== id);
    });
  };

  const run = async () => {
    if (!docs.length) return;
    setStep(1);
    setProgress(4);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setPhrase(PHRASES[Math.min(PHRASES.length - 1, Math.floor(i / 3))]!);
      setProgress((p) => Math.min(92, p + Math.random() * 9 + 2));
    }, 700);

    try {
      const files = await Promise.all(
        docs.map(async (d) => ({
          name: d.file.name,
          mime: d.file.type || (d.isPdf ? "application/pdf" : "image/jpeg"),
          dataUrl: await readAsDataUrl(d.file),
        })),
      );
      const res = (await analyze({ data: { files, unit } })) as AiIntakeResult;
      clearInterval(timer);
      setProgress(100);

      const base: Record<string, string> = {};
      for (const { key } of AI_INTAKE_FIELDS) base[key] = res.fields[key] ?? "";
      const local = validateIntake(base);
      const dup = await checkDuplicateHc(base["hc"] ?? "");

      setResult(res);
      setValues(base);
      setWarnings([...local, ...dup]);
      setStep(3);
    } catch (e: any) {
      clearInterval(timer);
      setStep(0);
      setProgress(0);
      toast.error(e?.message ?? "No se pudo analizar el documento.");
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4" style={{ color: accent }} />
          Registro Inteligente con IA
        </div>
        <Btn variant="ghost" onClick={onCancel}>
          <X className="size-3" /> Cerrar asistente
        </Btn>
      </div>

      {/* Pasos */}
      <div className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{
              borderColor: i <= step ? accent : "hsl(var(--border) / 0.6)",
              color: i <= step ? accent : "hsl(var(--muted-foreground))",
            }}
          >
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {/* PASO 1 · Documentos */}
      {step === 0 && (
        <div className="mt-4 space-y-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-background/40 px-4 py-10 text-center transition hover:bg-background/70"
          >
            <Upload className="size-5" style={{ color: accent }} />
            <div className="text-sm font-semibold">
              {mode === "camera"
                ? "Toma o selecciona fotografías del documento"
                : "Arrastra aquí los archivos o haz clic para seleccionar"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              PDF · JPG · JPEG · PNG · HEIC — hasta 6 documentos
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={ACCEPTED_INTAKE_TYPES}
            {...(mode === "camera" ? { capture: "environment" as any } : {})}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {docs.length === 0 ? (
            <Empty text="Aún no has agregado documentos." />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-background/60"
                >
                  {d.isPdf ? (
                    <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">
                      PDF
                    </div>
                  ) : (
                    <img src={d.url} alt={d.file.name} className="h-24 w-full object-cover" />
                  )}
                  <div className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                    {d.file.name}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDoc(d.id);
                    }}
                    className="absolute right-1 top-1 rounded-lg border border-border/60 bg-background/80 p-1 text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Btn variant="solid" accent={accent} onClick={run} disabled={!docs.length}>
            <Sparkles className="size-3" /> Analizar con IA
          </Btn>
        </div>
      )}

      {/* PASO 2 · Análisis */}
      {(step === 1 || step === 2) && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="size-4 animate-spin" style={{ color: accent }} />
            <span className="font-semibold">{phrase}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: accent }}
            />
          </div>
          <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground md:grid-cols-3">
            {PHRASES.map((p) => (
              <div key={p} className={PHRASES.indexOf(p) <= PHRASES.indexOf(phrase) ? "opacity-100" : "opacity-40"}>
                • {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PASO 3 + 4 · Revisión y autocompletado */}
      {step === 3 && result && (
        <div className="mt-4">
          <PatientReviewPanel
            docs={docs}
            result={result}
            values={values}
            onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            warnings={warnings}
            accent={accent}
            onBack={() => setStep(0)}
            onApply={() =>
              onApply({
                values,
                result,
                docs: docs.map((d) => d.file),
                warnings,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
