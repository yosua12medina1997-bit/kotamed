/**
 * Clinical Workspace (parte 1) — historia clínica pediátrica, área de atención
 * inicial / ABCDE, examen físico, monitorización, línea de tiempo clínica,
 * transición del paciente, resumen automático y alta hospitalaria.
 */
import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardPenLine,
  FileText,
  HeartPulse,
  Plus,
  Save,
  Siren,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import {
  hospitalDay,
  patientLabel,
  useWardDelete,
  useWardSave,
  WARD_KEYS,
  useProblems,
  useTasks,
  type WardPatient,
} from "@/lib/ward-os";
import {
  ABCDE,
  CLINICAL_KEYS,
  DISCHARGE_CHECKS,
  EXAM_SYSTEMS,
  HISTORY_BLOCKS,
  PATIENT_ORIGINS,
  PATIENT_STAGES,
  TIMELINE_KINDS,
  fmtDateTime,
  logClinicalEvent,
  useClinicalEvents,
  useVitals,
  type WardVital,
} from "@/lib/ward-clinical";
import { FileDrop } from "./FileDrop";
import { WardCard } from "./ui";

type Ctx = { patient: WardPatient; accent: string; userId?: string; isAdmin?: boolean };

/* ─────────────────────── Etapas / transición del paciente ─────────────────── */

export function StageTracker({ patient, accent, isAdmin }: Ctx) {
  const save = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const stage = (patient as unknown as { stage?: string }).stage ?? "hospitalizacion";
  const origin = (patient as unknown as { origin?: string }).origin ?? "ingreso_directo";
  const idx = PATIENT_STAGES.findIndex((s) => s.value === stage);

  return (
    <WardCard
      title="Ubicación actual del paciente"
      subtitle={`Origen: ${PATIENT_ORIGINS.find((o) => o.value === origin)?.label ?? "—"} · Día ${hospitalDay(patient.admitted_at)} de hospitalización`}
      icon={<Siren className="size-4" style={{ color: accent }} />}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {PATIENT_STAGES.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <li key={s.value} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  save.mutate({ id: patient.id, stage: s.value, ...(s.value === "alta" ? {} : {}) })
                }
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition"
                style={{
                  borderColor: current ? accent : undefined,
                  background: current ? `${accent}14` : undefined,
                  color: current ? accent : undefined,
                }}
              >
                {done ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <Circle className="size-3.5" />
                )}
                {s.label}
              </button>
              {i < PATIENT_STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
            </li>
          );
        })}
      </ol>
      {isAdmin && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Al pasar a Hospitalización asigna pabellón, sala y cama desde el croquis; la cama se
          actualiza automáticamente en el mapa.
        </p>
      )}
    </WardCard>
  );
}

/* ───────────────────────────── Historia clínica ───────────────────────────── */

