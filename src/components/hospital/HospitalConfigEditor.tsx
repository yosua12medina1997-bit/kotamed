/**
 * Editor administrativo del módulo de Hospitalización Neonatal:
 * permite crear, editar y eliminar pestañas, grupos, campos, plantillas de
 * evolución, categorías de laboratorio, tipos de imagen y protocolos.
 * Todo se guarda en base de datos (nada hardcodeado en la vista clínica).
 */
import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Settings2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_HOSPITAL_CONFIG,
  useSaveHospitalConfig,
  type DynamicField,
  type DynamicGroup,
  type FieldType,
  type HospitalConfig,
} from "@/lib/neonatal-hospital";
import { Btn, Field, Input, Panel, Select, Textarea } from "@/components/academy/ui";

const SECTIONS: { key: "general" | "maternal" | "exam"; label: string }[] = [
  { key: "general", label: "Datos generales del RN" },
  { key: "maternal", label: "Antecedentes maternos" },
  { key: "exam", label: "Examen físico" },
];

const TYPES: FieldType[] = ["text", "number", "textarea", "select", "date", "time", "checkbox"];

function slugKey(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)+/g, "")
    .slice(0, 40) || `campo_${Date.now()}`;
}

export function HospitalConfigEditor({
  config,
  accent,
}: {
  config: HospitalConfig;
  accent: string;
}) {
  const [draft, setDraft] = useState<HospitalConfig>(config);
  const [tab, setTab] = useState<"general" | "maternal" | "exam" | "otros">("general");
  const save = useSaveHospitalConfig();

  useEffect(() => setDraft(config), [config]);

  const patch = (p: Partial<HospitalConfig>) => setDraft((d) => ({ ...d, ...p }));

  const setGroups = (key: "general" | "maternal" | "exam", groups: DynamicGroup[]) =>
    patch({ [key]: groups } as Partial<HospitalConfig>);

  const addGroup = (key: "general" | "maternal" | "exam") =>
    setGroups(key, [
      ...draft[key],
      { key: `grupo_${Date.now()}`, title: "Nuevo grupo", fields: [] },
    ]);

  const updateGroup = (
    key: "general" | "maternal" | "exam",
    gi: number,
    p: Partial<DynamicGroup>,
  ) => setGroups(key, draft[key].map((g, i) => (i === gi ? { ...g, ...p } : g)));

  const removeGroup = (key: "general" | "maternal" | "exam", gi: number) =>
    setGroups(key, draft[key].filter((_, i) => i !== gi));

  const addField = (key: "general" | "maternal" | "exam", gi: number) =>
    updateGroup(key, gi, {
      fields: [
        ...draft[key][gi]!.fields,
        { key: `campo_${Date.now()}`, label: "Nuevo campo", type: "text" },
      ],
    });

  const updateField = (
    key: "general" | "maternal" | "exam",
    gi: number,
    fi: number,
    p: Partial<DynamicField>,
  ) =>
    updateGroup(key, gi, {
      fields: draft[key][gi]!.fields.map((f, i) => (i === fi ? { ...f, ...p } : f)),
    });

  const removeField = (key: "general" | "maternal" | "exam", gi: number, fi: number) =>
    updateGroup(key, gi, { fields: draft[key][gi]!.fields.filter((_, i) => i !== fi) });

  return (
    <Panel
      title="Configuración del servicio"
      subtitle="Define las pestañas, grupos y campos del expediente neonatal, las plantillas de evolución, los laboratorios disponibles y los protocolos internos."
      icon={<Settings2 className="size-4" />}
      accent={accent}
      actions={
        <>
          <Btn
            onClick={() => {
              setDraft(DEFAULT_HOSPITAL_CONFIG);
              toast.info("Plantilla base restaurada (recuerda guardar).");
            }}
          >
            <RotateCcw className="size-3" /> Plantilla base
          </Btn>
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={() =>
              save.mutate(draft, {
                onSuccess: () => toast.success("Configuración guardada."),
                onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
              })
            }
          >
            <Save className="size-3" /> Guardar configuración
          </Btn>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {[...SECTIONS, { key: "otros" as const, label: "Plantillas, labs y protocolos" }].map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key as any)}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
              tab === s.key
                ? "text-white"
                : "border border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
            style={tab === s.key ? { background: accent } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tab !== "otros" && (
        <div className="mt-5 space-y-4">
          {draft[tab].map((g, gi) => (
            <div key={g.key} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Field label="Título del grupo">
                    <Input
                      value={g.title}
                      onChange={(e) => updateGroup(tab, gi, { title: e.target.value })}
                    />
                  </Field>
                </div>
                <Btn onClick={() => addField(tab, gi)}>
                  <Plus className="size-3" /> Campo
                </Btn>
                <Btn onClick={() => removeGroup(tab, gi)}>
                  <Trash2 className="size-3" /> Grupo
                </Btn>
              </div>

              <div className="mt-3 space-y-2">
                {g.fields.map((f, fi) => (
                  <div
                    key={`${f.key}-${fi}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-border/40 bg-background/50 p-2"
                  >
                    <div className="md:col-span-4">
                      <Input
                        value={f.label}
                        placeholder="Etiqueta"
                        onChange={(e) =>
                          updateField(tab, gi, fi, {
                            label: e.target.value,
                            key: f.key.startsWith("campo_") ? slugKey(e.target.value) : f.key,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Select
                        value={f.type}
                        onChange={(e) =>
                          updateField(tab, gi, fi, { type: e.target.value as FieldType })
                        }
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={f.unit ?? ""}
                        placeholder="Unidad"
                        onChange={(e) => updateField(tab, gi, fi, { unit: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        value={(f.options ?? []).join(", ")}
                        placeholder={f.type === "select" ? "Opciones separadas por coma" : "Ayuda / placeholder"}
                        onChange={(e) =>
                          f.type === "select"
                            ? updateField(tab, gi, fi, {
                                options: e.target.value
                                  .split(",")
                                  .map((x) => x.trim())
                                  .filter(Boolean),
                              })
                            : updateField(tab, gi, fi, { hint: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end">
                      <Btn onClick={() => removeField(tab, gi, fi)}>
                        <Trash2 className="size-3" />
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Btn variant="outline" onClick={() => addGroup(tab)}>
            <Plus className="size-3" /> Agregar grupo
          </Btn>
        </div>
      )}

      {tab === "otros" && (
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
              Plantillas de evolución
            </div>
            {draft.templates.map((t, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border/40 p-2">
                <div className="flex gap-2">
                  <Input
                    value={t.title}
                    onChange={(e) =>
                      patch({
                        templates: draft.templates.map((x, j) =>
                          j === i ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Btn
                    onClick={() =>
                      patch({ templates: draft.templates.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 className="size-3" />
                  </Btn>
                </div>
                <Textarea
                  value={t.body}
                  onChange={(e) =>
                    patch({
                      templates: draft.templates.map((x, j) =>
                        j === i ? { ...x, body: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <Btn
              variant="outline"
              onClick={() =>
                patch({
                  templates: [
                    ...draft.templates,
                    { key: `tpl_${Date.now()}`, title: "Nueva plantilla", body: "" },
                  ],
                })
              }
            >
              <Plus className="size-3" /> Plantilla
            </Btn>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3">
            <Field label="Categorías de laboratorio (una por línea)">
              <Textarea
                value={draft.labCategories.join("\n")}
                onChange={(e) =>
                  patch({ labCategories: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })
                }
              />
            </Field>
            <Field label="Tipos de imagen / archivo (una por línea)">
              <Textarea
                value={draft.mediaKinds.join("\n")}
                onChange={(e) =>
                  patch({ mediaKinds: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })
                }
              />
            </Field>
          </div>

          <div className="xl:col-span-2 rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
              Protocolos del servicio
            </div>
            {draft.protocols.map((p, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border/40 p-2">
                <div className="flex gap-2">
                  <Input
                    value={p.title}
                    onChange={(e) =>
                      patch({
                        protocols: draft.protocols.map((x, j) =>
                          j === i ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Btn onClick={() => patch({ protocols: draft.protocols.filter((_, j) => j !== i) })}>
                    <Trash2 className="size-3" />
                  </Btn>
                </div>
                <Textarea
                  value={p.body}
                  onChange={(e) =>
                    patch({
                      protocols: draft.protocols.map((x, j) =>
                        j === i ? { ...x, body: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <Btn
              variant="outline"
              onClick={() =>
                patch({
                  protocols: [
                    ...draft.protocols,
                    { key: `pr_${Date.now()}`, title: "Nuevo protocolo", body: "" },
                  ],
                })
              }
            >
              <Plus className="size-3" /> Protocolo
            </Btn>
          </div>
        </div>
      )}
    </Panel>
  );
}
