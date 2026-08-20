/** Croquis clínico interactivo del pabellón (reconstruido, no una imagen). */
import { useMemo } from "react";
import { ArrowRight, DoorOpen, Bed as BedIcon, Sparkles } from "lucide-react";
import {
  PATIENT_STATUS,
  type WardBed,
  type WardPatient,
  type WardZone,
  type ZoneKind,
  patientLabel,
} from "@/lib/ward-os";
import { StatusDot } from "./ui";

const ZONE_STYLE: Record<ZoneKind, { bg: string; border: string; text: string }> = {
  room: {
    bg: "bg-primary/[0.06]",
    border: "border-primary/30",
    text: "text-foreground",
  },
  service: {
    bg: "bg-muted/50",
    border: "border-border/60",
    text: "text-muted-foreground",
  },
  circulation: {
    bg: "bg-background/40",
    border: "border-dashed border-border/60",
    text: "text-muted-foreground",
  },
  entrance: {
    bg: "bg-accent/10",
    border: "border-accent/40",
    text: "text-foreground",
  },
};

export function PavilionMap({
  zones,
  beds,
  patients,
  accent,
  myPatientIds,
  selectedPatientId,
  onSelectPatient,
  onSelectBed,
}: {
  zones: WardZone[];
  beds: WardBed[];
  patients: WardPatient[];
  accent: string;
  myPatientIds: Set<string>;
  selectedPatientId?: string | null;
  onSelectPatient: (patientId: string) => void;
  onSelectBed?: (bed: WardBed, zone: WardZone) => void;
}) {
  const cols = useMemo(
    () => Math.max(1, ...zones.map((z) => z.col + z.col_span - 1)),
    [zones],
  );
  const rows = useMemo(
    () => Math.max(1, ...zones.map((z) => z.row_index + z.row_span - 1)),
    [zones],
  );
  const bedsByZone = useMemo(() => {
    const map = new Map<string, WardBed[]>();
    for (const b of beds) map.set(b.zone_id, [...(map.get(b.zone_id) ?? []), b]);
    return map;
  }, [beds]);
  const patientByBed = useMemo(() => {
    const map = new Map<string, WardPatient>();
    for (const p of patients) if (p.bed_id) map.set(p.bed_id, p);
    return map;
  }, [patients]);

  return (
    <div className="space-y-4">
      <div
        className="overflow-x-auto rounded-3xl border border-border/60 bg-background/50 p-3"
        style={{ boxShadow: `inset 0 0 60px ${accent}0f` }}
      >
        <div
          className="grid min-w-[720px] gap-2"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(78px, auto))`,
          }}
        >
          {zones.map((zone) => {
            const style = ZONE_STYLE[zone.kind] ?? ZONE_STYLE.room;
            const zoneBeds = (bedsByZone.get(zone.id) ?? []).filter((b) => b.active);
            return (
              <div
                key={zone.id}
                className={`relative flex min-w-0 flex-col rounded-2xl border p-2.5 transition ${style.bg} ${style.border}`}
                style={{
                  gridColumn: `${zone.col} / span ${zone.col_span}`,
                  gridRow: `${zone.row_index} / span ${zone.row_span}`,
                }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  {zone.kind === "entrance" && <DoorOpen className="size-3 shrink-0" />}
                  {zone.kind === "circulation" && <ArrowRight className="size-3 shrink-0" />}
                  <span
                    className={`truncate text-[10px] font-black uppercase tracking-widest ${style.text}`}
                    title={zone.label}
                  >
                    {zone.label}
                  </span>
                </div>
                {zone.note && (
                  <span className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {zone.note}
                  </span>
                )}

                {zoneBeds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {zoneBeds.map((bed) => {
                      const patient = patientByBed.get(bed.id);
                      const mine = patient ? myPatientIds.has(patient.id) : false;
                      const selected = patient && patient.id === selectedPatientId;
                      const color = patient
                        ? (PATIENT_STATUS[patient.status] ?? PATIENT_STATUS.estable).color
                        : undefined;
                      return (
                        <button
                          key={bed.id}
                          type="button"
                          onClick={() =>
                            patient ? onSelectPatient(patient.id) : onSelectBed?.(bed, zone)
                          }
                          title={
                            patient
                              ? `Cama ${bed.number} · ${patientLabel(patient)} · ${patient.main_dx ?? "sin dx"}`
                              : `Cama ${bed.number} · libre`
                          }
                          className={`group relative grid size-11 place-items-center rounded-xl border text-[11px] font-black transition hover:-translate-y-0.5 ${
                            selected ? "ring-2 ring-offset-1 ring-offset-background" : ""
                          } ${
                            patient
                              ? "border-transparent text-foreground"
                              : "border-dashed border-border/70 text-muted-foreground"
                          }`}
                          style={
                            patient
                              ? {
                                  background: `${color}22`,
                                  borderColor: `${color}66`,
                                  ...(selected ? { boxShadow: `0 0 0 2px ${color}` } : {}),
                                }
                              : undefined
                          }
                        >
                          {bed.number}
                          {patient && (
                            <span className="absolute -right-0.5 -top-0.5">
                              <StatusDot status={patient.status} size={7} />
                            </span>
                          )}
                          {mine && (
                            <Sparkles
                              className="absolute -bottom-1 -left-1 size-3"
                              style={{ color: accent }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {Object.entries(PATIENT_STATUS).map(([key, s]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <BedIcon className="size-3" /> Cama libre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3" style={{ color: accent }} /> Asignado a mí
        </span>
      </div>
    </div>
  );
}