export function HistoriaClinica({ patient, accent, userId, isAdmin }: Ctx) {
  const save = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const history = ((patient as unknown as { history?: Record<string, string> }).history ??
    {}) as Record<string, string>;
  const [draft, setDraft] = useState<Record<string, string>>(history);
  const [block, setBlock] = useState<string>(HISTORY_BLOCKS[0].key);
  const [timeline, setTimeline] = useState<string>(history["cronologia"] ?? "");

  const current = HISTORY_BLOCKS.find((b) => b.key === block)!;
  const chrono = timeline
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <WardCard title="Bloques" icon={<FileText className="size-4" style={{ color: accent }} />}>
        <nav className="space-y-1">
          {HISTORY_BLOCKS.map((b) => {
            const filled = (draft[b.key] ?? "").trim().length > 0;
            const active = block === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBlock(b.key)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] font-bold transition ${
                  active ? "text-white" : "hover:bg-muted/60"
                }`}
                style={active ? { background: accent } : undefined}
              >
                <span className="truncate">{b.label}</span>
                {filled && (
                  <CheckCircle2
                    className="size-3.5 shrink-0"
                    style={{ color: active ? "#fff" : "#22c55e" }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </WardCard>

      <div className="space-y-5">
        <WardCard
          title={current.label}
          subtitle={current.hint ?? "Registra la información relevante o marca sin antecedentes."}
          icon={<ClipboardPenLine className="size-4" style={{ color: accent }} />}
          actions={
            <>
              <Btn
                onClick={() => setDraft((d) => ({ ...d, [block]: "Sin antecedentes relevantes." }))}
              >
                Sin antecedentes
              </Btn>
              <Btn
                variant="solid"
                accent={accent}
                loading={save.isPending}
                onClick={() =>
                  save.mutate({
                    id: patient.id,
                    history: { ...draft, cronologia: timeline },
                  })
                }
              >
                <Save className="size-3.5" /> Guardar
              </Btn>
            </>
          }
        >
          <Textarea
            value={draft[block] ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, [block]: e.target.value }))}
            placeholder={current.hint ?? "Describe aquí…"}
            className="min-h-40"
          />
        </WardCard>

        {block === "enfermedad_actual" && (
          <WardCard
            title="Línea de tiempo de la enfermedad"
            subtitle="Una línea por evento. Ej: Día -3 · Inicio de fiebre"
            icon={<CalendarDays className="size-4" style={{ color: accent }} />}
          >
            <Textarea
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder={"Día -3 · Inicio de fiebre\nDía -2 · Tos y rinorrea\nDía 0 · Ingreso por emergencia"}
            />
            {chrono.length > 0 && (
              <ol className="mt-4 space-y-2">
                {chrono.map((line, i) => (
                  <li key={`${line}-${i}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="grid place-items-center">
                      <span className="size-2.5 rounded-full" style={{ background: accent }} />
                      {i < chrono.length - 1 && <span className="mt-1 h-6 w-px bg-border" />}
                    </span>
                    <span className="pb-2 text-[12.5px] font-semibold">{line}</span>
                  </li>
                ))}
              </ol>
            )}
          </WardCard>
        )}

        <WardCard title="Documentos de la historia" icon={<FileText className="size-4" style={{ color: accent }} />}>
          <FileDrop
            patientId={patient.id}
            refKind="historia"
            accent={accent}
            userId={userId}
            isAdmin={isAdmin}
            label="Sube epicrisis, informes previos, fotos de la historia física, PDF, etc."
          />
        </WardCard>
      </div>
    </div>
  );
}

/* ─────────────────── Área de atención inicial / ABCDE ─────────────────── */

