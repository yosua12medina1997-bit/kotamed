/**
 * Editor de navegación del sitio (cabecera y pie) para CMS Studio — Fase 3.
 * Permite añadir, editar, ocultar, mover, duplicar y anidar submenús.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { Btn, Chip, Field, Input, Select } from "@/components/academy/ui";
import {
  useAdminNav,
  useDeleteNavItem,
  useReorderNav,
  useSaveNavItem,
  useSeedNav,
  type CmsNavItem,
  type NavLocation,
} from "@/lib/cms-nav";

const ICONS = [
  "Home", "GraduationCap", "BookOpen", "Users", "Crown", "Mail", "LogIn", "ArrowRight",
  "Layers", "Stethoscope", "FlaskConical", "ClipboardList", "Trophy", "Award", "MonitorPlay",
  "Activity", "Sparkles", "Calendar", "Circle",
];

export function NavEditor() {
  const [location, setLocation] = useState<NavLocation>("header");
  const { data: tree = [], isLoading } = useAdminNav(location);
  const saveItem = useSaveNavItem();
  const delItem = useDeleteNavItem();
  const reorder = useReorderNav();
  const seed = useSeedNav();
  const [editing, setEditing] = useState<string | null>(null);

  const addRoot = async () => {
    const label = window.prompt("Nombre del elemento del menú");
    if (!label?.trim()) return;
    const id = await saveItem.mutateAsync({
      location,
      label: label.trim(),
      href: "/",
      sort_order: tree.length,
    });
    setEditing(id);
  };

  const addChild = async (parent: CmsNavItem, count: number) => {
    const label = window.prompt(`Submenú de "${parent.label}"`);
    if (!label?.trim()) return;
    await saveItem.mutateAsync({
      location,
      parent_id: parent.id,
      label: label.trim(),
      href: "/",
      sort_order: count,
    });
    toast.success("Submenú añadido");
  };

  const move = (ids: string[], from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    reorder.mutate(next);
  };

  const duplicate = async (it: CmsNavItem, order: number) => {
    const { id: _id, ...rest } = it;
    await saveItem.mutateAsync({ ...rest, label: `${it.label} (copia)`, sort_order: order });
    toast.success("Elemento duplicado");
  };

  const rootIds = tree.map((t) => t.id);

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={location}
          className="max-w-[220px]"
          onChange={(e) => setLocation(e.target.value as NavLocation)}
        >
          <option value="header">Menú superior (cabecera)</option>
          <option value="footer">Menú del pie de página</option>
        </Select>
        <Btn variant="outline" onClick={addRoot}>
          <Plus className="size-3" /> Nuevo elemento
        </Btn>
        <Btn
          variant="ghost"
          loading={seed.isPending}
          onClick={() =>
            seed.mutate(undefined, {
              onSuccess: (n) =>
                toast.success(n ? `${n} elementos de menú creados` : "El menú ya está configurado"),
              onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
            })
          }
        >
          <Layers className="size-3" /> Menú por defecto
        </Btn>
        <Chip>{tree.length} elementos</Chip>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Cargando menú…</div>
      ) : tree.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Aún no hay elementos. Crea el menú por defecto y edítalo a tu medida.
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map((it, i) => (
            <div key={it.id} className="rounded-2xl border border-border/60 bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{it.label}</span>
                <span className="truncate text-xs text-muted-foreground">{it.href}</span>
                {it.is_cta && <Chip>CTA</Chip>}
                {!it.visible && <Chip>Oculto</Chip>}
                <div className="ml-auto flex items-center gap-1">
                  <Btn variant="ghost" onClick={() => move(rootIds, i, i - 1)}>
                    <ChevronUp className="size-3" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => move(rootIds, i, i + 1)}>
                    <ChevronDown className="size-3" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => saveItem.mutate({ id: it.id, visible: !it.visible })}
                  >
                    {it.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  </Btn>
                  <Btn variant="ghost" onClick={() => duplicate(it, tree.length)}>
                    <Copy className="size-3" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      if (!confirm(`¿Eliminar "${it.label}" y sus submenús?`)) return;
                      delItem.mutate(it.id);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Btn>
                  <Btn variant="outline" onClick={() => setEditing(editing === it.id ? null : it.id)}>
                    {editing === it.id ? "Cerrar" : "Editar"}
                  </Btn>
                </div>
              </div>

              {editing === it.id && <ItemForm item={it} onSave={(p) => saveItem.mutate({ id: it.id, ...p })} />}

              <div className="mt-2 space-y-1 border-l border-border/60 pl-3">
                {it.children.map((c, j) => (
                  <div key={c.id} className="rounded-xl bg-muted/30 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold">{c.label}</span>
                      <span className="truncate text-[11px] text-muted-foreground">{c.href}</span>
                      {!c.visible && <Chip>Oculto</Chip>}
                      <div className="ml-auto flex items-center gap-1">
                        <Btn variant="ghost" onClick={() => move(it.children.map((x) => x.id), j, j - 1)}>
                          <ChevronUp className="size-3" />
                        </Btn>
                        <Btn variant="ghost" onClick={() => move(it.children.map((x) => x.id), j, j + 1)}>
                          <ChevronDown className="size-3" />
                        </Btn>
                        <Btn variant="ghost" onClick={() => saveItem.mutate({ id: c.id, visible: !c.visible })}>
                          {c.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        </Btn>
                        <Btn variant="ghost" onClick={() => delItem.mutate(c.id)}>
                          <Trash2 className="size-3" />
                        </Btn>
                        <Btn variant="outline" onClick={() => setEditing(editing === c.id ? null : c.id)}>
                          {editing === c.id ? "Cerrar" : "Editar"}
                        </Btn>
                      </div>
                    </div>
                    {editing === c.id && (
                      <ItemForm item={c} onSave={(p) => saveItem.mutate({ id: c.id, ...p })} />
                    )}
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => addChild(it, it.children.length)}>
                  <Plus className="size-3" /> Añadir submenú
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemForm({
  item,
  onSave,
}: {
  item: CmsNavItem;
  onSave: (patch: Partial<CmsNavItem>) => void;
}) {
  const [form, setForm] = useState({
    label: item.label,
    href: item.href,
    icon: item.icon ?? "",
    badge: item.badge ?? "",
    description: item.description ?? "",
    is_cta: item.is_cta,
  });

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Field label="Etiqueta">
        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </Field>
      <Field label="Enlace (ruta o URL)">
        <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
      </Field>
      <Field label="Icono">
        <Select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
          <option value="">Sin icono</option>
          {ICONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Insignia (opcional)">
        <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Descripción del submenú (mega menú)">
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={form.is_cta}
          onChange={(e) => setForm({ ...form, is_cta: e.target.checked })}
        />
        Mostrar como botón destacado
      </label>
      <div className="flex items-center justify-end">
        <Btn
          variant="solid"
          onClick={() => {
            onSave({
              label: form.label,
              href: form.href,
              icon: form.icon || null,
              badge: form.badge || null,
              description: form.description || null,
              is_cta: form.is_cta,
            });
            toast.success("Menú actualizado");
          }}
        >
          Guardar elemento
        </Btn>
      </div>
    </div>
  );
}
