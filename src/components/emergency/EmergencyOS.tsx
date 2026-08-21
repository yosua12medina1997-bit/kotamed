/**
 * KOTA EMERGENCY — Emergencia Pediátrica HNSEB.
 * Emergency Operating System: panel de jornada, mapa operativo de Observación
 * y Shock Trauma, ingreso rápido, workspace del paciente activo, pendientes,
 * modo entrega, asignación de internos por box y transferencia longitudinal a
 * Hospitalización Pediátrica (Kota Ward).
 */
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Calculator,
  CheckSquare,
  ClipboardList,
  Crosshair,
  Droplets,
  FlaskConical,
  LayoutGrid,
  ListChecks,
  Pencil,
  Plus,
  Repeat2,
  Replace,
  Settings2,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Btn, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { useMyRoles, useSupabaseUser } from "@/lib/session";
import { initialsOf, internColor, useWardRoster } from "@/lib/ward-assign";
import {
  useBeds as useWardBeds,
  usePavilions as useWardPavilions,
  useWardSave,
  useZones as useWardZones,
  WARD_KEYS,
} from "@/lib/ward-os";
import {
  AREAS,
  EMERG_KEYS,
  EMERG_STATUS,
  canEditPatient,
  elapsed,
  fmtDateTime,
  fmtHour,
  isRecheckDue,
  logEmergEvent,
  isDemoPatient,
  patientLabel,
  useEmergBoxAssignments,
  useEmergBoxes,
  useEmergDelete,
  useEmergPatients,
  useEmergSave,
  useEmergTasks,
  type EmergArea,
  type EmergBox,
  type EmergPatient,
  type EmergStatus,
  type EmergTask,
} from "@/lib/emergency-os";
import { AreaMap } from "./AreaMap";
import { AdmissionWizard } from "./AdmissionWizard";
import {
  BalanceHidrico,
  CalculadoraPediatrica,
  DestinoPaciente,
  EvaluacionInicial,
  Evoluciones,
  Examenes,
  HistoriaClinica,
  Interconsultas,
  Procedimientos,
  Reevaluaciones,
  Resumen,
  Tratamiento,
} from "./PatientWorkspace";
import { EmergCard, EmergDot, EmergPill, EmergStat, Modal, Row, SoftBadge } from "./ui";
import { KotaLearning } from "@/components/learning/KotaLearning";

type SectionId =
  | "panel"
  | "ingreso"
  | "observacion"
  | "shock"
  | "activos"
  | "p-resumen"
  | "p-inicial"
  | "p-historia"
  | "p-evoluciones"
  | "p-reeval"
  | "p-examenes"
  | "p-tratamiento"
  | "p-balance"
  | "p-interconsultas"
  | "p-procedimientos"
  | "p-calculadora"
  | "p-destino"
  | "aprendizaje"
  | "pendientes"
  | "entrega"
  | "config";

type NavItem = { id: SectionId; label: string; icon: typeof LayoutGrid; patient?: boolean; adminOnly?: boolean };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Jornada",
    items: [
      { id: "panel", label: "Panel de emergencia", icon: LayoutGrid },
      { id: "ingreso", label: "Nuevo ingreso", icon: Plus },
      { id: "observacion", label: "Observación", icon: Crosshair },
      { id: "shock", label: "Shock Trauma", icon: Zap },
      { id: "activos", label: "Pacientes activos", icon: Users },
    ],
  },
  {
    label: "Paciente activo",
    items: [
      { id: "p-resumen", label: "Resumen", icon: Stethoscope, patient: true },
      { id: "p-inicial", label: "Evaluación inicial", icon: Activity, patient: true },
      { id: "p-historia", label: "Historia clínica", icon: ClipboardList, patient: true },
      { id: "p-evoluciones", label: "Evoluciones", icon: Pencil, patient: true },
      { id: "p-reeval", label: "Reevaluaciones", icon: Repeat2, patient: true },
      { id: "p-examenes", label: "Exámenes auxiliares", icon: FlaskConical, patient: true },
      { id: "p-tratamiento", label: "Tratamiento", icon: Syringe, patient: true },
      { id: "p-balance", label: "Balance hídrico", icon: Droplets, patient: true },
      { id: "p-interconsultas", label: "Interconsultas", icon: Users, patient: true },
      { id: "p-procedimientos", label: "Procedimientos", icon: Activity, patient: true },
      { id: "p-calculadora", label: "Calculadora pediátrica", icon: Calculator, patient: true },
      { id: "p-destino", label: "Destino del paciente", icon: Replace, patient: true },
    ],
  },
  {
    label: "Jornada",
    items: [
      { id: "pendientes", label: "Pendientes", icon: CheckSquare },
      { id: "entrega", label: "Modo entrega", icon: ListChecks },
    ],
  },
  {
    label: "Aprendizaje",
    items: [{ id: "aprendizaje", label: "Kota Learning", icon: Sparkles }],
  },
  {
    label: "Sistema",
    items: [{ id: "config", label: "Configurar área", icon: Settings2, adminOnly: true }],
  },
];

