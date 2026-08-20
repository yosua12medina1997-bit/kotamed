/**
 * Ward OS — sistema operativo del interno en Hospitalización Pediátrica
 * (Rotación Pediatría · HNSEB). Croquis interactivo, censo, expedientes,
 * modo ronda, competencias, casos de aprendizaje y configuración de admin.
 */
import { useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  MapPin,
  Plus,
  Settings2,
  Sparkles,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { useSupabaseUser } from "@/lib/session";
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
import { Pendientes } from "./ClinicalOrders";
import { PavilionMap } from "./PavilionMap";
import { PatientDetail } from "./PatientDetail";
import { PatientForm } from "./PatientForm";
import { RoundMode } from "./RoundMode";
import { Bar, KpiTile, Modal, StatusPill, WardCard } from "./ui";

type SectionId =
  | "inicio"
  | "pabellon"
  | "pacientes"
  | "ronda"
  | "pendientes"
  | "competencias"
  | "casos"
  | "config";

const SECTIONS: { id: SectionId; label: string; icon: typeof MapPin; adminOnly?: boolean }[] = [
  { id: "inicio", label: "Panel del interno", icon: LayoutGrid },
  { id: "pabellon", label: "Croquis del pabellón", icon: MapPin },
  { id: "pacientes", label: "Mis pacientes", icon: Users },
  { id: "ronda", label: "Modo Ronda", icon: Stethoscope },
  { id: "pendientes", label: "Pendientes clínicos", icon: ListChecks },
  { id: "competencias", label: "Competencias", icon: GraduationCap },
  { id: "casos", label: "Casos de aprendizaje", icon: BookOpen },
  { id: "config", label: "Configurar pabellón", icon: Settings2, adminOnly: true },
];

export function WardOS({ isAdmin, accent }: { isAdmin: boolean; accent: string }) {
  const user = useSupabaseUser();
  const [section, setSection] = useState<SectionId>("inicio");
  const [pavilionId, setPavilionId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formBed, setFormBed] = useState<string | null>(null);
  const [editing, setEditing] = useState<WardPatient | null>(null);

  const { data: pavilions = [] } = usePavilions();
  const activePavilion = pavilionId ?? pavilions[0]?.id ?? null;
  const { data: zones = [] } = useZones(activePavilion);
  const { data: beds = [] } = useBeds();
  const { data: patients = [] } = usePatients();
  const { data: assignments = [] } = useAssignments();
  const { data: tasks = [] } = useTasks();

  const zoneIds = useMemo(() => new Set(zones.map((z) => z.id)), [zones]);
  const pavilionBeds = useMemo(() => beds.filter((b) => zoneIds.has(b.zone_id)), [beds, zoneIds]);
  const pavilionBedIds = useMemo(() => new Set(pavilionBeds.map((b) => b.id)), [pavilionBeds]);
  const pavilionPatients = useMemo(
    () => patients.filter((p) => (p.bed_id ? pavilionBedIds.has(p.bed_id) : true)),
    [patients, pavilionBedIds],
  );

  const myPatientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of assignments) if (a.user_id === user?.id) ids.add(a.patient_id);
    for (const p of patients) if (p.created_by && p.created_by === user?.id) ids.add(p.id);
    return ids;
  }, [assignments, patients, user?.id]);

  const myPatients = useMemo(
    () => pavilionPatients.filter((p) => myPatientIds.has(p.id)),
    [pavilionPatients, myPatientIds],
  );

  const patient = patients.find((p) => p.id === selectedPatient) ?? null;
  const pendingTasks = tasks.filter((t) => t.status !== "hecho");

  function openPatient(id: string) {
    setSelectedPatient(id);
    setSection("pacientes");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Navegación lateral */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-border/60 bg-background/70 p-3 backdrop-blur">
          <div className="px-2 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Kota Ward
            </div>
            <div className="truncate text-sm font-black tracking-tight">Rotación Pediatría HNSEB</div>

          </div>
          <nav className="space-y-1">
            {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((s) => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl px-3 py-2 text-left text-[12px] font-bold transition ${
                    active ? "text-white" : "hover:bg-muted/60"
                  }`}
                  style={active ? { background: accent } : undefined}
                >
                  <s.icon className="size-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {pavilions.length > 1 && (
            <div className="mt-3 border-t border-border/60 pt-3">
              <Field label="Pabellón">
                <Select
                  value={activePavilion ?? ""}
                  onChange={(e) => setPavilionId(e.target.value)}
                >
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
        {section === "inicio" && (
          <Dashboard
            accent={accent}
            zones={zones}
            beds={pavilionBeds}
            patients={pavilionPatients}
            myPatients={myPatients}
            myPatientIds={myPatientIds}
            pendingTasks={pendingTasks}
            pavilionCode={pavilions.find((p) => p.id === activePavilion)?.code ?? null}
            pavilionName={pavilions.find((p) => p.id === activePavilion)?.name ?? null}
            userId={user?.id}

            onSelectPatient={openPatient}
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
            subtitle="Toca una cama para abrir el expediente; las camas libres permiten registrar un ingreso."
            icon={<MapPin className="size-4" style={{ color: accent }} />}
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
              selectedPatientId={selectedPatient}
              pavilionCode={pavilions.find((p) => p.id === activePavilion)?.code ?? null}
              pavilionName={pavilions.find((p) => p.id === activePavilion)?.name ?? null}
              tasks={tasks}
              pavilions={pavilions}
              activePavilionId={activePavilion}
              onPavilion={setPavilionId}
              canEdit
              userId={user?.id}
              onSelectPatient={openPatient}
              onSelectBed={(bed) => {
                setEditing(null);
                setFormBed(bed.id);
                setFormOpen(true);
              }}
            />

          </WardCard>
        )}

        {section === "pacientes" &&
          (patient ? (
            <>
              <Btn onClick={() => setSelectedPatient(null)}>← Volver al censo</Btn>
              <PatientDetail
                patient={patient}
                zones={zones}
                beds={beds}
                accent={accent}
                userId={user?.id}
                isAdmin={isAdmin}
                onEdit={() => {
                  setEditing(patient);
                  setFormOpen(true);
                }}
              />
            </>
          ) : (
            <Census
              accent={accent}
              zones={zones}
              beds={pavilionBeds}
              patients={pavilionPatients}
              myPatientIds={myPatientIds}
              onSelect={openPatient}
              onNew={() => {
                setEditing(null);
                setFormBed(null);
                setFormOpen(true);
              }}
            />
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
            patientId={selectedPatient}
            onSelectPatient={openPatient}
          />
        )}

        {section === "competencias" && <Competencies accent={accent} userId={user?.id} />}
        {section === "casos" && <LearningCases accent={accent} patients={patients} />}
        {section === "config" && (
          <WardConfig accent={accent} pavilionId={activePavilion} zones={zones} beds={pavilionBeds} />
        )}
      </div>

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

/* ────────────────────────────── Panel inicio ────────────────────────────── */

function Dashboard({
  accent,
  zones,
  beds,
  patients,
  myPatients,
  myPatientIds,
  pendingTasks,
  pavilionCode,
  pavilionName,
  userId,
  onSelectPatient,
  onNewPatient,
}: {
  accent: string;
  zones: WardZone[];
  beds: WardBed[];
  patients: WardPatient[];
  myPatients: WardPatient[];
  myPatientIds: Set<string>;
  pendingTasks: WardTask[];
  pavilionCode?: string | null;
  pavilionName?: string | null;
  userId?: string;
  onSelectPatient: (id: string) => void;
  onNewPatient: () => void;
}) {

  const { data: links = [] } = useStudyLinks();
  const evolvedToday = 0;
  const critical = patients.filter((p) => p.status === "critico" || p.status === "prioritario");
  const myZone = zones.find((z) =>
    beds.some((b) => b.zone_id === z.id && myPatients.some((p) => p.bed_id === b.id)),
  );

  const suggested = useMemo(() => {
    const keys = new Set<string>();
    for (const p of myPatients.length > 0 ? myPatients : patients) {
      for (const key of dxKeysFor(`${p.main_dx ?? ""} ${p.secondary_dx.join(" ")}`)) keys.add(key);
    }
    return links.filter((l) => keys.has(l.dx_key)).slice(0, 5);
  }, [links, myPatients, patients]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Mi ubicación"
          value={myZone?.label ?? "Sin asignar"}
          hint="Sala asignada hoy"
          accent={accent}
          icon={<MapPin className="size-4" />}
        />
        <KpiTile
          label="Mis pacientes"
          value={myPatients.length}
          hint={`${patients.length} en el pabellón`}
          accent="#38bdf8"
          icon={<Users className="size-4" />}
        />
        <KpiTile
          label="Pendientes"
          value={pendingTasks.length}
          hint="Tareas por cerrar"
          accent="#f59e0b"
          icon={<ListChecks className="size-4" />}
        />
        <KpiTile
          label="Prioritarios"
          value={critical.length}
          hint="Requieren revisión temprana"
          accent="#ef4444"
          icon={<Activity className="size-4" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <WardCard
          title="Croquis del pabellón"
          subtitle="Vista operativa en tiempo real de salas, camas y estado de cada paciente."
          icon={<MapPin className="size-4" style={{ color: accent }} />}
          actions={
            <Btn variant="solid" accent={accent} onClick={onNewPatient}>
              <Plus className="size-3.5" /> Nuevo ingreso
            </Btn>
          }
        >
          <PavilionMap
            zones={zones}
            beds={beds}
            patients={patients}
            accent={accent}
            myPatientIds={myPatientIds}
            pavilionCode={pavilionCode}
            pavilionName={pavilionName}
            tasks={pendingTasks}
            userId={userId}
            onSelectPatient={onSelectPatient}
          />

        </WardCard>

        <div className="space-y-5">
          <WardCard title="Pendientes de hoy" icon={<ListChecks className="size-4" style={{ color: accent }} />}>
            {pendingTasks.length === 0 ? (
              <Empty text="Sin pendientes abiertos." />
            ) : (
              <ul className="space-y-2">
                {pendingTasks.slice(0, 6).map((t) => (
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

          <WardCard title="Mis pacientes" icon={<Users className="size-4" style={{ color: accent }} />}>
            {myPatients.length === 0 ? (
              <Empty text="Aún no tienes pacientes asignados." />
            ) : (
              <ul className="space-y-2">
                {myPatients.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPatient(p.id)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-left hover:border-primary/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{patientLabel(p)}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {p.main_dx ?? "Sin diagnóstico"} · día {hospitalDay(p.admitted_at)}
                        </span>
                      </span>
                      <StatusPill status={p.status} />
                    </button>
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
      <span className="hidden">{evolvedToday}</span>
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
  zones,
  beds,
}: {
  accent: string;
  pavilionId: string | null;
  zones: WardZone[];
  beds: WardBed[];
}) {
  const saveZone = useWardSave("ward_zones", [WARD_KEYS.zones]);
  const delZone = useWardDelete("ward_zones", [WARD_KEYS.zones]);
  const saveBed = useWardSave("ward_beds", [WARD_KEYS.beds]);
  const delBed = useWardDelete("ward_beds", [WARD_KEYS.beds]);
  const [newZone, setNewZone] = useState({ label: "", kind: "room" });
  const [newBed, setNewBed] = useState<Record<string, string>>({});

  return (
    <div className="space-y-5">
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
