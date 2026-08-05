/**
 * Expediente clínico neonatal (HIS/EMR educativo).
 * Pestañas dinámicas según la configuración del administrador:
 * datos generales, antecedentes maternos, examen físico, diagnósticos,
 * evoluciones, laboratorios, imágenes, medicación, procedimientos,
 * nutrición/balance, escalas, IA docente y traslado/alta.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Baby,
  Brain,
  ClipboardList,
  Droplets,
  FlaskConical,
  Image as ImageIcon,
  Loader2,
  Pill,
  Plus,
  Printer,
  Save,
  Scissors,
  Stethoscope,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/hospital/DynamicForm";
import { Btn, Chip, Empty, Field, Input, Metric, Select, Textarea } from "@/components/academy/ui";
import {
  DOWNES_ITEMS,
  NEO_STATUS,
  NEO_UNITS,
  SILVERMAN_ITEMS,
  calcBalance,
  calcDose,
  calcFeeding,
  calcNpt,
  dayOfLife,
  downesReading,
  fluidRequirement,
  getUnit,
  hdb,
  logAudit,
  scaleTotal,
  signedClinicalUrl,
  silvermanReading,
  uploadClinicalFile,
  useChildRows,
  type HospitalConfig,
  type NeoPatient,
} from "@/lib/neonatal-hospital";
import { neoEvolutionDraft, neoLabInterpretation, neoPlanSuggestion, neoSummary } from "@/lib/neonatal-ai.functions";

type TabId =
  | "resumen"
  | "general"
  | "maternal"
  | "exam"
  | "diagnosticos"
  | "evoluciones"
  | "labs"
  | "imagenes"
  | "medicacion"
  | "procedimientos"
  | "nutricion"
  | "escalas"
  | "ia"
  | "traslado";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "resumen", label: "Resumen", icon: ClipboardList },
  { id: "general", label: "Datos generales", icon: Baby },
  { id: "maternal", label: "Antecedentes maternos", icon: Stethoscope },
  { id: "exam", label: "Examen físico", icon: Activity },
  { id: "diagnosticos", label: "Diagnósticos", icon: ClipboardList },
  { id: "evoluciones", label: "Evoluciones", icon: ClipboardList },
  { id: "labs", label: "Laboratorios", icon: FlaskConical },
  { id: "imagenes", label: "Imágenes y archivos", icon: ImageIcon },
  { id: "medicacion", label: "Medicación", icon: Pill },
  { id: "procedimientos", label: "Procedimientos", icon: Scissors },
  { id: "nutricion", label: "Nutrición y balance", icon: Droplets },
  { id: "escalas", label: "Escalas y calculadoras", icon: Activity },
  { id: "ia", label: "IA docente", icon: Brain },
  { id: "traslado", label: "Traslado y alta", icon: Truck },
];

function fmt(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export function PatientChart({
  patient,
  config,
  accent,
  canEdit,
  onBack,
}: {
  patient: NeoPatient;
  config: HospitalConfig;
  accent: string;
  canEdit: boolean;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<TabId>("resumen");
  const qc = useQueryClient();
  const dol = dayOfLife(patient.fecha_nacimiento);
  const weight = Number(patient.peso_nacimiento ?? 0) / 1000 || Number(patient.peso_nacimiento ?? 0);

  const savePatient = useMutation({
    mutationFn: async (patch: Partial<NeoPatient>) => {
      const { error } = await hdb.from("neo_patients").update(patch).eq("id", patient.id);
      if (error) throw error;
      await logAudit({ patientId: patient.id, entity: "neo_patients", entityId: patient.id, action: "update", detail: { keys: Object.keys(patch) } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-patient", patient.id] });
      qc.invalidateQueries({ queryKey: ["neo-patients"] });
      toast.success("Expediente actualizado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  const chartText = useChartText(patient, config);

  return (
    <div className="space-y-5">
      <header className="glass rounded-3xl p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Btn onClick={onBack}>
            <ArrowLeft className="size-3" /> Pacientes
          </Btn>
          <div className="flex-1 min-w-[240px]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight">
                RN de {patient.apellidos || "—"} {patient.nombres ? `· ${patient.nombres}` : ""}
              </h2>
              <Chip accent={accent}>{getUnit(patient.unit).title}</Chip>
              <Chip>{patient.status}</Chip>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              HC {patient.hc || "s/n"} · {patient.edad_gestacional ?? "—"} sem ·{" "}
              {patient.peso_nacimiento ?? "—"} g · Día de vida {dol} · Ingreso {fmt(patient.fecha_ingreso)}
            </p>
            {patient.diagnostico_ingreso && (
              <p className="mt-1 text-sm text-foreground/80">Dx ingreso: {patient.diagnostico_ingreso}</p>
            )}
          </div>
          <Btn onClick={() => window.print()}>
            <Printer className="size-3" /> Imprimir / PDF
          </Btn>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                  active
                    ? "text-white"
                    : "border border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
                style={active ? { background: accent } : undefined}
              >
                <Icon className="size-3" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {tab === "resumen" && <ResumenTab patient={patient} accent={accent} dol={dol} />}

      {(tab === "general" || tab === "maternal" || tab === "exam") && (
        <SectionForm
          key={tab}
          groups={config[tab]}
          values={patient[tab] as Record<string, any>}
          accent={accent}
          canEdit={canEdit}
          onSave={(values) => savePatient.mutate({ [tab]: values } as any)}
          saving={savePatient.isPending}
        />
      )}

      {tab === "diagnosticos" && (
        <DiagnosesTab patient={patient} accent={accent} canEdit={canEdit} onSave={(d) => savePatient.mutate({ diagnoses: d } as any)} />
      )}

      {tab === "evoluciones" && (
        <EvolutionsTab patient={patient} config={config} accent={accent} canEdit={canEdit} chartText={chartText} />
      )}
      {tab === "labs" && <LabsTab patient={patient} config={config} accent={accent} canEdit={canEdit} />}
      {tab === "imagenes" && <MediaTab patient={patient} config={config} accent={accent} canEdit={canEdit} />}
      {tab === "medicacion" && <MedicationsTab patient={patient} accent={accent} canEdit={canEdit} weightKg={weight} />}
      {tab === "procedimientos" && <ProceduresTab patient={patient} accent={accent} canEdit={canEdit} />}
      {tab === "nutricion" && <NutritionTab patient={patient} accent={accent} canEdit={canEdit} weightKg={weight} dol={dol} />}
      {tab === "escalas" && (
        <ScalesTab patient={patient} accent={accent} canEdit={canEdit} onSave={(s) => savePatient.mutate({ scales: s } as any)} weightKg={weight} />
      )}
      {tab === "ia" && <AiTab patient={patient} accent={accent} chartText={chartText} canEdit={canEdit} onSaveSummary={(s) => savePatient.mutate({ ai_summary: s } as any)} />}
      {tab === "traslado" && <TransferTab patient={patient} accent={accent} canEdit={canEdit} />}
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

function Card({ title, accent, actions, children }: { title: string; accent: string; actions?: any; children: any }) {
  return (
    <section className="glass rounded-3xl p-5 md:p-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold tracking-tight" style={{ color: accent }}>
          {title}
        </h3>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function useChartText(patient: NeoPatient, config: HospitalConfig) {
  return useMemo(() => {
    const dump = (groups: typeof config.general, values: Record<string, any>) =>
      groups
        .map(
          (g) =>
            `${g.title}:\n` +
            g.fields
              .map((f) => {
                const v = values?.[f.key];
                if (v === undefined || v === null || v === "" || v === false) return null;
                return `- ${f.label}: ${v === true ? "sí" : v}${f.unit ? ` ${f.unit}` : ""}`;
              })
              .filter(Boolean)
              .join("\n"),
        )
        .join("\n");
    return [
      `Paciente: RN de ${patient.apellidos} ${patient.nombres}`,
      `Unidad: ${getUnit(patient.unit).title} | Estado: ${patient.status}`,
      `EG: ${patient.edad_gestacional ?? "—"} sem | Peso al nacer: ${patient.peso_nacimiento ?? "—"} g | Día de vida: ${dayOfLife(patient.fecha_nacimiento)}`,
      `Diagnóstico de ingreso: ${patient.diagnostico_ingreso ?? "—"}`,
      `Diagnósticos activos: ${(patient.diagnoses ?? []).map((d) => d.text).join("; ") || "—"}`,
      dump(config.general, patient.general),
      dump(config.maternal, patient.maternal),
      dump(config.exam, patient.exam),
    ].join("\n");
  }, [patient, config]);
}

/* ------------------------------ resumen ------------------------------ */

