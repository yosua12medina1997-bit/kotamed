/**
 * Acciones posteriores al registro + recomendaciones clínicas informativas.
 * Se integran con la lógica existente (no la reemplazan).
 */
import { BedDouble, ClipboardList, FileText, Printer, Sparkles, Tag } from "lucide-react";
import { Btn } from "@/components/academy/ui";

export function RegistrationAftercare({
  accent,
  classification,
  reminders,
  onOpenChart,
  onHospitalize,
  onPrint,
  onBracelet,
  onDismiss,
}: {
  accent: string;
  classification?: string;
  reminders: string[];
  onOpenChart: () => void;
  onHospitalize: () => void;
  onPrint: () => void;
  onBracelet: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Sparkles className="size-4" style={{ color: accent }} />
        Paciente registrado correctamente
      </div>

      {classification && (
        <div className="mt-1 text-xs text-muted-foreground">
          Paciente compatible con{" "}
          <span className="font-bold" style={{ color: accent }}>
            {classification}
          </span>
          .
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="solid" accent={accent} onClick={onOpenChart}>
          <ClipboardList className="size-3" /> Abrir historia clínica
        </Btn>
        <Btn variant="outline" onClick={onHospitalize}>
          <BedDouble className="size-3" /> Guardar y hospitalizar
        </Btn>
        <Btn variant="outline" onClick={onPrint}>
          <Printer className="size-3" /> Imprimir ficha
        </Btn>
        <Btn variant="outline" onClick={onBracelet}>
          <Tag className="size-3" /> Generar brazalete
        </Btn>
        <Btn variant="ghost" onClick={onDismiss}>
          <FileText className="size-3" /> Nuevo registro
        </Btn>
      </div>

      <div className="mt-4 rounded-2xl border border-border/50 bg-background/40 p-3">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          Recordatorios clínicos (informativos)
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground md:grid-cols-2">
          {reminders.map((r) => (
            <li key={r}>✓ {r}</li>
          ))}
        </ul>
        <div className="mt-2 text-[11px] text-muted-foreground/80">
          Estas sugerencias son únicamente informativas y no sustituyen el criterio del médico tratante.
        </div>
      </div>
    </div>
  );
}
