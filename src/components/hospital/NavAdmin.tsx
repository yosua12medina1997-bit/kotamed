/**
 * KotaMed · Editor de módulos del Centro de Operaciones (solo administrador).
 * Permite crear, renombrar, duplicar, reordenar, ocultar, activar/desactivar y
 * eliminar módulos; cambiar icono, marcar estado (Nuevo/Beta/En desarrollo),
 * editar pestañas/tarjetas internas y definir permisos por rol.
 * Todo persiste en la base de datos: cero cambios de código.
 */
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Btn, Chip, Field, Input, Panel, Select } from "@/components/academy/ui";
import {
  DEFAULT_NEO_NAV,
  NEO_ICONS,
  NEO_ROLES,
  navIcon,
  type NeoModule,
  type NeoNavConfig,
  useSaveNeoNav,
} from "@/lib/neonatal-nav";

const BADGE_OPTIONS = [
  { value: "", label: "Sin marca" },
  { value: "nuevo", label: "Nuevo" },
  { value: "beta", label: "Beta" },
  { value: "desarrollo", label: "En desarrollo" },
];

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function NavAdmin({ nav, accent }: { nav: NeoNavConfig; accent: string }) {
  const [draft, setDraft] = useState<NeoNavConfig>(nav);
  const [openId, setOpenId] = useState<string | null>(null);
  const save = useSaveNeoNav();

  useEffect(() => setDraft(nav), [nav]);

  const setModules = (modules: NeoModule[]) => setDraft({ ...draft, modules });
  const patch = (id: string, p: Partial<NeoModule>) =>
    setModules(draft.modules.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...draft.modules];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    setModules(next);
  };

  const addModule = () => {
    const base = "modulo-nuevo";
    let id = base;
    let n = 2;
    while (draft.modules.some((m) => m.id === id)) id = `${base}-${n++}`;
    setModules([
      ...draft.modules,
      {
        id,
        label: "Nuevo módulo",
        icon: "LayoutDashboard",
        kind: "generic",
        layout: "tabs",
        tabs: [{ id: "general", label: "General" }],
        enabled: true,
        hidden: false,
        badge: "nuevo",
        roles: NEO_ROLES.map((r) => r.value),
      },
    ]);
    setOpenId(id);
  };

  const duplicate = (mod: NeoModule) => {
    let id = `${mod.id}-copia`;
    let n = 2;
    while (draft.modules.some((m) => m.id === id)) id = `${mod.id}-copia-${n++}`;
    const i = draft.modules.findIndex((m) => m.id === mod.id);
    const next = [...draft.modules];
    next.splice(i + 1, 0, { ...mod, id, label: `${mod.label} (copia)` });
    setModules(next);
  };

  return (
    <Panel
      title="Editor de módulos"
      subtitle="Arquitectura del Centro de Operaciones: crea, renombra, reordena, oculta o elimina módulos y define sus pestañas y permisos — sin tocar el código."
      icon={<Settings2 className="size-4" />}
      accent={accent}
      actions={
        <>
          <Btn variant="ghost" onClick={() => setDraft({ ...DEFAULT_NEO_NAV })}>
            <RotateCcw className="size-3" /> Restaurar por defecto
          </Btn>
          <Btn variant="outline" onClick={addModule}>
            <Plus className="size-3" /> Nuevo módulo
          </Btn>
          <Btn
            variant="solid"
            accent={accent}
            loading={save.isPending}
            onClick={() =>
              save.mutate(draft, {
                onSuccess: () => toast.success("Arquitectura del servicio actualizada."),
                onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
              })
            }
          >
            <Save className="size-3" /> Guardar cambios
          </Btn>
        </>
      }
    >
      <div className="space-y-2">
        {draft.modules.map((mod, i) => {
          const Icon = navIcon(mod.icon);
          const open = openId === mod.id;
          return (
            <div key={mod.id} className="rounded-2xl border border-border/50 bg-background/40">
              <div className="flex flex-wrap items-center gap-2 p-2.5">
                <Icon className="size-4 shrink-0" style={{ color: accent }} />
                <button
                  onClick={() => setOpenId(open ? null : mod.id)}
                  className="min-w-0 flex-1 text-left text-[12px] font-extrabold tracking-tight"
                >
                  {mod.label}
                  <span className="ml-2 text-[10px] font-medium text-muted-foreground">/{mod.id}</span>
                </button>
                {!mod.enabled && <Chip>Desactivado</Chip>}
                {mod.hidden && <Chip>Oculto</Chip>}
                {mod.badge && <Chip accent={accent}>{mod.badge}</Chip>}
                <div className="ml-auto flex shrink-0 items-center gap-0.5">
                  <IconBtn label="Subir" onClick={() => move(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </IconBtn>
                  <IconBtn label="Bajar" onClick={() => move(i, 1)}>
                    <ArrowDown className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    label={mod.hidden ? "Mostrar" : "Ocultar"}
                    onClick={() => patch(mod.id, { hidden: !mod.hidden })}
                  >
                    {mod.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </IconBtn>
                  <IconBtn label="Duplicar" onClick={() => duplicate(mod)}>
                    <Copy className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    label="Eliminar"
                    danger
                    onClick={() => setModules(draft.modules.filter((x) => x.id !== mod.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </IconBtn>
                </div>
              </div>

              {open && (
                <div className="space-y-3 border-t border-border/50 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Field label="Nombre">
                      <Input value={mod.label} onChange={(e) => patch(mod.id, { label: e.target.value })} />
                    </Field>
                    <Field label="Icono">
                      <Select value={mod.icon} onChange={(e) => patch(mod.id, { icon: e.target.value })}>
                        {Object.keys(NEO_ICONS).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Presentación interna">
                      <Select
                        value={mod.layout}
                        onChange={(e) => patch(mod.id, { layout: e.target.value as "tabs" | "cards" })}
                      >
                        <option value="tabs">Pestañas superiores</option>
                        <option value="cards">Tarjetas</option>
                      </Select>
                    </Field>
                    <Field label="Estado del módulo">
                      <Select
                        value={mod.badge ?? ""}
                        onChange={(e) =>
                          patch(mod.id, { badge: (e.target.value || null) as NeoModule["badge"] })
                        }
                      >
                        {BADGE_OPTIONS.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <input
                        type="checkbox"
                        checked={mod.enabled}
                        onChange={(e) => patch(mod.id, { enabled: e.target.checked })}
                      />
                      Módulo activo
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <input
                        type="checkbox"
                        checked={!!mod.adminOnly}
                        onChange={(e) => patch(mod.id, { adminOnly: e.target.checked })}
                      />
                      Solo administrador
                    </label>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Permisos por rol
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {NEO_ROLES.map((r) => {
                        const on = mod.roles.includes(r.value);
                        return (
                          <button
                            key={r.value}
                            onClick={() =>
                              patch(mod.id, {
                                roles: on
                                  ? mod.roles.filter((x) => x !== r.value)
                                  : [...mod.roles, r.value],
                              })
                            }
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                              on ? "text-foreground" : "border-border/60 text-muted-foreground"
                            }`}
                            style={on ? { background: `${accent}1f`, borderColor: `${accent}55` } : undefined}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {mod.layout === "cards" ? "Tarjetas internas" : "Pestañas internas"}
                      </div>
                      <Btn
                        variant="ghost"
                        onClick={() =>
                          patch(mod.id, {
                            tabs: [...mod.tabs, { id: `seccion-${mod.tabs.length + 1}`, label: "Nueva sección" }],
                          })
                        }
                      >
                        <Plus className="size-3" /> Agregar
                      </Btn>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {mod.tabs.map((t, ti) => (
                        <div key={`${t.id}-${ti}`} className="flex flex-wrap items-center gap-2">
                          <Input
                            value={t.label}
                            onChange={(e) => {
                              const tabs = [...mod.tabs];
                              tabs[ti] = { ...t, label: e.target.value, id: slug(e.target.value) || t.id };
                              patch(mod.id, { tabs });
                            }}
                            className="w-48"
                          />
                          <Input
                            value={t.hint ?? ""}
                            placeholder="Descripción (opcional)"
                            onChange={(e) => {
                              const tabs = [...mod.tabs];
                              tabs[ti] = { ...t, hint: e.target.value };
                              patch(mod.id, { tabs });
                            }}
                            className="flex-1 min-w-40"
                          />
                          <IconBtn
                            label="Subir"
                            onClick={() => {
                              if (ti === 0) return;
                              const tabs = [...mod.tabs];
                              const [it] = tabs.splice(ti, 1);
                              tabs.splice(ti - 1, 0, it!);
                              patch(mod.id, { tabs });
                            }}
                          >
                            <ArrowUp className="size-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Bajar"
                            onClick={() => {
                              if (ti === mod.tabs.length - 1) return;
                              const tabs = [...mod.tabs];
                              const [it] = tabs.splice(ti, 1);
                              tabs.splice(ti + 1, 0, it!);
                              patch(mod.id, { tabs });
                            }}
                          >
                            <ArrowDown className="size-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Eliminar"
                            danger
                            onClick={() => patch(mod.id, { tabs: mod.tabs.filter((_, x) => x !== ti) })}
                          >
                            <Trash2 className="size-3.5" />
                          </IconBtn>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-md p-1 text-muted-foreground transition hover:bg-foreground/5 ${
        danger ? "hover:text-destructive" : "hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
