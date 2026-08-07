/**
 * KotaMed · Hospitalización Neonatal — Centro de Operaciones Clínicas.
 * Sidebar de un solo nivel (índice minimalista) + módulos que abren su propia
 * pantalla independiente. Toda la arquitectura es editable por el administrador
 * desde Administración › Módulos (persistida en base de datos).
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Baby, BedDouble, ChevronRight, Plus, Settings2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Btn, Empty, Field, Input, Metric, Panel, Select } from "@/components/academy/ui";
import { PatientChart } from "@/components/hospital/PatientChart";
import { HospitalConfigEditor } from "@/components/hospital/HospitalConfigEditor";
import { HospitalSidebar } from "@/components/hospital/HospitalSidebar";
import { NavAdmin } from "@/components/hospital/NavAdmin";
import { CensusTable } from "@/components/hospital/modules/CensusTable";
import { GenericModule, ModuleTabs } from "@/components/hospital/modules/GenericModule";
import { CalculatorsModule } from "@/components/hospital/modules/CalculatorsModule";
import { KotamedAiModule } from "@/components/hospital/modules/KotamedAiModule";
import { AcademicCmsModule } from "@/components/hospital/modules/AcademicCmsModule";

import { DEFAULT_NEO_NAV, navIcon, useNeoNav, type NeoModule } from "@/lib/neonatal-nav";
import {
  DEFAULT_HOSPITAL_CONFIG,
  NEO_STATUS,
  NEO_UNITS,
  hdb,
  logAudit,
  usePatient,
  usePatients,
  useHospitalConfig,
} from "@/lib/neonatal-hospital";

export function NeonatalHospital({ isAdmin, accent }: { isAdmin: boolean; accent: string }) {
  const [unit, setUnit] = useState<string>(NEO_UNITS[0]!.slug);
  const [moduleId, setModuleId] = useState<string>("dashboard");
  const [tab, setTab] = useState<string>("");
  const [unitOpen, setUnitOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: nav = DEFAULT_NEO_NAV } = useNeoNav();
  const { data: config = DEFAULT_HOSPITAL_CONFIG } = useHospitalConfig();
  const { data: patients = [], isLoading } = usePatients(unit, search);
  const { data: patient } = usePatient(patientId);
  const unitMeta = NEO_UNITS.find((u) => u.slug === unit) ?? NEO_UNITS[0]!;
  const unitAccent = unitMeta.accent || accent;

  const modules = useMemo(
    () =>
      nav.modules.filter(
        (m) => m.enabled && !m.hidden && (!m.adminOnly || isAdmin),
      ),
    [nav.modules, isAdmin],
  );
  const mod: NeoModule | undefined =
    modules.find((m) => m.id === moduleId) ?? modules[0];

  const stats = useMemo(() => {
    const hosp = patients.filter((p: any) => p.status === "hospitalizado");
    const prema = patients.filter((p: any) => (p.edad_gestacional ?? 40) < 37);
    const bajoPeso = patients.filter((p: any) => (p.peso_nacimiento ?? 3000) < 2500);
    return {
      total: patients.length,
      hosp: hosp.length,
      prema: prema.length,
      bajoPeso: bajoPeso.length,
      camas: Math.max(0, 24 - hosp.length),
      alertas: prema.filter((p: any) => (p.edad_gestacional ?? 40) < 32).length + bajoPeso.length,
    };
  }, [patients]);

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
      setForm({ ...form, apellidos: "", nombres: "", hc: "", diagnostico_ingreso: "" });
      setPatientId(id);
      toast.success("Paciente ingresado al servicio.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo registrar."),
  });

  /* ---------------- Registro Inteligente con IA (aditivo) ---------------- */
  const [regMethod, setRegMethod] = useState<RegistrationMethod>("manual");
  const [aiIntake, setAiIntake] = useState<{
    result: AiIntakeResult;
    docs: File[];
    warnings: string[];
    values: Record<string, string>;
  } | null>(null);
  const [aftercare, setAftercare] = useState<{
    id: string;
    classification: string;
    reminders: string[];
  } | null>(null);

  const createWithAi = useMutation({
    mutationFn: async () => {
      if (!aiIntake) throw new Error("Sin datos de IA.");
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const v = aiIntake.values;
      const extra = {
        tipo_parto: v["tipo_parto"] || null,
        apgar: v["apgar"] || null,
        procedencia: v["procedencia"] || null,
        hospital: v["hospital"] || null,
        servicio: v["servicio"] || null,
        madre: v["madre"] || null,
        dni: v["dni"] || null,
        seguro: v["seguro"] || null,
        cama: v["cama"] || null,
        observaciones: v["observaciones"] || null,
      };
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
          general: extra,
          created_by: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({
        patientId: data.id,
        entity: "neo_patients",
        entityId: data.id,
        action: "insert",
      });

      const docPaths = await uploadIntakeDocs(aiIntake.docs).catch(() => [] as string[]);
      const finalData = { ...form, ...extra };
      await saveIntakeAudit({
        patientId: data.id,
        unit,
        source: regMethod === "camera" ? "camera" : "upload",
        docPaths,
        result: aiIntake.result,
        finalData,
        corrections: diffCorrections(aiIntake.result.fields, finalData),
        warnings: aiIntake.warnings,
      });
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["neo-patients"] });
      const merged = { ...(aiIntake?.values ?? {}), ...form } as Record<string, string>;
      setAftercare({
        id,
        classification: classify(merged, aiIntake?.result.clasificacion ?? ""),
        reminders: clinicalReminders(merged, aiIntake?.result.recommendations ?? []),
      });
      setAiIntake(null);
      toast.success("Paciente registrado con IA. Revisa las acciones disponibles.");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo registrar."),
  });

  const applyAiValues = (payload: {
    values: Record<string, string>;
    result: AiIntakeResult;
    docs: File[];
    warnings: string[];
  }) => {
    const v = payload.values;
    setForm((f) => ({
      ...f,
      apellidos: v["apellidos"] || f.apellidos,
      nombres: v["nombres"] || f.nombres,
      hc: v["hc"] || f.hc,
      sexo: v["sexo"] || f.sexo,
      fecha_nacimiento: v["fecha_nacimiento"] || f.fecha_nacimiento,
      hora_nacimiento: v["hora_nacimiento"] || f.hora_nacimiento,
      edad_gestacional: v["edad_gestacional"] || f.edad_gestacional,
      peso_nacimiento: v["peso_nacimiento"] || f.peso_nacimiento,
      diagnostico_ingreso: v["diagnostico_ingreso"] || f.diagnostico_ingreso,
      medico_responsable: v["medico_responsable"] || f.medico_responsable,
    }));
    setAiIntake(payload);
    toast.success("Formulario autocompletado. Revisa y confirma los datos.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };


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

  const goModule = (id: string) => {
    setModuleId(id);
    setTab("");
    setUnitOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goCenso = () => {
    goModule("hospitalizacion");
    setUnitOpen(true);
  };

  const Icon = mod ? navIcon(mod.icon) : BedDouble;
  const activeTab = tab || mod?.tabs[0]?.id || "";

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <HospitalSidebar
        modules={modules}
        active={mod?.id ?? ""}
        onSelect={goModule}
        accent={unitAccent}
        openPatients={stats.hosp}
      />

      <div className="min-w-0 flex-1 space-y-4">
        {/* Breadcrumb del centro de operaciones */}
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5 text-[11px]">
          <span className="font-bold uppercase tracking-widest text-muted-foreground">
            Neonatología
          </span>
          <ChevronRight className="size-3 text-muted-foreground" />
          <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: unitAccent }}>
            <Icon className="size-3.5" /> {mod?.label ?? "Centro de Operaciones"}
          </span>
          {mod?.layout === "tabs" && activeTab && (
            <>
              <ChevronRight className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {mod.tabs.find((t) => t.id === activeTab)?.label}
              </span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Btn variant="outline" onClick={() => goModule("ingresos")}>
              <Plus className="size-3" /> Ingresar RN
            </Btn>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                <Shield className="size-3" /> Admin
              </span>
            )}
          </div>
        </div>

        {!mod ? (
          <Panel title="Centro de Operaciones" accent={unitAccent}>
            <Empty text="No hay módulos disponibles para tu perfil." />
          </Panel>
        ) : mod.kind === "dashboard" ? (
          <>
            <Panel
              title="Centro de Operaciones Clínicas"
              subtitle="Estado en tiempo real del Servicio de Neonatología."
              icon={<Baby className="size-4" />}
              accent={unitAccent}
            >
              <ModuleTabs tabs={mod.tabs} active={activeTab} onSelect={setTab} accent={unitAccent} />
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Metric label="Pacientes en la unidad" value={stats.total} accent={unitAccent} hint={unitMeta.title} />
                <Metric label="Hospitalizados" value={stats.hosp} accent={unitAccent} hint="Pacientes activos" />
                <Metric
                  label="Prematuros (<37 sem)"
                  value={stats.prema}
                  accent={unitAccent}
                  hint={stats.total ? `${Math.round((stats.prema / stats.total) * 100)}% del total` : "—"}
                />
                <Metric
                  label="Bajo peso (<2500 g)"
                  value={stats.bajoPeso}
                  accent={unitAccent}
                  hint={stats.total ? `${Math.round((stats.bajoPeso / stats.total) * 100)}% del total` : "—"}
                />
                <Metric label="Camas disponibles" value={stats.camas} accent={unitAccent} hint="De 24 camas" />
                <Metric
                  label="Alertas activas"
                  value={stats.alertas}
                  accent="oklch(0.65 0.18 25)"
                  hint="Requieren atención"
                />
              </div>
            </Panel>
            {activeTab === "ocupacion" ? (
              <UnitCards unit={unit} onUnit={(u) => setUnit(u)} accent={unitAccent} />
            ) : (
              <CensusTable
                title={`Censo · ${unitMeta.title}`}
                accent={unitAccent}
                patients={
                  activeTab === "alertas"
                    ? patients.filter(
                        (p: any) => (p.edad_gestacional ?? 40) < 32 || (p.peso_nacimiento ?? 3000) < 2500,
                      )
                    : patients
                }
                isLoading={isLoading}
                search={search}
                onSearch={setSearch}
                onOpen={setPatientId}
                onDelete={(id) => remove.mutate(id)}
                canDelete={isAdmin}
              />
            )}
          </>
        ) : mod.kind === "ingresos" ? (
          <>
            <Panel
              title="Ingresos"
              subtitle={`Unidad de destino: ${unitMeta.title}`}
              icon={<Baby className="size-4" />}
              accent={unitAccent}
            >
              <ModuleTabs tabs={mod.tabs} active={activeTab} onSelect={setTab} accent={unitAccent} />
              {activeTab === "nuevo" || activeTab === "" ? (
                <div className="mt-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label="Unidad de ingreso">
                      <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                        {NEO_UNITS.map((u) => (
                          <option key={u.slug} value={u.slug}>
                            {u.title}
                          </option>
                        ))}
                      </Select>
                    </Field>
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
                  <div className="mt-4">
                    <Btn variant="solid" accent={unitAccent} loading={create.isPending} onClick={() => create.mutate()}>
                      <Plus className="size-3" /> Registrar ingreso
                    </Btn>
                  </div>
                </div>
              ) : activeTab === "estadisticas" ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric label="Ingresos en la unidad" value={stats.total} accent={unitAccent} />
                  <Metric label="Hospitalizados" value={stats.hosp} accent={unitAccent} />
                  <Metric label="Prematuros" value={stats.prema} accent={unitAccent} />
                  <Metric label="Bajo peso" value={stats.bajoPeso} accent={unitAccent} />
                </div>
              ) : null}
            </Panel>
            {activeTab !== "nuevo" && activeTab !== "estadisticas" && activeTab !== "" && (
              <CensusTable
                title={
                  activeTab === "dia"
                    ? "Ingresos del día"
                    : activeTab === "espera"
                      ? "Lista de espera"
                      : activeTab === "referidos"
                        ? "Referidos"
                        : "Traslados"
                }
                subtitle="Filtro sobre el censo del servicio."
                accent={unitAccent}
                patients={
                  activeTab === "dia"
                    ? patients.filter(
                        (p: any) =>
                          new Date(p.fecha_ingreso).toDateString() === new Date().toDateString(),
                      )
                    : activeTab === "referidos"
                      ? patients.filter((p: any) => p.status === "referido")
                      : patients
                }
                isLoading={isLoading}
                search={search}
                onSearch={setSearch}
                onOpen={setPatientId}
              />
            )}
          </>
        ) : mod.kind === "hospitalizacion" ? (
          <>
            <UnitCards
              unit={unit}
              accent={unitAccent}
              onUnit={(u) => {
                setUnit(u);
                setUnitOpen(true);
              }}
            />
            {unitOpen && (
              <CensusTable
                title={`Censo · ${unitMeta.title}`}
                subtitle={unitMeta.description}
                accent={unitAccent}
                patients={patients}
                isLoading={isLoading}
                search={search}
                onSearch={setSearch}
                onOpen={setPatientId}
                onDelete={(id) => remove.mutate(id)}
                canDelete={isAdmin}
              />
            )}
          </>
        ) : mod.kind === "calculadoras" ? (
          <CalculatorsModule accent={unitAccent} />
        ) : mod.kind === "casos-cms" ? (
          <AcademicCmsModule module="casos" isAdmin={isAdmin} accent={unitAccent} />
        ) : mod.kind === "docencia-cms" ? (
          <AcademicCmsModule module="docencia" isAdmin={isAdmin} accent={unitAccent} />
        ) : mod.kind === "kotamed-ai" ? (
          <KotamedAiModule isAdmin={isAdmin} accent={unitAccent} />

        ) : mod.id === "administracion" && isAdmin ? (
          <>
            <Panel
              title="Administración del servicio"
              subtitle="Configura la arquitectura, los formularios y los protocolos sin tocar el código."
              icon={<Settings2 className="size-4" />}
              accent={unitAccent}
            >
              <ModuleTabs tabs={mod.tabs} active={activeTab} onSelect={setTab} accent={unitAccent} />
            </Panel>
            {activeTab === "formularios" ? (
              <HospitalConfigEditor config={config} accent={unitAccent} />
            ) : (
              <NavAdmin nav={nav} accent={unitAccent} />
            )}
          </>
        ) : (
          <GenericModule mod={mod} accent={unitAccent} onGoCenso={goCenso} />
        )}
      </div>
    </div>
  );
}

function UnitCards({
  unit,
  onUnit,
  accent,
}: {
  unit: string;
  onUnit: (slug: string) => void;
  accent: string;
}) {
  return (
    <Panel
      title="Áreas de hospitalización"
      subtitle="Cada área abre su propio censo dentro del servicio."
      icon={<BedDouble className="size-4" />}
      accent={accent}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {NEO_UNITS.map((u) => {
          const active = u.slug === unit;
          return (
            <button
              key={u.slug}
              onClick={() => onUnit(u.slug)}
              className={`rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-transparent text-white"
                  : "border-border/50 bg-background/40 hover:border-primary/40"
              }`}
              style={active ? { background: u.accent } : undefined}
            >
              <div className="text-[11px] font-extrabold leading-tight">{u.title}</div>
              <div
                className={`mt-1 text-[10px] leading-snug ${
                  active ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                {u.description}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
