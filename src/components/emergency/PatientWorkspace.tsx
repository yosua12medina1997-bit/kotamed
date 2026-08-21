/**
 * Workspace clínico del PACIENTE ACTIVO de Emergencia Pediátrica:
 * resumen, evaluación inicial ABCDE, historia, evoluciones, reevaluaciones,
 * exámenes auxiliares, tratamiento, balance hídrico, interconsultas,
 * procedimientos, calculadora pediátrica y destino del paciente.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Calculator,
  Check,
  Clock,
  Droplets,
  FlaskConical,
  Pencil,
  Plus,
  Repeat2,
  Syringe,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Btn, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { CalculatorsModule } from "@/components/hospital/modules/CalculatorsModule";
import {
  ABCDE_ITEMS,
  ABCDE_STATES,
  DISPOSITIONS,
  EMERG_KEYS,
  EMERG_STATUS,
  EXAM_CATEGORIES,
  EXAM_FLAGS,
  EXAM_STATES,
  RECHECK_OPTIONS,
  VITALS,
  elapsed,
  fmtDateTime,
  fmtHour,
  logEmergEvent,
  patientLabel,
  useEmergBalance,
  useEmergCalcs,
  useEmergConsults,
  useEmergDelete,
  useEmergEvents,
  useEmergEvolutions,
  useEmergExams,
  useEmergProcedures,
  useEmergSave,
  useEmergTreatments,
  useReassessments,
  type EmergPatient,
  type EmergStatus,
} from "@/lib/emergency-os";
import { EmergCard, EmergPill, Row, SoftBadge } from "./ui";

export interface WsCtx {
  patient: EmergPatient;
  accent: string;
  canEdit: boolean;
}

function ReadOnly({ canEdit }: { canEdit: boolean }) {
  if (canEdit) return null;
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[12.5px] font-semibold text-amber-700 dark:text-amber-300">
      Este box está asignado a otro interno: puedes consultar la información en modo lectura.
    </div>
  );
}

/* ─────────────────────────────── Resumen ─────────────────────────────── */

