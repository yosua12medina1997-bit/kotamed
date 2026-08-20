/**
 * Expediente académico del paciente hospitalizado: resumen, SOAP del día,
 * problemas clínicos, plan, pendientes, línea de tiempo y ruta de estudio.
 */
import { useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Calculator,
  CalendarDays,
  ClipboardList,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  ListChecks,
  Paperclip,
  Pencil,
  Pill,
  Plus,
  Save,
  Siren,
  Stethoscope,
  Syringe,
  Trash2,
  Users,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import {
  PATIENT_STATUS,
  PLAN_CATEGORIES,
  SOAP_OBJECTIVE,
  SOAP_SUBJECTIVE,
  WARD_KEYS,
  dxKeysFor,
  hospitalDay,
  patientLabel,
  useEvolutions,
  usePlanItems,
  useProblems,
  useStudyLinks,
  useTasks,
  useWardDelete,
  useWardSave,
  type WardBed,
  type WardEvolution,
  type WardPatient,
  type WardZone,
} from "@/lib/ward-os";
import {
  AtencionInicial,
  ClinicalTimeline,
  ExamenFisico,
  HistoriaClinica,
  Monitorizacion,
  ResumenYAlta,
  StageTracker,
} from "./ClinicalRecord";
import {
  BalanceHidrico,
  ExamenesAuxiliares,
  Interconsultas,
  Procedimientos,
  Tratamiento,
} from "./ClinicalOrders";
import { FileDrop } from "./FileDrop";
import { WardCalculator } from "./WardCalculator";

import { StatusPill, WardCard } from "./ui";

const TABS = [
  { id: "resumen", label: "Resumen", icon: Stethoscope },
  { id: "historia", label: "Historia clínica", icon: ClipboardList },
  { id: "inicial", label: "Atención inicial", icon: Siren },
  { id: "examen", label: "Examen físico", icon: HeartPulse },
  { id: "monitor", label: "Monitorización", icon: Activity },
  { id: "examenes", label: "Exámenes auxiliares", icon: FlaskConical },
  { id: "tratamiento", label: "Tratamiento", icon: Pill },
  { id: "balance", label: "Balance hídrico", icon: Droplets },
  { id: "interconsultas", label: "Interconsultas", icon: Users },
  { id: "procedimientos", label: "Procedimientos", icon: Syringe },
  { id: "calculadora", label: "Calculadora", icon: Calculator },
  { id: "soap", label: "Evolución SOAP", icon: ClipboardList },
  { id: "problemas", label: "Problemas y plan", icon: ListChecks },
  { id: "archivos", label: "Archivos", icon: Paperclip },
  { id: "alta", label: "Resumen y alta", icon: FileText },
  { id: "timeline", label: "Línea de tiempo", icon: CalendarDays },
  { id: "estudio", label: "Ruta de estudio", icon: BookOpen },
] as const;


export function PatientDetail({
  patient,
  zones,
  beds,
  accent,
  onEdit,
  userId,
  isAdmin,
}: {
  patient: WardPatient;
  zones: WardZone[];
  beds: WardBed[];
  accent: string;
  onEdit: () => void;
  userId?: string;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("resumen");
  const ctx = { patient, accent, userId, isAdmin };

  const bed = beds.find((b) => b.id === patient.bed_id);
  const zone = zones.find((z) => z.id === bed?.zone_id);

  return (
    <div className="space-y-5">
      <WardCard className="!p-0 overflow-hidden">
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5"
          style={{ background: `linear-gradient(120deg, ${accent}14, transparent 70%)` }}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black tracking-tight">{patientLabel(patient)}</h2>
              <StatusPill status={patient.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                zone ? `${zone.label} · Cama ${bed?.number}` : "Sin cama",
                patient.age_label,
                patient.sex,
                patient.weight_kg ? `${patient.weight_kg} kg` : null,
                `Día ${hospitalDay(patient.admitted_at)} de hospitalización`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-2 text-sm font-semibold">{patient.main_dx ?? "Sin diagnóstico registrado"}</p>
            {patient.secondary_dx.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patient.secondary_dx.map((d) => (
                  <Chip key={d}>{d}</Chip>
                ))}
              </div>
            )}
          </div>
          <Btn onClick={onEdit} accent={accent} variant="outline">
            <Pencil className="size-3.5" /> Editar
          </Btn>
        </div>

        <nav className="flex flex-wrap gap-1.5 border-t border-border/60 px-4 py-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                  active ? "text-white" : "border border-border/60 hover:border-primary/40"
                }`}
                style={active ? { background: accent } : undefined}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </WardCard>

      {tab === "resumen" && <Resumen patient={patient} accent={accent} />}
      {tab === "soap" && <SoapEditor patient={patient} accent={accent} />}
      {tab === "problemas" && <ProblemsAndPlan patient={patient} accent={accent} />}
      {tab === "timeline" && <Timeline patient={patient} accent={accent} />}
      {tab === "estudio" && <StudyRoute patient={patient} accent={accent} />}
    </div>
  );
}

/* ─────────────────────────────── Resumen ─────────────────────────────── */

function Resumen({ patient, accent }: { patient: WardPatient; accent: string }) {
  const { data: problems = [] } = useProblems(patient.id);
  const { data: evolutions = [] } = useEvolutions(patient.id);
  const last = evolutions[0];

  const blocks = [
    { label: "Motivo de ingreso", value: patient.reason },
    { label: "Antecedentes", value: patient.background },
    { label: "Alergias", value: patient.allergies },
    { label: "Medicación actual", value: patient.medications },
    { label: "Notas", value: patient.notes },
  ].filter((b) => b.value);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <WardCard title="Datos clínicos" icon={<Stethoscope className="size-4" style={{ color: accent }} />} className="lg:col-span-2">
        {blocks.length === 0 ? (
          <Empty text="Aún no hay datos clínicos registrados para este paciente." />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.label} className="rounded-2xl border border-border/50 bg-background/40 p-3">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {b.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{b.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {patient.devices.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {patient.devices.map((d) => (
              <Chip key={d} accent={accent}>
                {d}
              </Chip>
            ))}
          </div>
        )}
      </WardCard>

      <div className="space-y-5">
        <WardCard title="Problemas activos" subtitle={`${problems.length} registrados`}>
          {problems.length === 0 ? (
            <Empty text="Sin problemas clínicos." />
          ) : (
            <ul className="space-y-2">
              {problems.map((p) => (
                <li key={p.id} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                  <div className="text-sm font-bold">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.state} · {p.trend}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </WardCard>

        <WardCard title="Última evolución">
          {!last ? (
            <Empty text="Aún no se registra evolución." />
          ) : (
            <div className="text-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {last.evo_date} · día {last.hosp_day ?? "—"}
              </div>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                {last.analysis || last.summary || "Sin análisis registrado."}
              </p>
            </div>
          )}
        </WardCard>
      </div>
    </div>
  );
}

/* ──────────────────────────────── SOAP ──────────────────────────────── */

function SoapEditor({ patient, accent }: { patient: WardPatient; accent: string }) {
  const { data: evolutions = [] } = useEvolutions(patient.id);
  const today = new Date().toISOString().slice(0, 10);
  const existing = evolutions.find((e) => e.evo_date === today);
  const save = useWardSave("ward_evolutions", [WARD_KEYS.evolutions]);

  const [draft, setDraft] = useState<{
    subjective: Record<string, string>;
    objective: Record<string, string>;
    analysis: string;
    plan_note: string;
  }>(() => ({
    subjective: existing?.subjective ?? {},
    objective: existing?.objective ?? {},
    analysis: existing?.analysis ?? "",
    plan_note: existing?.plan_note ?? "",
  }));

  async function submit(status: "borrador" | "firmada") {
    await save.mutateAsync({
      ...(existing?.id ? { id: existing.id } : {}),
      patient_id: patient.id,
      evo_date: today,
      hosp_day: hospitalDay(patient.admitted_at),
      status,
      subjective: draft.subjective,
      objective: draft.objective,
      analysis: draft.analysis || null,
      plan_note: draft.plan_note || null,
    });
  }

  return (
    <WardCard
      title={`Evolución SOAP · ${today}`}
      subtitle="Estructura guiada: subjetivo, objetivo, análisis y plan. Se guarda como borrador hasta que la firmes."
      icon={<ClipboardList className="size-4" style={{ color: accent }} />}
      actions={
        <>
          <Btn loading={save.isPending} onClick={() => submit("borrador")}>
            <Save className="size-3.5" /> Guardar borrador
          </Btn>
          <Btn variant="solid" accent={accent} loading={save.isPending} onClick={() => submit("firmada")}>
            Firmar evolución
          </Btn>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent }}>
            S · Subjetivo
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOAP_SUBJECTIVE.map((f) => (
              <Field key={f.key} label={f.label}>
                <Textarea
                  className="min-h-16"
                  value={draft.subjective[f.key] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      subjective: { ...d.subjective, [f.key]: e.target.value },
                    }))
                  }
                />
              </Field>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent }}>
            O · Objetivo
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SOAP_OBJECTIVE.map((f) => (
              <Field key={f.key} label={f.label}>
                {["examen", "laboratorio", "balance"].includes(f.key) ? (
                  <Textarea
                    className="min-h-16"
                    value={draft.objective[f.key] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        objective: { ...d.objective, [f.key]: e.target.value },
                      }))
                    }
                  />
                ) : (
                  <Input
                    value={draft.objective[f.key] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        objective: { ...d.objective, [f.key]: e.target.value },
                      }))
                    }
                  />
                )}
              </Field>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="A · Análisis / razonamiento clínico">
            <Textarea
              className="min-h-32"
              value={draft.analysis}
              onChange={(e) => setDraft((d) => ({ ...d, analysis: e.target.value }))}
              placeholder="¿Por qué está así el paciente? ¿Mejora o empeora? ¿Qué explica los hallazgos?"
            />
          </Field>
          <Field label="P · Plan del día">
            <Textarea
              className="min-h-32"
              value={draft.plan_note}
              onChange={(e) => setDraft((d) => ({ ...d, plan_note: e.target.value }))}
              placeholder="Conductas, exámenes, ajustes de tratamiento, criterios de alta."
            />
          </Field>
        </div>
      </div>
    </WardCard>
  );
}

/* ─────────────────────── Problemas, plan y pendientes ─────────────────────── */

function ProblemsAndPlan({ patient, accent }: { patient: WardPatient; accent: string }) {
  const { data: problems = [] } = useProblems(patient.id);
  const { data: plan = [] } = usePlanItems(patient.id);
  const { data: tasks = [] } = useTasks();
  const saveProblem = useWardSave("ward_problems", [WARD_KEYS.problems]);
  const delProblem = useWardDelete("ward_problems", [WARD_KEYS.problems]);
  const savePlan = useWardSave("ward_plan_items", [WARD_KEYS.plan]);
  const delPlan = useWardDelete("ward_plan_items", [WARD_KEYS.plan]);
  const saveTask = useWardSave("ward_tasks", [WARD_KEYS.tasks]);
  const delTask = useWardDelete("ward_tasks", [WARD_KEYS.tasks]);

  const [newProblem, setNewProblem] = useState("");
  const [newPlan, setNewPlan] = useState({ category: "monitorizacion", content: "" });
  const [newTask, setNewTask] = useState("");
  const myTasks = tasks.filter((t) => t.patient_id === patient.id);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <WardCard
        title="Problemas clínicos"
        subtitle="Cada problema con su evidencia, tendencia y estudios pendientes."
        icon={<ListChecks className="size-4" style={{ color: accent }} />}
      >
        <div className="flex flex-wrap gap-2">
          <Input
            className="flex-1"
            value={newProblem}
            placeholder="Nuevo problema (ej. Dificultad respiratoria)"
            onChange={(e) => setNewProblem(e.target.value)}
          />
          <Btn
            variant="solid"
            accent={accent}
            loading={saveProblem.isPending}
            onClick={async () => {
              if (!newProblem.trim()) return;
              await saveProblem.mutateAsync({
                patient_id: patient.id,
                title: newProblem.trim(),
                sort_order: problems.length,
              });
              setNewProblem("");
            }}
          >
            <Plus className="size-3.5" /> Añadir
          </Btn>
        </div>

        <div className="mt-4 space-y-3">
          {problems.length === 0 && <Empty text="Sin problemas registrados." />}
          {problems.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <input
                  defaultValue={p.title}
                  onBlur={(e) =>
                    e.target.value !== p.title &&
                    saveProblem.mutate({ id: p.id, title: e.target.value })
                  }
                  className="w-full min-w-0 bg-transparent text-sm font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => delProblem.mutate(p.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Select
                  defaultValue={p.state}
                  onChange={(e) => saveProblem.mutate({ id: p.id, state: e.target.value })}
                >
                  {["nuevo", "en evolución", "controlado", "resuelto"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Select
                  defaultValue={p.trend}
                  onChange={(e) => saveProblem.mutate({ id: p.id, trend: e.target.value })}
                >
                  {["mejora", "estable", "empeora"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <Textarea
                className="mt-2 min-h-16"
                defaultValue={p.evidence ?? ""}
                placeholder="Evidencia clínica y de laboratorio"
                onBlur={(e) => saveProblem.mutate({ id: p.id, evidence: e.target.value })}
              />
            </div>
          ))}
        </div>
      </WardCard>

      <div className="space-y-5">
        <WardCard title="Plan clínico" icon={<Activity className="size-4" style={{ color: accent }} />}>
          <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
            <Select
              value={newPlan.category}
              onChange={(e) => setNewPlan((p) => ({ ...p, category: e.target.value }))}
            >
              {PLAN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input
              value={newPlan.content}
              placeholder="Indicación / conducta"
              onChange={(e) => setNewPlan((p) => ({ ...p, content: e.target.value }))}
            />
            <Btn
              variant="solid"
              accent={accent}
              loading={savePlan.isPending}
              onClick={async () => {
                if (!newPlan.content.trim()) return;
                await savePlan.mutateAsync({
                  patient_id: patient.id,
                  category: newPlan.category,
                  content: newPlan.content.trim(),
                  sort_order: plan.length,
                });
                setNewPlan({ category: newPlan.category, content: "" });
              }}
            >
              <Plus className="size-3.5" />
            </Btn>
          </div>
          <div className="mt-4 space-y-2">
            {plan.length === 0 && <Empty text="Sin indicaciones registradas." />}
            {plan.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={item.status === "cumplido"}
                  onChange={(e) =>
                    savePlan.mutate({
                      id: item.id,
                      status: e.target.checked ? "cumplido" : "pendiente",
                    })
                  }
                  className="size-4 shrink-0 accent-primary"
                />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {PLAN_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}
                  </div>
                  <div
                    className={`truncate text-sm ${item.status === "cumplido" ? "line-through opacity-60" : ""}`}
                  >
                    {item.content}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => delPlan.mutate(item.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </WardCard>

        <WardCard title="Pendientes del paciente">
          <div className="flex flex-wrap gap-2">
            <Input
              className="flex-1"
              value={newTask}
              placeholder="Pendiente (ej. Recoger resultado de hemograma)"
              onChange={(e) => setNewTask(e.target.value)}
            />
            <Btn
              variant="solid"
              accent={accent}
              loading={saveTask.isPending}
              onClick={async () => {
                if (!newTask.trim()) return;
                await saveTask.mutateAsync({ patient_id: patient.id, title: newTask.trim() });
                setNewTask("");
              }}
            >
              <Plus className="size-3.5" />
            </Btn>
          </div>
          <div className="mt-4 space-y-2">
            {myTasks.length === 0 && <Empty text="Sin pendientes." />}
            {myTasks.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={t.status === "hecho"}
                  onChange={(e) =>
                    saveTask.mutate({
                      id: t.id,
                      status: e.target.checked ? "hecho" : "pendiente",
                      done_at: e.target.checked ? new Date().toISOString() : null,
                    })
                  }
                  className="size-4 shrink-0 accent-primary"
                />
                <span className={`truncate text-sm ${t.status === "hecho" ? "line-through opacity-60" : ""}`}>
                  {t.title}
                </span>
                <button
                  type="button"
                  onClick={() => delTask.mutate(t.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </WardCard>
      </div>
    </div>
  );
}

/* ───────────────────────────── Línea de tiempo ──────────────────────────── */

function Timeline({ patient, accent }: { patient: WardPatient; accent: string }) {
  const { data: evolutions = [] } = useEvolutions(patient.id);
  return (
    <WardCard
      title="Línea de tiempo de hospitalización"
      subtitle={`Ingreso ${patient.admitted_at} · día ${hospitalDay(patient.admitted_at)}`}
      icon={<CalendarDays className="size-4" style={{ color: accent }} />}
    >
      {evolutions.length === 0 ? (
        <Empty text="Aún no hay evoluciones registradas." />
      ) : (
        <ol className="relative space-y-4 border-l border-border/60 pl-5">
          {evolutions.map((e) => (
            <TimelineItem key={e.id} evolution={e} accent={accent} />
          ))}
        </ol>
      )}
    </WardCard>
  );
}

function TimelineItem({ evolution, accent }: { evolution: WardEvolution; accent: string }) {
  const vitals = useMemo(
    () =>
      ["fc", "fr", "t", "sato2", "pa", "peso"]
        .map((key) => (evolution.objective?.[key] ? `${key.toUpperCase()} ${evolution.objective[key]}` : null))
        .filter(Boolean) as string[],
    [evolution.objective],
  );
  return (
    <li className="relative">
      <span
        className="absolute -left-[26px] top-1.5 size-2.5 rounded-full"
        style={{ background: accent }}
      />
      <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black">{evolution.evo_date}</span>
          <Chip accent={accent}>día {evolution.hosp_day ?? "—"}</Chip>
          <Chip>{evolution.status}</Chip>
        </div>
        {vitals.length > 0 && (
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{vitals.join(" · ")}</p>
        )}
        {evolution.analysis && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{evolution.analysis}</p>
        )}
        {evolution.plan_note && (
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
            <strong className="font-bold">Plan:</strong> {evolution.plan_note}
          </p>
        )}
      </div>
    </li>
  );
}

/* ───────────────────────────── Ruta de estudio ──────────────────────────── */

export function StudyRoute({ patient, accent }: { patient: WardPatient; accent: string }) {
  const { data: links = [] } = useStudyLinks();
  const keys = useMemo(
    () => dxKeysFor(`${patient.main_dx ?? ""} ${patient.secondary_dx.join(" ")} ${patient.reason ?? ""}`),
    [patient],
  );
  const matches = links.filter((l) => keys.includes(l.dx_key));

  return (
    <WardCard
      title="Ruta de estudio sugerida"
      subtitle="Generada a partir de los diagnósticos activos de este paciente."
      icon={<BookOpen className="size-4" style={{ color: accent }} />}
    >
      {matches.length === 0 ? (
        <Empty text="Registra el diagnóstico principal para recibir una ruta de estudio sugerida." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((l) => (
            <li key={l.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                {l.dx_key}
              </div>
              <div className="mt-1 text-sm font-bold">{l.topic}</div>
              {l.summary && (
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{l.summary}</p>
              )}
              {l.url && (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-[11px] font-bold text-primary hover:underline"
                >
                  Abrir recurso →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground">
        Estado del paciente: {(PATIENT_STATUS[patient.status] ?? PATIENT_STATUS.estable).label}. Prioriza
        los temas de los problemas que aún están en evolución.
      </p>
    </WardCard>
  );
}