export function AtencionInicial({ patient, accent, userId, isAdmin }: Ctx) {
  const save = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const p = patient as unknown as { origin?: string; origin_at?: string; abcde?: Record<string, string> };
  const [origin, setOrigin] = useState(p.origin ?? "ingreso_directo");
  const [originAt, setOriginAt] = useState((p.origin_at ?? patient.admitted_at ?? "").slice(0, 16));
  const [abcde, setAbcde] = useState<Record<string, string>>(p.abcde ?? {});

  return (
    <div className="space-y-5">
      <WardCard
        title="Área de atención inicial"
        subtitle="Cada paciente conserva su punto de inicio dentro del hospital."
        icon={<Siren className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                id: patient.id,
                origin,
                origin_at: originAt ? new Date(originAt).toISOString() : null,
                abcde,
              });
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "ingreso",
                title: `Atención inicial · ${PATIENT_ORIGINS.find((o) => o.value === origin)?.label}`,
                occurred_at: originAt ? new Date(originAt).toISOString() : undefined,
              });
            }}
          >
            <Save className="size-3.5" /> Guardar
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Origen">
            <Select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {PATIENT_ORIGINS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha y hora de ingreso">
            <Input type="datetime-local" value={originAt} onChange={(e) => setOriginAt(e.target.value)} />
          </Field>
        </div>
      </WardCard>

      <WardCard
        title="Evaluación ABCDE"
        subtitle="Vista clínica rápida para pacientes de Shock Trauma / Observación."
        icon={<Activity className="size-4" style={{ color: accent }} />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {ABCDE.map((s) => (
            <div key={s.key} className="rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="text-[11px] font-black tracking-tight" style={{ color: accent }}>
                {s.label}
              </div>
              <div className="text-[10px] text-muted-foreground">{s.hint}</div>
              <Textarea
                className="mt-2 min-h-20"
                value={abcde[s.key] ?? ""}
                onChange={(e) => setAbcde((a) => ({ ...a, [s.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </WardCard>

      <WardCard title="Adjuntos de la atención inicial" icon={<FileText className="size-4" style={{ color: accent }} />}>
        <FileDrop
          patientId={patient.id}
          refKind="atencion_inicial"
          accent={accent}
          userId={userId}
          isAdmin={isAdmin}
          compact
          label="Fotos del triaje, hojas de emergencia, PDF de referencia…"
        />
      </WardCard>
    </div>
  );
}

/* ─────────────────────────── Examen físico ─────────────────────────── */

const EXAM_STATES = ["normal", "alterado", "no_evaluado"] as const;
const EXAM_STATE_LABEL: Record<string, string> = {
  normal: "Normal",
  alterado: "Alterado",
  no_evaluado: "No evaluado",
};
const EXAM_STATE_COLOR: Record<string, string> = {
  normal: "#22c55e",
  alterado: "#f59e0b",
  no_evaluado: "#94a3b8",
};

export function ExamenFisico({ patient, accent, userId, isAdmin }: Ctx) {
  const save = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const stored = ((patient as unknown as { exam?: Record<string, { state: string; note: string }> })
    .exam ?? {}) as Record<string, { state: string; note: string }>;
  const [exam, setExam] = useState(stored);

  const altered = Object.values(exam).filter((v) => v?.state === "alterado").length;

  return (
    <WardCard
      title="Examen físico pediátrico"
      subtitle={`Registro por sistemas · ${altered} sistema(s) alterado(s)`}
      icon={<HeartPulse className="size-4" style={{ color: accent }} />}
      actions={
        <Btn
          variant="solid"
          accent={accent}
          loading={save.isPending}
          onClick={() => save.mutate({ id: patient.id, exam })}
        >
          <Save className="size-3.5" /> Guardar examen
        </Btn>
      }
    >
      <div className="space-y-2">
        {EXAM_SYSTEMS.map((sys) => {
          const row = exam[sys] ?? { state: "no_evaluado", note: "" };
          return (
            <div key={sys} className="rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12.5px] font-bold">{sys}</span>
                <div className="flex gap-1.5">
                  {EXAM_STATES.map((st) => {
                    const active = row.state === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setExam((e) => ({ ...e, [sys]: { ...row, state: st } }))}
                        className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          borderColor: active ? EXAM_STATE_COLOR[st] : undefined,
                          background: active ? `${EXAM_STATE_COLOR[st]}1a` : undefined,
                          color: active ? EXAM_STATE_COLOR[st] : undefined,
                        }}
                      >
                        {EXAM_STATE_LABEL[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
              {row.state !== "no_evaluado" && (
                <Textarea
                  className="mt-2 min-h-16"
                  placeholder="Hallazgos…"
                  value={row.note ?? ""}
                  onChange={(e) => setExam((ex) => ({ ...ex, [sys]: { ...row, note: e.target.value } }))}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <FileDrop
          patientId={patient.id}
          refKind="examen_fisico"
          accent={accent}
          userId={userId}
          isAdmin={isAdmin}
          compact
          label="Fotos clínicas del examen (lesiones, hallazgos)"
        />
      </div>
    </WardCard>
  );
}

/* ────────────────────────── Monitorización ────────────────────────── */

const VITAL_FIELDS = [
  { key: "temp", label: "T° (°C)" },
  { key: "fc", label: "FC (lpm)" },
  { key: "fr", label: "FR (rpm)" },
  { key: "pa", label: "PA (mmHg)", text: true },
  { key: "pam", label: "PAM" },
  { key: "sato2", label: "SatO₂ (%)" },
  { key: "weight_kg", label: "Peso (kg)" },
  { key: "pain", label: "Dolor (0-10)" },
  { key: "glasgow", label: "Glasgow" },
] as const;

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full">
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Monitorizacion({ patient, accent, userId, isAdmin }: Ctx) {
  const { data: vitals = [] } = useVitals(patient.id);
  const save = useWardSave("ward_vitals", [CLINICAL_KEYS.vitals(patient.id)]);
  const del = useWardDelete("ward_vitals", [CLINICAL_KEYS.vitals(patient.id)]);
  const [form, setForm] = useState<Record<string, string>>({});

  const chrono = useMemo(() => [...vitals].reverse(), [vitals]);

  return (
    <div className="space-y-5">
      <WardCard
        title="Nuevo registro de monitorización"
        subtitle="Signos vitales y controles del turno."
        icon={<Activity className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={async () => {
              const payload: Record<string, unknown> = { patient_id: patient.id };
              for (const f of VITAL_FIELDS) {
                const raw = form[f.key];
                if (raw === undefined || raw === "") continue;
                payload[f.key] = "text" in f && f.text ? raw : Number(raw);
              }
              if (form["note"]) payload["note"] = form["note"];
              await save.mutateAsync(payload);
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "nota",
                title: "Registro de signos vitales",
                detail: VITAL_FIELDS.filter((f) => form[f.key])
                  .map((f) => `${f.label}: ${form[f.key]}`)
                  .join(" · "),
              });
              setForm({});
            }}
          >
            <Plus className="size-3.5" /> Registrar
          </Btn>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {VITAL_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <Input
                value={form[f.key] ?? ""}
                inputMode={"text" in f && f.text ? "text" : "decimal"}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
        <div className="mt-3">
          <Field label="Observación">
            <Input value={form["note"] ?? ""} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
          </Field>
        </div>
      </WardCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["fc", "fr", "temp", "sato2"] as const).map((key) => {
          const series = chrono
            .map((v) => Number((v as unknown as Record<string, number | null>)[key]))
            .filter((n) => Number.isFinite(n));
          const last = series.at(-1);
          const prev = series.at(-2);
          return (
            <div key={key} className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {VITAL_FIELDS.find((f) => f.key === key)?.label}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight" style={{ color: accent }}>
                  {last ?? "—"}
                </span>
                {last !== undefined && prev !== undefined && (
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: last > prev ? "#ef4444" : last < prev ? "#22c55e" : undefined }}
                  >
                    {last > prev ? "↑" : last < prev ? "↓" : "="} {prev}
                  </span>
                )}
              </div>
              <Sparkline values={series.slice(-12)} accent={accent} />
            </div>
          );
        })}
      </div>

      <WardCard title="Historial de registros" icon={<CalendarDays className="size-4" style={{ color: accent }} />}>
        {vitals.length === 0 ? (
          <Empty text="Aún no hay registros de monitorización." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="py-2">Fecha</th>
                  {VITAL_FIELDS.map((f) => (
                    <th key={f.key} className="py-2">
                      {f.label}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {vitals.map((v: WardVital) => (
                  <tr key={v.id} className="border-t border-border/50">
                    <td className="py-2 font-semibold">{fmtDateTime(v.taken_at)}</td>
                    {VITAL_FIELDS.map((f) => (
                      <td key={f.key} className="py-2">
                        {(v as unknown as Record<string, string | number | null>)[f.key] ?? "—"}
                      </td>
                    ))}
                    <td className="py-2 text-right">
                      {(isAdmin || userId) && (
                        <button
                          type="button"
                          onClick={() => del.mutate(v.id)}
                          className="text-destructive hover:underline"
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
      </WardCard>
    </div>
  );
}

/* ─────────────────── Línea de tiempo clínica global ─────────────────── */

export function ClinicalTimeline({ patient, accent }: Ctx) {
  const { data: events = [] } = useClinicalEvents(patient.id);
  const save = useWardSave("ward_events", [CLINICAL_KEYS.events(patient.id)]);
  const del = useWardDelete("ward_events", [CLINICAL_KEYS.events(patient.id)]);
  const [filter, setFilter] = useState<string>("todos");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("nota");

  const shown = filter === "todos" ? events : events.filter((e) => e.kind === filter);

  return (
    <WardCard
      title="Línea de tiempo clínica"
      subtitle="Toda la trayectoria del paciente en orden cronológico."
      icon={<CalendarDays className="size-4" style={{ color: accent }} />}
    >
      <div className="flex flex-wrap gap-1.5">
        {[{ value: "todos", label: "Todos" }, ...TIMELINE_KINDS].map((k) => {
          const active = filter === k.value;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => setFilter(k.value)}
              className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={active ? { background: `${accent}1a`, color: accent, borderColor: `${accent}55` } : undefined}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Input placeholder="Nuevo evento clínico…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          {TIMELINE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
        <Btn
          variant="solid"
          accent={accent}
          disabled={!title.trim()}
          loading={save.isPending}
          onClick={async () => {
            await save.mutateAsync({ patient_id: patient.id, kind, title: title.trim() });
            setTitle("");
          }}
        >
          <Plus className="size-3.5" /> Añadir
        </Btn>
      </div>

      {shown.length === 0 ? (
        <div className="mt-4">
          <Empty text="Sin eventos registrados con este filtro." />
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {shown.map((e, i) => (
            <li key={e.id} className="grid grid-cols-[86px_auto_minmax(0,1fr)] gap-3">
              <span className="pt-0.5 text-[11px] font-bold text-muted-foreground">
                {fmtDateTime(e.occurred_at)}
              </span>
              <span className="grid justify-items-center">
                <span className="mt-1 size-2.5 rounded-full" style={{ background: accent }} />
                {i < shown.length - 1 && <span className="mt-1 h-full w-px bg-border" />}
              </span>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-bold">{e.title}</span>
                  <Chip accent={accent}>{TIMELINE_KINDS.find((k) => k.value === e.kind)?.label ?? e.kind}</Chip>
                  <button
                    type="button"
                    onClick={() => del.mutate(e.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                {e.detail && <p className="text-[11.5px] text-muted-foreground">{e.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </WardCard>
  );
}

/* ───────────────── Resumen automático, alta y cierre de caso ───────────────── */

export function ResumenYAlta({ patient, accent, userId, isAdmin }: Ctx) {
  const save = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const { data: problems = [] } = useProblems(patient.id);
  const { data: tasks = [] } = useTasks();
  const p = patient as unknown as { discharge?: Record<string, boolean>; summary_text?: string };
  const [checks, setChecks] = useState<Record<string, boolean>>(p.discharge ?? {});
  const [summary, setSummary] = useState(p.summary_text ?? "");

  const pending = tasks.filter((t) => t.patient_id === patient.id && t.status !== "hecho");
  const done = DISCHARGE_CHECKS.filter((c) => checks[c.key]).length;

  function generate() {
    const active = problems.filter((pr) => pr.state !== "resuelto");
    const text = [
      `Paciente pediátrico ${patient.age_label ?? ""}, en su día ${hospitalDay(patient.admitted_at)} de hospitalización, con diagnóstico de ${patient.main_dx ?? "por definir"}.`,
      active.length > 0
        ? `Problemas activos: ${active.map((pr) => `${pr.title} (${pr.state}, ${pr.trend})`).join("; ")}.`
        : "Sin problemas activos registrados.",
      pending.length > 0
        ? `Pendientes: ${pending.map((t) => t.title).join("; ")}.`
        : "Sin pendientes abiertos.",
    ].join("\n\n");
    setSummary(text);
  }

  return (
    <div className="space-y-5">
      <WardCard
        title="Resumen clínico del paciente"
        subtitle="Generado con la información registrada; siempre editable por el interno."
        icon={<Sparkles className="size-4" style={{ color: accent }} />}
        actions={
          <>
            <Btn onClick={generate}>Generar resumen</Btn>
            <Btn
              variant="solid"
              accent={accent}
              loading={save.isPending}
              onClick={() => save.mutate({ id: patient.id, summary_text: summary })}
            >
              <Save className="size-3.5" /> Guardar
            </Btn>
          </>
        }
      >
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-40" />
      </WardCard>

      <WardCard
        title="Preparación de alta"
        subtitle={`${done} / ${DISCHARGE_CHECKS.length} completado`}
        icon={<CheckCircle2 className="size-4" style={{ color: accent }} />}
        actions={
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={() => save.mutate({ id: patient.id, discharge: checks })}
          >
            <Save className="size-3.5" /> Guardar checklist
          </Btn>
        }
      >
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(done / DISCHARGE_CHECKS.length) * 100}%`, background: accent }}
          />
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {DISCHARGE_CHECKS.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => setChecks((s) => ({ ...s, [c.key]: !s[c.key] }))}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-left text-[12px] font-semibold"
              >
                {checks[c.key] ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className="truncate">{c.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <FileDrop
            patientId={patient.id}
            refKind="alta"
            accent={accent}
            userId={userId}
            isAdmin={isAdmin}
            compact
            label="Adjunta el resumen de alta, receta o indicaciones (PDF/foto)"
          />
        </div>
      </WardCard>

      <WardCard
        title="Cierre del caso"
        subtitle="¿Qué deseas hacer con este paciente cuando deja el seguimiento?"
        icon={<ClipboardPenLine className="size-4" style={{ color: accent }} />}
      >
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={async () => {
              await save.mutateAsync({
                id: patient.id,
                stage: "alta",
                status: "alta",
                discharged_at: new Date().toISOString().slice(0, 10),
              });
              await logClinicalEvent({
                patient_id: patient.id,
                kind: "critico",
                title: "Alta hospitalaria registrada",
              });
            }}
          >
            Finalizar seguimiento
          </Btn>
          <CaseFromPatient patient={patient} accent={accent} summary={summary} />
        </div>
      </WardCard>
    </div>
  );
}

function CaseFromPatient({
  patient,
  accent,
  summary,
}: {
  patient: WardPatient;
  accent: string;
  summary: string;
}) {
  const save = useWardSave("ward_learning_cases", [WARD_KEYS.cases]);
  const { data: problems = [] } = useProblems(patient.id);
  return (
    <Btn
      variant="solid"
      accent={accent}
      loading={save.isPending}
      onClick={() =>
        save.mutate({
          patient_id: patient.id,
          title: `${patient.main_dx ?? "Caso pediátrico"} · ${patientLabel(patient)}`,
          problem: problems.map((p) => p.title).join("; ") || patient.reason,
          final_dx: patient.main_dx,
          evolution: summary,
          learnings: "",
          pearls: "",
          reflection: "",
        })
      }
    >
      Convertir en caso de aprendizaje
    </Btn>
  );
}