export function Resumen({ patient, accent, canEdit }: WsCtx) {
  const { data: events = [] } = useEmergEvents(patient.id);
  const { data: reassess = [] } = useReassessments(patient.id);
  const save = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const last = reassess[0];

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <div className="grid gap-5 lg:grid-cols-2">
        <EmergCard title="Situación actual" subtitle="Panorama inmediato del paciente activo.">
          <div className="space-y-1.5">
            <Row label="Motivo" value={patient.reason ?? "—"} />
            <Row label="Dx principal" value={patient.main_dx ?? "—"} />
            <Row label="Ingreso" value={fmtHour(patient.admitted_at)} />
            <Row label="Tiempo en emergencia" value={elapsed(patient.admitted_at)} />
            <Row label="Estado general" value={patient.general_state ?? "—"} />
            <Row
              label="Última reevaluación"
              value={last ? `${fmtHour(last.at)} · ${last.state ?? "—"}` : "Sin reevaluaciones"}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {patient.problems.map((p) => (
              <SoftBadge key={p} color={accent}>
                {p}
              </SoftBadge>
            ))}
          </div>
        </EmergCard>

        <EmergCard
          title="Programar reevaluación"
          subtitle="Ayuda al seguimiento sin alertas agresivas."
        >
          <div className="flex flex-wrap gap-2">
            {RECHECK_OPTIONS.map((o) => (
              <Btn
                key={o.minutes}
                variant="outline"
                accent={accent}
                disabled={!canEdit}
                onClick={() =>
                  save.mutate(
                    {
                      id: patient.id,
                      next_recheck_at: new Date(Date.now() + o.minutes * 60_000).toISOString(),
                    },
                    { onSuccess: () => toast.success(`Reevaluación programada en ${o.label}`) },
                  )
                }
              >
                <Clock className="size-3.5" /> {o.label}
              </Btn>
            ))}
          </div>
          <div className="mt-3 text-[12px] text-muted-foreground">
            {patient.next_recheck_at
              ? `Próxima reevaluación: ${fmtDateTime(patient.next_recheck_at)}`
              : "Sin reevaluación programada."}
          </div>
        </EmergCard>
      </div>

      <EmergCard title="Línea de tiempo de emergencia" subtitle="Todo lo ocurrido desde el ingreso.">
        {events.length === 0 ? (
          <Empty text="Aún no hay eventos registrados." />
        ) : (
          <ol className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                <span className="text-[11.5px] font-black text-muted-foreground">
                  {fmtHour(e.at)}
                </span>
                <div className="min-w-0 border-l border-border/60 pb-1 pl-3">
                  <div className="text-[12.5px] font-bold">{e.title}</div>
                  {e.detail && (
                    <div className="text-[11.5px] text-muted-foreground">{e.detail}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </EmergCard>
    </div>
  );
}

/* ────────────────────────── Evaluación inicial ───────────────────────── */

export function EvaluacionInicial({ patient, accent, canEdit }: WsCtx) {
  const save = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const [initial, setInitial] = useState<Record<string, string>>(patient.initial ?? {});
  const [abcde, setAbcde] = useState<Record<string, { state?: string; note?: string }>>(
    patient.abcde ?? {},
  );
  const [general, setGeneral] = useState(patient.general_state ?? "");

  useEffect(() => {
    setInitial(patient.initial ?? {});
    setAbcde(patient.abcde ?? {});
    setGeneral(patient.general_state ?? "");
  }, [patient.id, patient.initial, patient.abcde, patient.general_state]);

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard title="Primer contacto" subtitle="Motivo, hora de inicio e historia breve.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Motivo de consulta">
            <Input
              value={initial.motivo ?? patient.reason ?? ""}
              disabled={!canEdit}
              onChange={(e) => setInitial({ ...initial, motivo: e.target.value })}
            />
          </Field>
          <Field label="Hora de inicio de síntomas">
            <Input
              value={initial.inicio ?? ""}
              disabled={!canEdit}
              onChange={(e) => setInitial({ ...initial, inicio: e.target.value })}
              placeholder="Hace 6 horas"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Historia breve">
            <Textarea
              rows={3}
              value={initial.historia ?? ""}
              disabled={!canEdit}
              onChange={(e) => setInitial({ ...initial, historia: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-3">
          <div className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Estado general
          </div>
          <div className="flex flex-wrap gap-2">
            {["Estable", "Inestable", "Crítico"].map((s) => (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                onClick={() => setGeneral(s)}
                className="rounded-xl border px-3 py-1.5 text-[11.5px] font-bold transition"
                style={
                  general === s ? { borderColor: accent, background: `${accent}12`, color: accent } : undefined
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </EmergCard>

      <EmergCard title="ABCDE" subtitle="Evaluación estructurada por componentes.">
        <div className="grid gap-3 md:grid-cols-2">
          {ABCDE_ITEMS.map((item) => {
            const val = abcde[item.key] ?? {};
            return (
              <div key={item.key} className="rounded-2xl border border-border/50 bg-background/50 p-3">
                <div className="text-[12.5px] font-black">{item.label}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ABCDE_STATES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setAbcde({ ...abcde, [item.key]: { ...val, state: s.value } })}
                      className="rounded-lg border px-2 py-1 text-[10.5px] font-bold transition"
                      style={
                        val.state === s.value
                          ? { borderColor: s.color, background: `${s.color}14`, color: s.color }
                          : undefined
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={2}
                  className="mt-2"
                  disabled={!canEdit}
                  value={val.note ?? ""}
                  onChange={(e) => setAbcde({ ...abcde, [item.key]: { ...val, note: e.target.value } })}
                  placeholder="Observación breve"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Btn
            variant="solid"
            accent={accent}
            disabled={!canEdit}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({
                id: patient.id,
                initial,
                abcde,
                general_state: general || null,
              });
              await logEmergEvent({
                patient_id: patient.id,
                kind: "evaluacion",
                title: "Evaluación inicial",
                detail: general ? `Estado general: ${general}` : null,
              });
              toast.success("Evaluación guardada");
            }}
          >
            <Check className="size-3.5" /> Guardar evaluación
          </Btn>
          <Btn
            variant="outline"
            accent={accent}
            disabled={!canEdit}
            onClick={async () => {
              const found = ABCDE_ITEMS.filter((i) => (abcde[i.key]?.state ?? "normal") !== "normal").map(
                (i) => `${i.label}: ${abcde[i.key]?.state}`,
              );
              if (found.length === 0) {
                toast.info("No hay hallazgos alterados que convertir.");
                return;
              }
              await save.mutateAsync({
                id: patient.id,
                problems: Array.from(new Set([...(patient.problems ?? []), ...found])),
              });
              toast.success("Hallazgos convertidos en problemas activos");
            }}
          >
            <Plus className="size-3.5" /> Convertir hallazgos en problemas
          </Btn>
        </div>
      </EmergCard>
    </div>
  );
}

/* ─────────────────────────── Historia clínica ────────────────────────── */

export function HistoriaClinica({ patient, accent, canEdit }: WsCtx) {
  const save = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const [form, setForm] = useState({
    initials: patient.initials ?? "",
    age_label: patient.age_label ?? "",
    sex: patient.sex ?? "",
    weight_kg: patient.weight_kg?.toString() ?? "",
    main_dx: patient.main_dx ?? "",
    reason: patient.reason ?? "",
    notes: patient.notes ?? "",
  });

  useEffect(() => {
    setForm({
      initials: patient.initials ?? "",
      age_label: patient.age_label ?? "",
      sex: patient.sex ?? "",
      weight_kg: patient.weight_kg?.toString() ?? "",
      main_dx: patient.main_dx ?? "",
      reason: patient.reason ?? "",
      notes: patient.notes ?? "",
    });
  }, [patient.id]);

  return (
    <EmergCard title="Historia clínica de emergencia" subtitle="Identificación y enfermedad actual.">
      <ReadOnly canEdit={canEdit} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Iniciales">
          <Input
            value={form.initials}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
          />
        </Field>
        <Field label="Edad">
          <Input
            value={form.age_label}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, age_label: e.target.value })}
          />
        </Field>
        <Field label="Sexo">
          <Select
            value={form.sex}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, sex: e.target.value })}
          >
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </Select>
        </Field>
        <Field label="Peso (kg)">
          <Input
            value={form.weight_kg}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          />
        </Field>
        <Field label="Diagnóstico principal">
          <Input
            value={form.main_dx}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, main_dx: e.target.value })}
          />
        </Field>
        <Field label="Motivo de atención">
          <Input
            value={form.reason}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notas / antecedentes">
          <Textarea
            rows={3}
            value={form.notes}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Btn
          variant="solid"
          accent={accent}
          disabled={!canEdit}
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              {
                id: patient.id,
                ...form,
                weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
              },
              { onSuccess: () => toast.success("Historia actualizada") },
            )
          }
        >
          <Check className="size-3.5" /> Guardar
        </Btn>
      </div>
    </EmergCard>
  );
}

