/** Modal compartido de matriculación manual (Usuarios y Matriculación Manual). */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Badge, Btn, Field, Modal, inputCls } from "./ui";
import { usePlans } from "./AdminPlans";
import { useEnrollableNodes } from "@/lib/enrollments";
import { saveEnrollments } from "@/lib/enrollments.functions";
import {
  ASSIGNMENT_TYPES,
  DURATIONS,
  ENROLLMENT_KINDS,
  KIND_NODE_FILTER,
  REASONS,
  resolveExpiry,
  type DurationValue,
  type EnrollmentKind,
} from "@/lib/enrollments-shared";

export function EnrollmentModal({
  open,
  onClose,
  userId,
  userLabel,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userLabel: string;
}) {
  const qc = useQueryClient();
  const nodesQ = useEnrollableNodes();
  const plansQ = usePlans();
  const save = useServerFn(saveEnrollments);

  const [kind, setKind] = useState<EnrollmentKind>("programa");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [duration, setDuration] = useState<DurationValue>("permanent");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [assignmentType, setAssignmentType] = useState<string>("manual");
  const [planId, setPlanId] = useState("");
  const [observations, setObservations] = useState("");
  const [pendingDuplicates, setPendingDuplicates] = useState<string[] | null>(null);

  const options = useMemo(() => {
    const kinds = KIND_NODE_FILTER[kind];
    const t = search.trim().toLowerCase();
    return (nodesQ.data ?? [])
      .filter((n) => kinds.includes(n.kind))
      .filter((n) => !t || n.title.toLowerCase().includes(t) || n.slug.toLowerCase().includes(t));
  }, [nodesQ.data, kind, search]);

  const reset = () => {
    setSelected([]);
    setSearch("");
    setObservations("");
    setPendingDuplicates(null);
    setDuration("permanent");
    setCustomStart("");
    setCustomEnd("");
  };

  const mutation = useMutation({
    mutationFn: async (allowReplace: boolean) => {
      if (selected.length === 0) throw new Error("Selecciona al menos un programa");
      if (duration === "custom" && !customEnd) throw new Error("Indica la fecha de fin");
      return await save({
        data: {
          userId,
          nodeIds: selected,
          enrollmentKind: kind,
          assignmentType,
          reason,
          observations,
          startsAt: duration === "custom" && customStart ? customStart : null,
          expiresAt: resolveExpiry(duration, customEnd),
          planId: planId || null,
          allowReplace,
        },
      });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        setPendingDuplicates(res.duplicates.map((d) => d.title));
        return;
      }
      toast.success("Matrícula realizada correctamente");
      [
        "user-enrollments",
        "all-user-enrollments",
        "enrollment-audit",
        "my-program-enrollments",
        "user-content-access",
      ].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar la matrícula"),
  });

  return (
    <Modal open={open} onClose={onClose} wide title={`Matricular · ${userLabel}`}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Tipo de matrícula">
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as EnrollmentKind);
                setSelected([]);
              }}
            >
              {ENROLLMENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origen">
            <select
              className={inputCls}
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
            >
              {ASSIGNMENT_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan asociado (opcional)">
            <select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">— Sin plan —</option>
              {(plansQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Programas disponibles ({options.length})
            </span>
            <span className="text-[10px] font-bold text-primary">{selected.length} seleccionados</span>
          </div>
          <div className="relative mb-2">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Buscar programa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {nodesQ.isLoading && (
              <div className="p-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {options.map((n) => (
              <label key={n.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selected.includes(n.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, n.id] : prev.filter((id) => id !== n.id),
                    )
                  }
                />
                <span className="flex-1 min-w-0 text-sm truncate">{n.title}</span>
                <Badge>{n.kind}</Badge>
              </label>
            ))}
            {!nodesQ.isLoading && options.length === 0 && (
              <p className="px-3 py-5 text-sm text-muted-foreground">
                No hay contenido de este tipo en el árbol académico todavía.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Duración">
            <select
              className={inputCls}
              value={duration}
              onChange={(e) => setDuration(e.target.value as DurationValue)}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          {duration === "custom" && (
            <>
              <Field label="Fecha inicio">
                <input
                  type="date"
                  className={inputCls}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </Field>
              <Field label="Fecha fin">
                <input
                  type="date"
                  className={inputCls}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Motivo">
            <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Observaciones">
          <textarea
            rows={3}
            className={inputCls}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Detalle interno de esta matrícula…"
          />
        </Field>

        {pendingDuplicates && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2">
            <p className="font-bold text-amber-700">
              Este usuario ya está matriculado en: {pendingDuplicates.join(", ")}
            </p>
            <p className="text-muted-foreground">
              ¿Deseas renovar o extender esas matrículas con los nuevos datos?
            </p>
            <div className="flex gap-2">
              <Btn onClick={() => mutation.mutate(true)} disabled={mutation.isPending}>
                Sí, renovar / extender
              </Btn>
              <Btn variant="ghost" onClick={() => setPendingDuplicates(null)}>
                Cancelar
              </Btn>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={() => mutation.mutate(false)} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />} Guardar matrícula
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default EnrollmentModal;
