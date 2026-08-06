/** Tabla de matrículas de un usuario, con acciones de administración. */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Badge, Btn, Card, Field, Modal, inputCls } from "./ui";
import { useEnrollableNodes, useUserEnrollments } from "@/lib/enrollments";
import { deleteEnrollment, updateEnrollment } from "@/lib/enrollments.functions";
import {
  REASONS,
  enrollmentStatusLabel,
  isEnrollmentLive,
  type UserEnrollment,
} from "@/lib/enrollments-shared";
import { EnrollmentModal } from "./EnrollmentModal";

const INVALIDATE = [
  "user-enrollments",
  "all-user-enrollments",
  "enrollment-audit",
  "my-program-enrollments",
  "user-content-access",
];

export function UserEnrollmentsTable({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const qc = useQueryClient();
  const enrollmentsQ = useUserEnrollments(userId);
  const nodesQ = useEnrollableNodes();
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<UserEnrollment | null>(null);

  const update = useServerFn(updateEnrollment);
  const remove = useServerFn(deleteEnrollment);

  const nodeMap = useMemo(() => {
    const m = new Map<string, { title: string; kind: string }>();
    (nodesQ.data ?? []).forEach((n) => m.set(n.id, { title: n.title, kind: n.kind }));
    return m;
  }, [nodesQ.data]);

  const invalidate = () => INVALIDATE.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const patch = useMutation({
    mutationFn: async (v: {
      id: string;
      status?: string;
      expiresAt?: string | null;
      observations?: string;
      reason?: string;
    }) => await update({ data: v }),
    onSuccess: () => {
      toast.success("Matrícula actualizada");
      setEditing(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => await remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Matrícula eliminada");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
  });

  const extend = (row: UserEnrollment, days: number) => {
    const base = row.expires_at && new Date(row.expires_at) > new Date() ? new Date(row.expires_at) : new Date();
    base.setDate(base.getDate() + days);
    patch.mutate({ id: row.id, expiresAt: base.toISOString(), status: "active" });
  };

  const rows = enrollmentsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Matrículas individuales del usuario. Se reflejan al instante en su panel.
        </p>
        <Btn onClick={() => setOpenModal(true)}>
          <Plus className="size-3.5" /> Agregar programa manualmente
        </Btn>
      </div>

      {enrollmentsQ.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">Este usuario aún no tiene matrículas manuales.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                {["Programa", "Tipo", "Inicio", "Fin", "Estado", "Origen", "Motivo", "Acciones"].map((h) => (
                  <th key={h} className="text-left font-bold px-3 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const node = nodeMap.get(r.node_id);
                const live = isEnrollmentLive(r);
                return (
                  <tr key={r.id} className="align-middle">
                    <td className="px-3 py-2.5 font-bold max-w-[220px] truncate">
                      {node?.title ?? r.node_id}
                    </td>
                    <td className="px-3 py-2.5 capitalize">{r.enrollment_kind}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {new Date(r.starts_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "Permanente"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={live ? "ok" : r.status === "suspended" ? "warn" : "bad"}>
                        {enrollmentStatusLabel(r)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 capitalize">{r.assignment_type}</td>
                    <td className="px-3 py-2.5 max-w-[160px] truncate" title={r.observations ?? ""}>
                      {r.reason ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(r)}
                          title="Editar"
                          className="px-2 py-1 rounded-lg hover:bg-muted/60 font-bold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => extend(r, 30)}
                          title="Extender 30 días"
                          className="p-1.5 rounded-lg hover:bg-muted/60"
                        >
                          <CalendarPlus className="size-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            patch.mutate({
                              id: r.id,
                              status: r.status === "suspended" ? "active" : "suspended",
                            })
                          }
                          title={r.status === "suspended" ? "Reactivar" : "Suspender"}
                          className="p-1.5 rounded-lg hover:bg-muted/60"
                        >
                          {r.status === "suspended" ? (
                            <Play className="size-3.5" />
                          ) : (
                            <Pause className="size-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => del.mutate(r.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <EnrollmentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        userId={userId}
        userLabel={userLabel}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar matrícula">
        {editing && (
          <EditForm
            row={editing}
            pending={patch.isPending}
            onSave={(v) => patch.mutate({ id: editing.id, ...v })}
          />
        )}
      </Modal>
    </div>
  );
}

function EditForm({
  row,
  pending,
  onSave,
}: {
  row: UserEnrollment;
  pending: boolean;
  onSave: (v: { status: string; expiresAt: string | null; observations: string; reason: string }) => void;
}) {
  const [status, setStatus] = useState(row.status);
  const [expires, setExpires] = useState(row.expires_at ? row.expires_at.slice(0, 10) : "");
  const [reason, setReason] = useState(row.reason ?? REASONS[0]);
  const [observations, setObservations] = useState(row.observations ?? "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Estado">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {["active", "suspended", "expired", "revoked"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vence el (vacío = permanente)">
          <input
            type="date"
            className={inputCls}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
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
        />
      </Field>
      <div className="flex justify-end">
        <Btn
          disabled={pending}
          onClick={() => onSave({ status, expiresAt: expires || null, observations, reason })}
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />} Guardar cambios
        </Btn>
      </div>
    </div>
  );
}

export default UserEnrollmentsTable;
