/**
 * KotaMed · Hospitalización Neonatal (Internado Médico · Neonatología).
 * Simula el flujo real de un servicio de neonatología nivel III:
 * unidades, censo de pacientes, expediente clínico completo y
 * configuración editable por el administrador.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Baby, Building2, Loader2, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Btn, Chip, Empty, Field, Input, Metric, Panel, Select } from "@/components/academy/ui";
import { PatientChart } from "@/components/hospital/PatientChart";
import { HospitalConfigEditor } from "@/components/hospital/HospitalConfigEditor";
import {
  DEFAULT_HOSPITAL_CONFIG,
  NEO_STATUS,
  NEO_UNITS,
  dayOfLife,
  hdb,
  logAudit,
  usePatient,
  usePatients,
  useHospitalConfig,
} from "@/lib/neonatal-hospital";

export function NeonatalHospital({ isAdmin, accent }: { isAdmin: boolean; accent: string }) {
  const [unit, setUnit] = useState<string>(NEO_UNITS[0]!.slug);
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const { data: config = DEFAULT_HOSPITAL_CONFIG } = useHospitalConfig();
  const { data: patients = [], isLoading } = usePatients(unit, search);
  const { data: patient } = usePatient(patientId);
  const unitMeta = NEO_UNITS.find((u) => u.slug === unit)!;
  const unitAccent = unitMeta.accent || accent;

  const [form, setForm] = useState({
    apellidos: "",
    nombres: "",
    hc: "",
    sexo: "",
    fecha_nacimiento: "",
    hora_nacimiento: "",
    edad_gestacional: "",
    peso_nacimiento: "",
    diagnostico_ingreso: "",
    medico_responsable: "",
    status: "hospitalizado",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await hdb
        .from("neo_patients")
        .insert({
          unit,
          apellidos: form.apellidos,
          nombres: form.nombres,
          hc: form.hc || null,
          sexo: form.sexo || null,
          fecha_nacimiento: form.fecha_nacimiento || null,
          hora_nacimiento: form.hora_nacimiento || null,
          edad_gestacional: form.edad_gestacional ? Number(form.edad_gestacional) : null,
          peso_nacimiento: form.peso_nacimiento ? Number(form.peso_nacimiento) : null,
          diagnostico_ingreso: form.diagnostico_ingreso || null,
          medico_responsable: form.medico_responsable || null,
          status: form.status,
          created_by: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({ patientId: data.id, entity: "neo_patients", entityId: data.id, action: "insert" });
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["neo-patients"] });
      setCreating(false);
      setForm({ ...form, apellidos: "", nombres: "", hc: "", diagnostico_ingreso: "" });
      setPatientId(id);
      toast.success("Paciente ingresado al servicio.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo registrar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await hdb.from("neo_patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neo-patients"] });
      toast.success("Expediente eliminado.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar."),
  });

  if (patient) {
    return (
      <PatientChart
        patient={patient}
        config={config}
        accent={unitMeta.accent}
        canEdit
        onBack={() => setPatientId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Hospitalización Neonatal"
        subtitle="Servicio de Neonatología nivel III simulado: recibe al recién nacido, construye su historia clínica, evoluciona, solicita exámenes, calcula y traslada — igual que en el hospital."
        icon={<Baby className="size-4" />}
        accent={unitAccent}
        actions={
          <>
            <Btn onClick={() => setCreating((v) => !v)} variant="outline">
              <Plus className="size-3" /> Ingresar recién nacido
            </Btn>
            {isAdmin && (
              <Btn onClick={() => setShowConfig((v) => !v)}>
                <Settings2 className="size-3" /> {showConfig ? "Cerrar configuración" : "Configurar servicio"}
              </Btn>
            )}
          </>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {NEO_UNITS.map((u) => {
            const active = u.slug === unit;
            return (
              <button
                key={u.slug}
                onClick={() => setUnit(u.slug)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active ? "border-transparent text-white" : "border-border/50 bg-background/40 hover:border-primary/40"
                }`}
                style={active ? { background: u.accent } : undefined}
              >
                <Building2 className="size-4" />
                <div className="mt-2 text-[11px] font-extrabold leading-tight">{u.title}</div>
                <div className={`mt-1 text-[10px] leading-snug ${active ? "text-white/80" : "text-muted-foreground"}`}>
                  {u.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Pacientes en la unidad" value={patients.length} accent={unitAccent} />
          <Metric
            label="Hospitalizados"
            value={patients.filter((p) => p.status === "hospitalizado").length}
            accent={unitAccent}
          />
          <Metric
            label="Prematuros (<37 sem)"
            value={patients.filter((p) => (p.edad_gestacional ?? 40) < 37).length}
            accent={unitAccent}
          />
          <Metric
            label="Bajo peso (<2500 g)"
            value={patients.filter((p) => (p.peso_nacimiento ?? 3000) < 2500).length}
            accent={unitAccent}
          />
        </div>
      </Panel>

      {showConfig && isAdmin && <HospitalConfigEditor config={config} accent={unitAccent} />}

      {creating && (
        <Panel
          title="Ingreso de recién nacido"
          subtitle={`Unidad: ${unitMeta.title}`}
          accent={unitAccent}
          actions={
            <Btn variant="solid" accent={unitAccent} loading={create.isPending} onClick={() => create.mutate()}>
              <Plus className="size-3" /> Registrar ingreso
            </Btn>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Apellidos de la madre / del RN">
              <Input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
            </Field>
            <Field label="Nombres">
              <Input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
            </Field>
            <Field label="Historia clínica">
              <Input value={form.hc} onChange={(e) => setForm({ ...form, hc: e.target.value })} />
            </Field>
            <Field label="Sexo">
              <Select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                <option value="">—</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="indeterminado">Indeterminado</option>
              </Select>
            </Field>
            <Field label="Fecha de nacimiento">
              <Input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
              />
            </Field>
            <Field label="Hora de nacimiento">
              <Input
                type="time"
                value={form.hora_nacimiento}
                onChange={(e) => setForm({ ...form, hora_nacimiento: e.target.value })}
              />
            </Field>
            <Field label="Edad gestacional (sem)">
              <Input
                type="number"
                step="any"
                value={form.edad_gestacional}
                onChange={(e) => setForm({ ...form, edad_gestacional: e.target.value })}
              />
            </Field>
            <Field label="Peso al nacer (g)">
              <Input
                type="number"
                value={form.peso_nacimiento}
                onChange={(e) => setForm({ ...form, peso_nacimiento: e.target.value })}
              />
            </Field>
            <Field label="Médico responsable">
              <Input
                value={form.medico_responsable}
                onChange={(e) => setForm({ ...form, medico_responsable: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Diagnóstico de ingreso">
                <Input
                  value={form.diagnostico_ingreso}
                  onChange={(e) => setForm({ ...form, diagnostico_ingreso: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Estado">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {NEO_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Panel>
      )}

      <Panel
        title={`Censo · ${unitMeta.title}`}
        subtitle="Selecciona un paciente para abrir su expediente clínico completo."
        accent={unitAccent}
        actions={
          <div className="flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground" />
            <Input
              value={search}
              placeholder="Buscar por apellido, HC o diagnóstico"
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <Empty text="No hay pacientes en esta unidad. Registra un ingreso para comenzar." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {patients.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl border border-border/50 bg-background/40 p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <Chip accent={unitMeta.accent}>{p.status}</Chip>
                  <span className="text-[11px] text-muted-foreground">HC {p.hc || "s/n"}</span>
                  {isAdmin && (
                    <button
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => remove.mutate(p.id)}
                      aria-label="Eliminar expediente"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <button className="mt-2 text-left w-full" onClick={() => setPatientId(p.id)}>
                  <div className="text-base font-extrabold tracking-tight">
                    RN de {p.apellidos || "—"} {p.nombres ? `· ${p.nombres}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.edad_gestacional ?? "—"} sem · {p.peso_nacimiento ?? "—"} g · Día de vida{" "}
                    {dayOfLife(p.fecha_nacimiento)}
                  </div>
                  <div className="mt-2 text-sm text-foreground/80 line-clamp-2">
                    {p.diagnostico_ingreso || "Sin diagnóstico de ingreso"}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
