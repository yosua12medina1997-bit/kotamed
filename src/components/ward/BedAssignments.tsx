/**
 * Asignación clínica de responsabilidad — PABELLÓN → SALA → CAMA → INTERNO.
 * Panel premium: tabla cama por cama, búsqueda de internos, asignación rápida
 * de múltiples camas e historial administrativo de reasignaciones.
 */
import { useMemo, useState } from "react";
import { Check, History, Search, UserRound, Users } from "lucide-react";
import { Btn, Empty, Input } from "@/components/academy/ui";
import { Modal } from "@/components/ward/ui";
import type { WardBed, WardZone } from "@/lib/ward-os";
import {
  initialsOf,
  internColor,
  ownerByBed,
  rosterMap,
  useAssignBeds,
  useAssignmentLog,
  useBedAssignments,
  useWardRoster,
  type WardRosterEntry,
} from "@/lib/ward-assign";

/* ───────────────── Resumen dentro de la configuración de la sala ──────────── */

export function ZoneAssignmentSummary({
  accent,
  zoneBeds,
  onOpen,
}: {
  accent: string;
  zoneBeds: WardBed[];
  onOpen: () => void;
}) {
  const { data: assignments = [] } = useBedAssignments();
  const owners = ownerByBed(assignments);
  const assigned = zoneBeds.filter((b) => owners.has(b.id)).length;

  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
          Asignación clínica
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Gestiona qué interno será responsable de cada cama · {assigned}/{zoneBeds.length} asignadas
        </p>
      </div>
      <Btn onClick={onOpen}>
        <Users className="size-3.5" /> Gestionar asignaciones →
      </Btn>
    </div>
  );
}

/* ─────────────────── Resumen de distribución del pabellón ────────────────── */

export function DistributionSummary({
  accent,
  pavilionName,
  beds,
  onOpen,
}: {
  accent: string;
  pavilionName: string | null;
  beds: WardBed[];
  onOpen: () => void;
}) {
  const { data: assignments = [] } = useBedAssignments();
  const bedIds = new Set(beds.map((b) => b.id));
  const active = assignments.filter((a) => bedIds.has(a.bed_id));
  const internos = new Set(active.map((a) => a.user_id)).size;
  const assigned = active.length;

  return (
    <div className="rounded-3xl border border-border/50 bg-background/70 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Distribución de internos
          </div>
          <div className="mt-0.5 truncate text-sm font-black tracking-tight">
            {pavilionName ?? "Pabellón"}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[12px]">
            <span>
              Internos activos{" "}
              <b className="tabular-nums">{String(internos).padStart(2, "0")}</b>
            </span>
            <span>
              Camas asignadas{" "}
              <b className="tabular-nums">
                {assigned} / {beds.length}
              </b>
            </span>
            <span className="text-muted-foreground">
              Sin asignar{" "}
              <b className="tabular-nums">
                {String(Math.max(0, beds.length - assigned)).padStart(2, "0")}
              </b>
            </span>
          </div>
        </div>
        <Btn variant="solid" accent={accent} onClick={onOpen}>
          Gestionar distribución
        </Btn>
      </div>
    </div>
  );
}

/* ──────────────────────── Leyenda compacta de internos ───────────────────── */

