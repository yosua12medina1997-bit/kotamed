/**
 * Kota Ward — Clinical Workspace longitudinal de Hospitalización Pediátrica
 * (Rotación Pediatría · HNSEB). Arquitectura: Panel del interno · Croquis del
 * pabellón · Mis pacientes · Workspace del paciente activo · Jornada ·
 * Aprendizaje · Sistema. Todo gira alrededor del PACIENTE ACTIVO.
 */
import { useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  BookOpen,
  Calculator,
  CalendarDays,
  ClipboardList,
  Crosshair,
  Droplets,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  LayoutGrid,
  ListChecks,
  MapPin,
  Paperclip,
  Pencil,
  Pill,
  Plus,
  Repeat2,
  Settings2,
  Siren,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { useSupabaseUser } from "@/lib/session";
import {
  editablePatientIds,
  initialsOf,
  internColor,
  ownerByBed,
  rosterMap,
  useBedAssignments,
  useWardRoster,
} from "@/lib/ward-assign";
import {
  AssignmentsModal,
  DistributionModal,
  DistributionSummary,
  InternLegend,
  ZoneAssignmentSummary,
} from "@/components/ward/BedAssignments";
import {
  PATIENT_STATUS,
  WARD_KEYS,
  ZONE_KINDS,
  dxKeysFor,
  hospitalDay,
  patientLabel,
  useAssignments,
  useBeds,
  useCompetencies,
  useCompetencyProgress,
  useLearningCases,
  usePatients,
  usePavilions,
  useStudyLinks,
  useTasks,
  useWardDelete,
  useWardSave,
  useZones,
  type WardBed,
  type WardPatient,
  type WardTask,
  type WardZone,
} from "@/lib/ward-os";
import { PavilionMap } from "./PavilionMap";
import {
  PatientResumen,
  ProblemsAndPlan,
  SoapEditor,
  StudyRoute,
} from "./PatientDetail";
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
  Pendientes,
  Procedimientos,
  Tratamiento,
} from "./ClinicalOrders";
import { FileDrop } from "./FileDrop";
import { WardCalculator } from "./WardCalculator";
import { PatientForm } from "./PatientForm";
import { RoundMode } from "./RoundMode";
import { Bar, KpiTile, Modal, StatusDot, StatusPill, WardCard } from "./ui";

type SectionId =
  | "inicio"
  | "pabellon"
  | "pacientes"
  | "p-resumen"
  | "p-historia"
  | "p-soap"
  | "p-examenes"
  | "p-tratamiento"
  | "p-balance"
  | "p-interconsultas"
  | "p-procedimientos"
  | "p-calculadora"
  | "ronda"
  | "pendientes"
  | "competencias"
  | "casos"
  | "config";

type NavItem = {
  id: SectionId;
  label: string;
  icon: typeof MapPin;
  adminOnly?: boolean;
  patient?: boolean;
};

const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { id: "inicio", label: "Panel del interno", icon: LayoutGrid },
      { id: "pabellon", label: "Croquis del pabellón", icon: Crosshair },
      { id: "pacientes", label: "Mis pacientes", icon: Users },
    ],
  },
  {
    label: "Paciente",
    items: [
      { id: "p-resumen", label: "Resumen clínico", icon: Stethoscope, patient: true },
      { id: "p-historia", label: "Historia clínica", icon: ClipboardList, patient: true },
      { id: "p-soap", label: "Evolución / SOAP", icon: Pencil, patient: true },
      { id: "p-examenes", label: "Exámenes auxiliares", icon: FlaskConical, patient: true },
      { id: "p-tratamiento", label: "Tratamiento", icon: Pill, patient: true },
      { id: "p-balance", label: "Balance hídrico", icon: Droplets, patient: true },
      { id: "p-interconsultas", label: "Interconsultas", icon: Users, patient: true },
      { id: "p-procedimientos", label: "Procedimientos", icon: Syringe, patient: true },
      { id: "p-calculadora", label: "Calculadora pediátrica", icon: Calculator, patient: true },
    ],
  },
  {
    label: "Jornada",
    items: [
      { id: "ronda", label: "Modo ronda", icon: Activity },
      { id: "pendientes", label: "Pendientes clínicos", icon: ListChecks },
    ],
  },
  {
    label: "Aprendizaje",
    items: [
      { id: "competencias", label: "Competencias", icon: GraduationCap },
      { id: "casos", label: "Casos de aprendizaje", icon: BookOpen },
    ],
  },
  {
    label: "Sistema",
    items: [{ id: "config", label: "Configurar pabellón", icon: Settings2, adminOnly: true }],
  },
];

const DAY_FMT = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "2-digit", month: "short" });

