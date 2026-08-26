/**
 * Editor CMS de la navegación del Panel del Alumno (Nexus):
 * accesos del sidebar, orden, iconos, rutas, visibilidad y buscador.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Btn, Chip, Field, Input, Panel, Select } from "@/components/academy/ui";
import {
  DEFAULT_NEXUS_NAV,
  NAV_ICONS,
  newNavItem,
  useNexusNav,
  useSaveNexusNav,
  type NavIcon,
  type NavVisibility,
  type NexusNavConfig,
  type NexusNavItem,
} from "@/lib/nexus-nav-cms";

const VISIBILITY: { value: NavVisibility; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "enrolled", label: "Solo matriculados" },
  { value: "admin", label: "Administradores" },
  { value: "super_admin", label: "Super Admin" },
];

export function NexusNavEditor() {
  const { data } = useNexusNav();
  const save = useSaveNexusNav();
  const [cfg, setCfg] = useState<NexusNavConfig>(DEFAULT_NEXUS_NAV);

  useEffect(() => {
    if (data) setCfg(data);
  }, [data]);

  const patch = (i: number, next: Partial<NexusNavItem>) =>
    setCfg((c) => ({ ...c, items: c.items.map((it, idx) => (idx === i ? { ...it, ...next } : it)) }));

  const move = (i: number, dir: -1 | 1) =>
    setCfg((c) => {
      const items = [...c.items];
      const j = i + dir;
      if (j < 0 || j >= items.length) return c;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...c, items };
    });

  const submit = () =>
    save.mutate(cfg, {
      onSuccess: () => toast.success("Navegación del panel actualizada"),
      onError: (e) => toast.error(String((e as Error).message)),
    });

  return (
    <div className="space-y-3">
      <Panel
        title="Navegación del panel del alumno"
        accent="hsl(var(--primary))"
        subtitle="Define los accesos del menú lateral: etiqueta, ruta, icono, orden y quién los ve."
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={() => setCfg(DEFAULT_NEXUS_NAV)}>
              <RotateCcw className="size-3.5" /> Restaurar
            </Btn>
            <Btn variant="solid" loading={save.isPending} onClick={submit}>
              <Save className="size-3.5" /> Guardar
            </Btn>
          </div>
        }
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Texto del buscador">
            <Input
              value={cfg.searchPlaceholder}
              onChange={(e) => setCfg({ ...cfg, searchPlaceholder: e.target.value })}
            />
          </Field>
          <Field label="Mostrar «Perfil»">
            <Select
              value={cfg.showProfile ? "1" : "0"}
              onChange={(e) => setCfg({ ...cfg, showProfile: e.target.value === "1" })}
            >
              <option value="1">Sí</option>
              <option value="0">No</option>
            </Select>
          </Field>
          <Field label="Mostrar «Ajustes»">
            <Select
              value={cfg.showSettings ? "1" : "0"}
              onChange={(e) => setCfg({ ...cfg, showSettings: e.target.value === "1" })}
            >
              <option value="1">Sí</option>
              <option value="0">No</option>
            </Select>
          </Field>
        </div>

        <div className="mt-4 space-y-2">
          {cfg.items.map((it, i) => (
            <div key={it.id} className="rounded-2xl border border-border/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip accent={it.enabled ? "#10b981" : "#64748b"}>{i + 1}</Chip>
                <div className="text-xs font-black">{it.label || "Sin título"}</div>
                <span className="font-mono text-[10px] text-muted-foreground">{it.to}</span>
                <div className="ml-auto flex items-center gap-1">
                  <Btn variant="ghost" title="Subir" onClick={() => move(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Btn>
                  <Btn variant="ghost" title="Bajar" onClick={() => move(i, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    title={it.enabled ? "Ocultar" : "Mostrar"}
                    onClick={() => patch(i, { enabled: !it.enabled })}
                  >
                    {it.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </Btn>
                  <Btn
                    variant="ghost"
                    title="Eliminar"
                    onClick={() =>
                      setCfg((c) => ({ ...c, items: c.items.filter((_, idx) => idx !== i) }))
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Btn>
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Etiqueta">
                  <Input value={it.label} onChange={(e) => patch(i, { label: e.target.value })} />
                </Field>
                <Field label="Ruta">
                  <Input
                    value={it.to}
                    onChange={(e) => patch(i, { to: e.target.value })}
                    placeholder="/mis-cursos"
                  />
                </Field>
                <Field label="Icono">
                  <Select value={it.icon} onChange={(e) => patch(i, { icon: e.target.value as NavIcon })}>
                    {Object.keys(NAV_ICONS).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Visibilidad">
                  <Select
                    value={it.visibility}
                    onChange={(e) => patch(i, { visibility: e.target.value as NavVisibility })}
                  >
                    {VISIBILITY.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Descripción corta">
                  <Input value={it.hint} onChange={(e) => patch(i, { hint: e.target.value })} />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Btn variant="outline" onClick={() => setCfg((c) => ({ ...c, items: [...c.items, newNavItem()] }))}>
            <Plus className="size-3.5" /> Añadir acceso
          </Btn>
        </div>
      </Panel>
    </div>
  );
}
