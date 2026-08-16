/**
 * KotaMed Apex Studio (admin): banco de preguntas, taxonomía, plantillas de
 * examen y analítica del motor de evaluaciones.
 */
import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, BookMarked, Database, ListTree, Plus, Save, ScrollText, Trash2 } from "lucide-react";
import {
  DURATION_OPTIONS,
  EXAM_MODE_LABEL,
  TAX_CHILD,
  TAX_LABEL,
  type ExamMode,
  type TaxLevel,
} from "@/lib/apex-types";
import {
  useApexAnalytics,
  useExamBlueprintMutations,
  useExamBlueprints,
  useResourceLinks,
  useResourceMutations,
  useTaxonomy,
  useTaxonomyMutations,
  type ExamBlueprint,
  type ResourceLink,
  type TaxNode,
} from "@/lib/apex";
import QuestionBank from "./QuestionBank";
import { Btn, Chip, Empty, Field, inputClass, MasteryBar, Modal, Panel, Stat } from "./ui";

const TABS = [
  { key: "banco", label: "Banco de preguntas", icon: Database },
  { key: "taxonomia", label: "Taxonomía", icon: ListTree },
  { key: "examenes", label: "Exámenes", icon: ScrollText },
  { key: "recursos", label: "Recursos oficiales", icon: BookMarked },
  { key: "analitica", label: "Analítica IA", icon: BarChart3 },
] as const;

export default function ApexStudio() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("banco");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            <t.icon className="size-3.5" /> {t.label}
          </Chip>
        ))}
      </div>
      {tab === "banco" && <QuestionBank />}
      {tab === "taxonomia" && <TaxonomyEditor />}
      {tab === "examenes" && <ExamTemplates />}
      {tab === "recursos" && <ResourceLibrary />}
      {tab === "analitica" && <ApexAnalytics />}
    </div>
  );
}

/* ------------------------- Recursos oficiales ------------------------- */

const RESOURCE_KINDS = ["libro", "guía", "video", "artículo", "clase", "flashcards"];

function ResourceLibrary() {
  const list = useResourceLinks();
  const { save, remove } = useResourceMutations();
  const [editing, setEditing] = useState<Partial<ResourceLink> | null>(null);

  return (
    <>
      <Panel
        title="Recursos oficiales"
        subtitle="Se sugieren automáticamente en los resultados según la materia o tema fallado."
        right={
          <Btn variant="primary" onClick={() => setEditing({ kind: "libro", is_published: true })}>
            <Plus className="size-3.5" /> Nuevo recurso
          </Btn>
        }
      >
        <div className="space-y-2">
          {(list.data ?? []).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <div className="min-w-48 flex-1">
                <p className="text-sm font-bold">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.kind}
                  {r.label_match ? ` · coincide con "${r.label_match}"` : ""}
                </p>
              </div>
              <Chip className={r.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-600" : undefined}>
                {r.is_published ? "Visible" : "Oculto"}
              </Chip>
              <Btn onClick={() => setEditing(r)}>Editar</Btn>
              <Btn
                variant="danger"
                onClick={async () => {
                  if (window.confirm("¿Eliminar recurso?")) await remove.mutateAsync(r.id);
                }}
              >
                <Trash2 className="size-3" />
              </Btn>
            </div>
          ))}
          {(list.data ?? []).length === 0 && (
            <Empty title="Sin recursos" hint="Vincula libros, guías o clases a las materias y temas del banco." />
          )}
        </div>
      </Panel>

      {editing && (
        <Modal open title={editing.id ? "Editar recurso" : "Nuevo recurso"} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field label="Título">
              <input
                className={inputClass}
                value={editing.title ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                className={`${inputClass} min-h-20`}
                value={editing.description ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, description: e.target.value }))}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className={inputClass}
                  value={editing.kind ?? "libro"}
                  onChange={(e) => setEditing((p) => ({ ...p!, kind: e.target.value }))}
                >
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Etiqueta a la que aplica" hint="Materia o tema exacto, ej. Cardiología">
                <input
                  className={inputClass}
                  value={editing.label_match ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p!, label_match: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Enlace">
              <input
                className={inputClass}
                placeholder="https://…"
                value={editing.url ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, url: e.target.value }))}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={!!editing.is_published}
                onChange={(e) => setEditing((p) => ({ ...p!, is_published: e.target.checked }))}
              />
              Visible para estudiantes
            </label>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Btn onClick={() => setEditing(null)}>Cancelar</Btn>
              <Btn
                variant="primary"
                onClick={async () => {
                  if (!editing.title?.trim()) return toast.error("Ponle un título.");
                  try {
                    await save.mutateAsync({
                      id: editing.id ?? null,
                      patch: {
                        title: editing.title.trim(),
                        description: editing.description?.trim() || null,
                        kind: editing.kind ?? "libro",
                        label_match: editing.label_match?.trim() || null,
                        url: editing.url?.trim() || null,
                        is_published: !!editing.is_published,
                      },
                    });
                    toast.success("Recurso guardado.");
                    setEditing(null);
                  } catch (e: any) {
                    toast.error(e?.message ?? "No se pudo guardar.");
                  }
                }}
              >
                <Save className="size-3.5" /> Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------ Taxonomía ------------------------------ */

