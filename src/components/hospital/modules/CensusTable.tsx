/**
 * KotaMed · Censo del servicio (tabla compartida por los módulos).
 */
import { Loader2, Search, Trash2 } from "lucide-react";
import { Chip, Empty, Input, Panel } from "@/components/academy/ui";
import { dayOfLife } from "@/lib/neonatal-hospital";

export function CensusTable({
  title,
  subtitle,
  accent,
  patients,
  isLoading,
  search,
  onSearch,
  onOpen,
  onDelete,
  canDelete,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  patients: any[];
  isLoading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}) {
  return (
    <Panel
      title={title}
      subtitle={subtitle ?? "Selecciona un paciente para abrir su expediente clínico completo."}
      accent={accent}
      actions={
        <div className="flex items-center gap-2">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            value={search}
            placeholder="Buscar por apellido, HC o diagnóstico"
            onChange={(e) => onSearch(e.target.value)}
            className="w-56"
          />
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : patients.length === 0 ? (
        <Empty text="No hay pacientes en esta vista. Registra un ingreso para comenzar." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/50">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Edad gestacional</th>
                <th className="px-3 py-2">Día de vida</th>
                <th className="px-3 py-2">Peso</th>
                <th className="px-3 py-2">Diagnóstico principal</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border/40 transition last:border-0 hover:bg-background/60">
                  <td className="px-3 py-2.5">
                    <button className="text-left" onClick={() => onOpen(p.id)}>
                      <div className="font-bold tracking-tight">
                        RN de {p.apellidos || "—"} {p.nombres ? `· ${p.nombres}` : ""}
                      </div>
                      <div className="text-[10px] text-muted-foreground">HC {p.hc || "s/n"}</div>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{p.edad_gestacional ?? "—"} sem</td>
                  <td className="px-3 py-2.5 text-xs">{dayOfLife(p.fecha_nacimiento)}</td>
                  <td className="px-3 py-2.5 text-xs">{p.peso_nacimiento ?? "—"} g</td>
                  <td className="px-3 py-2.5 text-xs text-foreground/80">
                    {p.diagnostico_ingreso || "Sin diagnóstico de ingreso"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Chip accent={accent}>{p.status}</Chip>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {canDelete && onDelete && (
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(p.id)}
                        aria-label="Eliminar expediente"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
