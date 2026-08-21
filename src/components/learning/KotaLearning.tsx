/**
 * KOTA LEARNING — Academic Clinical Hub.
 * Sección académica integrada a Hospitalización Pediátrica (Kota Ward) y a
 * Emergencia Pediátrica (Kota Emergency). Convierte a cada paciente real en
 * una experiencia de aprendizaje clínico: análisis estructurado del caso,
 * contenido vinculado, actividades asignadas y progreso académico.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Layers,
  ListChecks,
  Save,
  Sparkles,
  Target,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Textarea } from "@/components/academy/ui";
import { Bar, KpiTile, WardCard } from "@/components/ward/ui";
import { ContentStudio } from "./ContentStudio";
import {
  ANALYSIS_FIELDS,
  REASONING_BLOCKS,
  kindMeta,
  relevantResources,
  useKlAnalysis,
  useKlAssignments,
  useKlProgress,
  useKlResources,
  useSaveAnalysis,
  useToggleProgress,
  type KlModule,
} from "@/lib/kota-learning";

export interface KlPatientRef {
  id: string;
  code: string | null;
  initials: string | null;
  age_label: string | null;
  sex: string | null;
  main_dx: string | null;
  reason: string | null;
  extra?: string | null;
}

type TabId = "resumen" | "analisis" | "aprende" | "actividades" | "studio";

export function KotaLearning({
  module,
  accent,
  isAdmin,
  userId,
  roles = [],
  patient,
  onPickPatient,
}: {
  module: KlModule;
  accent: string;
  isAdmin: boolean;
  userId?: string;
  roles?: string[];
  patient: KlPatientRef | null;
  onPickPatient?: () => void;
}) {
  const [tab, setTab] = useState<TabId>("resumen");
  const isWard = module === "ward";

  const { data: resources = [] } = useKlResources();
  const { data: assignments = [] } = useKlAssignments();
  const { data: analysis } = useKlAnalysis(module, patient?.id ?? null);
  const { data: progress = [] } = useKlProgress(userId);
  const saveAnalysis = useSaveAnalysis(module, patient?.id ?? null);
  const toggle = useToggleProgress(userId);

  const dxText = [patient?.main_dx, patient?.reason, patient?.extra].filter(Boolean).join(" · ") || null;

  const matched = useMemo(
    () => relevantResources(resources, assignments, { module, patientId: patient?.id ?? null, dxText, roles, userId }),
    [resources, assignments, module, patient?.id, dxText, roles, userId],
  );
  const required = matched.filter((m) => m.required);
  const statusOf = (resourceId: string) =>
    progress.find((p) => p.resource_id === resourceId && (p.patient_id ?? null) === (patient?.id ?? null))
      ?.status ?? "pendiente";
  const doneCount = matched.filter((m) => statusOf(m.resource.id) === "hecho").length;
  const pendingRequired = required.filter((m) => statusOf(m.resource.id) !== "hecho").length;

  /* Borrador local del análisis clínico */
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  useEffect(() => {
    setBlocks(analysis?.blocks ?? {});
  }, [analysis?.id, analysis?.updated_at, patient?.id]);

  const totalFields = REASONING_BLOCKS.length + ANALYSIS_FIELDS.length;
  const filled = Object.values(blocks).filter((v) => (v ?? "").trim()).length;
  const analysisPct = Math.round((filled / totalFields) * 100);
  const nextBlock = REASONING_BLOCKS.find((b) => !(blocks[b.key] ?? "").trim());

  const TABS: { id: TabId; label: string; icon: typeof BookOpen; adminOnly?: boolean }[] = [
    { id: "resumen", label: "Resumen", icon: GraduationCap },
    { id: "analisis", label: "Análisis clínico", icon: BrainCircuit },
    { id: "aprende", label: "Aprende con este paciente", icon: BookOpen },
    { id: "actividades", label: "Actividades", icon: ListChecks },
    { id: "studio", label: "Content Studio", icon: Layers, adminOnly: true },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Encabezado ─── */}
      <header
        className="relative overflow-hidden rounded-3xl border border-border/60 p-5 backdrop-blur"
        style={{ background: `linear-gradient(135deg, ${accent}14, transparent 65%)` }}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
              <Sparkles className="size-3.5" /> Kota Learning
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight">Academic Clinical Hub</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
              {isWard
                ? "Aprendizaje longitudinal y razonamiento clínico progresivo a partir de tus pacientes hospitalizados."
                : "Aprendizaje inmediato, decisiones rápidas y razonamiento crítico a partir de tus pacientes de emergencia."}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Paciente en estudio
            </div>
            {patient ? (
              <>
                <div className="text-[13px] font-black">
                  {patient.initials ?? patient.code ?? "Paciente"}
                  {patient.age_label ? ` · ${patient.age_label}` : ""}
                </div>
                <div className="max-w-[240px] truncate text-[11px] text-muted-foreground">
                  {patient.main_dx ?? patient.reason ?? "Sin diagnóstico registrado"}
                </div>
              </>
            ) : (
              <div className="mt-1">
                <div className="text-[12px] font-semibold text-muted-foreground">Sin paciente activo</div>
                {onPickPatient && (
                  <Btn className="mt-2" variant="outline" accent={accent} onClick={onPickPatient}>
                    Elegir paciente
                  </Btn>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Tiles resumen ─── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Temas disponibles" value={String(resources.filter((r) => !r.archived).length)} hint="Contenido académico del hub" accent={accent} icon={<BookOpen className="size-4" />} />
        <KpiTile label="Recursos recomendados" value={String(matched.length)} hint="Vinculados a este contexto clínico" accent={accent} icon={<Target className="size-4" />} />
        <KpiTile label="Actividades pendientes" value={String(pendingRequired)} hint="Obligatorias sin completar" accent={accent} icon={<ListChecks className="size-4" />} />
        <KpiTile label="Progreso del caso" value={`${analysisPct}%`} hint={`${doneCount}/${matched.length} recursos completados`} accent={accent} icon={<ClipboardCheck className="size-4" />} />
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/60 bg-background/60 p-1.5 backdrop-blur">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition ${
                active ? "text-background" : "text-muted-foreground hover:bg-muted/60"
              }`}
              style={active ? { background: accent } : undefined}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "resumen" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <WardCard
            title="Análisis clínico del paciente"
            subtitle="Workspace de razonamiento en 7 pasos, guiado y guardado por paciente."
            icon={<BrainCircuit className="size-4" style={{ color: accent }} />}
            actions={<Btn variant="outline" accent={accent} onClick={() => setTab("analisis")}>Abrir análisis</Btn>}
          >
            <Bar value={analysisPct} accent={accent} />
            <ol className="mt-4 space-y-2">
              {REASONING_BLOCKS.map((b) => {
                const done = !!(blocks[b.key] ?? "").trim();
                return (
                  <li key={b.key} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                    <span
                      className="grid size-7 place-items-center rounded-xl text-[10px] font-black"
                      style={{
                        background: done ? accent : `${accent}14`,
                        color: done ? "#fff" : accent,
                      }}
                    >
                      {b.index}
                    </span>
                    <div className="min-w-0 border-b border-border/40 pb-2">
                      <div className="text-[12.5px] font-bold">{b.title}</div>
                      <p className="text-[11px] text-muted-foreground">{isWard ? b.hintWard : b.hintEmerg}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {nextBlock && (
              <p className="mt-3 text-[11px] font-semibold" style={{ color: accent }}>
                Siguiente paso sugerido: {nextBlock.index} · {nextBlock.title}
              </p>
            )}
          </WardCard>

          <div className="space-y-4">
            <WardCard
              title="Aprende con este paciente"
              subtitle="Contenido sugerido según diagnóstico, módulo y asignaciones."
              icon={<BookOpen className="size-4" style={{ color: accent }} />}
              actions={<Btn variant="outline" accent={accent} onClick={() => setTab("aprende")}>Ver todo</Btn>}
            >
              <ResourceList
                items={matched.slice(0, 5)}
                accent={accent}
                statusOf={statusOf}
                onToggle={(id, status) =>
                  toggle.mutate({ resourceId: id, patientId: patient?.id ?? null, module, status })
                }
              />
            </WardCard>
            <WardCard
              title="Actividades pendientes"
              subtitle="Obligatorias asignadas por el docente o administrador."
              icon={<ListChecks className="size-4" style={{ color: accent }} />}
            >
              <ResourceList
                items={required.filter((m) => statusOf(m.resource.id) !== "hecho").slice(0, 5)}
                accent={accent}
                statusOf={statusOf}
                emptyText="Sin actividades obligatorias pendientes."
                onToggle={(id, status) =>
                  toggle.mutate({ resourceId: id, patientId: patient?.id ?? null, module, status })
                }
              />
            </WardCard>
          </div>
        </div>
      )}

      {tab === "analisis" &&
        (patient ? (
          <div className="space-y-4">
            <WardCard
              title="Workspace de razonamiento clínico"
              subtitle={`${filled}/${totalFields} apartados completados · se guarda por paciente y módulo.`}
              icon={<BrainCircuit className="size-4" style={{ color: accent }} />}
              actions={
                <Btn
                  variant="solid"
                  accent={accent}
                  disabled={saveAnalysis.isPending}
                  onClick={() => saveAnalysis.mutate(blocks)}
                >
                  <Save className="size-3.5" /> Guardar análisis
                </Btn>
              }
            >
              <Bar value={analysisPct} accent={accent} />
              <div className="mt-4 space-y-4">
                {REASONING_BLOCKS.map((b) => (
                  <div key={b.key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span
                      className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl text-[11px] font-black"
                      style={{ background: `${accent}14`, color: accent }}
                    >
                      {b.index}
                    </span>
                    <Field label={`${b.title} — ${isWard ? b.hintWard : b.hintEmerg}`}>
                      <Textarea
                        rows={3}
                        value={blocks[b.key] ?? ""}
                        onChange={(e) => setBlocks({ ...blocks, [b.key]: e.target.value })}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </WardCard>

            <WardCard
              title="Detalle académico del caso"
              subtitle="Campos estructurados complementarios del análisis."
              icon={<ClipboardCheck className="size-4" style={{ color: accent }} />}
              actions={
                <Btn variant="solid" accent={accent} disabled={saveAnalysis.isPending} onClick={() => saveAnalysis.mutate(blocks)}>
                  <Save className="size-3.5" /> Guardar
                </Btn>
              }
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {ANALYSIS_FIELDS.map((f) => (
                  <Field key={f.key} label={f.label}>
                    <Textarea
                      rows={2}
                      value={blocks[f.key] ?? ""}
                      onChange={(e) => setBlocks({ ...blocks, [f.key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
            </WardCard>
          </div>
        ) : (
          <WardCard title="Selecciona un paciente">
            <Empty text="Activa un paciente para iniciar su análisis clínico académico." />
            {onPickPatient && (
              <div className="mt-3">
                <Btn variant="solid" accent={accent} onClick={onPickPatient}>
                  Elegir paciente
                </Btn>
              </div>
            )}
          </WardCard>
        ))}

      {tab === "aprende" && (
        <WardCard
          title="Aprende con este paciente"
          subtitle={
            dxText
              ? `Contenido vinculado a: ${dxText}`
              : "Contenido del módulo. Activa un paciente para recibir sugerencias por diagnóstico."
          }
          icon={<BookOpen className="size-4" style={{ color: accent }} />}
        >
          <ResourceList
            items={matched}
            accent={accent}
            detailed
            statusOf={statusOf}
            onToggle={(id, status) =>
              toggle.mutate({ resourceId: id, patientId: patient?.id ?? null, module, status })
            }
          />
        </WardCard>
      )}

      {tab === "actividades" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <WardCard title="Contenido asignado" subtitle="Todo lo que el administrador asignó a este contexto." icon={<Layers className="size-4" style={{ color: accent }} />}>
            <ResourceList
              items={matched}
              accent={accent}
              statusOf={statusOf}
              onToggle={(id, status) =>
                toggle.mutate({ resourceId: id, patientId: patient?.id ?? null, module, status })
              }
            />
          </WardCard>
          <WardCard title="Mi progreso académico" subtitle="Avance por recurso y por caso clínico." icon={<ClipboardCheck className="size-4" style={{ color: accent }} />}>
            <Bar value={matched.length ? Math.round((doneCount / matched.length) * 100) : 0} accent={accent} />
            <ul className="mt-4 space-y-1.5 text-[12px]">
              <li className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Recursos completados</span>
                <span className="font-bold">{doneCount}</span>
              </li>
              <li className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Obligatorias pendientes</span>
                <span className="font-bold">{pendingRequired}</span>
              </li>
              <li className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Análisis del caso</span>
                <span className="font-bold">{analysisPct}%</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Casos con análisis registrado</span>
                <span className="font-bold">{analysis ? 1 : 0}</span>
              </li>
            </ul>
          </WardCard>
        </div>
      )}

      {tab === "studio" && isAdmin && (
        <ContentStudio
          accent={accent}
          module={module}
          patientId={patient?.id ?? null}
          patientLabel={patient?.initials ?? patient?.code ?? null}
        />
      )}
    </div>
  );
}

function ResourceList({
  items,
  accent,
  statusOf,
  onToggle,
  detailed,
  emptyText = "Aún no hay contenido vinculado a este contexto clínico.",
}: {
  items: { resource: { id: string; title: string; description: string | null; kind: string; url: string | null; duration_label: string | null; objectives: string[]; tags: string[] }; reasons: string[]; required: boolean }[];
  accent: string;
  statusOf: (id: string) => string;
  onToggle: (id: string, status: string) => void;
  detailed?: boolean;
  emptyText?: string;
}) {
  if (items.length === 0) return <Empty text={emptyText} />;
  return (
    <ul className="space-y-2">
      {items.map(({ resource: r, reasons, required }) => {
        const meta = kindMeta(r.kind);
        const done = statusOf(r.id) === "hecho";
        return (
          <li
            key={r.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-3"
          >
            <span
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-black uppercase"
              style={{ background: `${meta.color}1a`, color: meta.color }}
            >
              {meta.label.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[13px] font-bold">{r.title}</span>
                {required && <Chip accent={accent}>Obligatorio</Chip>}
                <Chip>{meta.label}</Chip>
                {r.duration_label && <Chip>{r.duration_label}</Chip>}
              </div>
              {r.description && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{r.description}</p>
              )}
              {detailed && r.objectives.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {r.objectives.map((o, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">
                      • {o}
                    </li>
                  ))}
                </ul>
              )}
              {reasons.length > 0 && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
                  {reasons.join(" · ")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted/60"
                >
                  <ExternalLink className="size-3.5" /> Abrir
                </a>
              )}
              <button
                type="button"
                onClick={() => onToggle(r.id, done ? "pendiente" : "hecho")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted/60"
                style={done ? { borderColor: accent, color: accent } : undefined}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                {done ? "Completado" : "Marcar"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
