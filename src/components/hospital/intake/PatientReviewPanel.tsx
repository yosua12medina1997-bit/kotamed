/**
 * Panel de revisión: vista comparativa (documento original ↔ formulario
 * autocompletado) con indicadores de confianza y advertencias clínicas.
 */
import { useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Btn, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { AI_INTAKE_FIELDS, CONFIDENCE_THRESHOLD, type AiIntakeResult } from "@/lib/neo-intake";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { DocumentPreview, type IntakeDoc } from "./DocumentPreview";

export function PatientReviewPanel({
  docs,
  result,
  values,
  onChange,
  warnings,
  accent,
  onApply,
  onBack,
}: {
  docs: IntakeDoc[];
  result: AiIntakeResult;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  warnings: string[];
  accent: string;
  onApply: () => void;
  onBack: () => void;
}) {
  const [docIndex, setDocIndex] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  const focusedLabel =
    AI_INTAKE_FIELDS.find((f) => f.key === focused)?.label ?? null;

  return (
    <div className="space-y-3">
      {(warnings.length > 0 || result.warnings.length > 0) && (
        <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/5 p-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-yellow-400">
            <AlertTriangle className="size-3.5" /> Validación clínica
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {[...result.warnings, ...warnings].map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] text-yellow-400/90">
            Ningún dato se guarda automáticamente: revisa y confirma antes de registrar.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <DocumentPreview
          docs={docs}
          index={docIndex}
          onIndex={setDocIndex}
          highlightLabel={focusedLabel}
          accent={accent}
        />

        <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
              Datos interpretados · editables
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Sparkles className="size-3.5" style={{ color: accent }} />
              Confianza global
              <ConfidenceIndicator value={result.overallConfidence} />
            </div>
          </div>

          {result.clasificacion && (
            <div className="mt-2 text-xs text-muted-foreground">
              Clasificación sugerida:{" "}
              <span className="font-bold" style={{ color: accent }}>
                {result.clasificacion}
              </span>
            </div>
          )}

          <div className="mt-3 max-h-[62vh] space-y-2 overflow-auto pr-1">
            {AI_INTAKE_FIELDS.map((f) => {
              const conf = result.confidence[f.key];
              const low = conf !== undefined && conf < CONFIDENCE_THRESHOLD;
              return (
                <div
                  key={f.key}
                  className={`rounded-xl p-2 transition ${low ? "ring-1 ring-yellow-400/70 bg-yellow-400/5" : ""}`}
                  onFocus={() => setFocused(f.key)}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {f.label}
                    </span>
                    <ConfidenceIndicator value={conf} />
                  </div>
                  {f.key === "observaciones" || f.key === "diagnostico_ingreso" ? (
                    <Textarea
                      value={values[f.key] ?? ""}
                      onChange={(e) => onChange(f.key, e.target.value)}
                    />
                  ) : f.key === "sexo" ? (
                    <Select
                      value={values[f.key] ?? ""}
                      onChange={(e) => onChange(f.key, e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="indeterminado">Indeterminado</option>
                    </Select>
                  ) : (
                    <Input
                      type={
                        f.key === "fecha_nacimiento"
                          ? "date"
                          : f.key === "hora_nacimiento"
                            ? "time"
                            : f.key === "edad_gestacional" || f.key === "peso_nacimiento"
                              ? "number"
                              : "text"
                      }
                      step={f.key === "edad_gestacional" ? "any" : undefined}
                      value={values[f.key] ?? ""}
                      onChange={(e) => onChange(f.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {result.ocrText && (
        <details className="rounded-2xl border border-border/50 bg-background/40 p-3">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Texto reconocido (OCR)
          </summary>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {result.ocrText}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <Btn variant="solid" accent={accent} onClick={onApply}>
          <Sparkles className="size-3" /> Autocompletar formulario de ingreso
        </Btn>
        <Btn variant="outline" onClick={onBack}>
          Volver a documentos
        </Btn>
      </div>
      <Field label="">
        <span className="text-[11px] text-muted-foreground">
          Todos los campos permanecen editables. La decisión final siempre es del profesional.
        </span>
      </Field>
    </div>
  );
}
