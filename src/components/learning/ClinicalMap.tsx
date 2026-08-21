/**
 * KOTA CLINICAL MAP — Biblioteca Maestra de Patologías.
 *
 * Biblioteca clínica compartida por Hospitalización Pediátrica (Kota Ward) y
 * Emergencia Pediátrica (Kota Emergency): buscador de patologías, página
 * maestra con ruta clínica de 6 pasos, contenido académico vinculado y
 * administración completa para el equipo docente.
 */
import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BookOpen,
  Copy,
  ExternalLink,
  Layers,
  Library,
  Link2,
  Plus,
  Save,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { WardCard } from "@/components/ward/ui";
import { kindMeta, useKlResources } from "@/lib/kota-learning";
import {
  KCM_AREAS,
  KCM_CATEGORIES,
  KCM_SEVERITIES,
  KCM_STEPS,
  areaMeta,
  areasForModule,
  filterPathologies,
  severityMeta,
  suggestPathologies,
  useDeletePathology,
  useDeleteResourceLink,
  useDuplicatePathology,
  useKcmAreaConfigs,
  useKcmPathologies,
  useKcmPatientLinks,
  useKcmResourceLinks,
  useLinkPatientPathology,
  useSaveAreaConfig,
  useSavePathology,
  useSaveResourceLink,
  useUnlinkPatientPathology,
  type KcmArea,
  type KcmModule,
  type KcmPathology,
} from "@/lib/kota-clinical-map";
import type { KlPatientRef } from "./KotaLearning";

type TabId = "resumen" | "mapas" | "contenido" | "admin";

const TABS: { id: TabId; label: string; adminOnly?: boolean }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "mapas", label: "Mapas clínicos" },
  { id: "contenido", label: "Contenido académico" },
  { id: "admin", label: "Administración", adminOnly: true },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const listToText = (arr: string[]) => arr.join(", ");
