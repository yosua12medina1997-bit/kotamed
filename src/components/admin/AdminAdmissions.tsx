/** Command Center · Matrículas (admisiones) y configuración de pagos / QR. */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  Eye,
  Loader2,
  QrCode,
  RefreshCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { Badge, Btn, Card, Field, SectionTitle, inputCls } from "./ui";
import {
  STATUS_LABELS,
  STATUS_TONE,
  receiptSignedUrl,
  useAllAdmissions,
  usePaymentSettings,
  type AdmissionApplication,
  type AdmissionStatus,
} from "@/lib/admission";
import { approveAdmission } from "@/lib/admission.functions";

const db = supabase as any;

const TABS: { key: AdmissionStatus | "all" | "pagos"; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "reviewing", label: "En revisión" },
  { key: "approved", label: "Aprobadas" },
  { key: "rejected", label: "Rechazadas" },
  { key: "refunded", label: "Reembolsadas" },
  { key: "all", label: "Historial" },
  { key: "pagos", label: "Pagos y QR" },
];

export default function AdminAdmissions() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [q, setQ] = useState("");
  const listQ = useAllAdmissions();
  const qc = useQueryClient();

  const rows = useMemo(() => {
    const all = listQ.data ?? [];
    const filtered = tab === "all" || tab === "pagos" ? all : all.filter((r) => r.status === tab);
    const term = q.trim().toLowerCase();
    if (!term) return filtered;
    return filtered.filter((r) =>
      [r.full_name, r.email, r.document_id, r.program_title, r.plan_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [listQ.data, tab, q]);

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: AdmissionStatus;
      notes?: string;
    }) => {
      const { error } = await db
        .from("admission_applications")
        .update({
          status,
          admin_notes: notes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["admin-admissions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar"),
  });

  const approve = useMutation({
    mutationFn: async (row: AdmissionApplication) => {
      await approveAdmission({
        data: { applicationId: row.id, months: row.duration_months ?? 12 },
      });
    },
    onSuccess: () => {
      toast.success("Matrícula aprobada: acceso premium activado");
      qc.invalidateQueries({ queryKey: ["admin-admissions"] });
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo aprobar"),
  });

  const counts = useMemo(() => {
    const all = listQ.data ?? [];
    const c: Record<string, number> = {};
    for (const r of all) c[r.status] = (c[r.status] ?? 0) + 1;
    c.all = all.length;
    return c;
  }, [listQ.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t.key
                ? "bg-foreground text-background"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.key === "pagos" ? <QrCode className="size-3.5" /> : null}
            {t.label}
            {t.key !== "pagos" && counts[t.key as string] ? (
              <span className="opacity-70">({counts[t.key as string]})</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "pagos" ? (
        <PaymentSettingsPanel />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, correo o documento"
                className={`${inputCls} pl-9`}
              />
            </div>
            <Btn variant="ghost" onClick={() => listQ.refetch()}>
              <RefreshCcw className="size-3.5" /> Actualizar
            </Btn>
          </div>

          {listQ.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : rows.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">No hay solicitudes en esta vista.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <AdmissionRow
                  key={r.id}
                  row={r}
                  onApprove={() => approve.mutate(r)}
                  onStatus={(status, notes) => setStatus.mutate({ id: r.id, status, notes })}
                  busy={approve.isPending || setStatus.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdmissionRow({
  row,
  onApprove,
  onStatus,
  busy,
}: {
  row: AdmissionApplication;
  onApprove: () => void;
  onStatus: (status: AdmissionStatus, notes?: string) => void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [open, setOpen] = useState(false);

  const viewReceipt = async () => {
    if (!row.receipt_path) {
      toast.error("Sin comprobante adjunto");
      return;
    }
    try {
      const url = await receiptSignedUrl(row.receipt_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo abrir el comprobante");
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm tracking-tight">{row.full_name || "Sin nombre"}</span>
            <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {row.email} · Doc. {row.document_id || "—"} · {row.phone || "—"}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <span className="px-2 py-0.5 rounded border border-border">
              {row.program_title || row.program_slug || "Sin programa"}
            </span>
            <span className="px-2 py-0.5 rounded border border-border">
              {row.plan_name || "Sin plan"}
            </span>
            <span className="px-2 py-0.5 rounded border border-border">
              {row.currency} {Number(row.amount ?? 0).toFixed(2)}
            </span>
            <span className="px-2 py-0.5 rounded border border-border">
              {row.duration_months} meses
            </span>
            {row.submitted_at && (
              <span className="px-2 py-0.5 rounded border border-border">
                Enviado {new Date(row.submitted_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="ghost" onClick={viewReceipt}>
            <Eye className="size-3.5" /> Comprobante
          </Btn>
          <Btn variant="ghost" onClick={() => setOpen((v) => !v)}>
            Notas
          </Btn>
          {row.status !== "approved" && (
            <Btn onClick={onApprove} disabled={busy}>
              <BadgeCheck className="size-3.5" /> Aprobar
            </Btn>
          )}
          {row.status === "pending" && (
            <Btn variant="ghost" onClick={() => onStatus("reviewing", notes)} disabled={busy}>
              <Check className="size-3.5" /> En revisión
            </Btn>
          )}
          {row.status !== "rejected" && (
            <Btn variant="danger" onClick={() => onStatus("rejected", notes)} disabled={busy}>
              <X className="size-3.5" /> Rechazar
            </Btn>
          )}
          {row.status === "approved" && (
            <Btn variant="ghost" onClick={() => onStatus("refunded", notes)} disabled={busy}>
              Reembolsar
            </Btn>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota visible para el postulante si se rechaza"
            className={inputCls}
          />
          <Btn variant="ghost" onClick={() => onStatus(row.status, notes)} disabled={busy}>
            <Save className="size-3.5" /> Guardar nota
          </Btn>
        </div>
      )}
    </Card>
  );
}

function PaymentSettingsPanel() {
  const settingsQ = usePaymentSettings();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, any>>({});

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const payload = {
        method: row.method ?? "yape",
        holder_name: row.holder_name ?? "",
        phone_number: row.phone_number ?? "",
        qr_url: row.qr_url || null,
        instructions: row.instructions || null,
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
      };
      if (row.id) {
        const { error } = await db.from("payment_settings").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("payment_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Método de pago guardado");
      qc.invalidateQueries({ queryKey: ["payment-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  const rows = settingsQ.data ?? [];

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Pagos y QR"
        hint="Configura el QR, el titular y el número que verán los postulantes en el paso de pago."
      />
      {settingsQ.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          {rows.map((r) => {
            const d = { ...r, ...(draft[r.id] ?? {}) } as any;
            return (
              <Card key={r.id}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Método">
                    <input
                      className={inputCls}
                      value={d.method ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [r.id]: { ...d, method: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Titular">
                    <input
                      className={inputCls}
                      value={d.holder_name ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [r.id]: { ...d, holder_name: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Número">
                    <input
                      className={inputCls}
                      value={d.phone_number ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [r.id]: { ...d, phone_number: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Imagen del código QR">
                    <div className="space-y-2">
                      <input
                        className={inputCls}
                        placeholder="Pega una URL o sube una foto"
                        value={d.qr_url ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, [r.id]: { ...d, qr_url: e.target.value } })
                        }
                      />
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-[11px] font-bold cursor-pointer hover:bg-black/[0.04] transition-colors">
                          {uploadingId === r.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Upload className="size-3.5" />
                          )}
                          Subir foto del QR
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              const url = await uploadQr(f, r.id);
                              if (url) setDraft((prev) => ({ ...prev, [r.id]: { ...d, qr_url: url } }));
                            }}
                          />
                        </label>
                        {d.qr_url && (
                          <button
                            onClick={() => setDraft((prev) => ({ ...prev, [r.id]: { ...d, qr_url: "" } }))}
                            className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Recuerda pulsar “Guardar” para publicar el QR en el paso de pago.
                      </p>
                    </div>
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Instrucciones">
                      <textarea
                        rows={2}
                        className={inputCls}
                        value={d.instructions ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, [r.id]: { ...d, instructions: e.target.value } })
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={!!d.is_active}
                      onChange={(e) =>
                        setDraft({ ...draft, [r.id]: { ...d, is_active: e.target.checked } })
                      }
                    />
                    Activo
                  </label>
                  <Btn onClick={() => upsert.mutate(d)} disabled={upsert.isPending}>
                    <Save className="size-3.5" /> Guardar
                  </Btn>
                  {d.qr_url && (
                    <img
                      src={d.qr_url}
                      alt="QR"
                      className="size-14 rounded-lg border border-border object-contain bg-white ml-auto"
                    />
                  )}
                </div>
              </Card>
            );
          })}
          <Btn
            variant="ghost"
            onClick={() =>
              upsert.mutate({
                method: "yape",
                holder_name: "",
                phone_number: "",
                is_active: true,
                sort_order: rows.length + 1,
              })
            }
          >
            <QrCode className="size-3.5" /> Añadir método de pago
          </Btn>
        </>
      )}
    </div>
  );
}
