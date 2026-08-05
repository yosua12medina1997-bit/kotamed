/**
 * Editores del CMS académico: formulario del nodo, secciones con IA,
 * recursos, relaciones, campos personalizados e historial de versiones.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Btn, Empty, Field, Input, Panel, Select, Textarea } from "@/components/academy/ui";
import { askAcademyCms } from "@/lib/academy-cms-ai.functions";
import {
  CASE_TYPES,
  CMS_FIELD_TYPES,
  CMS_ROLES,
  RESOURCE_KINDS,
  levelLabel,
  levelsFor,
  sectionsFor,
  useCmsFields,
  useCmsVersions,
  useDeleteCmsField,
  useSaveCmsField,
  type CmsField,
  type CmsModule,
  type CmsNode,
  type CmsNodeData,
  type CmsResource,
} from "@/lib/academy-cms";

const AI_ACTIONS: { id: string; label: string }[] = [
  { id: "redactar", label: "Redactar" },
  { id: "mejorar", label: "Mejorar" },
  { id: "resumen", label: "Resumen" },
  { id: "objetivos", label: "Objetivos" },
  { id: "diferencial", label: "Diferencial" },
  { id: "preguntas", label: "Preguntas" },
  { id: "flashcards", label: "Flashcards" },
  { id: "bibliografia", label: "Bibliografía" },
  { id: "algoritmo", label: "Algoritmo" },
  { id: "caso", label: "Caso completo" },
];

/* ================================================================== */
/*  FORMULARIO DEL NODO                                                */
/* ================================================================== */

