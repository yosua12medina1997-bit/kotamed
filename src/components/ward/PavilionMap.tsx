/**
 * Croquis clínico interactivo del pabellón — reconstrucción digital fiel de los
 * croquis físicos del HNSEB (Pabellón A y B). La arquitectura proviene del
 * blueprint en `@/lib/ward-croquis`; sobre ella se monta el estado clínico en
 * tiempo real de cada cama.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Minus,
  Plus as PlusIcon,
  Save,
  User,
  UserCheck,
} from "lucide-react";
import { Btn, Field, Select, Textarea } from "@/components/academy/ui";
import {
  PATIENT_STATUS,
  hospitalDay,
  patientLabel,
  useWardSave,
  WARD_KEYS,
  type PatientStatus,
  type WardBed,
  type WardPatient,
  type WardTask,
  type WardZone,
} from "@/lib/ward-os";
import {
  BED_LEVELS,
  croquisFor,
  levelColor,
  levelForStatus,
  levelLabel,
  type BedLevel,
  type CroquisBed,
  type CroquisBlock,
} from "@/lib/ward-croquis";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;

type Slot = {
  key: string;
  bed: CroquisBed;
  block: CroquisBlock;
  dbBed: WardBed | null;
  patient: WardPatient | null;
  level: BedLevel;
  mine: boolean;
  pending: number;
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
  pavilionCode,
  pavilionName,
  tasks = [],
  canEdit = false,
  userId,
  pavilions = [],
  onPavilion,
  activePavilionId,
}: {
  zones: WardZone[];
  beds: WardBed[];
  patients: WardPatient[];
  accent: string;
  myPatientIds: Set<string>;
  selectedPatientId?: string | null;
  onSelectPatient: (patientId: string) => void;
  onSelectBed?: (bed: WardBed, zone: WardZone | null) => void;
  pavilionCode?: string | null;
  pavilionName?: string | null;
  tasks?: WardTask[];
  canEdit?: boolean;
  userId?: string;
  pavilions?: { id: string; code: string; name: string }[];
  onPavilion?: (id: string) => void;
  activePavilionId?: string | null;
}) {
  const croquis = croquisFor(pavilionCode);
  const [levelFilter, setLevelFilter] = useState<Set<BedLevel>>(new Set());
  const [onlyMine, setOnlyMine] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  /* ── Vinculación blueprint ↔ base de datos ── */
  const zoneByLabel = useMemo(() => {
    const map = new Map<string, WardZone>();
    for (const z of zones) map.set(z.label.trim().toUpperCase(), z);
    return map;
  }, [zones]);

  const patientByBed = useMemo(() => {
    const map = new Map<string, WardPatient>();
    for (const p of patients) if (p.bed_id) map.set(p.bed_id, p);
    return map;
  }, [patients]);

  const pendingByPatient = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (!t.patient_id || t.status === "hecho") continue;
      map.set(t.patient_id, (map.get(t.patient_id) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const slots = useMemo<Slot[]>(() => {
    const out: Slot[] = [];
    for (const block of croquis.blocks) {
      const zone = block.zoneLabel
        ? (zoneByLabel.get(block.zoneLabel.trim().toUpperCase()) ?? null)
        : null;
      for (const [i, bed] of (block.beds ?? []).entries()) {
        const dbBed =
          bed.number == null
            ? null
            : ((zone ? beds.find((b) => b.zone_id === zone.id && b.number === bed.number) : null) ??
              beds.find((b) => b.number === bed.number) ??
              null);
        const patient = dbBed ? (patientByBed.get(dbBed.id) ?? null) : null;
        out.push({
          key: `${block.id}-${i}`,
          bed,
          block,
          dbBed,
          patient,
          level: levelForStatus(patient?.status),
          mine: patient ? myPatientIds.has(patient.id) : false,
          pending: patient ? (pendingByPatient.get(patient.id) ?? 0) : 0,
        });
      }
    }
    return out;
  }, [beds, croquis.blocks, myPatientIds, patientByBed, pendingByPatient, zoneByLabel]);

  const counts = useMemo(() => {
    const c: Record<BedLevel, number> = {
      libre: 0,
      estable: 0,
      seguimiento: 0,
      prioritario: 0,
      critico: 0,
    };
    for (const s of slots) c[s.level] += 1;
    return c;
  }, [slots]);

  const dimmed = useCallback(
    (s: Slot) => {
      if (onlyMine && !s.mine) return true;
      if (levelFilter.size > 0 && !levelFilter.has(s.level)) return true;
      return false;
    },
    [levelFilter, onlyMine],
  );

  const selected = slots.find((s) => s.key === picked) ?? null;

  /* ── Zoom / pan ── */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoomAt = useRef((next: number, px: number, py: number) => {});
  zoomAt.current = (next, px, py) => {
    const k = next / zoom;
    setOffset({ x: px - (px - offset.x) * k, y: py - (py - offset.y) * k });
    setZoom(next);
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      const current = Number(el.dataset["zoom"] ?? 1);
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * Math.exp(-dy * 0.0015)));
      zoomAt.current(next, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function centerOnMine() {
    const mine = slots.find((s) => s.mine);
    if (!mine || !wrapRef.current) return reset();
    const rect = wrapRef.current.getBoundingClientRect();
    const z = 1.8;
    setZoom(z);
    setOffset({
      x: rect.width / 2 - (mine.bed.x / 100) * rect.width * z,
      y: rect.height / 2 - (mine.bed.y / 100) * rect.height * z,
    });
    setPicked(mine.key);
  }

  return (
    <div className="space-y-4">
      {/* Panel de control */}
      {pavilions.length > 1 && onPavilion && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Pabellón
          </span>
          {pavilions.map((p) => {
            const active = p.id === activePavilionId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPavilion(p.id)}
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide transition ${
                  active ? "border-transparent text-white" : "border-border/60 hover:bg-muted/50"
                }`}
                style={active ? { background: accent } : undefined}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Estado de camas
        </span>
        {BED_LEVELS.map((l) => {
          const active = levelFilter.has(l.key);
          return (
            <button
              key={l.key}
              type="button"
              onClick={() =>
                setLevelFilter((prev) => {
                  const next = new Set(prev);
                  if (next.has(l.key)) next.delete(l.key);
                  else next.add(l.key);
                  return next;
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                active ? "border-transparent" : "border-border/60 hover:bg-muted/50"
              }`}
              style={active ? { background: `${l.color}22`, color: l.color } : undefined}
            >
              <span className="inline-block size-2 rounded-full" style={{ background: l.color }} />
              {l.label}
              <span className="tabular-nums opacity-70">{counts[l.key]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOnlyMine((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${
            onlyMine ? "border-transparent text-white" : "border-border/60 hover:bg-muted/50"
          }`}
          style={onlyMine ? { background: accent } : undefined}
        >
          <UserCheck className="size-3" /> Mis pacientes
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Btn onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}>
            <Minus className="size-3.5" />
          </Btn>
          <Btn onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}>
            <PlusIcon className="size-3.5" />
          </Btn>
          <Btn onClick={reset}>Centrar</Btn>
          <Btn onClick={centerOnMine}>
            <Crosshair className="size-3.5" /> Mi ubicación
          </Btn>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Lienzo del croquis */}
        <div
          ref={wrapRef}
          data-zoom={zoom}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerLeave={() => {
            drag.current = null;
            setHovered(null);
          }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/20 [touch-action:none]"
          style={{ aspectRatio: String(croquis.ratio) }}
        >
          <div className="pointer-events-none absolute right-4 top-3 z-20 rounded-xl border border-border/60 bg-background/85 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest backdrop-blur">
            {croquis.title}
          </div>

          <div
            className="absolute inset-0 origin-top-left"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          >
            {croquis.blocks.map((block) => (
              <Block key={block.id} block={block} accent={accent} />
            ))}

            {slots.map((s) => (
              <BedNode
                key={s.key}
                slot={s}
                accent={accent}
                dim={dimmed(s)}
                selected={
                  s.key === picked ||
                  (!!s.patient && !!selectedPatientId && s.patient.id === selectedPatientId)
                }
                hovered={hovered === s.key}
                onHover={setHovered}
                onPick={() => setPicked(s.key)}
              />
            ))}
          </div>
        </div>

        {/* Panel contextual */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Estado del pabellón
            </div>
            <div className="mt-0.5 truncate text-sm font-black tracking-tight">
              {pavilionName ?? `Pabellón ${croquis.code}`}
            </div>
            <ul className="mt-3 space-y-1.5 text-[12px]">
              {BED_LEVELS.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ background: l.color }}
                    />
                    {l.label}
                  </span>
                  <span className="font-black tabular-nums">{counts[l.key]}</span>
                </li>
              ))}
            </ul>
          </div>

          {selected ? (
            <BedPanel
              slot={selected}
              accent={accent}
              canEdit={canEdit}
              userId={userId}
              onOpenPatient={onSelectPatient}
              onRegister={() => {
                if (!selected.dbBed) return;
                const zone =
                  zones.find((z) => z.id === selected.dbBed?.zone_id) ?? null;
                onSelectBed?.(selected.dbBed, zone);
              }}
              onClose={() => setPicked(null)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-4 text-[12px] text-muted-foreground">
              Selecciona una cama del croquis para ver su tarjeta clínica, actualizar su estado o
              registrar un ingreso.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Bloques del croquis ─────────────────────────── */

function Block({ block, accent }: { block: CroquisBlock; accent: string }) {
  const pos = {
    left: `${block.x}%`,
    top: `${block.y}%`,
    width: `${block.w}%`,
    height: `${block.h}%`,
  } as const;

  if (block.kind === "corridor" || block.kind === "corridor-v") {
    const vertical = block.kind === "corridor-v";
    return (
      <div
        className="absolute grid place-items-center rounded-md border-2 border-dotted"
        style={{ ...pos, borderColor: `${accent}88`, background: `${accent}08` }}
      >
        <span
          className="px-1 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground sm:text-[10px]"
          style={
            vertical
              ? { writingMode: "vertical-rl", transform: "rotate(180deg)" }
              : undefined
          }
        >
          {block.label}
        </span>
      </div>
    );
  }

  if (block.kind === "entrance-left" || block.kind === "entrance-right") {
    const right = block.kind === "entrance-right";
    return (
      <div
        className="absolute grid place-items-center"
        style={{
          ...pos,
          background: `${accent}14`,
          border: `2px solid ${accent}77`,
          clipPath: right
            ? "polygon(0 25%, 62% 25%, 62% 0, 100% 50%, 62% 100%, 62% 75%, 0 75%)"
            : "polygon(38% 0, 100% 0, 100% 25%, 38% 25%, 38% 25%, 0 50%, 38% 75%, 38% 100%, 100% 100%, 100% 75%, 38% 75%)",
        }}
      >
        <span className="px-2 text-center text-[8px] font-black uppercase leading-tight tracking-widest sm:text-[10px]">
          {block.label}
        </span>
      </div>
    );
  }

  const service = block.kind === "service";
  return (
    <div
      className="absolute rounded-2xl border-2"
      style={{
        ...pos,
        borderColor: service ? `${accent}55` : `${accent}66`,
        background: service
          ? `linear-gradient(160deg, ${accent}22, ${accent}0d)`
          : "color-mix(in oklab, var(--background) 92%, transparent)",
      }}
    >
      {service ? (
        <div className="grid h-full place-items-center px-1 text-center text-[9px] font-black uppercase leading-tight tracking-widest sm:text-[13px]">
          {block.label}
        </div>
      ) : (
        block.tag && (
          <div className="grid h-full place-items-center">
            <span
              className="rounded-md border bg-background/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest sm:text-[10px]"
              style={{ borderColor: `${accent}66` }}
            >
              {block.tag}
            </span>
          </div>
        )
      )}
    </div>
  );
}

/* ──────────────────────────── Nodo clínico: cama ─────────────────────────── */

function BedNode({
  slot,
  accent,
  dim,
  selected,
  hovered,
  onHover,
  onPick,
}: {
  slot: Slot;
  accent: string;
  dim: boolean;
  selected: boolean;
  hovered: boolean;
  onHover: (key: string | null) => void;
  onPick: () => void;
}) {
  const color = levelColor(slot.level);
  const free = !slot.patient;
  return (
    <>
      <button
        type="button"
        disabled={!slot.dbBed && slot.bed.number != null}
        onClick={onPick}
        onMouseEnter={() => onHover(slot.key)}
        onMouseLeave={() => onHover(null)}
        className="absolute grid aspect-square -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[10px] font-black transition-transform duration-150 hover:scale-110 sm:text-[12px]"
        style={{
          left: `${slot.bed.x}%`,
          top: `${slot.bed.y}%`,
          width: "6.2%",
          borderColor: free ? "#94a3b855" : `${color}cc`,
          background: free ? "#94a3b81f" : `${color}2e`,
          color: free ? undefined : color,
          opacity: dim ? 0.28 : 1,
          boxShadow: selected
            ? `0 0 0 3px ${color}, 0 0 22px ${color}55`
            : slot.level === "critico"
              ? `0 0 16px ${color}66`
              : slot.level === "prioritario"
                ? `0 0 12px ${color}4d`
                : "none",
          zIndex: hovered || selected ? 15 : 10,
        }}
        title={slot.bed.number ? `Cama ${slot.bed.number}` : "Espacio de cama sin numeración"}
      >
        {slot.bed.number ?? "·"}
        {slot.mine && (
          <span
            className="absolute -bottom-1 -right-1 grid size-[45%] place-items-center rounded-full text-white"
            style={{ background: accent }}
          >
            <User className="size-[60%]" />
          </span>
        )}
      </button>

      {hovered && (
        <div
          className="pointer-events-none absolute z-30 w-[24%] min-w-[150px] -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 p-2.5 text-left shadow-xl backdrop-blur"
          style={{ left: `${slot.bed.x}%`, top: `calc(${slot.bed.y}% + 4%)` }}
        >
          <div className="text-[11px] font-black uppercase tracking-widest">
            {slot.bed.number ? `Cama ${slot.bed.number}` : "Cama sin numeración"}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
            {slot.patient
              ? (PATIENT_STATUS[slot.patient.status]?.label ?? levelLabel(slot.level))
              : levelLabel(slot.level)}
          </div>
          <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
            <div>Paciente: {slot.patient ? patientLabel(slot.patient) : "—"}</div>
            <div>Pendientes: {slot.pending}</div>
            <div>{slot.block.tag ?? slot.block.label}</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────── Panel contextual de la cama ────────────────────── */

const STATUS_OPTIONS = Object.entries(PATIENT_STATUS) as [PatientStatus, { label: string }][];

function BedPanel({
  slot,
  accent,
  canEdit,
  userId,
  onOpenPatient,
  onRegister,
  onClose,
}: {
  slot: Slot;
  accent: string;
  canEdit: boolean;
  userId?: string;
  onOpenPatient: (id: string) => void;
  onRegister: () => void;
  onClose: () => void;
}) {
  const patient = slot.patient;
  const savePatient = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const saveAssignment = useWardSave("ward_assignments", [WARD_KEYS.assignments]);
  const [status, setStatus] = useState<PatientStatus>(patient?.status ?? "estable");
  const [note, setNote] = useState("");

  useEffect(() => {
    setStatus(patient?.status ?? "estable");
    setNote("");
  }, [patient?.id, patient?.status]);

  const color = levelColor(slot.level);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black tracking-tight">
            {slot.bed.number ? `Cama ${slot.bed.number}` : "Espacio de cama"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {slot.block.tag ?? slot.block.label}
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `${color}1f`, color }}
        >
          {patient ? (PATIENT_STATUS[patient.status]?.label ?? "—") : levelLabel(slot.level)}
        </span>
      </header>

      {patient ? (
        <>
          <ul className="mt-3 space-y-1 text-[12px]">
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Paciente</span>
              <span className="truncate font-bold">{patientLabel(patient)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Día de hospitalización</span>
              <span className="font-bold tabular-nums">{hospitalDay(patient.admitted_at)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Diagnóstico</span>
              <span className="truncate font-bold">{patient.main_dx ?? "—"}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Pendientes</span>
              <span className="font-bold tabular-nums">{slot.pending}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Responsable</span>
              <span className="font-bold">{slot.mine ? "Mi paciente" : "Otro interno"}</span>
            </li>
          </ul>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Btn variant="solid" accent={accent} onClick={() => onOpenPatient(patient.id)}>
              Ver paciente
            </Btn>
            <Btn onClick={() => onOpenPatient(patient.id)}>Evolución / SOAP</Btn>
            {userId && !slot.mine && (
              <Btn
                onClick={() =>
                  saveAssignment.mutate({
                    patient_id: patient.id,
                    user_id: userId,
                    role: "interno",
                    active: true,
                  })
                }
              >
                <UserCheck className="size-3.5" /> Asignarme
              </Btn>
            )}
          </div>

          {canEdit && (
            <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Actualizar estado
              </div>
              <Field label="Prioridad clínica">
                <Select value={status} onChange={(e) => setStatus(e.target.value as PatientStatus)}>
                  {STATUS_OPTIONS.map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Observación">
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota breve sobre el cambio de estado"
                />
              </Field>
              <Btn
                variant="solid"
                accent={accent}
                onClick={() =>
                  savePatient.mutate({
                    id: patient.id,
                    status,
                    notes: note.trim()
                      ? `${patient.notes ? `${patient.notes}\n` : ""}${note.trim()}`
                      : patient.notes,
                  })
                }
              >
                <Save className="size-3.5" /> Guardar cambios
              </Btn>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] text-muted-foreground">
            {slot.dbBed
              ? "Cama disponible: puedes registrar un ingreso académico en esta posición del croquis."
              : "Espacio de cama del croquis original sin numeración asignada."}
          </p>
          {slot.dbBed && (
            <Btn variant="solid" accent={accent} onClick={onRegister}>
              <PlusIcon className="size-3.5" /> Registrar ingreso
            </Btn>
          )}
        </div>
      )}

      <div className="mt-3">
        <Btn onClick={onClose}>Cerrar</Btn>
      </div>
    </div>
  );
}