function turnoLabel(): string {
  const h = new Date().getHours();
  if (h < 13) return "Turno mañana · En curso";
  if (h < 19) return "Turno tarde · En curso";
  return "Turno noche · En curso";
}

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function WardOS({ isAdmin, accent }: { isAdmin: boolean; accent: string }) {
  const user = useSupabaseUser();
  const [section, setSection] = useState<SectionId>("inicio");
  const [pavilionId, setPavilionId] = useState<string | null>(null);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formBed, setFormBed] = useState<string | null>(null);
  const [editing, setEditing] = useState<WardPatient | null>(null);

  const { data: pavilions = [] } = usePavilions();
  const activePavilion = pavilionId ?? pavilions[0]?.id ?? null;
  const { data: zones = [] } = useZones(activePavilion);
  const { data: beds = [] } = useBeds();
  const { data: patients = [] } = usePatients();
  const { data: assignments = [] } = useAssignments();
  const { data: bedAssignments = [] } = useBedAssignments();
  const { data: roster = [] } = useWardRoster();
  const { data: tasks = [] } = useTasks();

  const zoneIds = useMemo(() => new Set(zones.map((z) => z.id)), [zones]);
  const pavilionBeds = useMemo(() => beds.filter((b) => zoneIds.has(b.zone_id)), [beds, zoneIds]);
  const pavilionBedIds = useMemo(() => new Set(pavilionBeds.map((b) => b.id)), [pavilionBeds]);
  const pavilionPatients = useMemo(
    () => patients.filter((p) => (p.bed_id ? pavilionBedIds.has(p.bed_id) : true)),
    [patients, pavilionBedIds],
  );

  /** Camas cuya responsabilidad clínica es del usuario actual. */
  const myBedIds = useMemo(
    () => new Set(bedAssignments.filter((a) => a.user_id === user?.id).map((a) => a.bed_id)),
    [bedAssignments, user?.id],
  );

  const myPatientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of assignments) if (a.user_id === user?.id) ids.add(a.patient_id);
    for (const p of patients) {
      if (p.created_by && p.created_by === user?.id) ids.add(p.id);
      if (p.bed_id && myBedIds.has(p.bed_id)) ids.add(p.id);
    }
    return ids;
  }, [assignments, myBedIds, patients, user?.id]);

  /** Pacientes que el usuario puede editar (mismas reglas que la base de datos). */
  const editableIds = useMemo(
    () =>
      isAdmin
        ? null
        : editablePatientIds(patients, bedAssignments, user?.id),
    [bedAssignments, isAdmin, patients, user?.id],
  );

  const myPatients = useMemo(
    () => pavilionPatients.filter((p) => myPatientIds.has(p.id)),
    [pavilionPatients, myPatientIds],
  );

  const patient = patients.find((p) => p.id === activePatientId) ?? null;
  const pendingTasks = tasks.filter((t) => t.status !== "hecho");
  const pavilionCode = pavilions.find((p) => p.id === activePavilion)?.code ?? null;
  const pavilionName = pavilions.find((p) => p.id === activePavilion)?.name ?? null;

  const bed = beds.find((b) => b.id === patient?.bed_id) ?? null;
  const zone = zones.find((z) => z.id === bed?.zone_id) ?? null;
  const isPatientSection = section.startsWith("p-");

  function selectPatient(id: string, go: SectionId = "p-resumen") {
    setActivePatientId(id);
    setSwitcherOpen(false);
    setSection(go);
  }

  const canEditActive = !patient || isAdmin || (editableIds?.has(patient.id) ?? true);
  const ctx = { patient: patient as WardPatient, accent, userId: user?.id, isAdmin };

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* ─── Menú lateral ─── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-border/50 bg-background/70 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="px-2 pb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
              Kota Ward
            </div>
            <div className="truncate text-[11px] font-semibold text-muted-foreground">
              Hospitalización Pediátrica
            </div>
          </div>

          <nav className="space-y-3">
            {NAV_GROUPS.map((group, gi) => {
              const items = group.items.filter((i) => !i.adminOnly || isAdmin);
              if (items.length === 0) return null;
              return (
                <div key={group.label ?? gi} className={gi > 0 ? "border-t border-border/40 pt-3" : ""}>
                  {group.label && (
                    <div className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = section === item.id;
                      const dim = item.patient && !patient;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSection(item.id)}
                          className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition ${
                            active
                              ? "text-white"
                              : dim
                                ? "text-muted-foreground/60 hover:bg-muted/40"
                                : "hover:bg-muted/60"
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

          {pavilions.length > 1 && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <Field label="Pabellón">
                <Select value={activePavilion ?? ""} onChange={(e) => setPavilionId(e.target.value)}>
                  {pavilions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        {/* ─── Barra de paciente activo ─── */}
        {patient && (
          <ActivePatientBar
            patient={patient}
            bedNumber={bed?.number ?? null}
            zoneLabel={zone?.label ?? null}
            pavilionCode={pavilionCode}
            accent={accent}
            onSwitch={() => setSwitcherOpen(true)}
            onNewEvolution={() => setSection("p-soap")}
            onTasks={() => setSection("pendientes")}
          />
        )}

        {section === "inicio" && (
          <Dashboard
            accent={accent}
            zones={zones}
            beds={pavilionBeds}
            patients={pavilionPatients}
            myPatients={myPatients}
            pendingTasks={pendingTasks}
            myBedIds={myBedIds}
            pavilionCode={pavilionCode}
            userName={
              (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
              user?.email?.split("@")[0] ??
              "interno"
            }
            onSelectPatient={selectPatient}
            onOpenCroquis={() => setSection("pabellon")}
            onAllPatients={() => setSection("pacientes")}
            onNewPatient={() => {
              setEditing(null);
              setFormBed(null);
              setFormOpen(true);
            }}
          />
        )}

        {section === "pabellon" && (
          <WardCard
            title="Croquis del pabellón"
            subtitle="Toca una cama para convertirla en tu paciente activo; las camas libres permiten registrar un ingreso."
            icon={<Crosshair className="size-4" style={{ color: accent }} />}
            actions={
              <Btn
                variant="solid"
                accent={accent}
                onClick={() => {
                  setEditing(null);
                  setFormBed(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Nuevo ingreso
              </Btn>
            }
          >
            <PavilionMap
              zones={zones}
              beds={pavilionBeds}
              patients={pavilionPatients}
              accent={accent}
              myPatientIds={myPatientIds}
              selectedPatientId={activePatientId}
              pavilionCode={pavilionCode}
              pavilionName={pavilionName}
              tasks={tasks}
              myBedIds={myBedIds}
              bedOwners={ownerByBed(bedAssignments)}
              roster={rosterMap(roster)}
              isAdmin={isAdmin}
              pavilions={pavilions}
              activePavilionId={activePavilion}
              onPavilion={setPavilionId}
              canEdit={isAdmin}
              userId={user?.id}
              onSelectPatient={(id) => selectPatient(id)}
              onSelectBed={(b) => {
                setEditing(null);
                setFormBed(b.id);
                setFormOpen(true);
              }}
            />
          </WardCard>
        )}

        {section === "pacientes" && (
          <Census
            accent={accent}
            zones={zones}
            beds={pavilionBeds}
            patients={pavilionPatients}
            myPatientIds={myPatientIds}
            onSelect={(id) => selectPatient(id)}
            onNew={() => {
              setEditing(null);
              setFormBed(null);
              setFormOpen(true);
            }}
          />
        )}

        {isPatientSection && patient && !canEditActive && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[12.5px] font-semibold text-amber-700 dark:text-amber-300">
            Esta cama está asignada a otro interno. Solo puedes editar la información clínica de tus
            camas asignadas; aquí puedes consultar en modo lectura.
          </div>
        )}

        {isPatientSection &&
          (patient ? (
            <>
              {section === "p-resumen" && (
                <PatientSubTabs
                  accent={accent}
                  tabs={[
                    { id: "resumen", label: "Resumen", icon: Stethoscope, render: () => (
                      <>
                        <StageTracker {...ctx} />
                        <PatientResumen patient={patient} accent={accent} />
                      </>
                    ) },
                    { id: "problemas", label: "Problemas y plan", icon: ListChecks, render: () => <ProblemsAndPlan patient={patient} accent={accent} /> },
                    { id: "timeline", label: "Línea de tiempo", icon: CalendarDays, render: () => <ClinicalTimeline {...ctx} /> },
                    { id: "alta", label: "Resumen y alta", icon: FileText, render: () => <ResumenYAlta {...ctx} /> },
                    { id: "estudio", label: "Ruta de estudio", icon: BookOpen, render: () => <StudyRoute patient={patient} accent={accent} /> },
                  ]}
                />
              )}
              {section === "p-historia" && (
                <PatientSubTabs
                  accent={accent}
                  tabs={[
                    { id: "historia", label: "Identificación y enfermedad actual", icon: ClipboardList, render: () => <HistoriaClinica {...ctx} /> },
                    { id: "inicial", label: "Atención inicial", icon: Siren, render: () => <AtencionInicial {...ctx} /> },
                    { id: "examen", label: "Examen físico", icon: HeartPulse, render: () => <ExamenFisico {...ctx} /> },
                    { id: "vitales", label: "Signos vitales", icon: Activity, render: () => <Monitorizacion {...ctx} /> },
                    { id: "archivos", label: "Archivos", icon: Paperclip, render: () => (
                      <WardCard title="Archivos del expediente">
                        <FileDrop patientId={patient.id} refKind="all" accent={accent} userId={user?.id} isAdmin={isAdmin} />
                      </WardCard>
                    ) },
                  ]}
                />
              )}
              {section === "p-soap" && <SoapEditor patient={patient} accent={accent} />}
              {section === "p-examenes" && <ExamenesAuxiliares {...ctx} />}
              {section === "p-tratamiento" && <Tratamiento {...ctx} />}
              {section === "p-balance" && <BalanceHidrico {...ctx} />}
              {section === "p-interconsultas" && <Interconsultas {...ctx} />}
              {section === "p-procedimientos" && <Procedimientos {...ctx} />}
              {section === "p-calculadora" && <WardCalculator patient={patient} accent={accent} />}
            </>
          ) : (
            <NoPatient accent={accent} onSelect={() => setSwitcherOpen(true)} />
          ))}

        {section === "ronda" && (
          <RoundMode
            patients={myPatients.length > 0 ? myPatients : pavilionPatients}
            zones={zones}
            beds={beds}
            accent={accent}
          />
        )}

        {section === "pendientes" && (
          <Pendientes
            accent={accent}
            patients={patients}
            patientId={activePatientId}
            onSelectPatient={(id) => selectPatient(id)}
          />
        )}

        {section === "competencias" && <Competencies accent={accent} userId={user?.id} />}
        {section === "casos" && <LearningCases accent={accent} patients={patients} />}
        {section === "config" && (
          <WardConfig
            accent={accent}
            pavilionId={activePavilion}
            pavilionName={pavilionName}
            zones={zones}
            beds={pavilionBeds}
          />
        )}
      </div>

      <Modal
        open={switcherOpen}
        title="Seleccionar paciente"
        subtitle="El paciente elegido se convierte en tu paciente activo en todo el workspace."
        onClose={() => setSwitcherOpen(false)}
      >
        <PatientPicker
          accent={accent}
          patients={(myPatients.length > 0 ? myPatients : pavilionPatients)}
          beds={beds}
          zones={zones}
          activeId={activePatientId}
          onPick={(id) => selectPatient(id, isPatientSection ? section : "p-resumen")}
        />
      </Modal>

      {formOpen && (
        <PatientForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          patient={editing}
          bedId={formBed}
          zones={zones}
          beds={pavilionBeds}
          patients={patients}
          accent={accent}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Barra de paciente activo ─────────────────────── */

function ActivePatientBar({
  patient,
  bedNumber,
  zoneLabel,
  pavilionCode,
  accent,
  onSwitch,
  onNewEvolution,
  onTasks,
}: {
  patient: WardPatient;
  bedNumber: string | null;
  zoneLabel: string | null;
  pavilionCode: string | null;
  accent: string;
  onSwitch: () => void;
  onNewEvolution: () => void;
  onTasks: () => void;
}) {
  return (
    <section
      className="rounded-3xl border border-border/50 bg-background/70 px-5 py-4 backdrop-blur"
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <StatusDot status={patient.status} size={7} /> Paciente activo
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-base font-black tracking-tight">
              {bedNumber ? `Cama ${bedNumber}` : "Sin cama"}
              {pavilionCode ? ` · Pabellón ${pavilionCode}` : ""}
            </span>
            <StatusPill status={patient.status} />
          </div>
          <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {[
              patientLabel(patient),
              patient.age_label,
              zoneLabel,
              `Día ${String(hospitalDay(patient.admitted_at)).padStart(2, "0")} de hospitalización`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Btn variant="outline" accent={accent} onClick={onNewEvolution}>
            <Pencil className="size-3.5" /> Nueva evolución
          </Btn>
          <Btn onClick={onTasks}>
            <ListChecks className="size-3.5" /> Pendientes
          </Btn>
          <Btn onClick={onSwitch}>
            <Repeat2 className="size-3.5" /> Cambiar paciente
          </Btn>
        </div>
      </div>
    </section>
  );
}

function NoPatient({ accent, onSelect }: { accent: string; onSelect: () => void }) {
  return (
    <WardCard>
      <div className="grid place-items-center gap-4 px-6 py-14 text-center">
        <span
          className="grid size-14 place-items-center rounded-2xl"
          style={{ background: `${accent}14`, color: accent }}
        >
          <UserRound className="size-6" />
        </span>
        <div>
          <h3 className="text-base font-black tracking-tight">Sin paciente activo</h3>
          <p className="mt-1 max-w-sm text-[12.5px] text-muted-foreground">
            Selecciona un paciente para acceder a su información clínica.
          </p>
        </div>
        <Btn variant="solid" accent={accent} onClick={onSelect}>
          Seleccionar paciente →
        </Btn>
      </div>
    </WardCard>
  );
}

function PatientPicker({
  accent,
  patients,
  beds,
  zones,
  activeId,
  onPick,
}: {
  accent: string;
  patients: WardPatient[];
  beds: WardBed[];
  zones: WardZone[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const list = patients.filter((p) =>
    `${patientLabel(p)} ${p.main_dx ?? ""} ${p.code ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cama, iniciales o diagnóstico" />
      {list.length === 0 && <Empty text="No hay pacientes disponibles." />}
      <div className="max-h-[50vh] space-y-2 overflow-y-auto">
        {list.map((p) => {
          const b = beds.find((x) => x.id === p.bed_id);
          const z = zones.find((x) => x.id === b?.zone_id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-primary/40 ${
                activeId === p.id ? "border-primary/50 bg-primary/5" : "border-border/50 bg-background/40"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">
                  {b ? `Cama ${b.number}` : "Sin cama"} · {patientLabel(p)}
                </span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {p.main_dx ?? "Sin diagnóstico"} · día {hospitalDay(p.admitted_at)}
                  {z ? ` · ${z.label}` : ""}
                </span>
              </span>
              <StatusPill status={p.status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── Sub-navegación del paciente ─────────────────── */

function PatientSubTabs({
  accent,
  tabs,
}: {
  accent: string;
  tabs: { id: string; label: string; icon: typeof MapPin; render: () => React.ReactNode }[];
}) {
  const [tab, setTab] = useState(tabs[0]!.id);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]!;
  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-border/50 bg-background/60 p-1.5">
        {tabs.map((t) => {
          const active = t.id === current.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition ${
                active ? "text-white" : "text-muted-foreground hover:bg-muted/60"
              }`}
              style={active ? { background: accent } : undefined}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>
      {current.render()}
    </div>
  );
}

/* ────────────────────────────── Panel inicio ────────────────────────────── */

function Dashboard({
  accent,
  zones,
  beds,
  patients,
  myPatients,
  pendingTasks,
  pavilionCode,
  userName,
  onSelectPatient,
  onOpenCroquis,
  onAllPatients,
  onNewPatient,
}: {
  accent: string;
  zones: WardZone[];
  beds: WardBed[];
  patients: WardPatient[];
  myPatients: WardPatient[];
  pendingTasks: WardTask[];
  pavilionCode?: string | null;
  userName: string;
  onSelectPatient: (id: string) => void;
  onOpenCroquis: () => void;
  onAllPatients: () => void;
  onNewPatient: () => void;
}) {
  const { data: links = [] } = useStudyLinks();
  const critical = patients.filter((p) => p.status === "critico" || p.status === "prioritario");
  const myZone = zones.find((z) =>
    beds.some((b) => b.zone_id === z.id && myPatients.some((p) => p.bed_id === b.id)),
  );
  const myBeds = beds
    .filter((b) => myPatients.some((p) => p.bed_id === b.id))
    .slice(0, 6);

  const suggested = useMemo(() => {
    const keys = new Set<string>();
    for (const p of myPatients.length > 0 ? myPatients : patients) {
      for (const key of dxKeysFor(`${p.main_dx ?? ""} ${p.secondary_dx.join(" ")}`)) keys.add(key);
    }
    return links.filter((l) => keys.has(l.dx_key)).slice(0, 4);
  }, [links, myPatients, patients]);

  const shown = (myPatients.length > 0 ? myPatients : patients).slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Header del dashboard */}
      <div className="grid gap-3 rounded-3xl border border-border/50 bg-background/70 px-5 py-4 backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black tracking-tight">
            {saludo()}, {userName}.
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Tu jornada clínica en Hospitalización Pediátrica.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[12px] font-bold capitalize">{DAY_FMT.format(new Date())}</div>
          <div className="text-[11px] text-muted-foreground">{turnoLabel()}</div>
        </div>
      </div>

      {/* Indicadores compactos */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Mi ubicación"
          value={pavilionCode ? `Pabellón ${pavilionCode}` : "Sin asignar"}
          hint={myZone?.label ?? "Sala por asignar"}
          accent={accent}
          icon={<MapPin className="size-4" />}
        />
        <KpiTile
          label="Mis pacientes"
          value={String(myPatients.length).padStart(2, "0")}
          hint={`${patients.length} en el pabellón`}
          accent="#38bdf8"
          icon={<Users className="size-4" />}
        />
        <KpiTile
          label="Pendientes"
          value={String(pendingTasks.length).padStart(2, "0")}
          hint="Tareas por cerrar"
          accent="#f59e0b"
          icon={<ListChecks className="size-4" />}
        />
        <KpiTile
          label="Prioritarios"
          value={String(critical.length).padStart(2, "0")}
          hint="Requieren revisión temprana"
          accent="#ef4444"
          icon={<Activity className="size-4" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Mis pacientes hoy — protagonista */}
        <WardCard
          title="Mis pacientes hoy"
          subtitle="Selecciona un paciente para abrir su workspace clínico."
          icon={<Users className="size-4" style={{ color: accent }} />}
          actions={
            <>
              <Btn onClick={onAllPatients}>Ver todos →</Btn>
              <Btn variant="solid" accent={accent} onClick={onNewPatient}>
                <Plus className="size-3.5" /> Nuevo ingreso
              </Btn>
            </>
          }
        >
          {shown.length === 0 ? (
            <Empty text="Aún no tienes pacientes asignados." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((p) => {
                const b = beds.find((x) => x.id === p.bed_id);
                const pend = pendingTasks.filter((t) => t.patient_id === p.id).length;
                return (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-border/50 bg-background/40 p-4 transition hover:border-primary/40"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusDot status={p.status} />
                        <span className="truncate text-[12.5px] font-black uppercase tracking-wide">
                          {b ? `Cama ${b.number}` : "Sin cama"}
                        </span>
                      </div>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="mt-2 truncate text-sm font-bold">{patientLabel(p)}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {[p.age_label, `Día ${String(hospitalDay(p.admitted_at)).padStart(2, "0")}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] font-semibold">
                      {p.main_dx ?? "Sin diagnóstico registrado"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {pend > 0 ? (
                        <Chip accent="#f59e0b">{pend} pendiente{pend > 1 ? "s" : ""}</Chip>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Sin pendientes</span>
                      )}
                      <Btn variant="outline" accent={accent} onClick={() => onSelectPatient(p.id)}>
                        Ver paciente →
                      </Btn>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </WardCard>

        <div className="space-y-5">
          {/* Ubicación de hoy — croquis resumido */}
          <WardCard
            title="Ubicación de hoy"
            icon={<MapPin className="size-4" style={{ color: accent }} />}
            actions={<Btn onClick={onOpenCroquis}>Ver croquis →</Btn>}
          >
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
                📍 {pavilionCode ? `Pabellón ${pavilionCode}` : "Pabellón por asignar"}
              </div>
              <div className="mt-1 truncate text-sm font-bold">{myZone?.label ?? "Sala por asignar"}</div>
              <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Camas asignadas
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {myBeds.length === 0 && (
                  <span className="text-[11.5px] text-muted-foreground">Sin camas asignadas.</span>
                )}
                {myBeds.map((b) => {
                  const p = myPatients.find((x) => x.bed_id === b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => (p ? onSelectPatient(p.id) : onOpenCroquis())}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[12px] font-black transition hover:border-primary/40"
                    >
                      {p && <StatusDot status={p.status} size={7} />}
                      {b.number}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
                {(["estable", "seguimiento", "prioritario"] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ background: PATIENT_STATUS[s]?.color }}
                    />
                    {PATIENT_STATUS[s]?.label}
                  </span>
                ))}
              </div>
            </div>
          </WardCard>

          <WardCard
            title="Pendientes de hoy"
            icon={<ListChecks className="size-4" style={{ color: accent }} />}
          >
            {pendingTasks.length === 0 ? (
              <Empty text="Sin pendientes abiertos." />
            ) : (
              <ul className="space-y-2">
                {pendingTasks.slice(0, 5).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-[12px]"
                  >
                    <div className="truncate font-semibold">{t.title}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      prioridad {t.priority}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </WardCard>

          <WardCard
            title="Ruta de estudio sugerida"
            subtitle="Según los diagnósticos activos de tus pacientes."
            icon={<Sparkles className="size-4" style={{ color: accent }} />}
          >
            {suggested.length === 0 ? (
              <Empty text="Registra diagnósticos para recibir sugerencias." />
            ) : (
              <ul className="space-y-2">
                {suggested.map((l) => (
                  <li key={l.id} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                    <div className="text-sm font-bold">{l.topic}</div>
                    {l.summary && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{l.summary}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </WardCard>
        </div>
      </div>
    </div>
  );
}


/* ──────────────────────────────── Censo ──────────────────────────────── */

function Census({
  accent,
  zones,
  beds,
  patients,
  myPatientIds,
  onSelect,
  onNew,
}: {
  accent: string;
  zones: WardZone[];
  beds: WardBed[];
  patients: WardPatient[];
  myPatientIds: Set<string>;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [filter, setFilter] = useState<"todos" | "mios" | "prioritarios">("todos");
  const [q, setQ] = useState("");

  const list = patients.filter((p) => {
    if (filter === "mios" && !myPatientIds.has(p.id)) return false;
    if (filter === "prioritarios" && !["critico", "prioritario"].includes(p.status)) return false;
    const hay = `${patientLabel(p)} ${p.main_dx ?? ""} ${p.code ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <WardCard
      title="Censo del pabellón"
      subtitle="Todos los pacientes activos con su cama, diagnóstico y día de hospitalización."
      icon={<BedDouble className="size-4" style={{ color: accent }} />}
      actions={
        <Btn variant="solid" accent={accent} onClick={onNew}>
          <Plus className="size-3.5" /> Nuevo ingreso
        </Btn>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por iniciales o diagnóstico" />
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="todos">Todos</option>
          <option value="mios">Mis pacientes</option>
          <option value="prioritarios">Prioritarios</option>
        </Select>
      </div>

      <div className="mt-4 space-y-2">
        {list.length === 0 && <Empty text="No hay pacientes que coincidan." />}
        {list.map((p) => {
          const bed = beds.find((b) => b.id === p.bed_id);
          const zone = zones.find((z) => z.id === bed?.zone_id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-left transition hover:border-primary/40"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-black">{patientLabel(p)}</span>
                  {myPatientIds.has(p.id) && <Chip accent={accent}>mío</Chip>}
                  <Chip>{bed ? `Cama ${bed.number}` : "Sin cama"}</Chip>
                  {zone && <Chip>{zone.label}</Chip>}
                </div>
                <div className="mt-1 truncate text-[12px] text-muted-foreground">
                  {p.main_dx ?? "Sin diagnóstico"} · día {hospitalDay(p.admitted_at)}
                  {p.age_label ? ` · ${p.age_label}` : ""}
                </div>
              </div>
              <StatusPill status={p.status} />
            </button>
          );
        })}
      </div>
    </WardCard>
  );
}

/* ───────────────────────────── Competencias ───────────────────────────── */

const STATES = ["pendiente", "observado", "asistido", "autonomo"] as const;

function Competencies({ accent, userId }: { accent: string; userId?: string }) {
  const { data: competencies = [] } = useCompetencies();
  const { data: progress = [] } = useCompetencyProgress(userId);
  const save = useWardSave("ward_competency_progress", [WARD_KEYS.progress]);

  const byId = new Map(progress.map((p) => [p.competency_id, p]));
  const groups = useMemo(() => {
    const map = new Map<string, typeof competencies>();
    for (const c of competencies) map.set(c.group_label, [...(map.get(c.group_label) ?? []), c]);
    return [...map.entries()];
  }, [competencies]);

  const achieved = progress.filter((p) => p.state === "autonomo").length;
  const pct = competencies.length ? Math.round((achieved / competencies.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <WardCard
        title="Portafolio de competencias"
        subtitle="Marca tu nivel real en cada competencia de la rotación: observado, asistido o autónomo."
        icon={<GraduationCap className="size-4" style={{ color: accent }} />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-black" style={{ color: accent }}>
            {pct}%
          </span>
          <span className="text-[12px] text-muted-foreground">
            {achieved} de {competencies.length} competencias autónomas
          </span>
        </div>
        <div className="mt-3">
          <Bar value={pct} accent={accent} />
        </div>
      </WardCard>

      {groups.map(([group, items]) => (
        <WardCard key={group} title={group}>
          <ul className="space-y-2">
            {items.map((c) => {
              const state = byId.get(c.id)?.state ?? "pendiente";
              return (
                <li
                  key={c.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.title}</span>
                    {c.description && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.description}
                      </span>
                    )}
                  </span>
                  <Select
                    className="w-40 shrink-0"
                    value={state}
                    disabled={!userId}
                    onChange={(e) => {
                      const existing = byId.get(c.id);
                      save.mutate({
                        ...(existing ? { id: existing.id } : {}),
                        user_id: userId,
                        competency_id: c.id,
                        state: e.target.value,
                      });
                    }}
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </li>
              );
            })}
          </ul>
        </WardCard>
      ))}
    </div>
  );
}

/* ──────────────────────── Casos de aprendizaje ──────────────────────── */

function LearningCases({ accent, patients }: { accent: string; patients: WardPatient[] }) {
  const { data: cases = [] } = useLearningCases();
  const save = useWardSave("ward_learning_cases", [WARD_KEYS.cases]);
  const del = useWardDelete("ward_learning_cases", [WARD_KEYS.cases]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    patient_id: "",
    problem: "",
    differential: "",
    final_dx: "",
    studies: "",
    treatment: "",
    evolution: "",
    learnings: "",
    difficulties: "",
    pearls: "",
    reflection: "",
  });

  const fields: { key: keyof typeof form; label: string; long?: boolean }[] = [
    { key: "problem", label: "Problema clínico", long: true },
    { key: "differential", label: "Diagnóstico diferencial", long: true },
    { key: "final_dx", label: "Diagnóstico final" },
    { key: "studies", label: "Exámenes que ayudaron", long: true },
    { key: "treatment", label: "Tratamiento", long: true },
    { key: "evolution", label: "Evolución", long: true },
    { key: "learnings", label: "Qué aprendí", long: true },
    { key: "difficulties", label: "Qué me costó", long: true },
    { key: "pearls", label: "Perlas clínicas", long: true },
    { key: "reflection", label: "Reflexión final", long: true },
  ];

  return (
    <div className="space-y-5">
      <WardCard
        title="Casos de aprendizaje"
        subtitle="Convierte cada paciente en un caso documentado para tu portafolio de rotación."
        icon={<ClipboardList className="size-4" style={{ color: accent }} />}
        actions={
          <Btn variant="solid" accent={accent} onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> Nuevo caso
          </Btn>
        }
      >
        {cases.length === 0 ? (
          <Empty text="Aún no has documentado casos." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cases.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <h4 className="min-w-0 truncate text-sm font-black">{c.title}</h4>
                  <button
                    type="button"
                    onClick={() => del.mutate(c.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {c.final_dx && <p className="mt-1 text-[12px] font-semibold">{c.final_dx}</p>}
                {c.learnings && (
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                    {c.learnings}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </WardCard>

      <Modal open={open} wide onClose={() => setOpen(false)} title="Nuevo caso de aprendizaje">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título del caso">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Paciente (opcional)">
            <Select
              value={form.patient_id}
              onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
            >
              <option value="">Sin vincular</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {patientLabel(p)} · {p.main_dx ?? "sin dx"}
                </option>
              ))}
            </Select>
          </Field>
          {fields.map((f) => (
            <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
              <Field label={f.label}>
                {f.long ? (
                  <Textarea
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Btn onClick={() => setOpen(false)}>Cancelar</Btn>
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={async () => {
              if (!form.title.trim()) return;
              await save.mutateAsync({
                ...form,
                title: form.title.trim(),
                patient_id: form.patient_id || null,
              });
              setOpen(false);
            }}
          >
            Guardar caso
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────────── Configuración del pabellón (admin) ─────────────────── */

function WardConfig({
  accent,
  pavilionId,
  pavilionName,
  zones,
  beds,
}: {
  accent: string;
  pavilionId: string | null;
  pavilionName: string | null;
  zones: WardZone[];
  beds: WardBed[];
}) {
  const saveZone = useWardSave("ward_zones", [WARD_KEYS.zones]);
  const delZone = useWardDelete("ward_zones", [WARD_KEYS.zones]);
  const saveBed = useWardSave("ward_beds", [WARD_KEYS.beds]);
  const delBed = useWardDelete("ward_beds", [WARD_KEYS.beds]);
  const [newZone, setNewZone] = useState({ label: "", kind: "room" });
  const [newBed, setNewBed] = useState<Record<string, string>>({});
  const [assignZone, setAssignZone] = useState<WardZone | null>(null);
  const [distOpen, setDistOpen] = useState(false);

  return (
    <div className="space-y-5">
      <DistributionSummary
        accent={accent}
        pavilionName={pavilionName}
        beds={beds}
        onOpen={() => setDistOpen(true)}
      />

      <AssignmentsModal
        open={!!assignZone}
        onClose={() => setAssignZone(null)}
        accent={accent}
        zone={assignZone}
        pavilionName={pavilionName}
        beds={beds}
      />

      <DistributionModal
        open={distOpen}
        onClose={() => setDistOpen(false)}
        accent={accent}
        pavilionName={pavilionName}
        zones={zones}
        beds={beds}
        onManageZone={(z) => {
          setDistOpen(false);
          setAssignZone(z);
        }}
      />

      <WardCard
        title="Croquis editable"
        subtitle="Como super admin puedes crear salas, moverlas en la cuadrícula y administrar camas sin restricciones."
        icon={<Settings2 className="size-4" style={{ color: accent }} />}
      >
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
          <Input
            value={newZone.label}
            placeholder="Nombre de la sala o área"
            onChange={(e) => setNewZone((z) => ({ ...z, label: e.target.value }))}
          />
          <Select value={newZone.kind} onChange={(e) => setNewZone((z) => ({ ...z, kind: e.target.value }))}>
            {ZONE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          <Btn
            variant="solid"
            accent={accent}
            loading={saveZone.isPending}
            onClick={async () => {
              if (!newZone.label.trim() || !pavilionId) return;
              await saveZone.mutateAsync({
                pavilion_id: pavilionId,
                label: newZone.label.trim(),
                kind: newZone.kind,
                col: 1,
                row_index: Math.max(1, ...zones.map((z) => z.row_index + 1)),
                sort_order: zones.length,
              });
              setNewZone({ label: "", kind: "room" });
            }}
          >
            <Plus className="size-3.5" /> Añadir área
          </Btn>
        </div>

        <div className="mt-4 space-y-3">
          {zones.length === 0 && <Empty text="Este pabellón aún no tiene áreas." />}
          {zones.map((z) => (
            <div key={z.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <input
                  defaultValue={z.label}
                  onBlur={(e) =>
                    e.target.value !== z.label && saveZone.mutate({ id: z.id, label: e.target.value })
                  }
                  className="w-full min-w-0 bg-transparent text-sm font-black outline-none"
                />
                <button
                  type="button"
                  onClick={() => delZone.mutate(z.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-5">
                <Field label="Tipo">
                  <Select
                    defaultValue={z.kind}
                    onChange={(e) => saveZone.mutate({ id: z.id, kind: e.target.value })}
                  >
                    {ZONE_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {(
                  [
                    ["col", "Columna"],
                    ["row_index", "Fila"],
                    ["col_span", "Ancho"],
                    ["row_span", "Alto"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={z[key]}
                      onBlur={(e) => saveZone.mutate({ id: z.id, [key]: Number(e.target.value) || 1 })}
                    />
                  </Field>
                ))}
              </div>

              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Camas
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {beds
                    .filter((b) => b.zone_id === z.id)
                    .map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-2 py-1 text-[11px] font-bold"
                      >
                        {b.number}
                        <button
                          type="button"
                          onClick={() => delBed.mutate(b.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    ))}
                  <span className="flex items-center gap-1.5">
                    <Input
                      className="!w-24"
                      placeholder="N.°"
                      value={newBed[z.id] ?? ""}
                      onChange={(e) => setNewBed((n) => ({ ...n, [z.id]: e.target.value }))}
                    />
                    <Btn
                      accent={accent}
                      variant="outline"
                      loading={saveBed.isPending}
                      onClick={async () => {
                        const number = (newBed[z.id] ?? "").trim();
                        if (!number) return;
                        await saveBed.mutateAsync({
                          zone_id: z.id,
                          number,
                          sort_order: beds.filter((b) => b.zone_id === z.id).length,
                        });
                        setNewBed((n) => ({ ...n, [z.id]: "" }));
                      }}
                    >
                      <Plus className="size-3" /> Cama
                    </Btn>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </WardCard>

      <WardCard title="Leyenda de estados">
        <div className="flex flex-wrap gap-2">
          {Object.keys(PATIENT_STATUS).map((k) => (
            <StatusPill key={k} status={k as keyof typeof PATIENT_STATUS} />
          ))}
        </div>
      </WardCard>
    </div>
  );
}