function ResumenTab({ patient, accent, dol }: { patient: NeoPatient; accent: string; dol: number }) {
  const { data: evolutions = [] } = useChildRows("neo_evolutions", patient.id, "day_number", false);
  const { data: labs = [] } = useChildRows("neo_labs", patient.id, "taken_at", false);
  const { data: meds = [] } = useChildRows("neo_medications", patient.id, "created_at", false);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Día de vida" value={dol} accent={accent} />
        <Metric label="Evoluciones" value={evolutions.length} accent={accent} />
        <Metric label="Laboratorios" value={labs.length} accent={accent} />
        <Metric label="Fármacos activos" value={meds.filter((m: any) => m.is_active).length} accent={accent} />
      </div>

      <Card title="Diagnósticos activos" accent={accent}>
        {(patient.diagnoses ?? []).length === 0 ? (
          <Empty text="Sin diagnósticos registrados." />
        ) : (
          <ul className="space-y-1.5 text-sm">
            {patient.diagnoses.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full" style={{ background: accent }} />
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {patient.ai_summary && (
        <Card title="Resumen clínico (IA docente)" accent={accent}>
          <p className="text-sm whitespace-pre-wrap text-foreground/85">{patient.ai_summary}</p>
        </Card>
      )}

      <Card title="Última evolución" accent={accent}>
        {evolutions.length === 0 ? (
          <Empty text="Aún no hay evoluciones." />
        ) : (
          <EvolutionBody row={evolutions[0]} />
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ formularios ------------------------------ */

function SectionForm({
  groups,
  values,
  accent,
  canEdit,
  onSave,
  saving,
}: {
  groups: HospitalConfig["general"];
  values: Record<string, any>;
  accent: string;
  canEdit: boolean;
  onSave: (v: Record<string, any>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, any>>(values ?? {});
  return (
    <Card
      title="Ficha"
      accent={accent}
      actions={
        canEdit && (
          <Btn variant="solid" accent={accent} loading={saving} onClick={() => onSave(draft)}>
            <Save className="size-3" /> Guardar
          </Btn>
        )
      }
    >
      <DynamicForm
        groups={groups}
        values={draft}
        accent={accent}
        disabled={!canEdit}
        onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
      />
    </Card>
  );
}

function DiagnosesTab({
  patient,
  accent,
  canEdit,
  onSave,
}: {
  patient: NeoPatient;
  accent: string;
  canEdit: boolean;
  onSave: (d: { text: string; kind?: string }[]) => void;
}) {
  const [list, setList] = useState(patient.diagnoses ?? []);
  const [text, setText] = useState("");
  return (
    <Card
      title="Diagnósticos"
      accent={accent}
      actions={
        canEdit && (
          <Btn variant="solid" accent={accent} onClick={() => onSave(list)}>
            <Save className="size-3" /> Guardar
          </Btn>
        )
      }
    >
      {canEdit && (
        <div className="flex gap-2">
          <Input
            value={text}
            placeholder="Ej. Sepsis neonatal temprana probable"
            onChange={(e) => setText(e.target.value)}
          />
          <Btn
            onClick={() => {
              if (!text.trim()) return;
              setList([...list, { text: text.trim() }]);
              setText("");
            }}
          >
            <Plus className="size-3" /> Agregar
          </Btn>
        </div>
      )}
      <ul className="mt-4 space-y-2">
        {list.length === 0 && <Empty text="Sin diagnósticos." />}
        {list.map((d, i) => (
          <li key={i} className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm">
            <span className="flex-1">{d.text}</span>
            {canEdit && (
              <Btn onClick={() => setList(list.filter((_, j) => j !== i))}>
                <Trash2 className="size-3" />
              </Btn>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------ evoluciones ------------------------------ */

function EvolutionBody({ row }: { row: any }) {
  const c = row?.content ?? {};
  const entries = Object.entries(c).filter(([, v]) => typeof v === "string" && v);
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-muted-foreground">
        Día {row.day_number} · {fmt(row.recorded_at)} · {row.author || "—"}
      </div>
      {Object.keys(row?.vitals ?? {}).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(row.vitals).map(([k, v]) => (
            <Chip key={k}>
              {k}: {String(v)}
            </Chip>
          ))}
        </div>
      )}
      {entries.map(([k, v]) => (
        <p key={k} className="text-sm whitespace-pre-wrap">
          <span className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">{k}</span>
          <br />
          {v as string}
        </p>
      ))}
    </div>
  );
}

function EvolutionsTab({
  patient,
  config,
  accent,
  canEdit,
  chartText,
}: {
  patient: NeoPatient;
  config: HospitalConfig;
  accent: string;
  canEdit: boolean;
  chartText: string;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_evolutions", patient.id, "day_number", false);
  const [format, setFormat] = useState("soap");
  const [day, setDay] = useState(dayOfLife(patient.fecha_nacimiento));
  const [vitals, setVitals] = useState({ FC: "", FR: "", "T°": "", "SatO2": "", Peso: "" });
  const [content, setContent] = useState<Record<string, string>>({ S: "", O: "", A: "", P: "" });
  const [notes, setNotes] = useState("");
  const [drafting, setDrafting] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      const { error } = await hdb.from("neo_evolutions").insert({
        patient_id: patient.id,
        day_number: day,
        format,
        vitals: Object.fromEntries(Object.entries(vitals).filter(([, v]) => v !== "")),
        content,
        author: auth.user?.email ?? null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({ patientId: patient.id, entity: "neo_evolutions", action: "insert" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_evolutions", patient.id] });
      setContent({ S: "", O: "", A: "", P: "" });
      setNotes("");
      toast.success("Evolución registrada.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await hdb.from("neo_evolutions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_evolutions", patient.id] }),
  });

  async function draftWithAi() {
    setDrafting(true);
    try {
      const out = await neoEvolutionDraft({ data: { chart: chartText, notes, format } });
      setContent({ S: out.s, O: out.o, A: out.a, P: out.p });
      toast.success("Borrador generado. Revísalo antes de guardar.");
    } catch (e: any) {
      toast.error(e?.message ?? "La IA no está disponible ahora.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <Card
          title="Nueva evolución"
          accent={accent}
          actions={
            <>
              <Btn onClick={draftWithAi} loading={drafting}>
                <Brain className="size-3" /> Redactar con IA
              </Btn>
              <Btn variant="solid" accent={accent} loading={create.isPending} onClick={() => create.mutate()}>
                <Save className="size-3" /> Guardar evolución
              </Btn>
            </>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Día de hospitalización">
              <Input type="number" value={day} onChange={(e) => setDay(Number(e.target.value))} />
            </Field>
            <Field label="Formato">
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                {config.templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </Field>
            {Object.keys(vitals).map((k) => (
              <Field key={k} label={k}>
                <Input
                  value={(vitals as any)[k]}
                  onChange={(e) => setVitals({ ...vitals, [k]: e.target.value })}
                />
              </Field>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(content).map((k) => (
              <Field key={k} label={k}>
                <Textarea value={content[k] ?? ""} onChange={(e) => setContent({ ...content, [k]: e.target.value })} />
              </Field>
            ))}
          </div>

          <div className="mt-3">
            <Field label="Notas crudas para la IA (opcional)">
              <Textarea
                value={notes}
                placeholder="Ej: RN tranquilo, tolera lactancia, ictericia zona II, sin distrés, glucosa 62..."
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </Card>
      )}

      <Card title={`Historial de evoluciones (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Aún no hay evoluciones registradas." />
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="flex justify-end">
                  {canEdit && (
                    <Btn onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="size-3" />
                    </Btn>
                  )}
                </div>
                <EvolutionBody row={r} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ laboratorios ------------------------------ */

function LabsTab({
  patient,
  config,
  accent,
  canEdit,
}: {
  patient: NeoPatient;
  config: HospitalConfig;
  accent: string;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_labs", patient.id, "taken_at", false);
  const [category, setCategory] = useState(config.labCategories[0] ?? "Otros");
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [interpreting, setInterpreting] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      let storage_path: string | null = null;
      let url: string | null = null;
      if (file) {
        const up = await uploadClinicalFile(patient.id, file);
        storage_path = up.path;
        url = up.url;
      }
      const results = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [k, ...rest] = l.split(":");
          return { item: (k ?? "").trim(), value: rest.join(":").trim() };
        });
      const { error } = await hdb.from("neo_labs").insert({
        patient_id: patient.id,
        category,
        name: name || category,
        results,
        storage_path,
        url,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({ patientId: patient.id, entity: "neo_labs", action: "insert" });
    },
    onSettled: () => setBusy(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_labs", patient.id] });
      setName("");
      setRaw("");
      setFile(null);
      toast.success("Laboratorio registrado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await hdb.from("neo_labs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_labs", patient.id] }),
  });

  const interpret = useMutation({
    mutationFn: async (row: any) => {
      setInterpreting(true);
      const labs = (row.results ?? []).map((r: any) => `${r.item}: ${r.value}`).join("\n");
      const out = await neoLabInterpretation({
        data: {
          context: `RN de ${patient.edad_gestacional ?? "—"} sem, ${patient.peso_nacimiento ?? "—"} g, día de vida ${dayOfLife(patient.fecha_nacimiento)}. Dx: ${patient.diagnostico_ingreso ?? "—"}`,
          labs: `${row.category} — ${row.name}\n${labs}`,
        },
      });
      const text = [
        out.interpretation,
        out.abnormal.map((a) => `• ${a.item}: ${a.comment}`).join("\n"),
        out.suggestions.map((s) => `→ ${s}`).join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n");
      const { error } = await hdb.from("neo_labs").update({ interpretation: text }).eq("id", row.id);
      if (error) throw error;
    },
    onSettled: () => setInterpreting(false),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_labs", patient.id] }),
    onError: (e: any) => toast.error(e?.message ?? "La IA no está disponible ahora."),
  });

  return (
    <div className="space-y-5">
      {canEdit && (
        <Card
          title="Registrar laboratorio"
          accent={accent}
          actions={
            <Btn variant="solid" accent={accent} loading={busy} onClick={() => create.mutate()}>
              <Save className="size-3" /> Guardar
            </Btn>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Categoría">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {config.labCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nombre del examen">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Hemograma completo" />
            </Field>
            <Field label="Archivo (PDF / imagen)">
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Resultados (una línea por parámetro: Nombre: valor)">
              <Textarea
                value={raw}
                placeholder={"Hb: 16.2 g/dL\nLeucocitos: 21 000\nPCR: 48 mg/L"}
                onChange={(e) => setRaw(e.target.value)}
              />
            </Field>
          </div>
        </Card>
      )}

      <Card title={`Resultados (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Sin laboratorios registrados." />
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip accent={accent}>{r.category}</Chip>
                  <span className="text-sm font-bold">{r.name}</span>
                  <span className="text-[11px] text-muted-foreground">{fmt(r.taken_at)}</span>
                  <div className="ml-auto flex gap-2">
                    {r.storage_path && <FileLink path={r.storage_path} />}
                    {canEdit && (
                      <>
                        <Btn loading={interpreting} onClick={() => interpret.mutate(r)}>
                          <Brain className="size-3" /> Interpretar
                        </Btn>
                        <Btn onClick={() => remove.mutate(r.id)}>
                          <Trash2 className="size-3" />
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
                {(r.results ?? []).length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {r.results.map((x: any, i: number) => (
                      <div key={i} className="rounded-xl border border-border/40 bg-background/50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{x.item}</div>
                        <div className="text-sm font-bold">{x.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {r.interpretation && (
                  <p className="mt-3 rounded-xl border border-border/40 bg-background/50 p-3 text-sm whitespace-pre-wrap">
                    {r.interpretation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FileLink({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Btn
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const url = await signedClinicalUrl(path);
        setLoading(false);
        if (url) window.open(url, "_blank", "noopener");
        else toast.error("No se pudo abrir el archivo.");
      }}
    >
      Ver archivo
    </Btn>
  );
}

/* ------------------------------ imágenes ------------------------------ */

function MediaTab({
  patient,
  config,
  accent,
  canEdit,
}: {
  patient: NeoPatient;
  config: HospitalConfig;
  accent: string;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_media", patient.id, "taken_at", false);
  const [kind, setKind] = useState(config.mediaKinds[0] ?? "Radiografía");
  const [title, setTitle] = useState("");
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecciona un archivo.");
      setBusy(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const up = await uploadClinicalFile(patient.id, file);
      const { error } = await hdb.from("neo_media").insert({
        patient_id: patient.id,
        kind,
        title: title || kind,
        storage_path: up.path,
        url: up.url,
        mime_type: up.mime,
        comments,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({ patientId: patient.id, entity: "neo_media", action: "insert" });
    },
    onSettled: () => setBusy(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_media", patient.id] });
      setTitle("");
      setComments("");
      setFile(null);
      toast.success("Archivo clínico agregado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo subir."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await hdb.from("neo_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_media", patient.id] }),
  });

  return (
    <div className="space-y-5">
      {canEdit && (
        <Card
          title="Subir imagen o informe"
          accent={accent}
          actions={
            <Btn variant="solid" accent={accent} loading={busy} onClick={() => create.mutate()}>
              <Save className="size-3" /> Subir
            </Btn>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Tipo">
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                {config.mediaKinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Título">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Rx tórax AP día 2" />
            </Field>
            <Field label="Archivo">
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Comentario docente">
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
            </Field>
          </div>
        </Card>
      )}

      <Card title={`Archivos clínicos (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Sin imágenes ni informes." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="flex items-center gap-2">
                  <Chip accent={accent}>{r.kind}</Chip>
                  <span className="text-sm font-bold">{r.title}</span>
                  <div className="ml-auto flex gap-2">
                    <FileLink path={r.storage_path} />
                    {canEdit && (
                      <Btn onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="size-3" />
                      </Btn>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{fmt(r.taken_at)}</div>
                {r.comments && <p className="mt-2 text-sm">{r.comments}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ medicación ------------------------------ */

function MedicationsTab({
  patient,
  accent,
  canEdit,
  weightKg,
}: {
  patient: NeoPatient;
  accent: string;
  canEdit: boolean;
  weightKg: number;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_medications", patient.id, "created_at", false);
  const [form, setForm] = useState({ name: "", dose: "", route: "EV", frequency: "c/12 h", notes: "" });
  const [calc, setCalc] = useState({ mgKg: 0, doses: 2, conc: 0 });
  const dose = calcDose(weightKg, calc.mgKg, calc.doses, calc.conc);

  const create = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb.from("neo_medications").insert({
        patient_id: patient.id,
        ...form,
        started_at: new Date().toISOString(),
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
      await logAudit({ patientId: patient.id, entity: "neo_medications", action: "insert" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_medications", patient.id] });
      setForm({ name: "", dose: "", route: "EV", frequency: "c/12 h", notes: "" });
      toast.success("Indicación registrada.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  const toggle = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await hdb
        .from("neo_medications")
        .update({ is_active: !row.is_active, ended_at: row.is_active ? new Date().toISOString() : null })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_medications", patient.id] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await hdb.from("neo_medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_medications", patient.id] }),
  });

  return (
    <div className="space-y-5">
      <Card title="Calculadora de dosis por kg" accent={accent}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Peso actual (kg)">
            <Input value={weightKg.toFixed(3)} readOnly />
          </Field>
          <Field label="mg/kg/dosis">
            <Input type="number" step="any" value={calc.mgKg} onChange={(e) => setCalc({ ...calc, mgKg: Number(e.target.value) })} />
          </Field>
          <Field label="Dosis por día">
            <Input type="number" value={calc.doses} onChange={(e) => setCalc({ ...calc, doses: Number(e.target.value) })} />
          </Field>
          <Field label="Concentración (mg/mL)">
            <Input type="number" step="any" value={calc.conc} onChange={(e) => setCalc({ ...calc, conc: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Metric label="Por dosis" value={`${dose.perDoseMg.toFixed(2)} mg`} accent={accent} />
          <Metric label="Total día" value={`${dose.perDayMg.toFixed(2)} mg`} accent={accent} />
          <Metric label="Volumen" value={`${dose.perDoseMl.toFixed(2)} mL`} accent={accent} />
        </div>
      </Card>

      {canEdit && (
        <Card
          title="Nueva indicación"
          accent={accent}
          actions={
            <Btn variant="solid" accent={accent} loading={create.isPending} onClick={() => create.mutate()}>
              <Plus className="size-3" /> Agregar
            </Btn>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Fármaco">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Dosis">
              <Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="50 mg/kg/dosis" />
            </Field>
            <Field label="Vía">
              <Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
            </Field>
            <Field label="Frecuencia">
              <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
            </Field>
          </div>
        </Card>
      )}

      <Card title={`Tratamiento (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Sin medicación registrada." />
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                <Chip accent={r.is_active ? accent : undefined}>{r.is_active ? "Activo" : "Suspendido"}</Chip>
                <span className="text-sm font-bold">{r.name}</span>
                <span className="text-sm text-muted-foreground">
                  {r.dose} · {r.route} · {r.frequency}
                </span>
                <span className="text-[11px] text-muted-foreground">Inicio {fmt(r.started_at)}</span>
                {canEdit && (
                  <div className="ml-auto flex gap-2">
                    <Btn onClick={() => toggle.mutate(r)}>{r.is_active ? "Suspender" : "Reactivar"}</Btn>
                    <Btn onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="size-3" />
                    </Btn>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ procedimientos ------------------------------ */

function ProceduresTab({ patient, accent, canEdit }: { patient: NeoPatient; accent: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_procedures", patient.id, "performed_at", false);
  const [form, setForm] = useState({ name: "", notes: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb.from("neo_procedures").insert({
        patient_id: patient.id,
        ...form,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_procedures", patient.id] });
      setForm({ name: "", notes: "" });
      toast.success("Procedimiento registrado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await hdb.from("neo_procedures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-child", "neo_procedures", patient.id] }),
  });

  return (
    <div className="space-y-5">
      {canEdit && (
        <Card
          title="Registrar procedimiento"
          accent={accent}
          actions={
            <Btn variant="solid" accent={accent} loading={create.isPending} onClick={() => create.mutate()}>
              <Plus className="size-3" /> Registrar
            </Btn>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Procedimiento">
              <Input
                value={form.name}
                placeholder="Cateterismo umbilical, punción lumbar, intubación…"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Detalles">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </Card>
      )}
      <Card title={`Procedimientos (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Sin procedimientos." />
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                <span className="text-sm font-bold">{r.name}</span>
                <span className="text-sm text-muted-foreground">{r.notes}</span>
                <span className="text-[11px] text-muted-foreground">{fmt(r.performed_at)}</span>
                {canEdit && (
                  <Btn className="ml-auto" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="size-3" />
                  </Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ nutrición ------------------------------ */

function NutritionTab({
  patient,
  accent,
  canEdit,
  weightKg,
  dol,
}: {
  patient: NeoPatient;
  accent: string;
  canEdit: boolean;
  weightKg: number;
  dol: number;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_nutrition", patient.id, "recorded_at", false);
  const req = fluidRequirement(weightKg || 3, dol);
  const [npt, setNpt] = useState({
    weightKg: weightKg || 3,
    totalMlKgDay: req.mlKgDay,
    glucosePercent: 10,
    aminoAcidsGKg: 2,
    lipidsGKg: 1,
    naMeqKg: 0,
    kMeqKg: 0,
    caMgKg: 45,
    enteralMlKgDay: 0,
  });
  const nptOut = calcNpt(npt);
  const [feed, setFeed] = useState({ mlKgDay: req.mlKgDay, feeds: 8 });
  const feedOut = calcFeeding(weightKg || 3, feed.mlKgDay, feed.feeds);
  const [bal, setBal] = useState({ inputsMl: 0, urineMl: 0, urineHours: 24, otherLossesMl: 0 });
  const balOut = calcBalance({ weightKg: weightKg || 3, ...bal });

  const save = useMutation({
    mutationFn: async (payload: { kind: string; data: any }) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb.from("neo_nutrition").insert({
        patient_id: patient.id,
        kind: payload.kind,
        data: payload.data,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_nutrition", patient.id] });
      toast.success("Registro guardado en el expediente.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  return (
    <div className="space-y-5">
      <Card title="Requerimiento hídrico del día" accent={accent}>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="mL/kg/día" value={req.mlKgDay} accent={accent} hint={`Día de vida ${dol}`} />
          <Metric label="Total día" value={`${req.totalMlDay.toFixed(1)} mL`} accent={accent} />
          <Metric label="Infusión" value={`${req.mlHour.toFixed(1)} mL/h`} accent={accent} />
        </div>
      </Card>

      <Card
        title="Nutrición parenteral (NPT)"
        accent={accent}
        actions={
          canEdit && (
            <Btn variant="solid" accent={accent} onClick={() => save.mutate({ kind: "npt", data: { input: npt, output: nptOut } })}>
              <Save className="size-3" /> Guardar cálculo
            </Btn>
          )
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["totalMlKgDay", "Volumen total (mL/kg/día)"],
            ["enteralMlKgDay", "Aporte enteral (mL/kg/día)"],
            ["glucosePercent", "Dextrosa (%)"],
            ["aminoAcidsGKg", "Aminoácidos (g/kg)"],
            ["lipidsGKg", "Lípidos (g/kg)"],
            ["naMeqKg", "Sodio (mEq/kg)"],
            ["kMeqKg", "Potasio (mEq/kg)"],
            ["caMgKg", "Calcio (mg/kg)"],
          ].map(([k, label]) => (
            <Field key={k} label={label as string}>
              <Input
                type="number"
                step="any"
                value={(npt as any)[k as string]}
                onChange={(e) => setNpt({ ...npt, [k as string]: Number(e.target.value) })}
              />
            </Field>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="VIG (GIR)" value={`${nptOut.gir.toFixed(1)} mg/kg/min`} accent={accent} />
          <Metric label="Parenteral" value={`${nptOut.parenteralMl.toFixed(1)} mL`} accent={accent} hint={`${nptOut.mlHour.toFixed(1)} mL/h`} />
          <Metric label="Lípidos 20%" value={`${nptOut.lipidMl20.toFixed(1)} mL`} accent={accent} />
          <Metric label="Aporte calórico" value={`${nptOut.kcalKg.toFixed(0)} kcal/kg`} accent={accent} />
        </div>
      </Card>

      <Card
        title="Lactancia / fórmula"
        accent={accent}
        actions={
          canEdit && (
            <Btn variant="solid" accent={accent} onClick={() => save.mutate({ kind: "formula", data: { input: feed, output: feedOut } })}>
              <Save className="size-3" /> Guardar
            </Btn>
          )
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="mL/kg/día">
            <Input type="number" step="any" value={feed.mlKgDay} onChange={(e) => setFeed({ ...feed, mlKgDay: Number(e.target.value) })} />
          </Field>
          <Field label="Tomas por día">
            <Input type="number" value={feed.feeds} onChange={(e) => setFeed({ ...feed, feeds: Number(e.target.value) })} />
          </Field>
          <Metric label="Por toma" value={`${feedOut.perFeed.toFixed(1)} mL`} accent={accent} hint={`c/${feedOut.intervalHours.toFixed(1)} h`} />
          <Metric label="Aporte" value={`${feedOut.kcalKg.toFixed(0)} kcal/kg`} accent={accent} />
        </div>
      </Card>

      <Card
        title="Balance hídrico 24 h"
        accent={accent}
        actions={
          canEdit && (
            <Btn variant="solid" accent={accent} onClick={() => save.mutate({ kind: "balance", data: { input: bal, output: balOut } })}>
              <Save className="size-3" /> Guardar
            </Btn>
          )
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Ingresos (mL)">
            <Input type="number" step="any" value={bal.inputsMl} onChange={(e) => setBal({ ...bal, inputsMl: Number(e.target.value) })} />
          </Field>
          <Field label="Diuresis (mL)">
            <Input type="number" step="any" value={bal.urineMl} onChange={(e) => setBal({ ...bal, urineMl: Number(e.target.value) })} />
          </Field>
          <Field label="Horas">
            <Input type="number" value={bal.urineHours} onChange={(e) => setBal({ ...bal, urineHours: Number(e.target.value) })} />
          </Field>
          <Field label="Otras pérdidas (mL)">
            <Input type="number" step="any" value={bal.otherLossesMl} onChange={(e) => setBal({ ...bal, otherLossesMl: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Metric label="Diuresis" value={`${balOut.diuresis.toFixed(2)} mL/kg/h`} accent={accent} />
          <Metric label="Balance" value={`${balOut.balance.toFixed(1)} mL`} accent={accent} hint={`${balOut.balanceMlKg.toFixed(1)} mL/kg`} />
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm">{balOut.reading}</div>
        </div>
      </Card>

      <Card title={`Historial nutricional (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Sin registros." />
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm">
                <Chip accent={accent}>{r.kind.toUpperCase()}</Chip>{" "}
                <span className="text-[11px] text-muted-foreground">{fmt(r.recorded_at)}</span>
                <pre className="mt-2 overflow-x-auto text-[11px] text-muted-foreground">
                  {JSON.stringify(r.data?.output ?? r.data, null, 1)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ escalas ------------------------------ */

function ScalesTab({
  patient,
  accent,
  canEdit,
  onSave,
  weightKg,
}: {
  patient: NeoPatient;
  accent: string;
  canEdit: boolean;
  onSave: (s: Record<string, any>) => void;
  weightKg: number;
}) {
  const [scales, setScales] = useState<Record<string, any>>(patient.scales ?? {});
  const silverman = scaleTotal(scales.silverman);
  const downes = scaleTotal(scales.downes);

  const setItem = (scale: string, key: string, value: number) =>
    setScales((s) => ({ ...s, [scale]: { ...(s[scale] ?? {}), [key]: value } }));

  return (
    <div className="space-y-5">
      <Card
        title="Escalas clínicas"
        accent={accent}
        actions={
          canEdit && (
            <Btn variant="solid" accent={accent} onClick={() => onSave(scales)}>
              <Save className="size-3" /> Guardar
            </Btn>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
              Silverman-Andersen
            </div>
            {SILVERMAN_ITEMS.map((it) => (
              <div key={it.key} className="mt-2 flex items-center gap-2">
                <span className="flex-1 text-sm">{it.label}</span>
                {[0, 1, 2].map((v) => (
                  <button
                    key={v}
                    disabled={!canEdit}
                    onClick={() => setItem("silverman", it.key, v)}
                    className={`size-8 rounded-lg border text-xs font-bold transition ${
                      (scales.silverman?.[it.key] ?? 0) === v
                        ? "text-white border-transparent"
                        : "border-border/60 bg-background/60"
                    }`}
                    style={(scales.silverman?.[it.key] ?? 0) === v ? { background: accent } : undefined}
                  >
                    {v}
                  </button>
                ))}
              </div>
            ))}
            <div className="mt-3 text-sm font-bold">
              Total {silverman} · <span className="font-normal text-muted-foreground">{silvermanReading(silverman)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
              Downes
            </div>
            {DOWNES_ITEMS.map((it) => (
              <div key={it.key} className="mt-2 flex items-center gap-2">
                <span className="flex-1 text-sm">{it.label}</span>
                {[0, 1, 2].map((v) => (
                  <button
                    key={v}
                    disabled={!canEdit}
                    onClick={() => setItem("downes", it.key, v)}
                    className={`size-8 rounded-lg border text-xs font-bold transition ${
                      (scales.downes?.[it.key] ?? 0) === v
                        ? "text-white border-transparent"
                        : "border-border/60 bg-background/60"
                    }`}
                    style={(scales.downes?.[it.key] ?? 0) === v ? { background: accent } : undefined}
                  >
                    {v}
                  </button>
                ))}
              </div>
            ))}
            <div className="mt-3 text-sm font-bold">
              Total {downes} · <span className="font-normal text-muted-foreground">{downesReading(downes)}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Referencias rápidas" accent={accent}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Peso actual" value={`${weightKg.toFixed(3)} kg`} accent={accent} />
          <Metric label="TET (nº)" value={weightKg < 1 ? "2.5" : weightKg < 2 ? "3.0" : weightKg < 3 ? "3.5" : "3.5-4.0"} accent={accent} />
          <Metric label="Profundidad TET" value={`${(6 + weightKg).toFixed(1)} cm`} accent={accent} hint="Regla 6 + peso (kg)" />
          <Metric label="Adrenalina EV" value={`${(weightKg * 0.1).toFixed(2)} mL`} accent={accent} hint="1:10 000 · 0.1-0.3 mL/kg" />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ IA ------------------------------ */

function AiTab({
  patient,
  accent,
  chartText,
  canEdit,
  onSaveSummary,
}: {
  patient: NeoPatient;
  accent: string;
  chartText: string;
  canEdit: boolean;
  onSaveSummary: (s: string) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState<"summary" | "plan" | null>(null);

  async function run(kind: "summary" | "plan") {
    setBusy(kind);
    try {
      if (kind === "summary") {
        const out = await neoSummary({ data: { chart: chartText } });
        setSummary(out);
      } else {
        const out = await neoPlanSuggestion({ data: { chart: chartText, question } });
        setPlan(out);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "La IA no está disponible ahora.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card
        title="Resumen clínico para la visita"
        accent={accent}
        actions={
          <>
            <Btn onClick={() => run("summary")} loading={busy === "summary"}>
              <Brain className="size-3" /> Generar
            </Btn>
            {summary && canEdit && (
              <Btn variant="solid" accent={accent} onClick={() => onSaveSummary(summary.summary)}>
                <Save className="size-3" /> Guardar en expediente
              </Btn>
            )}
          </>
        }
      >
        {!summary ? (
          <Empty text="Genera un resumen del expediente para presentar al paciente en la visita médica." />
        ) : (
          <div className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{summary.summary}</p>
            <List title="Problemas activos" items={summary.activeProblems} accent={accent} />
            <List title="Pendientes" items={summary.pendingActions} accent={accent} />
            <List title="Alertas" items={summary.alerts} accent={accent} />
          </div>
        )}
      </Card>

      <Card
        title="Razonamiento clínico asistido"
        accent={accent}
        actions={
          <Btn onClick={() => run("plan")} loading={busy === "plan"}>
            <Brain className="size-3" /> Analizar
          </Btn>
        }
      >
        <Field label="Pregunta al tutor (opcional)">
          <Input
            value={question}
            placeholder="¿Debo iniciar antibióticos? ¿Cuándo indico fototerapia?"
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Field>
        {plan && (
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                Diferenciales
              </div>
              <ul className="mt-1 space-y-1">
                {plan.differentials.map((d: any, i: number) => (
                  <li key={i}>
                    <span className="font-bold">{d.dx}</span> — {d.rationale}
                  </li>
                ))}
              </ul>
            </div>
            <List title="Exámenes a solicitar" items={plan.workup} accent={accent} />
            <List title="Manejo" items={plan.management} accent={accent} />
            <p className="rounded-xl border border-border/40 bg-background/50 p-3">{plan.teaching}</p>
          </div>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          Contenido educativo generado con IA. La decisión clínica final corresponde siempre al médico tratante.
        </p>
      </Card>
    </div>
  );
}

function List({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
        {title}
      </div>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 rounded-full" style={{ background: accent }} />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ traslado / alta ------------------------------ */

function TransferTab({ patient, accent, canEdit }: { patient: NeoPatient; accent: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useChildRows("neo_transfers", patient.id, "transferred_at", false);
  const [toUnit, setToUnit] = useState(patient.unit);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(patient.status);

  const transfer = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb.from("neo_transfers").insert({
        patient_id: patient.id,
        from_unit: patient.unit,
        to_unit: toUnit,
        reason,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
      const { error: e2 } = await hdb.from("neo_patients").update({ unit: toUnit, status }).eq("id", patient.id);
      if (e2) throw e2;
      await logAudit({ patientId: patient.id, entity: "neo_transfers", action: "transfer", detail: { toUnit, status } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-patient", patient.id] });
      qc.invalidateQueries({ queryKey: ["neo-patients"] });
      qc.invalidateQueries({ queryKey: ["neo-child", "neo_transfers", patient.id] });
      setReason("");
      toast.success("Paciente trasladado. El expediente se mantiene íntegro.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo trasladar."),
  });

  return (
    <div className="space-y-5">
      <Card
        title="Traslado de unidad / cambio de estado"
        accent={accent}
        actions={
          canEdit && (
            <Btn variant="solid" accent={accent} loading={transfer.isPending} onClick={() => transfer.mutate()}>
              <Truck className="size-3" /> Aplicar
            </Btn>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Unidad destino">
            <Select value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
              {NEO_UNITS.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {NEO_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Motivo">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title={`Historial de traslados (${rows.length})`} accent={accent}>
        {rows.length === 0 ? (
          <Empty text="Sin traslados registrados." />
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm">
                {r.from_unit ? `${getUnit(r.from_unit).title} → ` : ""}
                <span className="font-bold">{getUnit(r.to_unit).title}</span>{" "}
                <span className="text-[11px] text-muted-foreground">{fmt(r.transferred_at)}</span>
                {r.reason && <div className="text-muted-foreground">{r.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function LoadingChart() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}
