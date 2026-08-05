/**
 * KOTAMED AI · Asistente Clínico Inteligente por Paciente.
 * Lee automáticamente todo el expediente del recién nacido (datos generales,
 * antecedentes maternos, escalas, evoluciones, laboratorios, imágenes,
 * medicación, nutrición y procedimientos) y ofrece resumen inteligente,
 * interpretación clínica, docencia, explicación de laboratorios e imágenes,
 * ayuda para evoluciones, diferenciales, fármacos, riesgos y bibliografía.
 * Nunca vuelve a pedir datos que ya están en la historia clínica.
 */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  ClipboardCheck,
  Copy,
  Loader2,
  Save,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Btn, Chip, Empty, Field, Input, Metric, Panel, Select, Textarea } from "@/components/academy/ui";
import { dayOfLife, getUnit, hdb, logAudit, usePatients, type NeoPatient } from "@/lib/neonatal-hospital";
import {
  AI_DISCLAIMER,
  COPILOT_MODELS,
  DEFAULT_COPILOT_CONFIG,
  buildPatientContext,
  computeRiskFlags,
  usePatientDossier,
  useCopilotConfig,
  useSaveCopilotConfig,
  type CopilotConfig,
  type CopilotFunctionDef,
} from "@/lib/neonatal-copilot";
import { neoCopilot } from "@/lib/neonatal-copilot.functions";
import { NEO_ROLES } from "@/lib/neonatal-nav";
import { supabase } from "@/integrations/supabase/client";

export function KotamedAiModule({ isAdmin, accent }: { isAdmin: boolean; accent: string }) {
  const [view, setView] = useState<"pacientes" | "config">("pacientes");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: patients = [], isLoading } = usePatients(undefined, search);
  const { data: config = DEFAULT_COPILOT_CONFIG } = useCopilotConfig();

  const patient = patients.find((p) => p.id === patientId) ?? null;

  if (view === "config" && isAdmin) {
    return <CopilotAdmin config={config} accent={accent} onBack={() => setView("pacientes")} />;
  }

  if (patient) {
    return (
      <PatientCopilot
        patient={patient}
        config={config}
        accent={accent}
        onBack={() => setPatientId(null)}
      />
    );
  }

  return (
    <Panel
      title="KotaMed AI"
      subtitle="Copiloto clínico del servicio. Selecciona un paciente y la IA cargará automáticamente todo su expediente: no tendrás que volver a escribir ningún dato."
      icon={<BrainCircuit className="size-4" />}
      accent={accent}
      actions={
        isAdmin ? (
          <Btn variant="outline" onClick={() => setView("config")}>
            <Settings2 className="size-3" /> Configuración de IA
          </Btn>
        ) : undefined
      }
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por apellidos, HC o diagnóstico…"
          className="pl-9"
        />
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando censo…
          </div>
        ) : patients.length === 0 ? (
          <Empty text="No hay pacientes registrados todavía. Registra un ingreso para activar el copiloto." />
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setPatientId(p.id)}
                className="rounded-2xl border border-border/50 bg-background/40 p-4 text-left transition hover:border-primary/40 hover:bg-background/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-extrabold tracking-tight">
                    {p.apellidos} {p.nombres}
                  </div>
                  <Chip accent={accent}>{getUnit(p.unit).title}</Chip>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {p.edad_gestacional ?? "—"} sem · {p.peso_nacimiento ?? "—"} g ·{" "}
                  {dayOfLife(p.fecha_nacimiento)} días de vida
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {p.diagnostico_ingreso ?? "Sin diagnóstico consignado"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-5 text-[11px] leading-snug text-muted-foreground">{config.disclaimer || AI_DISCLAIMER}</p>
    </Panel>
  );
}

/* ================================================================== */
/*  COPILOTO DEL PACIENTE                                              */
/* ================================================================== */