function TaxonomyEditor() {
  const tax = useTaxonomy();
  const { create, update, remove } = useTaxonomyMutations();
  const nodes = tax.data ?? [];
  const childrenOf = (id: string | null) => nodes.filter((n) => n.parent_id === id);

  const add = async (parent: TaxNode | null) => {
    const level: TaxLevel = parent ? (TAX_CHILD[parent.level] ?? "concept") : "subject";
    const name = window.prompt(`Nombre de la nueva ${TAX_LABEL[level].toLowerCase()}`);
    if (!name?.trim()) return;
    try {
      await create.mutateAsync({
        level,
        name: name.trim(),
        parentId: parent?.id ?? null,
        siblings: childrenOf(parent?.id ?? null).length,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el nodo.");
    }
  };

  const Node = ({ node, depth }: { node: TaxNode; depth: number }) => (
    <div style={{ marginLeft: depth * 16 }} className="border-l border-border/60 pl-3">
      <div className="flex items-center gap-2 py-1.5">
        <Chip>{TAX_LABEL[node.level]}</Chip>
        <span className="text-sm font-medium">{node.name}</span>
        <div className="flex-1" />
        {TAX_CHILD[node.level] && (
          <Btn onClick={() => add(node)} title="Agregar hijo">
            <Plus className="size-3" />
          </Btn>
        )}
        <Btn
          onClick={async () => {
            const name = window.prompt("Nuevo nombre", node.name);
            if (name?.trim()) await update.mutateAsync({ id: node.id, patch: { name: name.trim() } });
          }}
        >
          Renombrar
        </Btn>
        <Btn
          variant="danger"
          onClick={async () => {
            if (window.confirm(`¿Eliminar "${node.name}" y sus hijos?`)) await remove.mutateAsync(node.id);
          }}
        >
          <Trash2 className="size-3" />
        </Btn>
      </div>
      {childrenOf(node.id).map((c) => (
        <Node key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <Panel
      title="Taxonomía académica"
      subtitle="Materia › Tema › Subtema › Capítulo › Concepto. Usada para filtrar y distribuir los exámenes."
      right={
        <Btn variant="primary" onClick={() => add(null)}>
          <Plus className="size-3.5" /> Nueva materia
        </Btn>
      }
    >
      {childrenOf(null).length === 0 ? (
        <Empty title="Sin taxonomía" hint="Crea materias o importa el banco: las etiquetas generan la taxonomía automáticamente." />
      ) : (
        <div className="space-y-1">
          {childrenOf(null).map((n) => (
            <Node key={n.id} node={n} depth={0} />
          ))}
        </div>
      )}
    </Panel>
  );
}

/* --------------------------- Plantillas examen --------------------------- */

const emptyBlueprint = {
  title: "",
  mode: "simulacro" as ExamMode,
  question_count: 100,
  duration_minutes: 120,
  blocks: 1,
  description: "",
  is_published: false,
};

function ExamTemplates() {
  const list = useExamBlueprints();
  const { save, remove } = useExamBlueprintMutations();
  const [editing, setEditing] = useState<Partial<ExamBlueprint> | null>(null);

  return (
    <>
      <Panel
        title="Plantillas de examen"
        subtitle="Simulacros oficiales, prácticas por materia y exámenes reales por bloques."
        right={
          <Btn variant="primary" onClick={() => setEditing({ ...emptyBlueprint })}>
            <Plus className="size-3.5" /> Nueva plantilla
          </Btn>
        }
      >
        <div className="space-y-2">
          {(list.data ?? []).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <div className="min-w-48 flex-1">
                <p className="text-sm font-bold">{e.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {EXAM_MODE_LABEL[e.mode as ExamMode]} · {e.question_count} preguntas · {e.duration_minutes} min ·{" "}
                  {e.blocks} bloque(s)
                </p>
              </div>
              <Chip className={e.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-600" : undefined}>
                {e.is_published ? "Publicado" : "Borrador"}
              </Chip>
              <Btn onClick={() => setEditing(e)}>Editar</Btn>
              <Btn
                variant="danger"
                onClick={async () => {
                  if (window.confirm("¿Eliminar plantilla?")) await remove.mutateAsync(e.id);
                }}
              >
                <Trash2 className="size-3" />
              </Btn>
            </div>
          ))}
          {(list.data ?? []).length === 0 && <Empty title="Sin plantillas" hint="Crea el primer simulacro oficial." />}
        </div>
      </Panel>

      {editing && (
        <Modal open title={editing.id ? "Editar plantilla" : "Nueva plantilla"} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field label="Título">
              <input
                className={inputClass}
                value={editing.title ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                className={`${inputClass} min-h-20`}
                value={editing.description ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, description: e.target.value }))}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Modalidad">
                <select
                  className={inputClass}
                  value={editing.mode ?? "simulacro"}
                  onChange={(e) => setEditing((p) => ({ ...p!, mode: e.target.value }))}
                >
                  {(Object.keys(EXAM_MODE_LABEL) as ExamMode[]).map((m) => (
                    <option key={m} value={m}>
                      {EXAM_MODE_LABEL[m]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Número de preguntas">
                <input
                  type="number"
                  min={1}
                  max={400}
                  className={inputClass}
                  value={editing.question_count ?? 100}
                  onChange={(e) => setEditing((p) => ({ ...p!, question_count: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Duración (minutos)">
                <select
                  className={inputClass}
                  value={editing.duration_minutes ?? 120}
                  onChange={(e) => setEditing((p) => ({ ...p!, duration_minutes: Number(e.target.value) }))}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bloques">
                <select
                  className={inputClass}
                  value={editing.blocks ?? 1}
                  onChange={(e) => setEditing((p) => ({ ...p!, blocks: Number(e.target.value) }))}
                >
                  <option value={1}>1 bloque</option>
                  <option value={2}>2 bloques</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={!!editing.is_published}
                onChange={(e) => setEditing((p) => ({ ...p!, is_published: e.target.checked }))}
              />
              Publicado para estudiantes
            </label>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Btn onClick={() => setEditing(null)}>Cancelar</Btn>
              <Btn
                variant="primary"
                onClick={async () => {
                  if (!editing.title?.trim()) return toast.error("Ponle un título.");
                  const slug =
                    (editing.slug ??
                      editing.title
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "")
                        .slice(0, 48)) || "examen";
                  try {
                    await save.mutateAsync({
                      id: editing.id ?? null,
                      patch: {
                        title: editing.title.trim(),
                        slug,
                        description: editing.description ?? null,
                        mode: editing.mode ?? "simulacro",
                        question_count: editing.question_count ?? 100,
                        duration_minutes: editing.duration_minutes ?? 120,
                        blocks: editing.blocks ?? 1,
                        is_published: !!editing.is_published,
                      },
                    });
                    toast.success("Plantilla guardada.");
                    setEditing(null);
                  } catch (e: any) {
                    toast.error(e?.message ?? "No se pudo guardar.");
                  }
                }}
              >
                <Save className="size-3.5" /> Guardar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------ Analítica ------------------------------ */

function ApexAnalytics() {
  const analytics = useApexAnalytics(true);
  const d: any = analytics.data ?? {};
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Intentos calificados" value={(d.recentAttempts ?? []).length} tone="info" />
        <Stat label="Preguntas reportadas" value={(d.flags ?? []).length} tone="warn" />
        <Stat label="Temas críticos" value={(d.hardestTopics ?? []).length} tone="bad" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Temas más difíciles" subtitle="Menor porcentaje de acierto global.">
          <div className="space-y-3">
            {(d.hardestTopics ?? []).map((t: any) => (
              <MasteryBar key={t.label} label={t.label} percent={t.percent} total={t.total} />
            ))}
            {(d.hardestTopics ?? []).length === 0 && <Empty title="Sin datos suficientes" />}
          </div>
        </Panel>
        <Panel title="Preguntas con más errores" subtitle="Candidatas a revisión o anulación.">
          <div className="space-y-2">
            {(d.worst ?? []).map((q: any) => (
              <div key={q.id} className="rounded-xl border border-border p-3 text-xs">
                <p className="line-clamp-2 font-medium">{q.stem}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {q.times_used}× usada · {q.times_wrong} errores · {q.flagged_count ?? 0} reportes
                </p>
              </div>
            ))}
            {(d.worst ?? []).length === 0 && <Empty title="Sin métricas de uso todavía" />}
          </div>
        </Panel>
        <Panel title="Preguntas más lentas">
          <div className="space-y-2">
            {(d.slowest ?? []).map((q: any) => (
              <div key={q.id} className="rounded-xl border border-border p-3 text-xs">
                <p className="line-clamp-2 font-medium">{q.stem}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {q.times_used ? Math.round(q.total_seconds / q.times_used) : 0}s promedio
                </p>
              </div>
            ))}
            {(d.slowest ?? []).length === 0 && <Empty title="Sin datos de tiempo" />}
          </div>
        </Panel>
        <Panel title="Reportes de estudiantes">
          <div className="space-y-2">
            {(d.flags ?? []).map((f: any) => (
              <div key={f.id} className="rounded-xl border border-border p-3 text-xs">
                <p className="font-bold">{f.reason}</p>
                {f.note && <p className="text-muted-foreground">{f.note}</p>}
              </div>
            ))}
            {(d.flags ?? []).length === 0 && <Empty title="Sin reportes abiertos" />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