const textToList = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function ClinicalMap({
  module,
  accent,
  isAdmin,
  userId,
  patient,
  onPickPatient,
}: {
  module: KcmModule;
  accent: string;
  isAdmin: boolean;
  userId?: string;
  patient: KlPatientRef | null;
  onPickPatient?: () => void;
}) {
  const moduleAreas = areasForModule(module);
  const [area, setArea] = useState<KcmArea>(moduleAreas[0]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("resumen");
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: pathologies = [], isLoading } = useKcmPathologies();
  const { data: areaConfigs = [] } = useKcmAreaConfigs();
  const { data: resourceLinks = [] } = useKcmResourceLinks();
  const { data: resources = [] } = useKlResources();
  const { data: patientLinks = [] } = useKcmPatientLinks(module, patient?.id ?? null);

  const linkPatient = useLinkPatientPathology(module, patient?.id ?? null);
  const unlinkPatient = useUnlinkPatientPathology(module, patient?.id ?? null);
  const duplicate = useDuplicatePathology();
  const removePathology = useDeletePathology();

  const filtered = useMemo(
    () => filterPathologies(pathologies, { query, category, severity, area, showArchived: isAdmin }),
    [pathologies, query, category, severity, area, isAdmin],
  );

  const selected = useMemo(
    () => pathologies.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [pathologies, selectedId, filtered],
  );

  const patientText = patient
    ? [patient.main_dx, patient.reason, patient.extra].filter(Boolean).join(" · ")
    : "";
  const suggestions = useMemo(
    () => (patientText ? suggestPathologies(pathologies, patientText, area) : []),
    [pathologies, patientText, area],
  );

  const config = selected ? areaConfigs.find((c) => c.pathology_id === selected.id && c.area === area) : null;
  const links = selected ? resourceLinks.filter((l) => l.pathology_id === selected.id && !l.hidden) : [];
  const linkedResources = links
    .map((l) => ({ link: l, resource: resources.find((r: any) => r.id === l.resource_id) }))
    .filter((x) => x.resource);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-4">
      <WardCard
        title="KOTA CLINICAL MAP · Biblioteca Maestra de Patologías"
        subtitle="Biblioteca clínica y académica común a Hospitalización, Observación y Shock Trauma. Cada patología define su enfoque por área, su ruta clínica de 6 pasos y su contenido vinculado."
        icon={<Library className="size-4" style={{ color: accent }} />}
        actions={
          <>
            {moduleAreas.length > 1 && (
              <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1">
                {moduleAreas.map((a) => {
                  const meta = areaMeta(a);
                  const on = a === area;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setArea(a)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                        on ? "text-white" : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={on ? { background: accent } : undefined}
                    >
                      {meta.short}
                    </button>
                  );
                })}
              </div>
            )}
            {isAdmin && (
              <Btn variant="solid" accent={accent} onClick={() => setEditorOpen(true)}>
                <Plus className="size-3" /> Nueva patología
              </Btn>
            )}
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar patología, sinónimo o palabra clave…"
              className="pl-9"
            />
          </div>
          <Select value={category ?? ""} onChange={(e) => setCategory(e.target.value || null)}>
            <option value="">Todas las categorías</option>
            {KCM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={severity ?? ""} onChange={(e) => setSeverity(e.target.value || null)}>
            <option value="">Toda severidad</option>
            {KCM_SEVERITIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {patient && suggestions.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="size-3" style={{ color: accent }} /> Basado en tu paciente
              {patient.code ? ` · ${patient.code}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map(({ pathology }) => (
                <button
                  key={pathology.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(pathology.id);
                    setTab("resumen");
                  }}
                  className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-bold transition hover:border-primary/50"
                >
                  {pathology.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </WardCard>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Biblioteca */}
        <WardCard title={`Biblioteca (${filtered.length})`} icon={<Layers className="size-4" style={{ color: accent }} />}>
          {isLoading ? (
            <Empty text="Cargando biblioteca clínica…" />
          ) : filtered.length === 0 ? (
            <Empty text="No hay patologías que coincidan con la búsqueda." />
          ) : (
            <div className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((p) => {
                const on = selected?.id === p.id;
                const sev = severityMeta(p.severity);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      on ? "border-primary/50 bg-primary/[0.06]" : "border-border/60 bg-background/50 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-[12px] font-black tracking-tight">{p.name}</span>
                      <span
                        className="mt-1 size-2 shrink-0 rounded-full"
                        style={{ background: sev.color, boxShadow: `0 0 0 3px ${sev.color}22` }}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {p.category}
                      {p.subcategory ? ` · ${p.subcategory}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </WardCard>

        {/* Página maestra */}
        {!selected ? (
          <Empty text="Selecciona una patología de la biblioteca." />
        ) : (
          <div className="space-y-4">
            <WardCard>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip accent={severityMeta(selected.severity).color}>
                      {severityMeta(selected.severity).label}
                    </Chip>
                    <Chip accent={accent}>{selected.category}</Chip>
                    {selected.subcategory && <Chip>{selected.subcategory}</Chip>}
                    <Chip>{selected.specialty ?? "Pediatría"}</Chip>
                    {selected.archived && <Chip>Archivada</Chip>}
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-tight">{selected.name}</h2>
                  <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
                    {selected.description ?? "Sin descripción registrada."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selected.code && <Chip>{selected.code}</Chip>}
                    {selected.age_range && <Chip>{selected.age_range}</Chip>}
                    {selected.frequency && <Chip>{selected.frequency}</Chip>}
                    {selected.tags.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {patient ? (
                    patientLinks.some((l) => l.pathology_id === selected.id) ? (
                      <Btn
                        onClick={() => {
                          const l = patientLinks.find((x) => x.pathology_id === selected.id);
                          if (l) unlinkPatient.mutate(l.id);
                        }}
                      >
                        <X className="size-3" /> Desvincular del paciente
                      </Btn>
                    ) : (
                      <Btn
                        variant="solid"
                        accent={accent}
                        onClick={() => linkPatient.mutate({ pathology_id: selected.id, area, userId })}
                      >
                        <Link2 className="size-3" /> Vincular al paciente
                      </Btn>
                    )
                  ) : (
                    onPickPatient && (
                      <Btn onClick={onPickPatient}>
                        <Stethoscope className="size-3" /> Elegir paciente
                      </Btn>
                    )
                  )}
                  {isAdmin && (
                    <>
                      <Btn onClick={() => duplicate.mutate(selected)} title="Duplicar">
                        <Copy className="size-3" /> Duplicar
                      </Btn>
                      <Btn onClick={() => setEditorOpen(true)}>
                        <Save className="size-3" /> Editar
                      </Btn>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                {visibleTabs.map((t) => {
                  const on = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                        on ? "text-white" : "border border-border/60 bg-background/60 hover:border-primary/40"
                      }`}
                      style={on ? { background: accent } : undefined}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </WardCard>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                {tab === "resumen" && (
                  <>
                    <WardCard title="Enfoque clínico en esta área" subtitle={areaMeta(area).label}>
                      {config?.note && <p className="text-[12px] leading-relaxed">{config.note}</p>}
                      {config && config.focus.length > 0 ? (
                        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                          {config.focus.map((f) => (
                            <li
                              key={f}
                              className="rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-[11px] font-semibold"
                            >
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Empty text="Esta patología aún no tiene enfoque configurado para el área seleccionada." />
                      )}
                    </WardCard>

                    <WardCard title="Identificación y búsqueda">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <MetaRow label="Sinónimos" value={listToText(selected.synonyms) || "—"} />
                        <MetaRow label="Palabras clave" value={listToText(selected.keywords) || "—"} />
                        <MetaRow label="Diagnósticos relacionados" value={listToText(selected.related_dx) || "—"} />
                        <MetaRow
                          label="Áreas donde aplica"
                          value={
                            selected.areas.length
                              ? selected.areas.map((a) => areaMeta(a).short).join(", ")
                              : "Todas"
                          }
                        />
                      </dl>
                    </WardCard>
                  </>
                )}

                {tab === "mapas" && (
                  <WardCard
                    title="Mapas clínicos por área"
                    subtitle="Cada área define su propio enfoque sobre la misma patología."
                  >
                    <div className="grid gap-3">
                      {KCM_AREAS.map((a) => {
                        const c = areaConfigs.find((x) => x.pathology_id === selected.id && x.area === a.key);
                        return (
                          <div key={a.key} className="rounded-2xl border border-border/60 bg-background/50 p-3">
                            <p className="text-[11px] font-black tracking-tight">{a.label}</p>
                            {c?.note && <p className="mt-1 text-[11px] text-muted-foreground">{c.note}</p>}
                            {c && c.focus.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {c.focus.map((f) => (
                                  <Chip key={f}>{f}</Chip>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-muted-foreground">Sin enfoque configurado.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </WardCard>
                )}

                {tab === "contenido" && (
                  <WardCard
                    title={`Contenido académico vinculado (${linkedResources.length})`}
                    icon={<BookOpen className="size-4" style={{ color: accent }} />}
                  >
                    {linkedResources.length === 0 ? (
                      <Empty text="Aún no hay contenido académico vinculado a esta patología." />
                    ) : (
                      <div className="space-y-2">
                        {linkedResources.map(({ link, resource }: any) => {
                          const meta = kindMeta(resource.kind);
                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[12px] font-bold">{resource.title}</p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <Chip accent={meta.color}>{meta.label}</Chip>
                                  {link.area && <Chip>{areaMeta(link.area).short}</Chip>}
                                  {resource.duration_label && <span>{resource.duration_label}</span>}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {resource.url && (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] font-bold hover:border-primary/40"
                                  >
                                    <ExternalLink className="size-3" /> Abrir
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </WardCard>
                )}

                {tab === "admin" && isAdmin && (
                  <AdminPanel
                    pathology={selected}
                    area={area}
                    accent={accent}
                    userId={userId}
                    onDeleted={() => setSelectedId(null)}
                    remove={(id) => removePathology.mutate(id)}
                  />
                )}
              </div>

              {/* Ruta clínica */}
              <WardCard
                title={`Ruta clínica (${areaMeta(area).short})`}
                icon={<Activity className="size-4" style={{ color: accent }} />}
              >
                <ol className="space-y-2">
                  {KCM_STEPS.map((s) => (
                    <li key={s.key} className="rounded-2xl border border-border/60 bg-background/50 p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="grid size-6 shrink-0 place-items-center rounded-lg text-[10px] font-black text-white"
                          style={{ background: accent }}
                        >
                          {s.index}
                        </span>
                        <span className="text-[12px] font-black tracking-tight">{s.title}</span>
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">{s.hint}</p>
                    </li>
                  ))}
                </ol>
              </WardCard>
            </div>
          </div>
        )}
      </div>

      {editorOpen && isAdmin && (
        <PathologyEditor
          accent={accent}
          userId={userId}
          pathology={tabWasNew(editorOpen, selected) ? selected : null}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}

/** El editor abre en modo edición cuando hay una patología seleccionada. */
function tabWasNew(_open: boolean, selected: KcmPathology | null) {
  return !!selected;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[11.5px] font-semibold leading-relaxed">{value}</dd>
    </div>
  );
}

/* ─────────────────────── Administración de patología ─────────────────────── */

function AdminPanel({
  pathology,
  area,
  accent,
  userId,
  remove,
  onDeleted,
}: {
  pathology: KcmPathology;
  area: KcmArea;
  accent: string;
  userId?: string;
  remove: (id: string) => void;
  onDeleted: () => void;
}) {
  const { data: areaConfigs = [] } = useKcmAreaConfigs();
  const { data: resources = [] } = useKlResources();
  const { data: resourceLinks = [] } = useKcmResourceLinks();
  const saveConfig = useSaveAreaConfig();
  const saveLink = useSaveResourceLink();
  const deleteLink = useDeleteResourceLink();
  const savePathology = useSavePathology();

  const current = areaConfigs.find((c) => c.pathology_id === pathology.id && c.area === area);
  const [focus, setFocus] = useState(listToText(current?.focus ?? []));
  const [note, setNote] = useState(current?.note ?? "");
  const [pickResource, setPickResource] = useState("");

  const links = resourceLinks.filter((l) => l.pathology_id === pathology.id);

  return (
    <div className="space-y-4">
      <WardCard title="Administración de patología" subtitle={`Área: ${areaMeta(area).label}`}>
        <div className="grid gap-3">
          <Field label="Enfoque clínico del área (separado por comas)">
            <Textarea value={focus} onChange={(e) => setFocus(e.target.value)} />
          </Field>
          <Field label="Nota del área">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            <Btn
              variant="solid"
              accent={accent}
              loading={saveConfig.isPending}
              onClick={() =>
                saveConfig.mutate({
                  pathology_id: pathology.id,
                  area,
                  focus: textToList(focus),
                  note: note.trim() || null,
                })
              }
            >
              <Save className="size-3" /> Guardar enfoque
            </Btn>
            <Btn
              onClick={() =>
                savePathology.mutate({ id: pathology.id, archived: !pathology.archived })
              }
            >
              <Archive className="size-3" /> {pathology.archived ? "Restaurar" : "Archivar"}
            </Btn>
            <Btn
              onClick={() => {
                if (!window.confirm(`¿Eliminar definitivamente "${pathology.name}"?`)) return;
                remove(pathology.id);
                onDeleted();
              }}
            >
              <Trash2 className="size-3" /> Eliminar
            </Btn>
          </div>
        </div>
      </WardCard>

      <WardCard title="Vincular contenido académico" subtitle="Los recursos provienen de Kota Learning.">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Select value={pickResource} onChange={(e) => setPickResource(e.target.value)}>
            <option value="">Selecciona un recurso…</option>
            {(resources as any[]).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} · {kindMeta(r.kind).label}
              </option>
            ))}
          </Select>
          <Btn
            variant="solid"
            accent={accent}
            disabled={!pickResource}
            loading={saveLink.isPending}
            onClick={() =>
              saveLink.mutate(
                { pathology_id: pathology.id, resource_id: pickResource, area, created_by: userId ?? null },
                { onSuccess: () => setPickResource("") },
              )
            }
          >
            <Link2 className="size-3" /> Vincular
          </Btn>
        </div>

        <div className="mt-3 space-y-2">
          {links.length === 0 ? (
            <Empty text="Sin recursos vinculados." />
          ) : (
            links.map((l) => {
              const r = (resources as any[]).find((x) => x.id === l.resource_id);
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold">{r?.title ?? "Recurso eliminado"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {l.area ? areaMeta(l.area).short : "Todas las áreas"}
                    </p>
                  </div>
                  <Btn onClick={() => deleteLink.mutate(l.id)}>
                    <Trash2 className="size-3" />
                  </Btn>
                </div>
              );
            })
          )}
        </div>
      </WardCard>
    </div>
  );
}

/* ────────────────────────── Editor de patología ────────────────────────── */

function PathologyEditor({
  pathology,
  accent,
  userId,
  onClose,
}: {
  pathology: KcmPathology | null;
  accent: string;
  userId?: string;
  onClose: () => void;
}) {
  const save = useSavePathology();
  const [form, setForm] = useState({
    name: pathology?.name ?? "",
    code: pathology?.code ?? "",
    category: pathology?.category ?? KCM_CATEGORIES[0],
    subcategory: pathology?.subcategory ?? "",
    severity: pathology?.severity ?? "variable",
    description: pathology?.description ?? "",
    keywords: listToText(pathology?.keywords ?? []),
    synonyms: listToText(pathology?.synonyms ?? []),
    related_dx: listToText(pathology?.related_dx ?? []),
    tags: listToText(pathology?.tags ?? []),
    age_range: pathology?.age_range ?? "",
    frequency: pathology?.frequency ?? "",
    areas: pathology?.areas ?? ["hospitalizacion", "observacion", "shock"],
  });

  function toggleArea(a: string) {
    setForm((f) => ({
      ...f,
      areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/60 bg-background p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black tracking-tight">
              {pathology ? "Editar patología" : "Nueva patología"}
            </h3>
            <p className="text-[11px] text-muted-foreground">Biblioteca Maestra · Kota Clinical Map</p>
          </div>
          <Btn onClick={onClose}>
            <X className="size-3" />
          </Btn>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nombre">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Código">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Categoría">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {KCM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subcategoría">
            <Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
          </Field>
          <Field label="Severidad">
            <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {KCM_SEVERITIES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Rango de edad">
            <Input value={form.age_range} onChange={(e) => setForm({ ...form, age_range: e.target.value })} />
          </Field>
          <Field label="Frecuencia">
            <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
          </Field>
          <Field label="Etiquetas (comas)">
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descripción">
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <Field label="Sinónimos (comas)">
            <Input value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} />
          </Field>
          <Field label="Palabras clave (comas)">
            <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Diagnósticos relacionados (comas)">
              <Input value={form.related_dx} onChange={(e) => setForm({ ...form, related_dx: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Áreas donde aplica
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {KCM_AREAS.map((a) => {
                const on = form.areas.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleArea(a.key)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                      on ? "text-white" : "border border-border/60 bg-background/60"
                    }`}
                    style={on ? { background: accent } : undefined}
                  >
                    {a.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="mt-5 flex justify-end gap-1.5">
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={() => {
              if (!form.name.trim()) {
                return;
              }
              save.mutate(
                {
                  ...(pathology ? { id: pathology.id } : { slug: slugify(form.name), created_by: userId ?? null }),
                  name: form.name.trim(),
                  code: form.code.trim() || null,
                  category: form.category,
                  subcategory: form.subcategory.trim() || null,
                  severity: form.severity,
                  description: form.description.trim() || null,
                  keywords: textToList(form.keywords),
                  synonyms: textToList(form.synonyms),
                  related_dx: textToList(form.related_dx),
                  tags: textToList(form.tags),
                  age_range: form.age_range.trim() || null,
                  frequency: form.frequency.trim() || null,
                  areas: form.areas,
                } as any,
                { onSuccess: onClose },
              );
            }}
          >
            <Save className="size-3" /> Guardar
          </Btn>
        </footer>
      </div>
    </div>
  );
}