function PatientCopilot({
  patient,
  config,
  accent,
  onBack,
}: {
  patient: NeoPatient;
  config: CopilotConfig;
  accent: string;
  onBack: () => void;
}) {
  const { data: dossier, isLoading } = usePatientDossier(patient.id);
  const [fn, setFn] = useState<CopilotFunctionDef | null>(null);
  const [extra, setExtra] = useState("");
  const [answer, setAnswer] = useState("");
  const call = useServerFn(neoCopilot);

  const context = useMemo(
    () => buildPatientContext(patient, dossier),
    [patient, dossier],
  );
  const risks = useMemo(() => computeRiskFlags(patient), [patient]);
  const enabled = config.functions.filter((f) => f.enabled !== false);
  const dol = dayOfLife(patient.fecha_nacimiento);
  const epm = patient.edad_gestacional ? patient.edad_gestacional + dol / 7 : null;

  const run = useMutation({
    mutationFn: async (target: CopilotFunctionDef) => {
      const res = await call({
        data: { mode: target.id, context, extra: extra || undefined },
      });
      return res as { text: string; disclaimer: string };
    },
    onSuccess: (res, target) => {
      setAnswer(res.text);
      if (config.audit !== false) {
        void logAudit({
          patientId: patient.id,
          entity: "kotamed-ai",
          action: target.id,
          detail: { label: target.label },
        });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "KotaMed AI no pudo responder."),
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb.from("neo_evolutions").insert({
        patient_id: patient.id,
        day_number: dol,
        format: "nota",
        content: { nota: `[KotaMed AI · ${fn?.label ?? "Análisis"}]\n${answer}` },
        author: auth.user?.email ?? null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Análisis guardado en la historia clínica como nota.");
      void logAudit({ patientId: patient.id, entity: "kotamed-ai", action: "guardar-nota" });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar la nota."),
  });

  return (
    <div className="space-y-4">
      <Panel
        title={`${patient.apellidos} ${patient.nombres}`}
        subtitle={`${getUnit(patient.unit).title} · ${patient.diagnostico_ingreso ?? "sin diagnóstico consignado"}`}
        icon={<BrainCircuit className="size-4" />}
        accent={accent}
        actions={
          <Btn variant="outline" onClick={onBack}>
            <ArrowLeft className="size-3" /> Pacientes
          </Btn>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Edad gestacional" value={`${patient.edad_gestacional ?? "—"} sem`} accent={accent} />
          <Metric label="Días de vida" value={dol} accent={accent} />
          <Metric
            label="Edad postmenstrual"
            value={epm ? `${epm.toFixed(1)} sem` : "—"}
            accent={accent}
          />
          <Metric label="Peso al nacer" value={`${patient.peso_nacimiento ?? "—"} g`} accent={accent} />
        </div>

        <div className="mt-4 rounded-2xl border border-border/50 bg-background/40 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Riesgos activos detectados automáticamente
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {risks.map((r) => (
              <span
                key={r.label}
                title={r.why}
                className="rounded-full border px-2.5 py-1 text-[10px] font-bold"
                style={{
                  borderColor: r.level === "alto" ? "#ef444488" : `${accent}55`,
                  color: r.level === "alto" ? "#ef4444" : undefined,
                  background: r.level === "alto" ? "#ef444414" : `${accent}12`,
                }}
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {isLoading ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Cargando expediente completo…
            </>
          ) : (
            <>
              <ClipboardCheck className="size-3" />
              Expediente cargado: {dossier?.evolutions.length ?? 0} evoluciones ·{" "}
              {dossier?.labs.length ?? 0} laboratorios · {dossier?.media.length ?? 0} imágenes ·{" "}
              {dossier?.medications.length ?? 0} medicamentos · {dossier?.procedures.length ?? 0}{" "}
              procedimientos
            </>
          )}
        </div>
      </Panel>

      {!fn ? (
        <Panel
          title="Funciones del copiloto"
          subtitle="Cada función abre su propia pantalla de trabajo y utiliza el expediente completo del paciente."
          icon={<Sparkles className="size-4" />}
          accent={accent}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {enabled.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFn(f);
                  setExtra("");
                  setAnswer("");
                }}
                className="rounded-2xl border border-border/50 bg-background/40 p-4 text-left transition hover:border-primary/40 hover:bg-background/60"
              >
                <div className="text-lg">{f.emoji}</div>
                <div className="mt-1 text-[12px] font-extrabold tracking-tight">{f.label}</div>
                <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.hint}</div>
              </button>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel
          title={`${fn.emoji} ${fn.label}`}
          subtitle={fn.hint}
          accent={accent}
          actions={
            <>
              <Btn variant="outline" onClick={() => setFn(null)}>
                <ArrowLeft className="size-3" /> Funciones
              </Btn>
              <Btn
                variant="solid"
                accent={accent}
                loading={run.isPending}
                onClick={() => run.mutate(fn)}
              >
                <Sparkles className="size-3" /> {answer ? "Regenerar" : "Analizar"}
              </Btn>
            </>
          }
        >
          {fn.input && (
            <Field label={fn.input}>
              <Textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Escribe aquí únicamente el dato nuevo; el resto del expediente ya está cargado."
              />
            </Field>
          )}

          {run.isPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Analizando el expediente con KotaMed AI…
            </div>
          )}

          {answer && (
            <>
              <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-border/50 bg-background/40 p-4 font-sans text-[13px] leading-relaxed">
                {answer}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(answer);
                    toast.success("Análisis copiado.");
                  }}
                >
                  <Copy className="size-3" /> Copiar
                </Btn>
                <Btn variant="outline" loading={saveNote.isPending} onClick={() => saveNote.mutate()}>
                  <Save className="size-3" /> Guardar en la historia clínica
                </Btn>
              </div>
            </>
          )}

          <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
            {config.disclaimer || AI_DISCLAIMER}
          </p>
        </Panel>
      )}
    </div>
  );
}

/* ================================================================== */
/*  CONFIGURACIÓN (ADMINISTRADOR)                                      */
/* ================================================================== */

function CopilotAdmin({
  config,
  accent,
  onBack,
}: {
  config: CopilotConfig;
  accent: string;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<CopilotConfig>(config);
  const save = useSaveCopilotConfig();

  const patchFn = (id: string, p: Partial<CopilotFunctionDef>) =>
    setDraft({
      ...draft,
      functions: draft.functions.map((f) => (f.id === id ? { ...f, ...p } : f)),
    });

  return (
    <Panel
      title="Configuración de KotaMed AI"
      subtitle="Edita el comportamiento del copiloto, las instrucciones de cada función, los protocolos del servicio, la bibliografía y los permisos. Nada de esto requiere tocar el código."
      icon={<Settings2 className="size-4" />}
      accent={accent}
      actions={
        <>
          <Btn variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-3" /> Volver
          </Btn>
          <Btn variant="ghost" onClick={() => setDraft({ ...DEFAULT_COPILOT_CONFIG })}>
            Restaurar por defecto
          </Btn>
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={() =>
              save.mutate(draft, {
                onSuccess: () => toast.success("Configuración de KotaMed AI actualizada."),
                onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
              })
            }
          >
            <Save className="size-3" /> Guardar
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Modelo de IA">
          <Select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
            {COPILOT_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Aviso legal mostrado al usuario">
          <Input
            value={draft.disclaimer}
            onChange={(e) => setDraft({ ...draft, disclaimer: e.target.value })}
          />
        </Field>
        <div className="flex items-end">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold">
            <input
              type="checkbox"
              checked={draft.audit !== false}
              onChange={(e) => setDraft({ ...draft, audit: e.target.checked })}
            />
            Registrar cada consulta en la auditoría
          </label>
        </div>
      </div>

      <div className="mt-3">
        <Field label="Instrucción general del copiloto (prompt del sistema)">
          <Textarea
            value={draft.system}
            onChange={(e) => setDraft({ ...draft, system: e.target.value })}
            className="min-h-40"
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Roles con acceso al copiloto
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {NEO_ROLES.map((r) => {
            const on = draft.roles.includes(r.value);
            return (
              <button
                key={r.value}
                onClick={() =>
                  setDraft({
                    ...draft,
                    roles: on ? draft.roles.filter((x) => x !== r.value) : [...draft.roles, r.value],
                  })
                }
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                  on ? "text-foreground" : "border-border/60 text-muted-foreground"
                }`}
                style={on ? { background: `${accent}1f`, borderColor: `${accent}55` } : undefined}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Funciones del copiloto
        </div>
        {draft.functions.map((f) => (
          <div key={f.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span>{f.emoji}</span>
              <span className="text-[12px] font-extrabold tracking-tight">{f.label}</span>
              <label className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={f.enabled !== false}
                  onChange={(e) => patchFn(f.id, { enabled: e.target.checked })}
                />
                Activa
              </label>
            </div>
            <div className="mt-2">
              <Textarea
                value={f.prompt}
                onChange={(e) => patchFn(f.id, { prompt: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Protocolos del servicio que la IA debe respetar
          </div>
          <Btn
            variant="ghost"
            onClick={() =>
              setDraft({ ...draft, protocols: [...draft.protocols, { title: "Nuevo protocolo", body: "" }] })
            }
          >
            Agregar protocolo
          </Btn>
        </div>
        <div className="mt-2 space-y-2">
          {draft.protocols.map((p, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                value={p.title}
                onChange={(e) => {
                  const protocols = [...draft.protocols];
                  protocols[i] = { ...p, title: e.target.value };
                  setDraft({ ...draft, protocols });
                }}
              />
              <div className="md:col-span-2 flex gap-2">
                <Input
                  value={p.body}
                  onChange={(e) => {
                    const protocols = [...draft.protocols];
                    protocols[i] = { ...p, body: e.target.value };
                    setDraft({ ...draft, protocols });
                  }}
                />
                <Btn
                  variant="ghost"
                  onClick={() =>
                    setDraft({ ...draft, protocols: draft.protocols.filter((_, x) => x !== i) })
                  }
                >
                  Quitar
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <Field label="Bibliografía preferente (una por línea)">
          <Textarea
            value={draft.references.join("\n")}
            onChange={(e) =>
              setDraft({ ...draft, references: e.target.value.split("\n").filter(Boolean) })
            }
          />
        </Field>
      </div>
    </Panel>
  );
}