const DAY_FMT = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "2-digit", month: "short" });

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}
function turno() {
  const h = new Date().getHours();
  return h < 13 ? "Turno mañana · En curso" : h < 19 ? "Turno tarde · En curso" : "Turno noche · En curso";
}

export function EmergencyOS({ isAdmin, accent }: { isAdmin: boolean; accent: string }) {
  const user = useSupabaseUser();
  const { data: myRoles = [] } = useMyRoles(user?.id);
  const isSuperAdmin = myRoles.includes("super_admin");

  const [section, setSection] = useState<SectionId>("panel");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switcher, setSwitcher] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [wizardBox, setWizardBox] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: boxes = [] } = useEmergBoxes();
  const { data: patients = [] } = useEmergPatients();
  const { data: assignments = [] } = useEmergBoxAssignments();
  const { data: roster = [] } = useWardRoster();
  const { data: tasks = [] } = useEmergTasks();
  const delPatient = useEmergDelete("emerg_patients", [EMERG_KEYS.patients]);

  const myBoxIds = useMemo(
    () => new Set(assignments.filter((a) => a.user_id === user?.id).map((a) => a.box_id)),
    [assignments, user?.id],
  );
  const boxOwners = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assignments) if (!m.has(a.box_id)) m.set(a.box_id, a.user_id);
    return m;
  }, [assignments]);
  const rosterMap = useMemo(
    () => new Map(roster.map((r) => [r.user_id, { full_name: r.full_name, initials: r.initials }])),
    [roster],
  );
  const boxById = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes]);

  const patient = patients.find((p) => p.id === activeId) ?? null;
  const canEdit = canEditPatient(patient, { isAdmin, userId: user?.id, myBoxIds });
  const myPatients = patients.filter(
    (p) => (p.box_id && myBoxIds.has(p.box_id)) || p.created_by === user?.id,
  );
  const obs = patients.filter((p) => p.area === "observacion");
  const shock = patients.filter((p) => p.area === "shock");
  const pendingTasks = tasks.filter((t) => t.status !== "hecho");

  function select(id: string, go: SectionId = "p-resumen") {
    setActiveId(id);
    setSwitcher(false);
    setSection(go);
  }

  const ctx = patient ? { patient, accent, canEdit } : null;
  const isPatientSection = section.startsWith("p-");

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* ─── Sidebar ─── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-border/50 bg-background/70 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="px-2 pb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]">
              <span style={{ color: accent }}>KOTA </span>
              <span className="text-rose-500">EMERGENCY</span>
            </div>
            <div className="truncate text-[11px] font-semibold text-muted-foreground">
              Emergencia Pediátrica
            </div>
          </div>

          <nav className="space-y-3">
            {NAV_GROUPS.map((group, gi) => {
              const items = group.items.filter((i) => !i.adminOnly || isAdmin);
              if (items.length === 0) return null;
              return (
                <div key={`${group.label}-${gi}`} className={gi > 0 ? "border-t border-border/40 pt-3" : ""}>
                  <div className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = section === item.id;
                      const dim = item.patient && !patient;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => (item.id === "ingreso" ? (setWizardBox(null), setWizard(true)) : setSection(item.id))}
                          className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition ${
                            active ? "text-white" : dim ? "text-muted-foreground/60 hover:bg-muted/40" : "hover:bg-muted/60"
                          }`}
                          style={active ? { background: accent } : undefined}
                        >
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        {patient && (
          <ActivePatientBar
            patient={patient}
            boxCode={patient.box_id ? (boxById.get(patient.box_id)?.code ?? null) : null}
            accent={accent}
            onSwitch={() => setSwitcher(true)}
            canDelete={isSuperAdmin}
            onDelete={() => {
              if (!window.confirm(`¿Eliminar definitivamente al paciente ${patientLabel(patient)}?`)) return;
              delPatient.mutate(patient.id, {
                onSuccess: () => {
                  toast.success("Paciente eliminado");
                  setActiveId(null);
                  setSection("activos");
                },
              });
            }}
          />
        )}

        {section === "panel" && (
          <Panel
            accent={accent}
            userName={
              (user?.user_metadata?.full_name as string | undefined) ??
              user?.email?.split("@")[0] ??
              "Interno"
            }
            patients={patients}
            obs={obs}
            shock={shock}
            myPatients={myPatients}
            pendingTasks={pendingTasks}
            boxById={boxById}
            onGoArea={(a) => setSection(a === "observacion" ? "observacion" : "shock")}
            onSelect={(id) => select(id)}
            onNew={() => {
              setWizardBox(null);
              setWizard(true);
            }}
            onPendientes={() => setSection("pendientes")}
          />
        )}

        {(section === "observacion" || section === "shock") && (
          <AreaMap
            area={section === "observacion" ? "observacion" : "shock"}
            boxes={boxes}
            patients={patients}
            tasks={tasks}
            accent={section === "shock" ? "#f43f5e" : accent}
            myBoxIds={myBoxIds}
            boxOwners={boxOwners}
            roster={rosterMap}
            activePatientId={activeId}
            onSelectPatient={(id) => select(id)}
            onAdmit={(boxId) => {
              setWizardBox(boxId);
              setWizard(true);
            }}
            onGoto={(id, s) =>
              select(id, s === "reeval" ? "p-reeval" : s === "evolucion" ? "p-evoluciones" : "p-examenes")
            }
          />
        )}

        {section === "activos" && (
          <ActivePatients
            accent={accent}
            patients={patients}
            boxById={boxById}
            myIds={new Set(myPatients.map((p) => p.id))}
            onSelect={(id) => select(id)}
            onNew={() => {
              setWizardBox(null);
              setWizard(true);
            }}
          />
        )}

        {isPatientSection &&
          (ctx ? (
            <>
              {section === "p-resumen" && <Resumen {...ctx} />}
              {section === "p-inicial" && <EvaluacionInicial {...ctx} />}
              {section === "p-historia" && <HistoriaClinica {...ctx} />}
              {section === "p-evoluciones" && <Evoluciones {...ctx} />}
              {section === "p-reeval" && <Reevaluaciones {...ctx} />}
              {section === "p-examenes" && <Examenes {...ctx} />}
              {section === "p-tratamiento" && <Tratamiento {...ctx} />}
              {section === "p-balance" && <BalanceHidrico {...ctx} />}
              {section === "p-interconsultas" && <Interconsultas {...ctx} />}
              {section === "p-procedimientos" && <Procedimientos {...ctx} />}
              {section === "p-calculadora" && <CalculadoraPediatrica {...ctx} />}
              {section === "p-destino" && (
                <DestinoPaciente
                  {...ctx}
                  onTransfer={() => setTransferOpen(true)}
                  onClosed={() => {
                    setActiveId(null);
                    setSection("panel");
                  }}
                />
              )}
            </>
          ) : (
            <NoPatient accent={accent} onSelect={() => setSwitcher(true)} />
          ))}

        {section === "aprendizaje" && (
          <KotaLearning
            module="emergency"
            accent={accent}
            isAdmin={isAdmin}
            userId={user?.id}
            roles={myRoles}
            patient={
              patient
                ? {
                    id: patient.id,
                    code: patient.code,
                    initials: patient.initials,
                    age_label: patient.age_label,
                    sex: patient.sex,
                    main_dx: patient.main_dx,
                    reason: patient.reason,
                    extra: patient.problems?.join(", ") ?? null,
                  }
                : null
            }
            onPickPatient={() => setSwitcher(true)}
          />
        )}

        {section === "pendientes" && (
          <Pendientes
            accent={accent}
            tasks={tasks}
            patients={patients}
            boxById={boxById}
            myIds={new Set(myPatients.map((p) => p.id))}
            onSelect={(id) => select(id)}
          />
        )}

        {section === "entrega" && (
          <ModoEntrega accent={accent} patients={patients} boxById={boxById} onSelect={(id) => select(id)} />
        )}

        {section === "config" && (
          <AreaConfig
            accent={accent}
            boxes={boxes}
            assignments={assignments}
            roster={roster}
            patients={patients}
          />
        )}
      </div>

      <AdmissionWizard
        open={wizard}
        onClose={() => setWizard(false)}
        accent={accent}
        boxes={boxes}
        patients={patients}
        presetBoxId={wizardBox}
        onCreated={(id) => {
          setWizard(false);
          select(id, "p-inicial");
        }}
      />

      <Modal
        open={switcher}
        title="Seleccionar paciente"
        subtitle="El paciente elegido se convierte en tu paciente activo de emergencia."
        onClose={() => setSwitcher(false)}
      >
        {patients.length === 0 ? (
          <Empty text="No hay pacientes en emergencia." />
        ) : (
          <ul className="space-y-2">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select(p.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 px-3 py-2 text-left hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black">{patientLabel(p)}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {(p.box_id ? boxById.get(p.box_id)?.code : null) ?? "Sin box"} ·{" "}
                      {p.area === "shock" ? "Shock Trauma" : "Observación"} · {elapsed(p.admitted_at)}
                    </span>
                  </span>
                  <EmergPill status={p.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {patient && (
        <TransferModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          accent={accent}
          patient={patient}
          onDone={() => {
            setTransferOpen(false);
            setActiveId(null);
            setSection("panel");
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Barra de paciente activo ────────────────────── */

function ActivePatientBar({
  patient,
  boxCode,
  accent,
  onSwitch,
  canDelete,
  onDelete,
}: {
  patient: EmergPatient;
  boxCode: string | null;
  accent: string;
  onSwitch: () => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const shock = patient.area === "shock";
  const color = shock ? "#f43f5e" : accent;
  return (
    <div
      className="grid gap-3 rounded-3xl border p-4 md:grid-cols-[minmax(0,1fr)_auto]"
      style={{ borderColor: `${color}44`, background: `${color}08` }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Paciente activo
          </span>
          <SoftBadge color={color}>
            {shock ? "🔴 Shock Trauma" : "Observación"} · {boxCode ?? "Sin box"}
          </SoftBadge>
          {isRecheckDue(patient) && <SoftBadge color="#f59e0b">Reevaluación pendiente</SoftBadge>}
          {isDemoPatient(patient) && <DemoTag />}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-xl font-black tracking-tight">{patientLabel(patient)}</span>
          <span className="text-[12px] text-muted-foreground">{patient.age_label ?? "—"}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11.5px]">
          <span className="text-muted-foreground">
            Ingreso: <b className="text-foreground">{fmtHour(patient.admitted_at)}</b>
          </span>
          <span className="text-muted-foreground">
            Tiempo en emergencia: <b className="text-foreground">{elapsed(patient.admitted_at)}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            Estado: <EmergPill status={patient.status} pulse />
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Btn variant="outline" accent={color} onClick={onSwitch}>
          Cambiar paciente
        </Btn>
        {canDelete && (
          <Btn variant="ghost" onClick={onDelete}>
            <Trash2 className="size-3.5" /> Eliminar
          </Btn>
        )}
      </div>
    </div>
  );
}

function NoPatient({ accent, onSelect }: { accent: string; onSelect: () => void }) {
  return (
    <EmergCard title="Workspace clínico">
      <div className="py-8 text-center">
        <p className="text-[13px] font-semibold">
          Selecciona un paciente para acceder a su workspace clínico.
        </p>
        <div className="mt-4 flex justify-center">
          <Btn variant="solid" accent={accent} onClick={onSelect}>
            Seleccionar paciente <ArrowRight className="size-3.5" />
          </Btn>
        </div>
      </div>
    </EmergCard>
  );
}

/* ─────────────────────────── Panel de emergencia ─────────────────────── */

function Panel({
  accent,
  userName,
  patients,
  obs,
  shock,
  myPatients,
  pendingTasks,
  boxById,
  onGoArea,
  onSelect,
  onNew,
  onPendientes,
}: {
  accent: string;
  userName: string;
  patients: EmergPatient[];
  obs: EmergPatient[];
  shock: EmergPatient[];
  myPatients: EmergPatient[];
  pendingTasks: EmergTask[];
  boxById: Map<string, EmergBox>;
  onGoArea: (a: EmergArea) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onPendientes: () => void;
}) {
  const prioritarios = patients.filter((p) => p.status === "prioritario" || p.status === "critico");
  const count = (list: EmergPatient[], s: EmergStatus) => list.filter((p) => p.status === s).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-3xl border border-border/60 bg-background/70 p-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight">
            {saludo()}, {userName}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Tu jornada en Emergencia Pediátrica.</p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[11.5px]">
            <span className="text-muted-foreground">
              Hospital <b className="text-foreground">HN Sergio E. Bernales</b>
            </span>
            <span className="text-muted-foreground">
              Área <b className="text-foreground">Emergencia Pediátrica</b>
            </span>
            <span className="text-muted-foreground">
              Turno <b className="text-foreground">{turno()}</b>
            </span>
            <span className="text-muted-foreground">
              Fecha <b className="text-foreground capitalize">{DAY_FMT.format(new Date())}</b>
            </span>
          </div>
        </div>
        <div className="flex items-start">
          <Btn variant="solid" accent={accent} onClick={onNew}>
            <Plus className="size-3.5" /> Nuevo ingreso
          </Btn>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <EmergStat label="Observación" value={String(obs.length).padStart(2, "0")} hint="pacientes" accent="#0ea5e9" icon={<Crosshair className="size-4" />} onClick={() => onGoArea("observacion")} />
        <EmergStat label="Shock Trauma" value={String(shock.length).padStart(2, "0")} hint="pacientes" accent="#f43f5e" icon={<Zap className="size-4" />} onClick={() => onGoArea("shock")} />
        <EmergStat label="Mis pacientes" value={String(myPatients.length).padStart(2, "0")} hint="asignados" accent={accent} icon={<UserRound className="size-4" />} />
        <EmergStat label="Prioritarios" value={String(prioritarios.length).padStart(2, "0")} hint="requieren atención" accent="#f59e0b" icon={<Activity className="size-4" />} />
        <EmergStat label="Pendientes" value={String(pendingTasks.length).padStart(2, "0")} hint="por completar" accent="#6366f1" icon={<CheckSquare className="size-4" />} onClick={onPendientes} />
      </div>

      <EmergCard title="Área de atención actual" subtitle="Selecciona el área donde trabajarás.">
        <div className="grid gap-4 lg:grid-cols-2">
          {AREAS.map((a) => {
            const list = a.value === "observacion" ? obs : shock;
            return (
              <div
                key={a.value}
                className="rounded-3xl border p-5"
                style={{ borderColor: `${a.color}33`, background: `${a.color}07` }}
              >
                <SoftBadge color={a.color}>{a.label}</SoftBadge>
                <p className="mt-2 text-[12px] text-muted-foreground">{a.hint}</p>
                <div className="mt-4 text-4xl font-black tracking-tight">
                  {String(list.length).padStart(2, "0")}
                </div>
                <div className="text-[11.5px] text-muted-foreground">pacientes</div>
                <ul className="mt-3 space-y-1 text-[12px]">
                  {a.value === "observacion" ? (
                    <>
                      <li className="flex items-center gap-2"><EmergDot status="estable" size={6} /> {count(list, "estable")} estables</li>
                      <li className="flex items-center gap-2"><EmergDot status="seguimiento" size={6} /> {count(list, "seguimiento")} en seguimiento</li>
                      <li className="flex items-center gap-2"><EmergDot status="prioritario" size={6} /> {count(list, "prioritario")} prioritario</li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2"><EmergDot status="critico" size={6} /> {count(list, "critico")} crítico</li>
                      <li className="flex items-center gap-2"><EmergDot status="estabilizacion" size={6} /> {count(list, "estabilizacion")} en estabilización</li>
                    </>
                  )}
                </ul>
                <div className="mt-4">
                  <Btn variant="outline" accent={a.color} onClick={() => onGoArea(a.value)}>
                    Ver {a.label} <ArrowRight className="size-3.5" />
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </EmergCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <EmergCard title="Mis pacientes hoy" subtitle="Pacientes bajo tu responsabilidad clínica.">
          {myPatients.length === 0 ? (
            <Empty text="Aún no tienes pacientes asignados." />
          ) : (
            <ul className="space-y-2">
              {myPatients.map((p) => (
                <PatientRow key={p.id} p={p} boxById={boxById} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </EmergCard>

        <EmergCard title="Pacientes por área" subtitle="Todo el servicio en una vista.">
          {patients.length === 0 ? (
            <Empty text="Sin pacientes registrados en emergencia." />
          ) : (
            <ul className="space-y-2">
              {patients.slice(0, 8).map((p) => (
                <PatientRow key={p.id} p={p} boxById={boxById} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </EmergCard>
      </div>

      <EmergCard title="Triage pediátrico — prioridad de atención">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Estable", "Puede esperar", EMERG_STATUS.estable.color],
            ["En observación", "Requiere seguimiento", EMERG_STATUS.seguimiento.color],
            ["Urgente", "Atención prioritaria", EMERG_STATUS.prioritario.color],
            ["Crítico", "Atención inmediata", EMERG_STATUS.critico.color],
          ].map(([l, h, c]) => (
            <div key={l} className="rounded-2xl border p-3" style={{ borderColor: `${c}33`, background: `${c}0a` }}>
              <div className="text-[11.5px] font-black uppercase tracking-wide" style={{ color: c }}>{l}</div>
              <div className="text-[11px] text-muted-foreground">{h}</div>
            </div>
          ))}
        </div>
      </EmergCard>
    </div>
  );
}

function PatientRow({
  p,
  boxById,
  onSelect,
}: {
  p: EmergPatient;
  boxById: Map<string, EmergBox>;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(p.id)}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/50 px-3 py-2 text-left transition hover:bg-muted/40"
      >
        <span className="rounded-lg bg-muted/60 px-2 py-1 text-[10.5px] font-black">
          {(p.box_id ? boxById.get(p.box_id)?.code : null) ?? "—"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-black">{patientLabel(p)}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{p.age_label ?? "—"}</span>
        </span>
        <span className="flex items-center gap-2">
          <EmergPill status={p.status} />
          <span className="text-[11px] font-bold text-muted-foreground">{elapsed(p.admitted_at)}</span>
        </span>
      </button>
    </li>
  );
}

/* ─────────────────────────── Pacientes activos ───────────────────────── */

function ActivePatients({
  accent,
  patients,
  boxById,
  myIds,
  onSelect,
  onNew,
}: {
  accent: string;
  patients: EmergPatient[];
  boxById: Map<string, EmergBox>;
  myIds: Set<string>;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [mine, setMine] = useState(false);
  const list = mine ? patients.filter((p) => myIds.has(p.id)) : patients;
  return (
    <EmergCard
      title="Pacientes activos"
      subtitle="Censo completo de Emergencia Pediátrica."
      actions={
        <>
          <Btn variant={mine ? "solid" : "outline"} accent={accent} onClick={() => setMine((v) => !v)}>
            Solo mis pacientes
          </Btn>
          <Btn variant="solid" accent={accent} onClick={onNew}>
            <Plus className="size-3.5" /> Nuevo ingreso
          </Btn>
        </>
      }
    >
      {list.length === 0 ? (
        <Empty text="Sin pacientes." />
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <PatientRow key={p.id} p={p} boxById={boxById} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </EmergCard>
  );
}

/* ─────────────────────────────── Pendientes ──────────────────────────── */

function Pendientes({
  accent,
  tasks,
  patients,
  boxById,
  myIds,
  onSelect,
}: {
  accent: string;
  tasks: EmergTask[];
  patients: EmergPatient[];
  boxById: Map<string, EmergBox>;
  myIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const save = useEmergSave("emerg_tasks", [EMERG_KEYS.tasks]);
  const del = useEmergDelete("emerg_tasks", [EMERG_KEYS.tasks]);
  const [filter, setFilter] = useState<"todo" | "mios" | "observacion" | "shock">("todo");
  const [title, setTitle] = useState("");
  const [patientId, setPatientId] = useState("");
  const [priority, setPriority] = useState("media");

  const pById = new Map(patients.map((p) => [p.id, p]));
  const list = tasks.filter((t) => {
    const p = t.patient_id ? pById.get(t.patient_id) : null;
    if (filter === "mios") return t.patient_id ? myIds.has(t.patient_id) : false;
    if (filter === "observacion") return p?.area === "observacion";
    if (filter === "shock") return p?.area === "shock";
    return true;
  });

  return (
    <div className="space-y-5">
      <EmergCard
        title="Pendientes de emergencia"
        subtitle="Vinculados a paciente, área, box, prioridad y hora."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="todo">Todo Emergencia</option>
            <option value="mios">Solo mis pacientes</option>
            <option value="observacion">Observación</option>
            <option value="shock">Shock Trauma</option>
          </Select>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Pendiente">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reevaluar dificultad respiratoria" />
          </Field>
          <Field label="Paciente">
            <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Sin paciente</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {patientLabel(p)} · {(p.box_id ? boxById.get(p.box_id)?.code : null) ?? "—"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Prioritario</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!title.trim()}
              onClick={async () => {
                await save.mutateAsync({ title: title.trim(), patient_id: patientId || null, priority });
                setTitle("");
              }}
            >
              <Plus className="size-3.5" /> Añadir
            </Btn>
          </div>
        </div>

        <div className="mt-4">
          {list.length === 0 ? (
            <Empty text="Sin pendientes." />
          ) : (
            <ul className="space-y-2">
              {list.map((t) => {
                const p = t.patient_id ? pById.get(t.patient_id) : null;
                const color = t.priority === "alta" ? "#f43f5e" : t.priority === "media" ? "#f59e0b" : accent;
                return (
                  <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SoftBadge color={color}>{t.priority === "alta" ? "Prioritario" : t.priority}</SoftBadge>
                        {p && (
                          <button type="button" onClick={() => onSelect(p.id)} className="text-[11px] font-bold underline-offset-2 hover:underline">
                            {(p.box_id ? boxById.get(p.box_id)?.code : null) ?? "—"} · {patientLabel(p)}
                          </button>
                        )}
                        <span className="text-[11px] text-muted-foreground">{fmtDateTime(t.due_at ?? null)}</span>
                      </div>
                      <div className={`truncate text-[13px] font-semibold ${t.status === "hecho" ? "line-through opacity-60" : ""}`}>
                        {t.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.status !== "hecho" && (
                        <Btn variant="outline" onClick={() => save.mutate({ id: t.id, status: "hecho", done_at: new Date().toISOString() })}>
                          Completar
                        </Btn>
                      )}
                      <button type="button" onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </EmergCard>
    </div>
  );
}

/* ─────────────────────────────── Modo entrega ────────────────────────── */

function ModoEntrega({
  accent,
  patients,
  boxById,
  onSelect,
}: {
  accent: string;
  patients: EmergPatient[];
  boxById: Map<string, EmergBox>;
  onSelect: (id: string) => void;
}) {
  const save = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const [index, setIndex] = useState(0);
  const list = patients;
  const p = list[Math.min(index, Math.max(0, list.length - 1))];

  if (list.length === 0) return <EmergCard title="Modo entrega"><Empty text="Sin pacientes que entregar." /></EmergCard>;

  return (
    <EmergCard
      title="Modo entrega"
      subtitle={`Paciente ${index + 1} de ${list.length} · cambio de turno`}
      actions={
        <>
          <Btn variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))}>Anterior</Btn>
          <Btn variant="outline" onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}>Siguiente</Btn>
        </>
      }
    >
      {p && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SoftBadge color={p.area === "shock" ? "#f43f5e" : accent}>
              {(p.box_id ? boxById.get(p.box_id)?.code : null) ?? "Sin box"}
            </SoftBadge>
            <span className="text-xl font-black tracking-tight">{patientLabel(p)}</span>
            <EmergPill status={p.status} />
            {p.handoff_at && <SoftBadge color="#16a34a">Entregado {fmtHour(p.handoff_at)}</SoftBadge>}
          </div>
          <div className="grid gap-1.5 rounded-2xl border border-border/50 bg-background/50 p-3">
            <Row label="Problema principal" value={p.main_dx ?? p.reason ?? "—"} />
            <Row label="Estado" value={EMERG_STATUS[p.status]?.label ?? "—"} />
            <Row label="Tiempo en emergencia" value={elapsed(p.admitted_at)} />
            <Row label="Última nota" value={p.notes ?? "—"} />
            <Row label="Destino probable" value={p.disposition ?? "Por definir"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="solid"
              accent={accent}
              onClick={() =>
                save.mutate(
                  { id: p.id, handoff_at: new Date().toISOString() },
                  { onSuccess: () => toast.success("Paciente entregado") },
                )
              }
            >
              Marcar entregado
            </Btn>
            <Btn variant="outline" onClick={() => onSelect(p.id)}>Abrir paciente</Btn>
          </div>
        </div>
      )}
    </EmergCard>
  );
}

/* ────────────────────── Configuración y asignaciones ─────────────────── */

function AreaConfig({
  accent,
  boxes,
  assignments,
  roster,
  patients,
}: {
  accent: string;
  boxes: EmergBox[];
  assignments: { id: string; box_id: string; user_id: string }[];
  roster: { user_id: string; full_name: string; initials: string }[];
  patients: EmergPatient[];
}) {
  const saveBox = useEmergSave("emerg_boxes", [EMERG_KEYS.boxes]);
  const delBox = useEmergDelete("emerg_boxes", [EMERG_KEYS.boxes]);
  const saveAssign = useEmergSave("emerg_box_assignments", [EMERG_KEYS.boxAssignments]);
  const delAssign = useEmergDelete("emerg_box_assignments", [EMERG_KEYS.boxAssignments]);
  const [code, setCode] = useState("");
  const [area, setArea] = useState<EmergArea>("observacion");

  const ownerOf = new Map(assignments.map((a) => [a.box_id, a]));
  const rosterById = new Map(roster.map((r) => [r.user_id, r]));

  return (
    <div className="space-y-5">
      <EmergCard title="Boxes del área" subtitle="Crea, renombra o retira boxes de Observación y Shock Trauma.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Código">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BOX 09" />
          </Field>
          <Field label="Área">
            <Select value={area} onChange={(e) => setArea(e.target.value as EmergArea)}>
              <option value="observacion">Observación</option>
              <option value="shock">Shock Trauma</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Btn
              variant="solid"
              accent={accent}
              disabled={!code.trim()}
              onClick={async () => {
                await saveAssignSafe(() =>
                  saveBox.mutateAsync({
                    code: code.trim().toUpperCase(),
                    area,
                    label: area === "shock" ? "Shock Trauma" : "Observación",
                    sort_order: boxes.length + 1,
                  }),
                );
                setCode("");
              }}
            >
              <Plus className="size-3.5" /> Añadir box
            </Btn>
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {boxes.map((b) => {
            const a = ownerOf.get(b.id);
            const owner = a ? rosterById.get(a.user_id) : undefined;
            const occupied = patients.some((p) => p.box_id === b.id);
            return (
              <li key={b.id} className="rounded-2xl border border-border/50 bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-black">{b.code}</span>
                  <div className="flex items-center gap-2">
                    <SoftBadge color={b.area === "shock" ? "#f43f5e" : accent}>
                      {b.area === "shock" ? "Shock" : "Observación"}
                    </SoftBadge>
                    <button
                      type="button"
                      disabled={occupied}
                      title={occupied ? "El box está ocupado" : "Retirar box"}
                      onClick={() => delBox.mutate(b.id)}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <Select
                    value={a?.user_id ?? ""}
                    onChange={async (e) => {
                      const uid = e.target.value;
                      if (a) await delAssign.mutateAsync(a.id);
                      if (uid) await saveAssign.mutateAsync({ box_id: b.id, user_id: uid });
                    }}
                  >
                    <option value="">Sin asignar</option>
                    {roster.map((r) => (
                      <option key={r.user_id} value={r.user_id}>
                        {r.full_name}
                      </option>
                    ))}
                  </Select>
                  {owner && (
                    <span
                      className="grid size-8 place-items-center rounded-xl text-[10.5px] font-black"
                      style={{ background: internColor(owner.user_id), color: "#0f172a" }}
                    >
                      {initialsOf(owner.full_name)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </EmergCard>
    </div>
  );
}

async function saveAssignSafe(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch {
    /* el error ya se muestra vía toast */
  }
}

/* ───────────────── Transferencia a Hospitalización (Kota Ward) ────────── */

function TransferModal({
  open,
  onClose,
  accent,
  patient,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  patient: EmergPatient;
  onDone: () => void;
}) {
  const { data: pavilions = [] } = useWardPavilions();
  const [pavilionId, setPavilionId] = useState<string | null>(null);
  const activePav = pavilionId ?? pavilions[0]?.id ?? null;
  const { data: zones = [] } = useWardZones(activePav);
  const { data: wardBeds = [] } = useWardBeds();
  const { data: roster = [] } = useWardRoster();
  const [zoneId, setZoneId] = useState("");
  const [bedId, setBedId] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const saveWardPatient = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const saveAssignment = useWardSave("ward_assignments", [WARD_KEYS.assignments]);
  const saveEmerg = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);

  const zoneBeds = wardBeds.filter((b) => b.zone_id === zoneId);

  return (
    <Modal
      open={open}
      title="Transferencia a Hospitalización"
      subtitle="El paciente continúa su historia dentro de Kota Ward · Hospitalización Pediátrica."
      onClose={onClose}
    >
      <div className="rounded-2xl border border-border/50 bg-background/50 p-3 text-[12px]">
        <Row label="Paciente" value={patientLabel(patient)} />
        <Row label="Ingreso a emergencia" value={fmtDateTime(patient.admitted_at)} />
        <Row label="Diagnóstico" value={patient.main_dx ?? patient.reason ?? "—"} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Pabellón">
          <Select value={activePav ?? ""} onChange={(e) => setPavilionId(e.target.value)}>
            {pavilions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Sala">
          <Select value={zoneId} onChange={(e) => { setZoneId(e.target.value); setBedId(""); }}>
            <option value="">Selecciona sala</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cama">
          <Select value={bedId} onChange={(e) => setBedId(e.target.value)}>
            <option value="">Selecciona cama</option>
            {zoneBeds.map((b) => (
              <option key={b.id} value={b.id}>{b.number}</option>
            ))}
          </Select>
        </Field>
        <Field label="Interno responsable">
          <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Sin asignar</option>
            {roster.map((r) => (
              <option key={r.user_id} value={r.user_id}>{r.full_name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="mt-3 text-[11.5px] text-muted-foreground">
        La atención en Emergencia queda como historial de solo lectura y la nueva actividad se
        registra desde Hospitalización.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn
          variant="solid"
          accent={accent}
          disabled={!bedId}
          loading={saveWardPatient.isPending}
          onClick={async () => {
            const wardId = await saveWardPatient.mutateAsync({
              bed_id: bedId,
              initials: patient.initials,
              sex: patient.sex,
              age_label: patient.age_label,
              weight_kg: patient.weight_kg,
              admitted_at: new Date().toISOString().slice(0, 10),
              reason: patient.reason,
              main_dx: patient.main_dx,
              status: "seguimiento",
              priority: "media",
              notes: [
                `Transferido desde Emergencia Pediátrica (${fmtDateTime(patient.admitted_at)}).`,
                patient.general_state ? `Estado general al ingreso: ${patient.general_state}.` : "",
                patient.notes ?? "",
              ]
                .filter(Boolean)
                .join(" "),
            });
            if (!wardId) return;
            if (ownerId) {
              await saveAssignment.mutateAsync({ patient_id: wardId, user_id: ownerId, role: "interno", active: true });
            }
            await saveEmerg.mutateAsync({
              id: patient.id,
              disposition: "hospitalizacion",
              disposition_at: new Date().toISOString(),
              discharged_at: new Date().toISOString(),
              ward_patient_id: wardId,
            });
            await logEmergEvent({
              patient_id: patient.id,
              kind: "transferencia",
              title: "Transferido a Hospitalización Pediátrica",
              detail: `Pabellón/sala/cama seleccionados · ${fmtDateTime(new Date().toISOString())}`,
            });
            toast.success("Transferencia confirmada");
            onDone();
          }}
        >
          Confirmar transferencia <ArrowRight className="size-3.5" />
        </Btn>
      </div>
    </Modal>
  );
}
