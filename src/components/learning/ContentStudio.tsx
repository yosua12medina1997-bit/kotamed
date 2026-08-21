/**
 * KOTA CONTENT STUDIO — administración académica de KOTA LEARNING.
 * Permite crear temas y recursos de cualquier tipo, editarlos, archivarlos,
 * eliminarlos y asignarlos por módulo, tema, diagnóstico, paciente, rol o
 * usuario. Solo visible en modo administrador.
 */
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Layers,
  Link2,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Btn, Chip, Empty, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { Modal, WardCard } from "@/components/ward/ui";
import {
  KL_KEYS,
  LEVELS,
  RESOURCE_KINDS,
  SCOPE_LABELS,
  kindMeta,
  useKlAssignments,
  useKlDelete,
  useKlResources,
  useKlSave,
  type KlAssignment,
  type KlModule,
  type KlResource,
  type KlScope,
} from "@/lib/kota-learning";
import { supabase } from "@/integrations/supabase/client";

const EMPTY = {
  title: "",
  description: "",
  kind: "tema",
  url: "",
  body: "",
  specialty: "",
  level: "General",
  tags: "",
  objectives: "",
  duration_label: "",
};

type Draft = typeof EMPTY & { id?: string };

function toDraft(r: KlResource): Draft {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    kind: r.kind,
    url: r.url ?? "",
    body: r.body ?? "",
    specialty: r.specialty ?? "",
    level: r.level ?? "General",
    tags: r.tags.join(", "),
    objectives: r.objectives.join("\n"),
    duration_label: r.duration_label ?? "",
  };
}

export function ContentStudio({
  accent,
  module,
  patientId,
  patientLabel,
}: {
  accent: string;
  module: KlModule;
  patientId: string | null;
  patientLabel: string | null;
}) {
  const { data: resources = [] } = useKlResources();
  const { data: assignments = [] } = useKlAssignments();
  const saveRes = useKlSave("kl_resources", [KL_KEYS.resources]);
  const delRes = useKlDelete("kl_resources", [KL_KEYS.resources, KL_KEYS.assignments]);
  const saveAsg = useKlSave("kl_assignments", [KL_KEYS.assignments]);
  const delAsg = useKlDelete("kl_assignments", [KL_KEYS.assignments]);

  const [editor, setEditor] = useState<Draft | null>(null);
  const [assignFor, setAssignFor] = useState<KlResource | null>(null);
  const [filter, setFilter] = useState("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [uploading, setUploading] = useState(false);

  const byResource = useMemo(() => {
    const m = new Map<string, KlAssignment[]>();
    for (const a of assignments) m.set(a.resource_id, [...(m.get(a.resource_id) ?? []), a]);
    return m;
  }, [assignments]);

  const visible = resources.filter(
    (r) => (showArchived ? true : !r.archived) && (filter === "todos" || r.kind === filter),
  );

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const path = `kota-learning/${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from("content").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("content").createSignedUrl(path, 60 * 60 * 24 * 365);
      setEditor((d) => ({ ...(d ?? EMPTY), url: data?.signedUrl ?? "", title: (d?.title || file.name) }));
      toast.success("Archivo subido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <WardCard
        title="Kota Content Studio"
        subtitle="Crea, organiza y distribuye el contenido académico del ecosistema clínico."
        icon={<Layers className="size-4" style={{ color: accent }} />}
        actions={
          <>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              {RESOURCE_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
            <Btn variant="outline" accent={accent} onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
              {showArchived ? "Ocultar archivados" : "Ver archivados"}
            </Btn>
            <Btn variant="solid" accent={accent} onClick={() => setEditor({ ...EMPTY })}>
              <Plus className="size-3.5" /> Crear contenido
            </Btn>
          </>
        }
      >
        {visible.length === 0 ? (
          <Empty text="Aún no hay contenido académico. Crea el primer tema o recurso." />
        ) : (
          <ul className="space-y-2">
            {visible.map((r) => {
              const meta = kindMeta(r.kind);
              const asg = byResource.get(r.id) ?? [];
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] font-bold">{r.title}</span>
                      {r.archived && <Chip>Archivado</Chip>}
                      <Chip>{meta.label}</Chip>
                      {r.level && <Chip>{r.level}</Chip>}
                    </div>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{r.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {asg.length === 0 ? (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Sin asignaciones
                        </span>
                      ) : (
                        asg.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            title="Quitar asignación"
                            onClick={() => delAsg.mutate(a.id)}
                            className="rounded-lg border border-border/60 px-2 py-0.5 text-[10px] font-bold hover:border-destructive hover:text-destructive"
                          >
                            {SCOPE_LABELS[a.scope]}: {a.scope_value}
                            {a.required ? " · obligatorio" : ""}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Btn variant="outline" accent={accent} onClick={() => setAssignFor(r)}>
                      <Share2 className="size-3.5" /> Asignar
                    </Btn>
                    <Btn variant="outline" accent={accent} onClick={() => setEditor(toDraft(r))}>
                      <Pencil className="size-3.5" /> Editar
                    </Btn>
                    <Btn
                      variant="outline"
                      accent={accent}
                      onClick={() => saveRes.mutate({ id: r.id, archived: !r.archived })}
                    >
                      {r.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                    </Btn>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar "${r.title}"?`)) delRes.mutate(r.id);
                      }}
                      className="grid size-8 place-items-center rounded-xl border border-border/60 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </WardCard>

      {/* ─── Editor de recurso ─── */}
      <Modal
        open={!!editor}
        title={editor?.id ? "Editar contenido" : "Crear contenido académico"}
        subtitle="Temas, videos, guías, algoritmos, casos, flashcards, preguntas y archivos."
        onClose={() => setEditor(null)}
        wide
      >
        {editor && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título">
                <Input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="Bronquiolitis aguda · manejo inicial"
                />
              </Field>
              <Field label="Tipo de contenido">
                <Select value={editor.kind} onChange={(e) => setEditor({ ...editor, kind: e.target.value })}>
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Especialidad o categoría">
                <Input
                  value={editor.specialty}
                  onChange={(e) => setEditor({ ...editor, specialty: e.target.value })}
                  placeholder="Neumología pediátrica"
                />
              </Field>
              <Field label="Nivel académico">
                <Select value={editor.level} onChange={(e) => setEditor({ ...editor, level: e.target.value })}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Etiquetas (separadas por coma)">
                <Input
                  value={editor.tags}
                  onChange={(e) => setEditor({ ...editor, tags: e.target.value })}
                  placeholder="bronquiolitis, sibilancias, VSR"
                />
              </Field>
              <Field label="Duración / extensión">
                <Input
                  value={editor.duration_label}
                  onChange={(e) => setEditor({ ...editor, duration_label: e.target.value })}
                  placeholder="18:45 min · 12 páginas · 32 tarjetas"
                />
              </Field>
            </div>

            <Field label="Descripción">
              <Textarea
                rows={2}
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
              />
            </Field>

            <Field label="Objetivos de aprendizaje (uno por línea)">
              <Textarea
                rows={3}
                value={editor.objectives}
                onChange={(e) => setEditor({ ...editor, objectives: e.target.value })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Enlace (video, PDF, presentación, artículo)">
                <Input
                  value={editor.url}
                  onChange={(e) => setEditor({ ...editor, url: e.target.value })}
                  placeholder="https://..."
                />
              </Field>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-[12px] font-bold hover:bg-muted/60">
                <Upload className="size-3.5" />
                {uploading ? "Subiendo…" : "Subir archivo"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f);
                  }}
                />
              </label>
            </div>

            <Field label="Contenido estructurado / notas del tema">
              <Textarea
                rows={7}
                value={editor.body}
                onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                placeholder="Puntos clave, algoritmo, preguntas, flashcards (una por línea)…"
              />
            </Field>

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="outline" accent={accent} onClick={() => setEditor(null)}>
                Cancelar
              </Btn>
              <Btn
                variant="solid"
                accent={accent}
                disabled={!editor.title.trim() || saveRes.isPending}
                onClick={() =>
                  saveRes.mutate(
                    {
                      ...(editor.id ? { id: editor.id } : {}),
                      title: editor.title.trim(),
                      description: editor.description.trim() || null,
                      kind: editor.kind,
                      url: editor.url.trim() || null,
                      body: editor.body.trim() || null,
                      specialty: editor.specialty.trim() || null,
                      level: editor.level,
                      duration_label: editor.duration_label.trim() || null,
                      tags: editor.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                      objectives: editor.objectives
                        .split("\n")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    },
                    {
                      onSuccess: () => {
                        toast.success("Contenido guardado");
                        setEditor(null);
                      },
                    },
                  )
                }
              >
                Guardar contenido
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Asignación inteligente ─── */}
      <AssignModal
        resource={assignFor}
        accent={accent}
        module={module}
        patientId={patientId}
        patientLabel={patientLabel}
        onClose={() => setAssignFor(null)}
        onSave={(payload) =>
          saveAsg.mutate(payload, {
            onSuccess: () => {
              toast.success("Contenido asignado");
              setAssignFor(null);
            },
          })
        }
      />
    </div>
  );
}

