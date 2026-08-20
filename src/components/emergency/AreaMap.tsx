/**
 * Mapa operativo de Emergencia: Observación (BOX 01…) y Shock Trauma (ST-01…).
 * No es un croquis arquitectónico: es una rejilla operativa de boxes con
 * estado, tiempo y prioridad, más un panel lateral contextual.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Clock, FlaskConical, Pencil, Plus, Repeat2, UserRound } from "lucide-react";
import { Btn, Empty } from "@/components/academy/ui";
import {
  EMERG_STATUS,
  elapsed,
  fmtHour,
  isRecheckDue,
  patientLabel,
  shortElapsed,
  type EmergArea,
  type EmergBox,
  type EmergPatient,
  type EmergTask,
} from "@/lib/emergency-os";
import { EmergCard, EmergDot, EmergPill, Row, SoftBadge } from "./ui";

export interface AreaMapProps {
  area: EmergArea;
  boxes: EmergBox[];
  patients: EmergPatient[];
  tasks: EmergTask[];
  accent: string;
  myBoxIds: Set<string>;
  boxOwners: Map<string, string>;
  roster: Map<string, { full_name: string; initials: string }>;
  activePatientId: string | null;
  onSelectPatient: (id: string) => void;
  onAdmit: (boxId: string) => void;
  onGoto: (patientId: string, section: "reeval" | "evolucion" | "examenes") => void;
}

export function AreaMap(props: AreaMapProps) {
  const { area, boxes, patients, tasks, accent, myBoxIds, boxOwners, roster } = props;
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  const areaBoxes = useMemo(
    () => boxes.filter((b) => b.area === area).sort((a, b) => a.sort_order - b.sort_order),
    [boxes, area],
  );
  const byBox = useMemo(() => {
    const m = new Map<string, EmergPatient>();
    for (const p of patients) if (p.box_id) m.set(p.box_id, p);
    return m;
  }, [patients]);

  const box = areaBoxes.find((b) => b.id === selectedBox) ?? null;
  const boxPatient = box ? (byBox.get(box.id) ?? null) : null;
  const isShock = area === "shock";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <EmergCard
        title={isShock ? "Shock Trauma" : "Mapa de Observación"}
        subtitle={
          isShock
            ? "Atención inmediata y estabilización. Toca un box para abrir el paciente."
            : "Estado, tiempo y prioridad de cada box. Toca un box para ver su detalle."
        }
        actions={
          <>
            <Btn
              variant={onlyMine ? "solid" : "outline"}
              accent={accent}
              onClick={() => setOnlyMine((v) => !v)}
            >
              Mis boxes
            </Btn>
          </>
        }
      >
        {areaBoxes.length === 0 ? (
          <Empty text="Aún no hay boxes configurados en esta área." />
        ) : (
          <div
            className={`grid gap-3 ${isShock ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"}`}
          >
            {areaBoxes.map((b) => {
              const p = byBox.get(b.id) ?? null;
              const mine = myBoxIds.has(b.id);
              const dim = onlyMine && !mine;
              const owner = boxOwners.get(b.id);
              const ownerInfo = owner ? roster.get(owner) : undefined;
              const st = p ? EMERG_STATUS[p.status] : null;
              const active = props.activePatientId && p?.id === props.activePatientId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBox(b.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-3.5 text-left transition ${
                    dim ? "opacity-35" : "hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                  style={{
                    borderColor: active ? accent : st ? `${st.color}55` : undefined,
                    background: st ? `${st.color}08` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-lg px-2 py-0.5 text-[10.5px] font-black tracking-wide"
                      style={{
                        background: isShock ? "#f43f5e14" : `${accent}14`,
                        color: isShock ? "#f43f5e" : accent,
                      }}
                    >
                      {b.code}
                    </span>
                    {ownerInfo && (
                      <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9.5px] font-bold text-muted-foreground">
                        {ownerInfo.initials}
                      </span>
                    )}
                  </div>

                  {p ? (
                    <>
                      <div className="mt-2.5 truncate text-[15px] font-black tracking-tight">
                        {patientLabel(p)}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {p.age_label ?? "—"}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Clock className="size-3" />
                        {shortElapsed(p.admitted_at)}
                        {isRecheckDue(p) && (
                          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <span className="size-1.5 rounded-full bg-amber-500" /> reevaluar
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <EmergPill status={p.status} pulse />
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
                      <Plus className="size-3.5" /> Box libre
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </EmergCard>

      {/* Panel lateral contextual */}
      <EmergCard
        title={box ? box.code : "Detalle del box"}
        subtitle={box ? (box.label ?? "") : "Selecciona un box del mapa."}
      >
        {!box ? (
          <Empty text="Sin box seleccionado." />
        ) : !boxPatient ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Este box está libre. Puedes registrar un ingreso directamente aquí.
            </p>
            <Btn variant="solid" accent={accent} onClick={() => props.onAdmit(box.id)}>
              <Plus className="size-3.5" /> Nuevo ingreso en {box.code}
            </Btn>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <div className="text-[17px] font-black tracking-tight">
                {patientLabel(boxPatient)}
              </div>
              <div className="mt-1">
                <EmergPill status={boxPatient.status} pulse />
              </div>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-border/50 bg-background/50 p-3">
              <Row label="Edad" value={boxPatient.age_label ?? "—"} />
              <Row label="Ingreso" value={fmtHour(boxPatient.admitted_at)} />
              <Row label="En emergencia" value={elapsed(boxPatient.admitted_at)} />
              <Row label="Dx principal" value={boxPatient.main_dx ?? boxPatient.reason ?? "—"} />
              <Row
                label="Reevaluación"
                value={
                  boxPatient.next_recheck_at
                    ? `${fmtHour(boxPatient.next_recheck_at)}${isRecheckDue(boxPatient) ? " · pendiente" : ""}`
                    : "No programada"
                }
              />
            </div>

            {boxPatient.problems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {boxPatient.problems.slice(0, 5).map((pr) => (
                  <SoftBadge key={pr} color={accent}>
                    {pr}
                  </SoftBadge>
                ))}
              </div>
            )}

            {(() => {
              const pend = tasks.filter(
                (t) => t.patient_id === boxPatient.id && t.status !== "hecho",
              );
              return pend.length === 0 ? null : (
                <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Pendientes
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[12px]">
                    {pend.slice(0, 4).map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <EmergDot status={t.priority === "alta" ? "prioritario" : "seguimiento"} size={6} />
                        <span className="min-w-0 truncate">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            <div className="grid gap-2">
              <Btn
                variant="solid"
                accent={accent}
                onClick={() => props.onSelectPatient(boxPatient.id)}
              >
                <UserRound className="size-3.5" /> Ver paciente <ArrowRight className="size-3.5" />
              </Btn>
              <div className="grid grid-cols-3 gap-2">
                <Btn variant="outline" onClick={() => props.onGoto(boxPatient.id, "reeval")}>
                  <Repeat2 className="size-3.5" /> Reevaluar
                </Btn>
                <Btn variant="outline" onClick={() => props.onGoto(boxPatient.id, "evolucion")}>
                  <Pencil className="size-3.5" /> Evolución
                </Btn>
                <Btn variant="outline" onClick={() => props.onGoto(boxPatient.id, "examenes")}>
                  <FlaskConical className="size-3.5" /> Exámenes
                </Btn>
              </div>
            </div>
          </div>
        )}
      </EmergCard>
    </div>
  );
}
