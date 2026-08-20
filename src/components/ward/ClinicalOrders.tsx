/**
 * Clinical Workspace (parte 2) — exámenes auxiliares con resultados y
 * tendencias, tratamiento y medicación, balance hídrico, interconsultas,
 * procedimientos (ligados a competencias) y pendientes.
 */
import { useMemo, useState } from "react";
import {
  Beaker,
  Check,
  Droplets,
  FlaskConical,
  ListChecks,
  Pill,
  Plus,
  Save,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import {
  PLAN_CATEGORIES,
  WARD_KEYS,
  useCompetencies,
  useTasks,
  useWardDelete,
  useWardSave,
  type WardPatient,
} from "@/lib/ward-os";
import {
  BALANCE_IN,
  BALANCE_OUT,
  BALANCE_SHIFTS,
  CLINICAL_KEYS,
  CONSULT_STATUS,
  EXAM_CATEGORIES,
  EXAM_STATUS,
  EXAM_SUGGESTIONS,
  PROCEDURE_LEVELS,
  VALUE_FLAGS,
  balanceTotals,
  fmtDateTime,
  logClinicalEvent,
  useBalances,
  useConsults,
  useExams,
  useMeds,
  useProcedures,
  type WardExam,
  type WardExamValue,
} from "@/lib/ward-clinical";
import { FileDrop } from "./FileDrop";
import { WardCard } from "./ui";

type Ctx = { patient: WardPatient; accent: string; userId?: string; isAdmin?: boolean };

const flagColor = (flag?: string) => VALUE_FLAGS.find((f) => f.value === flag)?.color ?? "#94a3b8";

/* ─────────────────────────── Exámenes auxiliares ─────────────────────────── */

export function ExamenesAuxiliares({ patient, accent, userId, isAdmin }: Ctx) {
  const { data: exams = [] } = useExams(patient.id);
  const save = useWardSave("ward_exams", [CLINICAL_KEYS.exams(patient.id)]);
  const del = useWardDelete("ward_exams", [CLINICAL_KEYS.exams(patient.id)]);
  const [category, setCategory] = useState<string>("laboratorio");
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const byCategory = useMemo(
    () => exams.filter((e) => e.category === category),
    [exams, category],
  );

  /** Tendencia de un analito a lo largo de la hospitalización. */
  const trends = useMemo(() => {
    const map = new Map<string, { value: string; flag?: string; at: string }[]>();
    for (const e of [...exams].reverse()) {
      for (const v of e.values ?? []) {
        const arr = map.get(v.label) ?? [];
        arr.push({ value: v.value, flag: v.flag, at: e.taken_at ?? e.requested_at });
        map.set(v.label, arr);
      }
    }
    return map;
  }, [exams]);

  return (
    <div className="space-y-5">
      <WardCard
        title="Solicitar examen"
        subtitle="Laboratorio, imágenes, microbiología u otros estudios."
        icon={<FlaskConical className="size-4" style={{ color: accent }} />}
      >
        <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
          <Field label="Categoría">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXAM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Examen">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Hemograma" />
          </Field>
          <div className="self-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!name.trim()}
              loading={save.isPending}
              onClick={async () => {
                await save.mutateAsync({ patient_id: patient.id, category, name: name.trim() });
                await logClinicalEvent({
                  patient_id: patient.id,
                  kind: category === "imagenes" ? "imagen" : "laboratorio",
                  title: `Se solicita ${name.trim()}`,
                });
                setName("");
              }}
            >
              <Plus className="size-3.5" /> Solicitar
            </Btn>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(EXAM_SUGGESTIONS[category] ?? []).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="rounded-full border border-border/60 px-2.5 py-1 text-[10.5px] font-bold hover:border-primary/40"
            >
              {s}
            </button>
          ))}
        </div>
      </WardCard>

      <WardCard
        title={`${EXAM_CATEGORIES.find((c) => c.value === category)?.label} · ${byCategory.length}`}
        icon={<Beaker className="size-4" style={{ color: accent }} />}
      >
        {byCategory.length === 0 ? (
          <Empty text="Sin exámenes registrados en esta categoría." />
        ) : (
          <ul className="space-y-2">
            {byCategory.map((e) => (
              <li key={e.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <button type="button" className="min-w-0 text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
                    <span className="block truncate text-[13px] font-bold">{e.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {fmtDateTime(e.taken_at ?? e.requested_at)} ·{" "}
                      {EXAM_STATUS.find((s) => s.value === e.status)?.label}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: `${flagColor(e.flag)}1a`, color: flagColor(e.flag) }}
                    >
                      {VALUE_FLAGS.find((f) => f.value === e.flag)?.label ?? e.flag}
                    </span>
                    <button
                      type="button"
                      onClick={() => del.mutate(e.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {open === e.id && (
                  <ExamEditor
                    exam={e}
                    patient={patient}
                    accent={accent}
                    userId={userId}
                    isAdmin={isAdmin}
                    trends={trends}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </WardCard>
    </div>
  );
}

function ExamEditor({
  exam,
  patient,
  accent,
  userId,
  isAdmin,
  trends,
}: {
  exam: WardExam;
  patient: WardPatient;
  accent: string;
  userId?: string;
  isAdmin?: boolean;
  trends: Map<string, { value: string; flag?: string; at: string }[]>;
}) {
  const save = useWardSave("ward_exams", [CLINICAL_KEYS.exams(patient.id)]);
  const [status, setStatus] = useState(exam.status);
  const [flag, setFlag] = useState(exam.flag);
  const [result, setResult] = useState(exam.result_text ?? "");
  const [values, setValues] = useState<WardExamValue[]>(exam.values ?? []);

  return (
    <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Estado">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {EXAM_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valoración global">
          <Select value={flag} onChange={(e) => setFlag(e.target.value)}>
            {VALUE_FLAGS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de toma">
          <Input
            type="datetime-local"
            defaultValue={(exam.taken_at ?? "").slice(0, 16)}
            onChange={(e) =>
              save.mutate({ id: exam.id, taken_at: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Valores importantes
        </div>
        {values.map((v, i) => {
          const history = trends.get(v.label) ?? [];
          return (
            <div key={`${v.label}-${i}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_90px_130px_auto]">
              <Input
                placeholder="Analito (Hb)"
                value={v.label}
                onChange={(e) =>
                  setValues((s) => s.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
              <Input
                placeholder="Valor"
                value={v.value}
                onChange={(e) =>
                  setValues((s) => s.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                }
              />
              <Input
                placeholder="Unidad"
                value={v.unit ?? ""}
                onChange={(e) =>
                  setValues((s) => s.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))
                }
              />
              <Select
                value={v.flag ?? "normal"}
                onChange={(e) =>
                  setValues((s) => s.map((x, j) => (j === i ? { ...x, flag: e.target.value } : x)))
                }
              >
                {VALUE_FLAGS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-2">
                {history.length > 1 && (
                  <span
                    className="inline-flex items-center gap-1 text-[10.5px] font-bold"
                    title={history.map((h) => `${h.value} (${fmtDateTime(h.at)})`).join(" → ")}
                  >
                    <TrendingDown className="size-3" />
                    {history.slice(-3).map((h) => h.value).join(" → ")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setValues((s) => s.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        <Btn onClick={() => setValues((s) => [...s, { label: "", value: "", unit: "", flag: "normal" }])}>
          <Plus className="size-3.5" /> Añadir valor
        </Btn>
      </div>

      <Field label="Informe / resultado">
        <Textarea value={result} onChange={(e) => setResult(e.target.value)} />
      </Field>

      <FileDrop
        patientId={patient.id}
        refKind="examenes"
        refId={exam.id}
        accent={accent}
        userId={userId}
        isAdmin={isAdmin}
        compact
        label="Sube la placa, el informe en PDF o la foto del resultado"
      />

      <Btn
        variant="solid"
        accent={accent}
        loading={save.isPending}
        onClick={async () => {
          await save.mutateAsync({
            id: exam.id,
            status,
            flag,
            result_text: result,
            values,
          });
          await logClinicalEvent({
            patient_id: patient.id,
            kind: exam.category === "imagenes" ? "imagen" : "laboratorio",
            title: `${exam.name}: ${EXAM_STATUS.find((s) => s.value === status)?.label}`,
            detail: values.map((v) => `${v.label} ${v.value}${v.unit ?? ""}`).join(" · ") || null,
          });
        }}
      >
        <Save className="size-3.5" /> Guardar resultado
      </Btn>
    </div>
  );
}

/* ──────────────────────── Tratamiento y medicación ──────────────────────── */

export function Tratamiento({ patient, accent, userId, isAdmin }: Ctx) {
  const { data: meds = [] } = useMeds(patient.id);
  const save = useWardSave("ward_meds", [CLINICAL_KEYS.meds(patient.id)]);
  const del = useWardDelete("ward_meds", [CLINICAL_KEYS.meds(patient.id)]);
  const [form, setForm] = useState<Record<string, string>>({});

  return (
    <div className="space-y-5">
      <WardCard
        title="Nueva indicación"
        subtitle="Los cálculos de la calculadora pediátrica pueden enviarse aquí automáticamente."
        icon={<Pill className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            disabled={!form["name"]?.trim()}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                patient_id: patient.id,
                name: form["name"]!.trim(),
                dose: form["dose"] ?? null,
                unit: form["unit"] ?? null,
                route: form["route"] ?? null,
                frequency: form["frequency"] ?? null,
                notes: form["notes"] ?? null,
              });
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "medicacion",
                title: `Inicio de ${form["name"]}`,
                detail: [form["dose"], form["unit"], form["route"], form["frequency"]].filter(Boolean).join(" · "),
              });
              setForm({});
            }}
          >
            <Plus className="size-3.5" /> Agregar
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { k: "name", l: "Medicamento" },
            { k: "dose", l: "Dosis" },
            { k: "unit", l: "Unidad" },
            { k: "route", l: "Vía" },
            { k: "frequency", l: "Frecuencia" },
          ].map((f) => (
            <Field key={f.k} label={f.l}>
              <Input value={form[f.k] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.k]: e.target.value }))} />
            </Field>
          ))}
        </div>
      </WardCard>

      <WardCard title="Medicación actual" icon={<Syringe className="size-4" style={{ color: accent }} />}>
        {meds.length === 0 ? (
          <Empty text="Sin medicación registrada." />
        ) : (
          <ul className="space-y-2">
            {meds.map((m) => {
              const calc = m.calc as { tool?: string; weight_kg?: number; result?: string; at?: string };
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-2xl border border-border/50 bg-background/40 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold">{m.name}</span>
                      <Chip accent={accent}>{m.status}</Chip>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {[m.dose && `${m.dose} ${m.unit ?? ""}`, m.route, m.frequency, m.started_at && `desde ${m.started_at}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {calc?.result && (
                      <div className="mt-1 rounded-xl border border-dashed border-border/60 px-2 py-1 text-[11px]">
                        <b>Trazabilidad:</b> {calc.tool} · peso {calc.weight_kg} kg · {calc.result}
                      </div>
                    )}
                    {m.notes && <p className="mt-1 text-[11px] text-muted-foreground">{m.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Select
                      value={m.status}
                      onChange={(e) => save.mutate({ id: m.id, status: e.target.value })}
                      className="!py-1 text-[11px]"
                    >
                      {["activo", "suspendido", "finalizado"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => del.mutate(m.id)}
                      className="justify-self-end text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <FileDrop
            patientId={patient.id}
            refKind="tratamiento"
            accent={accent}
            userId={userId}
            isAdmin={isAdmin}
            compact
            label="Adjunta la hoja de indicaciones o kardex (foto/PDF)"
          />
        </div>
      </WardCard>
    </div>
  );
}

/* ────────────────────────────── Balance hídrico ────────────────────────────── */

export function BalanceHidrico({ patient, accent }: Ctx) {
  const { data: rows = [] } = useBalances(patient.id);
  const save = useWardSave("ward_balance", [CLINICAL_KEYS.balance(patient.id)]);
  const del = useWardDelete("ward_balance", [CLINICAL_KEYS.balance(patient.id)]);
  const [shift, setShift] = useState("24h");
  const [ingresos, setIngresos] = useState<Record<string, string>>({});
  const [egresos, setEgresos] = useState<Record<string, string>>({});

  const num = (rec: Record<string, string>) =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, Number(v) || 0]));
  const hours = shift === "24h" ? 24 : 8;

  return (
    <div className="space-y-5">
      <WardCard
        title="Registrar balance"
        subtitle="Ingresos y egresos por turno; el balance y la diuresis se calculan solos."
        icon={<Droplets className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                patient_id: patient.id,
                shift,
                ingresos: num(ingresos),
                egresos: num(egresos),
              });
              setIngresos({});
              setEgresos({});
            }}
          >
            <Plus className="size-3.5" /> Guardar
          </Btn>
        }
      >
        <Field label="Turno">
          <Select value={shift} onChange={(e) => setShift(e.target.value)}>
            {BALANCE_SHIFTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              Ingresos (ml)
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {BALANCE_IN.map((k) => (
                <Field key={k} label={k}>
                  <Input
                    inputMode="decimal"
                    value={ingresos[k] ?? ""}
                    onChange={(e) => setIngresos((s) => ({ ...s, [k]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
              Egresos (ml)
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {BALANCE_OUT.map((k) => (
                <Field key={k} label={k}>
                  <Input
                    inputMode="decimal"
                    value={egresos[k] ?? ""}
                    onChange={(e) => setEgresos((s) => ({ ...s, [k]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </WardCard>

      <WardCard title="Historial de balances" icon={<Droplets className="size-4" style={{ color: accent }} />}>
        {rows.length === 0 ? (
          <Empty text="Sin balances registrados." />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const t = balanceTotals(r, patient.weight_kg, hours);
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 bg-background/40 px-3 py-2 text-[12px]"
                >
                  <div>
                    <div className="font-bold">
                      {r.on_date} · {BALANCE_SHIFTS.find((s) => s.value === r.shift)?.label}
                    </div>
                    <div className="text-muted-foreground">
                      Ingresos {t.ingresos} ml · Egresos {t.egresos} ml · Balance{" "}
                      <b style={{ color: t.balance >= 0 ? "#22c55e" : "#f97316" }}>
                        {t.balance > 0 ? "+" : ""}
                        {t.balance} ml
                      </b>
                      {t.diuresisRate !== null && ` · Diuresis ${t.diuresisRate.toFixed(1)} ml/kg/h`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => del.mutate(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </WardCard>
    </div>
  );
}

/* ────────────────────────────── Interconsultas ────────────────────────────── */

export function Interconsultas({ patient, accent, userId, isAdmin }: Ctx) {
  const { data: rows = [] } = useConsults(patient.id);
  const save = useWardSave("ward_consults", [CLINICAL_KEYS.consults(patient.id)]);
  const del = useWardDelete("ward_consults", [CLINICAL_KEYS.consults(patient.id)]);
  const [specialty, setSpecialty] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-5">
      <WardCard
        title="Solicitar interconsulta"
        icon={<Stethoscope className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            disabled={!specialty.trim()}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                patient_id: patient.id,
                specialty: specialty.trim(),
                reason: reason.trim() || null,
                status: "solicitada",
              });
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "interconsulta",
                title: `Interconsulta a ${specialty.trim()}`,
                detail: reason.trim() || null,
              });
              setSpecialty("");
              setReason("");
            }}
          >
            <Plus className="size-3.5" /> Solicitar
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[240px_minmax(0,1fr)]">
          <Field label="Especialidad">
            <Input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Neurología Pediátrica"
            />
          </Field>
          <Field label="Motivo">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Evaluación por crisis convulsiva"
            />
          </Field>
        </div>
      </WardCard>

      <WardCard title="Interconsultas del paciente" icon={<Stethoscope className="size-4" style={{ color: accent }} />}>
        {rows.length === 0 ? (
          <Empty text="Sin interconsultas registradas." />
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold">{c.specialty}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {c.reason} · {fmtDateTime(c.requested_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={c.status}
                      className="!py-1 text-[11px]"
                      onChange={(e) =>
                        save.mutate({
                          id: c.id,
                          status: e.target.value,
                          answered_at: e.target.value === "respondida" ? new Date().toISOString() : null,
                        })
                      }
                    >
                      {CONSULT_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => del.mutate(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <Textarea
                  className="mt-2 min-h-16"
                  placeholder="Conclusión de la especialidad…"
                  defaultValue={c.response ?? ""}
                  onBlur={async (e) => {
                    if (e.target.value === (c.response ?? "")) return;
                    await save.mutateAsync({ id: c.id, response: e.target.value });
                    await logClinicalEvent({
                      patient_id: patient.id,
                      kind: "interconsulta",
                      title: `Respuesta de ${c.specialty}`,
                      detail: e.target.value.slice(0, 300),
                    });
                  }}
                />
                <FileDrop
                  patientId={patient.id}
                  refKind="interconsultas"
                  refId={c.id}
                  accent={accent}
                  userId={userId}
                  isAdmin={isAdmin}
                  compact
                  label="Adjunta la hoja de interconsulta (foto/PDF)"
                />
              </li>
            ))}
          </ul>
        )}
      </WardCard>
    </div>
  );
}

/* ─────────────────────────────── Procedimientos ─────────────────────────────── */

export function Procedimientos({ patient, accent, userId, isAdmin }: Ctx) {
  const { data: rows = [] } = useProcedures(patient.id);
  const { data: competencies = [] } = useCompetencies();
  const save = useWardSave("ward_procedures", [CLINICAL_KEYS.procedures(patient.id)]);
  const del = useWardDelete("ward_procedures", [CLINICAL_KEYS.procedures(patient.id)]);
  const [form, setForm] = useState<Record<string, string>>({ level: "observado" });

  return (
    <div className="space-y-5">
      <WardCard
        title="Registrar procedimiento"
        subtitle="Cada procedimiento puede vincularse a una competencia de la rotación."
        icon={<Syringe className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            disabled={!form["name"]?.trim()}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                patient_id: patient.id,
                name: form["name"]!.trim(),
                indication: form["indication"] ?? null,
                level: form["level"] ?? "observado",
                competency_id: form["competency_id"] || null,
                note: form["note"] ?? null,
              });
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "procedimiento",
                title: `${form["name"]} · ${PROCEDURE_LEVELS.find((l) => l.value === form["level"])?.label}`,
              });
              setForm({ level: "observado" });
            }}
          >
            <Plus className="size-3.5" /> Registrar
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Procedimiento">
            <Input
              value={form["name"] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Canalización venosa periférica"
            />
          </Field>
          <Field label="Indicación">
            <Input
              value={form["indication"] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, indication: e.target.value }))}
            />
          </Field>
          <Field label="Nivel de logro">
            <Select value={form["level"]} onChange={(e) => setForm((s) => ({ ...s, level: e.target.value }))}>
              {PROCEDURE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Competencia">
            <Select
              value={form["competency_id"] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, competency_id: e.target.value }))}
            >
              <option value="">Sin vincular</option>
              {competencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </WardCard>

      <WardCard title="Procedimientos del paciente" icon={<Syringe className="size-4" style={{ color: accent }} />}>
        {rows.length === 0 ? (
          <Empty text="Sin procedimientos registrados." />
        ) : (
          <ul className="space-y-2">
            {rows.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold">{p.name}</span>
                    <Chip accent={accent}>{PROCEDURE_LEVELS.find((l) => l.value === p.level)?.label}</Chip>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {fmtDateTime(p.done_at)}
                    {p.indication ? ` · ${p.indication}` : ""}
                    {p.competency_id
                      ? ` · ${competencies.find((c) => c.id === p.competency_id)?.title ?? "competencia"}`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate(p.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <FileDrop
            patientId={patient.id}
            refKind="procedimientos"
            accent={accent}
            userId={userId}
            isAdmin={isAdmin}
            compact
            label="Fotos o consentimientos del procedimiento"
          />
        </div>
      </WardCard>
    </div>
  );
}

/* ──────────────────────────────── Pendientes ──────────────────────────────── */

export function Pendientes({
  accent,
  patients,
  patientId,
  onSelectPatient,
}: {
  accent: string;
  patients: WardPatient[];
  patientId?: string | null;
  onSelectPatient?: (id: string) => void;
}) {
  const { data: tasks = [] } = useTasks();
  const save = useWardSave("ward_tasks", [WARD_KEYS.tasks]);
  const del = useWardDelete("ward_tasks", [WARD_KEYS.tasks]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>(PLAN_CATEGORIES[0].value);
  const [target, setTarget] = useState<string>(patientId ?? "");
  const [only, setOnly] = useState(false);

  const shown = tasks.filter((t) => (only ? t.status !== "hecho" : true));

  return (
    <WardCard
      title="Pendientes clínicos"
      subtitle="Cada elemento del plan puede convertirse en un pendiente con dueño y fecha."
      icon={<ListChecks className="size-4" style={{ color: accent }} />}
      actions={<Btn onClick={() => setOnly((v) => !v)}>{only ? "Ver todos" : "Solo abiertos"}</Btn>}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_200px_auto]">
        <Input placeholder="Nuevo pendiente…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          {PLAN_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Sin paciente</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.initials ?? p.code ?? "Paciente"}
            </option>
          ))}
        </Select>
        <Btn
          variant="solid"
          accent={accent}
          disabled={!title.trim()}
          loading={save.isPending}
          onClick={async () => {
            await save.mutateAsync({
              title: title.trim(),
              kind,
              patient_id: target || null,
              status: "abierto",
              priority: "media",
            });
            setTitle("");
          }}
        >
          <Plus className="size-3.5" /> Añadir
        </Btn>
      </div>

      {shown.length === 0 ? (
        <div className="mt-4">
          <Empty text="Sin pendientes." />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((t) => {
            const p = patients.find((x) => x.id === t.patient_id);
            const done = t.status === "hecho";
            return (
              <li
                key={t.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 bg-background/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    save.mutate({
                      id: t.id,
                      status: done ? "abierto" : "hecho",
                      done_at: done ? null : new Date().toISOString(),
                    })
                  }
                  className="grid size-7 place-items-center rounded-lg border border-border/60"
                  style={done ? { background: "#22c55e1a", color: "#22c55e" } : undefined}
                >
                  <Check className="size-3.5" />
                </button>
                <div className="min-w-0">
                  <div className={`truncate text-[12.5px] font-bold ${done ? "line-through opacity-60" : ""}`}>
                    {t.title}
                  </div>
                  <div className="truncate text-[10.5px] text-muted-foreground">
                    {t.kind}
                    {p && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => p && onSelectPatient?.(p.id)}
                        >
                          {p.initials ?? p.code}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </WardCard>
  );
}