function AssignModal({
  resource,
  accent,
  module,
  patientId,
  patientLabel,
  onClose,
  onSave,
}: {
  resource: KlResource | null;
  accent: string;
  module: KlModule;
  patientId: string | null;
  patientLabel: string | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [scope, setScope] = useState<KlScope>("module");
  const [value, setValue] = useState<string>(module);
  const [required, setRequired] = useState(false);
  const [note, setNote] = useState("");

  return (
    <Modal
      open={!!resource}
      title="Asignación inteligente"
      subtitle={resource?.title}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ámbito de asignación">
            <Select
              value={scope}
              onChange={(e) => {
                const s = e.target.value as KlScope;
                setScope(s);
                setValue(s === "module" ? module : s === "patient" ? (patientId ?? "") : "");
              }}
            >
              {(Object.keys(SCOPE_LABELS) as KlScope[]).map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valor">
            {scope === "module" ? (
              <Select value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="ward">Hospitalización Pediátrica</option>
                <option value="emergency">Emergencia Pediátrica</option>
                <option value="todos">Ambos módulos</option>
              </Select>
            ) : scope === "patient" ? (
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={patientLabel ? `Paciente activo: ${patientLabel}` : "ID del paciente"}
              />
            ) : scope === "role" ? (
              <Select value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="">Selecciona…</option>
                <option value="student">Internos / Alumnos</option>
                <option value="teacher">Docentes</option>
                <option value="admin">Administradores</option>
              </Select>
            ) : (
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  scope === "dx" ? "bronquiolitis" : scope === "topic" ? "insuficiencia respiratoria" : "UUID del usuario"
                }
              />
            )}
          </Field>
        </div>
        <Field label="Nota para el interno (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-[12px] font-semibold">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Marcar como actividad obligatoria
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Btn variant="outline" accent={accent} onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            variant="solid"
            accent={accent}
            disabled={!resource || !value.trim()}
            onClick={() =>
              onSave({
                resource_id: resource!.id,
                scope,
                scope_value: value.trim(),
                module: scope === "module" ? null : module,
                required,
                note: note.trim() || null,
              })
            }
          >
            <Link2 className="size-3.5" /> Asignar
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
