/**
 * Calculadora pediátrica con contexto de paciente: reutiliza el centro de
 * calculadoras clínicas de KotaMed y permite guardar el resultado en el
 * expediente (trazabilidad de dosis y cálculos).
 */
import { useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { Btn, Empty, Field, Input } from "@/components/academy/ui";
import { CalculatorsModule } from "@/components/hospital/modules/CalculatorsModule";
import { useWardDelete, useWardSave, type WardPatient } from "@/lib/ward-os";
import { CLINICAL_KEYS, fmtDateTime, logClinicalEvent, useCalcs } from "@/lib/ward-clinical";
import { WardCard } from "./ui";

export function WardCalculator({ patient, accent }: { patient: WardPatient; accent: string }) {
  const { data: calcs = [] } = useCalcs(patient.id);
  const save = useWardSave("ward_calcs", [CLINICAL_KEYS.calcs(patient.id)]);
  const del = useWardDelete("ward_calcs", [CLINICAL_KEYS.calcs(patient.id)]);
  const [tool, setTool] = useState("");
  const [result, setResult] = useState("");

  return (
    <div className="space-y-5">
      <WardCard
        title="Contexto del paciente"
        subtitle="Usa el peso y la edad registrados para que los cálculos sean exactos."
        icon={<Calculator className="size-4" style={{ color: accent }} />}
      >
        <div className="flex flex-wrap gap-2 text-[11.5px] font-bold">
          {[
            ["Peso", patient.weight_kg ? `${patient.weight_kg} kg` : "—"],
            ["Talla", patient.height_cm ? `${patient.height_cm} cm` : "—"],
            ["Edad", patient.age_label ?? "—"],
            ["Dx", patient.main_dx ?? "—"],
          ].map(([k, v]) => (
            <span key={k} className="rounded-xl border border-border/60 bg-background/60 px-2.5 py-1.5">
              <span className="text-muted-foreground">{k}: </span>
              {v}
            </span>
          ))}
        </div>
      </WardCard>

      <CalculatorsModule accent={accent} />

      <WardCard
        title="Guardar cálculo en el expediente"
        subtitle="Queda registrado en la línea de tiempo con el peso usado."
        icon={<Calculator className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            disabled={!tool.trim() || !result.trim()}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                patient_id: patient.id,
                tool: tool.trim(),
                weight_kg: patient.weight_kg,
                result: result.trim(),
              });
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "calculo",
                title: `${tool.trim()}`,
                detail: `${result.trim()}${patient.weight_kg ? ` · peso ${patient.weight_kg} kg` : ""}`,
              });
              setTool("");
              setResult("");
            }}
          >
            <Plus className="size-3.5" /> Guardar
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Herramienta / fórmula">
            <Input value={tool} onChange={(e) => setTool(e.target.value)} placeholder="Dosis de paracetamol" />
          </Field>
          <Field label="Resultado">
            <Input value={result} onChange={(e) => setResult(e.target.value)} placeholder="150 mg cada 6 h" />
          </Field>
        </div>
      </WardCard>

      <WardCard title="Cálculos guardados" icon={<Calculator className="size-4" style={{ color: accent }} />}>
        {calcs.length === 0 ? (
          <Empty text="Sin cálculos guardados para este paciente." />
        ) : (
          <ul className="space-y-2">
            {calcs.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 bg-background/40 px-3 py-2 text-[12px]"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold">{c.tool}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {c.result} · {fmtDateTime(c.created_at)}
                    {c.weight_kg ? ` · ${c.weight_kg} kg` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </WardCard>
    </div>
  );
}