export function CmsNodeEditor({
  module,
  node,
  nodes,
  path,
  accent,
  onSave,
  onCancel,
}: {
  module: CmsModule;
  node: Partial<CmsNode>;
  nodes: CmsNode[];
  path: string;
  accent: string;
  onSave: (draft: Partial<CmsNode>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Partial<CmsNode>>({
    level_kind: levelsFor(module)[0]!,
    is_published: true,
    hidden: false,
    tags: [],
    roles: [],
    data: {},
    ...node,
  });
  const data: CmsNodeData = draft.data ?? {};
  const { data: fields = [] } = useCmsFields(module);
  const sections = sectionsFor(module);
  const [aiAction, setAiAction] = useState("redactar");
  const [aiSection, setAiSection] = useState(sections[0]!.key);
  const [aiExtra, setAiExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const runAi = useServerFn(askAcademyCms);

  const set = (patch: Partial<CmsNode>) => setDraft((d) => ({ ...d, ...patch }));
  const setData = (patch: Partial<CmsNodeData>) =>
    setDraft((d) => ({ ...d, data: { ...(d.data ?? {}), ...patch } }));
  const setSection = (key: string, value: string) =>
    setData({ sections: { ...(data.sections ?? {}), [key]: value } });

  const activeFields = useMemo(
    () =>
      fields.filter(
        (f) => !f.applies_to.length || f.applies_to.includes(draft.level_kind ?? ""),
      ),
    [fields, draft.level_kind],
  );

  const generate = async () => {
    setAiBusy(true);
    try {
      const res: any = await runAi({
        data: {
          action: aiAction,
          module,
          path,
          section: sections.find((s) => s.key === aiSection)?.label ?? aiSection,
          context: [
            `Título: ${draft.title ?? ""}`,
            draft.subtitle ? `Subtítulo: ${draft.subtitle}` : "",
            draft.case_type ? `Tipo: ${draft.case_type}` : "",
            (data.sections?.[aiSection] ?? "").slice(0, 6000),
          ]
            .filter(Boolean)
            .join("\n"),
          extra: aiExtra,
        },
      });
      const text = String(res?.text ?? "");
      if (!text) throw new Error("Respuesta vacía");
      setSection(aiSection, [(data.sections?.[aiSection] ?? "").trim(), text].filter(Boolean).join("\n\n"));
      toast.success("Contenido generado por KotaMed AI");
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally {
      setAiBusy(false);
    }
  };

  const resources = data.resources ?? [];
  const setResource = (i: number, patch: Partial<CmsResource>) =>
    setData({ resources: resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-4">
      <Panel title="Ficha del contenido" accent={accent}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Título">
            <Input value={draft.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={draft.subtitle ?? ""}
              onChange={(e) => set({ subtitle: e.target.value })}
            />
          </Field>
          <Field label="Nivel jerárquico">
            <Select
              value={draft.level_kind ?? ""}
              onChange={(e) => set({ level_kind: e.target.value })}
            >
              {levelsFor(module).map((l) => (
                <option key={l} value={l}>
                  {levelLabel(l)}
                </option>
              ))}
            </Select>
          </Field>
          {module === "casos" && (
            <Field label="Tipo de caso">
              <Select
                value={draft.case_type ?? ""}
                onChange={(e) => set({ case_type: e.target.value })}
              >
                <option value="">Sin tipo</option>
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Etiquetas (separadas por coma)">
            <Input
              value={(draft.tags ?? []).join(", ")}
              onChange={(e) =>
                set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
              }
            />
          </Field>
          <Field label="Orden">
            <Input
              type="number"
              value={draft.sort_order ?? 0}
              onChange={(e) => set({ sort_order: Number(e.target.value) })}
            />
          </Field>
          <Field label="Nodo padre">
            <Select
              value={draft.parent_id ?? ""}
              onChange={(e) => set({ parent_id: e.target.value || null })}
            >
              <option value="">Raíz</option>
              {nodes
                .filter((n) => n.id !== draft.id)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {levelLabel(n.level_kind)} · {n.title}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Publicación programada">
            <Input
              type="datetime-local"
              value={(draft.publish_at ?? "").slice(0, 16)}
              onChange={(e) => set({ publish_at: e.target.value || null })}
            />
          </Field>
          <Field label="Cierre programado">
            <Input
              type="datetime-local"
              value={(draft.close_at ?? "").slice(0, 16)}
              onChange={(e) => set({ close_at: e.target.value || null })}
            />
          </Field>
          <Field label="Roles con acceso (vacío = todos)">
            <Input
              value={(draft.roles ?? []).join(", ")}
              onChange={(e) =>
                set({ roles: e.target.value.split(",").map((r) => r.trim()).filter(Boolean) })
              }
              placeholder={CMS_ROLES.join(", ")}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.is_published !== false}
              onChange={(e) => set({ is_published: e.target.checked })}
            />
            Publicado
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.hidden === true}
              onChange={(e) => set({ hidden: e.target.checked })}
            />
            Oculto
          </label>
        </div>
        <div className="mt-3">
          <Field label="Descripción / resumen">
            <Textarea value={draft.body ?? ""} onChange={(e) => set({ body: e.target.value })} />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Contenido por secciones"
        accent={accent}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={aiSection} onChange={(e) => setAiSection(e.target.value)}>
              {sections.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select value={aiAction} onChange={(e) => setAiAction(e.target.value)}>
              {AI_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
            <Btn variant="solid" accent={accent} onClick={generate} loading={aiBusy}>
              <Sparkles className="size-3" /> Generar con IA
            </Btn>
          </div>
        }
      >
        <div className="mb-3">
          <Field label="Indicación para la IA (opcional)">
            <Input
              value={aiExtra}
              onChange={(e) => setAiExtra(e.target.value)}
              placeholder="Ej. enfoque MINSA, nivel interno, prematuro de 28 semanas…"
            />
          </Field>
        </div>
        <div className="space-y-3">
          {sections.map((s) => (
            <Field key={s.key} label={s.label}>
              <Textarea
                value={data.sections?.[s.key] ?? ""}
                onChange={(e) => setSection(s.key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </Panel>

      {activeFields.length > 0 && (
        <Panel title="Campos personalizados" accent={accent}>
          <div className="grid gap-3 md:grid-cols-2">
            {activeFields.map((f) => (
              <CustomFieldInput
                key={f.id}
                field={f}
                value={data.custom?.[f.key]}
                onChange={(v) => setData({ custom: { ...(data.custom ?? {}), [f.key]: v } })}
              />
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Recursos adjuntos"
        accent={accent}
        actions={
          <Btn
            variant="outline"
            onClick={() =>
              setData({ resources: [...resources, { kind: "PDF", title: "", url: "" }] })
            }
          >
            <Plus className="size-3" /> Añadir
          </Btn>
        }
      >
        {resources.length === 0 ? (
          <Empty text="Sin recursos. Añade PDF, videos, guías, protocolos o calculadoras." />
        ) : (
          <div className="space-y-2">
            {resources.map((r, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[150px_1fr_1fr_auto]">
                <Select value={r.kind} onChange={(e) => setResource(i, { kind: e.target.value })}>
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
                <Input
                  value={r.title}
                  placeholder="Título"
                  onChange={(e) => setResource(i, { title: e.target.value })}
                />
                <Input
                  value={r.url ?? ""}
                  placeholder="URL"
                  onChange={(e) => setResource(i, { url: e.target.value })}
                />
                <Btn
                  onClick={() => setData({ resources: resources.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="size-3" />
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Relaciones inteligentes" accent={accent}>
        <Field label="Contenidos relacionados">
          <div className="max-h-48 overflow-auto rounded-xl border border-border/60 p-2">
            {nodes
              .filter((n) => n.id !== draft.id)
              .map((n) => {
                const on = (data.relations ?? []).includes(n.id);
                return (
                  <label key={n.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setData({
                          relations: e.target.checked
                            ? [...(data.relations ?? []), n.id]
                            : (data.relations ?? []).filter((x) => x !== n.id),
                        })
                      }
                    />
                    <span className="text-muted-foreground">{levelLabel(n.level_kind)}</span>
                    {n.title}
                  </label>
                );
              })}
          </div>
        </Field>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Btn variant="solid" accent={accent} onClick={() => onSave(draft)}>
          <Save className="size-3" /> Guardar contenido
        </Btn>
        <Btn onClick={onCancel}>
          <X className="size-3" /> Cancelar
        </Btn>
      </div>
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CmsField;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 pt-5 text-xs font-bold">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === "select" || field.type === "multiselect") {
    return (
      <Field label={field.label}>
        <Select
          multiple={field.type === "multiselect"}
          value={value ?? (field.type === "multiselect" ? [] : "")}
          onChange={(e) =>
            onChange(
              field.type === "multiselect"
                ? Array.from(e.target.selectedOptions).map((o) => o.value)
                : e.target.value,
            )
          }
        >
          {field.type === "select" && <option value="">—</option>}
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (["textarea", "markdown", "code", "html", "table"].includes(field.type)) {
    return (
      <Field label={field.label}>
        <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </Field>
    );
  }
  return (
    <Field label={field.label}>
      <Input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/* ================================================================== */
/*  CAMPOS PERSONALIZADOS (ADMIN)                                      */
/* ================================================================== */

export function CmsFieldsAdmin({ module, accent }: { module: CmsModule; accent: string }) {
  const { data: fields = [] } = useCmsFields(module);
  const save = useSaveCmsField(module);
  const del = useDeleteCmsField(module);
  const [draft, setDraft] = useState<Partial<CmsField>>({ type: "text", options: [], applies_to: [] });

  const submit = () => {
    if (!draft.key?.trim() || !draft.label?.trim()) {
      toast.error("Clave y etiqueta son obligatorias.");
      return;
    }
    save.mutate(draft, {
      onSuccess: () => {
        toast.success("Campo guardado");
        setDraft({ type: "text", options: [], applies_to: [] });
      },
      onError: (e: any) => toast.error(String(e?.message ?? e)),
    });
  };

  return (
    <Panel title="Constructor de campos personalizados" accent={accent}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Clave (sin espacios)">
          <Input
            value={draft.key ?? ""}
            onChange={(e) => setDraft({ ...draft, key: e.target.value.replace(/\s+/g, "_") })}
          />
        </Field>
        <Field label="Etiqueta visible">
          <Input value={draft.label ?? ""} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </Field>
        <Field label="Tipo de campo">
          <Select
            value={draft.type ?? "text"}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
          >
            {CMS_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Opciones (coma)">
          <Input
            value={(draft.options ?? []).join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Aplica a niveles (vacío = todos)">
          <Input
            value={(draft.applies_to ?? []).join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                applies_to: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
              })
            }
            placeholder={levelsFor(module).join(", ")}
          />
        </Field>
        <Field label="Orden">
          <Input
            type="number"
            value={draft.sort_order ?? 0}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Btn variant="solid" accent={accent} onClick={submit} loading={save.isPending}>
          <Wand2 className="size-3" /> {draft.id ? "Actualizar campo" : "Crear campo"}
        </Btn>
      </div>
      <div className="mt-4 space-y-2">
        {fields.length === 0 ? (
          <Empty text="Aún no hay campos personalizados." />
        ) : (
          fields.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs"
            >
              <div>
                <b>{f.label}</b>{" "}
                <span className="text-muted-foreground">
                  · {f.key} · {f.type}
                  {f.applies_to.length ? ` · ${f.applies_to.join("/")}` : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => setDraft(f)}>Editar</Btn>
                <Btn onClick={() => del.mutate(f.id)}>
                  <Trash2 className="size-3" />
                </Btn>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

/* ================================================================== */
/*  HISTORIAL DE VERSIONES                                             */
/* ================================================================== */

export function CmsVersionHistory({ nodeId, accent }: { nodeId: string; accent: string }) {
  const { data: versions = [] } = useCmsVersions(nodeId);
  return (
    <Panel title="Historial de versiones" accent={accent}>
      {versions.length === 0 ? (
        <Empty text="Sin versiones previas registradas." />
      ) : (
        <ul className="space-y-1 text-xs">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-1.5"
            >
              <span className="font-bold">Versión {v.version}</span>
              <span className="text-muted-foreground">
                {new Date(v.created_at).toLocaleString("es-PE")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
