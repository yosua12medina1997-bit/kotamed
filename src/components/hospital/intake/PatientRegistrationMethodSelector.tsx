/** Selector del método de registro de paciente (aditivo, no altera el formulario). */
import { Camera, FileText, PenLine } from "lucide-react";
import { Btn } from "@/components/academy/ui";

export type RegistrationMethod = "manual" | "camera" | "upload";

const CARDS = [
  {
    id: "manual" as const,
    icon: PenLine,
    emoji: "✍",
    title: "Registro Manual",
    desc: "Registrar todos los datos manualmente.",
    cta: "Continuar",
  },
  {
    id: "camera" as const,
    icon: Camera,
    emoji: "📷",
    title: "Fotografiar Documento",
    desc: "Tomar fotografías de la historia clínica, referencia, hoja de parto u otros documentos.",
    cta: "Subir fotografías",
  },
  {
    id: "upload" as const,
    icon: FileText,
    emoji: "📄",
    title: "Subir PDF / Imagen",
    desc: "Subir documentos digitalizados (PDF, JPG, JPEG, PNG, HEIC).",
    cta: "Seleccionar archivos",
  },
];

export function PatientRegistrationMethodSelector({
  active,
  onSelect,
  accent,
}: {
  active: RegistrationMethod;
  onSelect: (m: RegistrationMethod) => void;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
        ¿Cómo desea registrar este paciente?
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {CARDS.map((c) => {
          const on = active === c.id;
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="group flex flex-col rounded-2xl border bg-background/60 p-4 text-left transition hover:bg-background/80"
              style={{
                borderColor: on ? accent : "hsl(var(--border) / 0.6)",
                boxShadow: on ? `0 0 0 1px ${accent}, 0 10px 30px -18px ${accent}` : undefined,
              }}
            >
              <span
                className="flex size-9 items-center justify-center rounded-xl border border-border/60 text-base"
                style={{ color: accent }}
              >
                <Icon className="size-4" />
              </span>
              <span className="mt-3 text-sm font-bold">
                <span className="mr-1">{c.emoji}</span>
                {c.title}
              </span>
              <span className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {c.desc}
              </span>
              <span className="mt-3">
                <Btn variant={on ? "solid" : "outline"} accent={accent}>
                  {c.cta}
                </Btn>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
