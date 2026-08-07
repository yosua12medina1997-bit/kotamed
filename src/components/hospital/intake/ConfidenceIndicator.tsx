/** Indicador de confianza por campo extraído por la IA. */
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CONFIDENCE_THRESHOLD } from "@/lib/neo-intake";

export function ConfidenceIndicator({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const low = value < CONFIDENCE_THRESHOLD;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
      style={{
        borderColor: low ? "rgb(250 204 21 / 0.6)" : "rgb(34 197 94 / 0.5)",
        color: low ? "rgb(250 204 21)" : "rgb(34 197 94)",
        background: low ? "rgb(250 204 21 / 0.08)" : "rgb(34 197 94 / 0.08)",
      }}
      title={low ? "Confianza baja: requiere revisión" : "Confianza alta"}
    >
      {low ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
      {value}%
    </span>
  );
}

export function confidenceBorder(value?: number): string {
  if (value === undefined || value === null) return "";
  return value < CONFIDENCE_THRESHOLD
    ? "ring-1 ring-yellow-400/70 rounded-xl"
    : "";
}