/* ────────────────────────────── Evoluciones ──────────────────────────── */

export function Evoluciones({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useEmergEvolutions(patient.id);
  const save = useEmergSave("emerg_evolutions", [EMERG_KEYS.evolutions(patient.id)]);
  const savePatient = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const saveTask = useEmergSave("emerg_tasks", [EMERG_KEYS.tasks]);
  const [draft, setDraft] = useState({ subjective: "", objective: "", analysis: "", plan_note: "" });

  async function submit(status: "borrador" | "firmada") {
    const id = await save.mutateAsync({ patient_id: patient.id, ...draft, status });
    if (!id) return;
    if (status === "firmada") {
      await logEmergEvent({
        patient_id: patient.id,
        kind: "evolucion",
        title: "Evolución firmada",
        detail: draft.analysis || draft.plan_note || null,
      });
      setDraft({ subjective: "", objective: "", analysis: "", plan_note: "" });
    }
    toast.success(status === "firmada" ? "Evolución firmada" : "Borrador guardado");
  }

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard title="Nueva evolución (SOAP de emergencia)" icon={<Pencil className="size-4" style={{ color: accent }} />}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="S · Cambios clínicos referidos">
            <Textarea rows={4} disabled={!canEdit} value={draft.subjective} onChange={(e) => setDraft({ ...draft, subjective: e.target.value })} />
          </Field>
          <Field label="O · Signos vitales, examen y resultados">
            <Textarea rows={4} disabled={!canEdit} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} />
          </Field>
          <Field label="A · Análisis y respuesta">
            <Textarea rows={4} disabled={!canEdit} value={draft.analysis} onChange={(e) => setDraft({ ...draft, analysis: e.target.value })} />
          </Field>
          <Field label="P · Plan, tratamiento y destino">
            <Textarea rows={4} disabled={!canEdit} value={draft.plan_note} onChange={(e) => setDraft({ ...draft, plan_note: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="outline" disabled={!canEdit} onClick={() => void submit("borrador")}>
            Guardar borrador
          </Btn>
          <Btn variant="solid" accent={accent} disabled={!canEdit} loading={save.isPending} onClick={() => void submit("firmada")}>
            <Check className="size-3.5" /> Guardar evolución
          </Btn>
          <Btn
            variant="outline"
            disabled={!canEdit || !draft.plan_note.trim()}
            onClick={() =>
              saveTask.mutate(
                { patient_id: patient.id, title: draft.plan_note.trim().slice(0, 120), priority: "media" },
                { onSuccess: () => toast.success("Pendiente creado") },
              )
            }
          >
            <Plus className="size-3.5" /> Crear pendiente
          </Btn>
          <Btn
            variant="outline"
            disabled={!canEdit}
            onClick={() =>
              savePatient.mutate(
                { id: patient.id, next_recheck_at: new Date(Date.now() + 30 * 60_000).toISOString() },
                { onSuccess: () => toast.success("Reevaluación programada en 30 min") },
              )
            }
          >
            <Clock className="size-3.5" /> Programar reevaluación
          </Btn>
        </div>
      </EmergCard>

      <EmergCard title="Evoluciones registradas">
        {rows.length === 0 ? (
          <Empty text="Sin evoluciones registradas." />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border/50 bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-black">{fmtDateTime(r.at)}</span>
                  <SoftBadge color={r.status === "firmada" ? "#16a34a" : "#94a3b8"}>{r.status}</SoftBadge>
                </div>
                <div className="mt-2 grid gap-1 text-[12px]">
                  {r.subjective && <p><b>S:</b> {r.subjective}</p>}
                  {r.objective && <p><b>O:</b> {r.objective}</p>}
                  {r.analysis && <p><b>A:</b> {r.analysis}</p>}
                  {r.plan_note && <p><b>P:</b> {r.plan_note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </EmergCard>
    </div>
  );
}

/* ───────────────────────────── Reevaluaciones ────────────────────────── */

export function Reevaluaciones({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useReassessments(patient.id);
  const save = useEmergSave("emerg_reassessments", [EMERG_KEYS.reassessments(patient.id)]);
  const savePatient = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ state: "", response: "", findings: "", conduct: "" });

  const prev = rows[0];

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard
        title="Nueva reevaluación"
        subtitle="Signos vitales, respuesta al tratamiento y conducta."
        icon={<Repeat2 className="size-4" style={{ color: accent }} />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {VITALS.map((v) => (
            <Field key={v.key} label={v.label}>
              <Input
                disabled={!canEdit}
                value={vitals[v.key] ?? ""}
                onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                placeholder={prev?.vitals?.[v.key] ? `Previo: ${prev.vitals[v.key]}` : ""}
              />
            </Field>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Estado clínico">
            <Input disabled={!canEdit} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Mejoría clínica" />
          </Field>
          <Field label="Respuesta al tratamiento">
            <Input disabled={!canEdit} value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} />
          </Field>
          <Field label="Nuevos hallazgos">
            <Textarea rows={2} disabled={!canEdit} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
          </Field>
          <Field label="Conducta">
            <Textarea rows={2} disabled={!canEdit} value={form.conduct} onChange={(e) => setForm({ ...form, conduct: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn
            variant="solid"
            accent={accent}
            disabled={!canEdit}
            loading={save.isPending}
            onClick={async () => {
              const id = await save.mutateAsync({ patient_id: patient.id, vitals, ...form });
              if (!id) return;
              const delta = VITALS.filter((v) => vitals[v.key])
                .map((v) => `${v.label.split(" ")[0]}: ${prev?.vitals?.[v.key] ? `${prev.vitals[v.key]} → ` : ""}${vitals[v.key]}`)
                .join(" · ");
              await logEmergEvent({
                patient_id: patient.id,
                kind: "reevaluacion",
                title: "Reevaluación",
                detail: delta || form.state || null,
              });
              await savePatient.mutateAsync({ id: patient.id, next_recheck_at: null });
              setVitals({});
              setForm({ state: "", response: "", findings: "", conduct: "" });
              toast.success("Reevaluación registrada");
            }}
          >
            <Plus className="size-3.5" /> Nueva reevaluación
          </Btn>
        </div>
      </EmergCard>

      <EmergCard title="Timeline de reevaluaciones">
        {rows.length === 0 ? (
          <Empty text="Sin reevaluaciones registradas." />
        ) : (
          <ol className="space-y-3">
            {rows.map((r, i) => {
              const before = rows[i + 1];
              return (
                <li key={r.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                  <span className="text-[11.5px] font-black text-muted-foreground">{fmtHour(r.at)}</span>
                  <div className="min-w-0 border-l border-border/60 pl-3">
                    <div className="text-[12.5px] font-bold">{r.state || "Reevaluación"}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {VITALS.filter((v) => r.vitals?.[v.key]).map((v) => (
                        <SoftBadge key={v.key} color={accent}>
                          {v.label.split(" ")[0]}: {before?.vitals?.[v.key] ? `${before.vitals[v.key]} → ` : ""}
                          {r.vitals[v.key]}
                        </SoftBadge>
                      ))}
                    </div>
                    {r.response && <p className="mt-1 text-[11.5px] text-muted-foreground">Respuesta: {r.response}</p>}
                    {r.conduct && <p className="text-[11.5px] text-muted-foreground">Conducta: {r.conduct}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </EmergCard>
    </div>
  );
}

/* ─────────────────────────── Exámenes auxiliares ─────────────────────── */

export function Examenes({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useEmergExams(patient.id);
  const save = useEmergSave("emerg_exams", [EMERG_KEYS.exams(patient.id)]);
  const del = useEmergDelete("emerg_exams", [EMERG_KEYS.exams(patient.id)]);
  const [form, setForm] = useState({ name: "", category: "laboratorio", priority: "rutina" });

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard
        title="Solicitar examen"
        icon={<FlaskConical className="size-4" style={{ color: accent }} />}
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Examen">
            <Input disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hemograma" />
          </Field>
          <Field label="Categoría">
            <Select disabled={!canEdit} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXAM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select disabled={!canEdit} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="rutina">Rutina</option>
              <option value="urgente">Urgente</option>
              <option value="critica">Crítica</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!canEdit || !form.name.trim()}
              loading={save.isPending}
              onClick={async () => {
                await save.mutateAsync({ patient_id: patient.id, ...form });
                await logEmergEvent({ patient_id: patient.id, kind: "examen", title: `Examen solicitado: ${form.name}` });
                setForm({ name: "", category: "laboratorio", priority: "rutina" });
              }}
            >
              <Plus className="size-3.5" /> Solicitar
            </Btn>
          </div>
        </div>
      </EmergCard>

      <EmergCard title="Exámenes del paciente">
        {rows.length === 0 ? (
          <Empty text="Sin exámenes registrados." />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const flag = EXAM_FLAGS.find((f) => f.value === r.flag) ?? EXAM_FLAGS[0];
              return (
                <li key={r.id} className="rounded-2xl border border-border/50 bg-background/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-black">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.category} · {r.priority} · {fmtDateTime(r.requested_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.status === "disponible" && <SoftBadge color={accent}>Nuevo resultado</SoftBadge>}
                      <SoftBadge color={flag.color}>{flag.label}</SoftBadge>
                      <button type="button" disabled={!canEdit} onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[160px_160px_minmax(0,1fr)]">
                    <Select
                      disabled={!canEdit}
                      value={r.status}
                      onChange={(e) => save.mutate({ id: r.id, status: e.target.value })}
                    >
                      {EXAM_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                    <Select
                      disabled={!canEdit}
                      value={r.flag}
                      onChange={(e) => save.mutate({ id: r.id, flag: e.target.value })}
                    >
                      {EXAM_FLAGS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </Select>
                    <Input
                      disabled={!canEdit}
                      defaultValue={r.result ?? ""}
                      placeholder="Resultado"
                      onBlur={(e) => {
                        if (e.target.value !== (r.result ?? "")) save.mutate({ id: r.id, result: e.target.value });
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </EmergCard>
    </div>
  );
}

/* ───────────────────────────── Tratamiento ───────────────────────────── */

export function Tratamiento({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useEmergTreatments(patient.id);
  const save = useEmergSave("emerg_treatments", [EMERG_KEYS.treatments(patient.id)]);
  const del = useEmergDelete("emerg_treatments", [EMERG_KEYS.treatments(patient.id)]);
  const [form, setForm] = useState({ drug: "", dose: "", route: "" });

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard title="Tratamiento activo" icon={<Syringe className="size-4" style={{ color: accent }} />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Medicamento">
            <Input disabled={!canEdit} value={form.drug} onChange={(e) => setForm({ ...form, drug: e.target.value })} placeholder="Salbutamol" />
          </Field>
          <Field label="Dosis">
            <Input disabled={!canEdit} value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="2 puff" />
          </Field>
          <Field label="Vía">
            <Input disabled={!canEdit} value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="Inhalatorio" />
          </Field>
          <div className="flex items-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!canEdit || !form.drug.trim()}
              loading={save.isPending}
              onClick={async () => {
                await save.mutateAsync({ patient_id: patient.id, ...form });
                await logEmergEvent({
                  patient_id: patient.id,
                  kind: "tratamiento",
                  title: `Indicado: ${form.drug}`,
                  detail: [form.dose, form.route].filter(Boolean).join(" · ") || null,
                });
                setForm({ drug: "", dose: "", route: "" });
              }}
            >
              <Plus className="size-3.5" /> Añadir
            </Btn>
          </div>
        </div>

        <div className="mt-4">
          {rows.length === 0 ? (
            <Empty text="Sin tratamientos registrados." />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 bg-background/50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-black uppercase">{r.drug}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {[r.dose, r.route, fmtHour(r.at)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === "administrado" ? (
                      <SoftBadge color="#16a34a">✓ Administrado</SoftBadge>
                    ) : (
                      <Btn
                        variant="outline"
                        disabled={!canEdit}
                        onClick={async () => {
                          await save.mutateAsync({ id: r.id, status: "administrado" });
                          await logEmergEvent({ patient_id: patient.id, kind: "tratamiento", title: `Administrado: ${r.drug}` });
                        }}
                      >
                        Registrar administración
                      </Btn>
                    )}
                    <button type="button" disabled={!canEdit} onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EmergCard>
    </div>
  );
}

/* ─────────────────────────── Balance hídrico ─────────────────────────── */

const BALANCE_RANGES = [
  { key: "1h", label: "Última hora", hours: 1 },
  { key: "6h", label: "Últimas 6 horas", hours: 6 },
  { key: "turno", label: "Turno", hours: 12 },
  { key: "ingreso", label: "Desde ingreso", hours: 0 },
] as const;

export function BalanceHidrico({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useEmergBalance(patient.id);
  const save = useEmergSave("emerg_balance", [EMERG_KEYS.balance(patient.id)]);
  const del = useEmergDelete("emerg_balance", [EMERG_KEYS.balance(patient.id)]);
  const [range, setRange] = useState<(typeof BALANCE_RANGES)[number]["key"]>("6h");
  const [form, setForm] = useState({ kind: "ingreso", label: "", volume_ml: "" });

  const since = useMemo(() => {
    const r = BALANCE_RANGES.find((x) => x.key === range)!;
    return r.hours === 0 ? new Date(patient.admitted_at).getTime() : Date.now() - r.hours * 3_600_000;
  }, [range, patient.admitted_at]);

  const inRange = rows.filter((r) => new Date(r.at).getTime() >= since);
  const ing = inRange.filter((r) => r.kind === "ingreso").reduce((s, r) => s + Number(r.volume_ml), 0);
  const egr = inRange.filter((r) => r.kind !== "ingreso").reduce((s, r) => s + Number(r.volume_ml), 0);
  const diuresis = inRange.filter((r) => r.kind === "diuresis").reduce((s, r) => s + Number(r.volume_ml), 0);

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard
        title="Balance hídrico"
        icon={<Droplets className="size-4" style={{ color: accent }} />}
        actions={
          <Select value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
            {BALANCE_RANGES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </Select>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Ingresos", `${ing} ml`, "#0ea5e9"],
            ["Egresos", `${egr} ml`, "#f59e0b"],
            ["Balance", `${ing - egr} ml`, accent],
            ["Diuresis", `${diuresis} ml`, "#14b8a6"],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-2xl border border-border/50 bg-background/50 p-3">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{l}</div>
              <div className="mt-1 text-xl font-black" style={{ color: c as string }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Field label="Tipo">
            <Select disabled={!canEdit} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="diuresis">Diuresis</option>
            </Select>
          </Field>
          <Field label="Detalle">
            <Input disabled={!canEdit} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="ClNa 0.9%" />
          </Field>
          <Field label="Volumen (ml)">
            <Input disabled={!canEdit} inputMode="numeric" value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!canEdit || !form.volume_ml}
              onClick={async () => {
                await save.mutateAsync({ patient_id: patient.id, ...form, volume_ml: Number(form.volume_ml) });
                setForm({ kind: "ingreso", label: "", volume_ml: "" });
              }}
            >
              <Plus className="size-3.5" /> Registrar
            </Btn>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {inRange.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/40 px-3 py-1.5 text-[12px]">
              <span className="truncate">
                {fmtHour(r.at)} · {r.kind} · {r.label ?? "—"} · <b>{r.volume_ml} ml</b>
              </span>
              <button type="button" disabled={!canEdit} onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </EmergCard>
    </div>
  );
}

/* ──────────────────────────── Interconsultas ─────────────────────────── */

export function Interconsultas({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useEmergConsults(patient.id);
  const save = useEmergSave("emerg_consults", [EMERG_KEYS.consults(patient.id)]);
  const [form, setForm] = useState({ specialty: "", priority: "rutina", question: "" });

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard title="Interconsultas" icon={<Users className="size-4" style={{ color: accent }} />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Especialidad">
            <Input disabled={!canEdit} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Neumología" />
          </Field>
          <Field label="Prioridad">
            <Select disabled={!canEdit} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="rutina">Rutina</option>
              <option value="urgente">Urgente</option>
            </Select>
          </Field>
          <Field label="Motivo / pregunta">
            <Input disabled={!canEdit} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!canEdit || !form.specialty.trim()}
              onClick={async () => {
                await save.mutateAsync({ patient_id: patient.id, ...form });
                await logEmergEvent({ patient_id: patient.id, kind: "interconsulta", title: `Interconsulta a ${form.specialty}` });
                setForm({ specialty: "", priority: "rutina", question: "" });
              }}
            >
              <Plus className="size-3.5" /> Solicitar
            </Btn>
          </div>
        </div>

        <div className="mt-4">
          {rows.length === 0 ? (
            <Empty text="Sin interconsultas." />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border/50 bg-background/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-black">{r.specialty}</div>
                    <div className="flex items-center gap-2">
                      <SoftBadge color={r.status === "respondida" ? "#16a34a" : r.priority === "urgente" ? "#f59e0b" : accent}>
                        {r.status}
                      </SoftBadge>
                      <span className="text-[11px] text-muted-foreground">{fmtHour(r.requested_at)}</span>
                    </div>
                  </div>
                  {r.question && <p className="mt-1 text-[12px] text-muted-foreground">{r.question}</p>}
                  <div className="mt-2 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <Select disabled={!canEdit} value={r.status} onChange={(e) => save.mutate({ id: r.id, status: e.target.value })}>
                      <option value="solicitada">Solicitada</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="respondida">Respondida</option>
                    </Select>
                    <Input
                      disabled={!canEdit}
                      defaultValue={r.answer ?? ""}
                      placeholder="Respuesta de la especialidad"
                      onBlur={(e) => {
                        if (e.target.value !== (r.answer ?? "")) save.mutate({ id: r.id, answer: e.target.value });
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EmergCard>
    </div>
  );
}

/* ───────────────────────────── Procedimientos ────────────────────────── */

export function Procedimientos({ patient, accent, canEdit }: WsCtx) {
  const { data: rows = [] } = useEmergProcedures(patient.id);
  const save = useEmergSave("emerg_procedures", [EMERG_KEYS.procedures(patient.id)]);
  const del = useEmergDelete("emerg_procedures", [EMERG_KEYS.procedures(patient.id)]);
  const [form, setForm] = useState({ name: "", operator: "", supervisor: "", result: "" });

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard title="Procedimientos" icon={<Activity className="size-4" style={{ color: accent }} />}>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Procedimiento">
            <Input disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Canalización periférica" />
          </Field>
          <Field label="Interno responsable">
            <Input disabled={!canEdit} value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} />
          </Field>
          <Field label="Supervisor">
            <Input disabled={!canEdit} value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} />
          </Field>
          <Field label="Resultado">
            <Input disabled={!canEdit} value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <Btn
            variant="solid"
            accent={accent}
            disabled={!canEdit || !form.name.trim()}
            onClick={async () => {
              await save.mutateAsync({ patient_id: patient.id, ...form });
              await logEmergEvent({ patient_id: patient.id, kind: "procedimiento", title: form.name });
              setForm({ name: "", operator: "", supervisor: "", result: "" });
            }}
          >
            <Plus className="size-3.5" /> Registrar procedimiento
          </Btn>
        </div>

        <div className="mt-4">
          {rows.length === 0 ? (
            <Empty text="Sin procedimientos registrados." />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 bg-background/50 px-3 py-2 text-[12px]">
                  <div className="min-w-0">
                    <div className="truncate font-black uppercase">{r.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {fmtDateTime(r.at)} · {r.status}
                      {r.operator ? ` · Interno: ${r.operator}` : ""}
                      {r.supervisor ? ` · Supervisor: ${r.supervisor}` : ""}
                    </div>
                  </div>
                  <button type="button" disabled={!canEdit} onClick={() => del.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EmergCard>
    </div>
  );
}

/* ──────────────────────── Calculadora pediátrica ─────────────────────── */

export function CalculadoraPediatrica({ patient, accent, canEdit }: WsCtx) {
  const { data: calcs = [] } = useEmergCalcs(patient.id);
  const save = useEmergSave("emerg_calcs", [EMERG_KEYS.calcs(patient.id)]);
  const del = useEmergDelete("emerg_calcs", [EMERG_KEYS.calcs(patient.id)]);
  const saveTreat = useEmergSave("emerg_treatments", [EMERG_KEYS.treatments(patient.id)]);
  const [tool, setTool] = useState("");
  const [result, setResult] = useState("");

  return (
    <div className="space-y-5">
      <EmergCard title="Contexto del paciente activo" icon={<Calculator className="size-4" style={{ color: accent }} />}>
        <div className="flex flex-wrap gap-2 text-[11.5px] font-bold">
          {[
            ["Paciente", patientLabel(patient)],
            ["Edad", patient.age_label ?? "—"],
            ["Peso", patient.weight_kg ? `${patient.weight_kg} kg` : "—"],
            ["Dx", patient.main_dx ?? "—"],
          ].map(([k, v]) => (
            <span key={k} className="rounded-xl border border-border/60 bg-background/60 px-2.5 py-1.5">
              <span className="text-muted-foreground">{k}: </span>
              {v}
            </span>
          ))}
        </div>
      </EmergCard>

      <CalculatorsModule accent={accent} />

      <EmergCard title="Guardar cálculo" subtitle="Queda registrado en el expediente de emergencia.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Herramienta / fórmula">
            <Input disabled={!canEdit} value={tool} onChange={(e) => setTool(e.target.value)} placeholder="Adrenalina 0.01 mg/kg" />
          </Field>
          <Field label="Resultado">
            <Input disabled={!canEdit} value={result} onChange={(e) => setResult(e.target.value)} placeholder="0.12 mg IV" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn
            variant="solid"
            accent={accent}
            disabled={!canEdit || !tool.trim() || !result.trim()}
            onClick={async () => {
              await save.mutateAsync({ patient_id: patient.id, tool: tool.trim(), result: result.trim(), weight_kg: patient.weight_kg });
              await logEmergEvent({ patient_id: patient.id, kind: "calculo", title: tool.trim(), detail: result.trim() });
              setTool("");
              setResult("");
            }}
          >
            <Plus className="size-3.5" /> Guardar
          </Btn>
          <Btn
            variant="outline"
            disabled={!canEdit || !tool.trim()}
            onClick={async () => {
              await saveTreat.mutateAsync({ patient_id: patient.id, drug: tool.trim(), dose: result.trim() });
              toast.success("Añadido a tratamiento");
            }}
          >
            Añadir a tratamiento
          </Btn>
          <Btn
            variant="outline"
            disabled={!result.trim()}
            onClick={() => {
              void navigator.clipboard?.writeText(`${tool}: ${result}`);
              toast.success("Copiado");
            }}
          >
            Copiar
          </Btn>
        </div>

        <ul className="mt-4 space-y-1.5">
          {calcs.map((c) => (
            <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/40 px-3 py-1.5 text-[12px]">
              <span className="truncate">
                <b>{c.tool}</b> · {c.result} · {fmtDateTime(c.created_at)}
              </span>
              <button type="button" disabled={!canEdit} onClick={() => del.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </EmergCard>
    </div>
  );
}

/* ─────────────────────────── Destino del paciente ────────────────────── */

export function DestinoPaciente({
  patient,
  accent,
  canEdit,
  onTransfer,
  onClosed,
}: WsCtx & { onTransfer: () => void; onClosed: () => void }) {
  const save = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const [disposition, setDisposition] = useState(patient.disposition ?? "");
  const [note, setNote] = useState(patient.disposition_note ?? "");

  return (
    <div className="space-y-5">
      <ReadOnly canEdit={canEdit} />
      <EmergCard title="Definir destino" subtitle="Cierre de la atención en Emergencia.">
        <div className="grid gap-2 sm:grid-cols-3">
          {DISPOSITIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={!canEdit}
              onClick={() => setDisposition(d.value)}
              className="rounded-2xl border px-3 py-2.5 text-left text-[12.5px] font-bold transition"
              style={disposition === d.value ? { borderColor: accent, background: `${accent}0d`, color: accent } : undefined}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Field label="Indicaciones / nota de destino">
            <Textarea rows={3} disabled={!canEdit} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {disposition === "hospitalizacion" ? (
            <Btn variant="solid" accent={accent} disabled={!canEdit} onClick={onTransfer}>
              Continuar a transferencia <ArrowRight className="size-3.5" />
            </Btn>
          ) : (
            <Btn
              variant="solid"
              accent={accent}
              disabled={!canEdit || !disposition}
              loading={save.isPending}
              onClick={async () => {
                const closes = disposition !== "observacion";
                await save.mutateAsync({
                  id: patient.id,
                  disposition,
                  disposition_note: note || null,
                  disposition_at: new Date().toISOString(),
                  discharged_at: closes ? new Date().toISOString() : null,
                });
                await logEmergEvent({
                  patient_id: patient.id,
                  kind: "destino",
                  title: `Destino: ${DISPOSITIONS.find((d) => d.value === disposition)?.label}`,
                  detail: note || null,
                });
                toast.success("Destino registrado");
                if (closes) onClosed();
              }}
            >
              <Check className="size-3.5" /> Registrar destino
            </Btn>
          )}
        </div>
      </EmergCard>
    </div>
  );
}

export function statusColor(s: EmergStatus) {
  return EMERG_STATUS[s]?.color ?? EMERG_STATUS.estable.color;
}

export function PatientHeaderPills({ patient }: { patient: EmergPatient }) {
  return <EmergPill status={patient.status} pulse />;
}