export function InternLegend({ beds }: { beds: WardBed[] }) {
  const { data: assignments = [] } = useBedAssignments();
  const { data: roster = [] } = useWardRoster();
  const names = rosterMap(roster);
  const bedIds = new Set(beds.map((b) => b.id));

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      if (!bedIds.has(a.bed_id)) continue;
      map.set(a.user_id, (map.get(a.user_id) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [assignments, bedIds]);

  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      {counts.map(([userId, n]) => (
        <span key={userId} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: internColor(userId) }}
          />
          {names.get(userId)?.initials ?? initialsOf(names.get(userId)?.full_name)} — {n}{" "}
          {n === 1 ? "cama" : "camas"}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────── Modal: gestionar asignaciones de sala ───────────────── */

export function AssignmentsModal({
  open,
  onClose,
  accent,
  zone,
  pavilionName,
  beds,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  zone: WardZone | null;
  pavilionName: string | null;
  beds: WardBed[];
}) {
  const { data: assignments = [] } = useBedAssignments();
  const { data: roster = [] } = useWardRoster();
  const assign = useAssignBeds();
  const owners = ownerByBed(assignments);
  const names = rosterMap(roster);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkUser, setBulkUser] = useState<string>("");
  const [rowFor, setRowFor] = useState<string | null>(null);
  const [historyBed, setHistoryBed] = useState<string | null>(null);

  const zoneBeds = zone ? beds.filter((b) => b.zone_id === zone.id) : [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal
      open={open}
      wide
      title="Asignación de internos"
      subtitle={`${zone?.label ?? "Sala"} · ${pavilionName ?? "Pabellón"}`}
      onClose={onClose}
    >
      {zoneBeds.length === 0 ? (
        <Empty text="Esta sala aún no tiene camas registradas." />
      ) : (
        <div className="space-y-5">
          {/* Asignación rápida de múltiples camas */}
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Seleccionar camas
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {zoneBeds.map((b) => {
                const on = selected.has(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggle(b.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-black transition ${
                      on ? "border-transparent text-white" : "border-border/60 hover:bg-muted/50"
                    }`}
                    style={on ? { background: accent } : undefined}
                  >
                    {on ? <Check className="size-3" /> : null} {b.number}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <InternPicker
                roster={roster}
                value={bulkUser}
                onChange={setBulkUser}
                accent={accent}
              />
              <Btn
                variant="solid"
                accent={accent}
                loading={assign.isPending}
                onClick={async () => {
                  if (selected.size === 0) return;
                  await assign.mutateAsync({
                    bedIds: [...selected],
                    userId: bulkUser || null,
                  });
                  setSelected(new Set());
                }}
              >
                Asignar camas seleccionadas
              </Btn>
            </div>
          </div>

          {/* Tabla cama · interno · estado */}
          <div className="overflow-hidden rounded-2xl border border-border/50">
            <div className="grid grid-cols-[70px_minmax(0,1fr)_110px_auto] items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Cama</span>
              <span>Interno</span>
              <span>Estado</span>
              <span />
            </div>
            {zoneBeds.map((b) => {
              const userId = owners.get(b.id) ?? null;
              const entry = userId ? names.get(userId) : null;
              return (
                <div key={b.id} className="border-b border-border/40 last:border-0">
                  <div className="grid grid-cols-[70px_minmax(0,1fr)_110px_auto] items-center gap-2 px-3 py-2.5">
                    <span className="text-sm font-black tabular-nums">{b.number}</span>
                    <span className="flex min-w-0 items-center gap-2 text-[13px]">
                      {userId && (
                        <span
                          className="grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-black text-slate-800"
                          style={{ background: internColor(userId) }}
                        >
                          {entry?.initials ?? initialsOf(entry?.full_name)}
                        </span>
                      )}
                      <span className={`truncate ${userId ? "font-bold" : "text-muted-foreground"}`}>
                        {entry?.full_name ?? (userId ? "Interno de la rotación" : "Sin asignar")}
                      </span>
                    </span>
                    <span
                      className="justify-self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={
                        userId
                          ? { background: `${internColor(userId)}55` }
                          : { background: "#94a3b81f", color: "#64748b" }
                      }
                    >
                      {userId ? "Asignada" : "Disponible"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Btn onClick={() => setRowFor(rowFor === b.id ? null : b.id)}>
                        {userId ? "Cambiar" : "Asignar interno"}
                      </Btn>
                      <Btn onClick={() => setHistoryBed(historyBed === b.id ? null : b.id)}>
                        <History className="size-3.5" />
                      </Btn>
                    </span>
                  </div>

                  {rowFor === b.id && (
                    <div className="grid gap-2 px-3 pb-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <InternPicker
                        roster={roster}
                        value={userId ?? ""}
                        accent={accent}
                        onChange={async (next) => {
                          await assign.mutateAsync({ bedIds: [b.id], userId: next || null });
                          setRowFor(null);
                        }}
                      />
                      {userId && (
                        <Btn
                          onClick={async () => {
                            await assign.mutateAsync({ bedIds: [b.id], userId: null });
                            setRowFor(null);
                          }}
                        >
                          Liberar cama
                        </Btn>
                      )}
                      <Btn onClick={() => setRowFor(null)}>Cerrar</Btn>
                    </div>
                  )}

                  {historyBed === b.id && <BedHistory bedId={b.id} names={names} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ────────────────────────── Selector con búsqueda ────────────────────────── */

function InternPicker({
  roster,
  value,
  onChange,
  accent,
}: {
  roster: WardRosterEntry[];
  value: string;
  onChange: (userId: string) => void;
  accent: string;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = roster.filter((r) => !term || r.full_name.toLowerCase().includes(term));
    return list.slice(0, 40);
  }, [q, roster]);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-2">
      <div className="flex items-center gap-2 px-1">
        <Search className="size-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar interno..."
          className="!border-0 !bg-transparent !px-0 !py-1 text-[12px] focus:!ring-0"
        />
      </div>
      <div className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-1">
        {results.length === 0 && (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            No hay internos matriculados en la rotación con ese nombre.
          </p>
        )}
        {results.map((r) => {
          const on = r.user_id === value;
          return (
            <button
              key={r.user_id}
              type="button"
              onClick={() => onChange(on ? "" : r.user_id)}
              className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12px] transition ${
                on ? "text-white" : "hover:bg-muted/60"
              }`}
              style={on ? { background: accent } : undefined}
            >
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-black text-slate-800"
                style={{ background: internColor(r.user_id) }}
              >
                {r.initials || initialsOf(r.full_name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.full_name}</span>
              {r.is_admin && (
                <span className="text-[9px] font-black uppercase tracking-wide opacity-70">
                  Staff
                </span>
              )}
              {on && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────── Historial administrativo de la cama ────────────────── */

function BedHistory({
  bedId,
  names,
}: {
  bedId: string;
  names: Map<string, WardRosterEntry>;
}) {
  const { data: log = [], isLoading } = useAssignmentLog(bedId);
  const label = (id: string | null) =>
    id ? (names.get(id)?.full_name ?? "Interno") : "Sin asignar";

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Historial de asignación
      </div>
      {isLoading ? (
        <p className="mt-1 text-[11px] text-muted-foreground">Cargando…</p>
      ) : log.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground">Sin movimientos registrados.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-[11px]">
          {log.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-bold uppercase tracking-wide text-muted-foreground">
                {new Date(l.created_at).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="font-semibold">{label(l.from_user_id)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold">{label(l.to_user_id)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Vista general: distribución completa del pabellón ────────── */

export function DistributionModal({
  open,
  onClose,
  accent,
  pavilionName,
  zones,
  beds,
  onManageZone,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  pavilionName: string | null;
  zones: WardZone[];
  beds: WardBed[];
  onManageZone: (zone: WardZone) => void;
}) {
  const { data: assignments = [] } = useBedAssignments();
  const { data: roster = [] } = useWardRoster();
  const owners = ownerByBed(assignments);
  const names = rosterMap(roster);

  return (
    <Modal
      open={open}
      wide
      title="Distribución del pabellón"
      subtitle={`${pavilionName ?? "Pabellón"} · responsabilidad cama por cama`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <InternLegend beds={beds} />
        {zones.length === 0 && <Empty text="Este pabellón aún no tiene salas." />}
        {zones.map((z) => {
          const zoneBeds = beds.filter((b) => b.zone_id === z.id);
          if (zoneBeds.length === 0) return null;
          return (
            <div key={z.id} className="rounded-2xl border border-border/50 bg-background/60 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="truncate text-[12px] font-black uppercase tracking-wide">
                  {z.label}
                </div>
                <Btn onClick={() => onManageZone(z)}>
                  <UserRound className="size-3.5" /> Gestionar
                </Btn>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {zoneBeds.map((b) => {
                  const userId = owners.get(b.id) ?? null;
                  const entry = userId ? names.get(userId) : null;
                  return (
                    <div
                      key={b.id}
                      className="grid min-w-[76px] place-items-center rounded-xl border border-border/60 px-2 py-1.5"
                      style={userId ? { background: `${internColor(userId)}33` } : undefined}
                    >
                      <span className="text-sm font-black tabular-nums">{b.number}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        {userId
                          ? (entry?.initials ?? initialsOf(entry?.full_name))
                          : "Sin asignar"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
