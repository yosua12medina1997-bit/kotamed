/**
 * Administrador de colecciones reutilizables del CMS (docentes, testimonios,
 * planes, cronogramas, FAQ, contadores, cursos) — Fase 3.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Layers, Plus, Trash2, Upload } from "lucide-react";
import { Btn, Chip, Field, Input, Select, Textarea } from "@/components/academy/ui";
import { uploadCmsMedia } from "@/lib/cms";
import {
  COLLECTIONS,
  useCollectionItems,
  useDeleteCollectionItem,
  useSaveCollectionItem,
  useSeedCollections,
  type CmsCollection,
  type CmsCollectionItem,
} from "@/lib/cms-collections";

export function CollectionsEditor() {
  const [collection, setCollection] = useState<CmsCollection>("teachers");
  const { data: items = [], isLoading } = useCollectionItems(collection, false);
  const save = useSaveCollectionItem();
  const del = useDeleteCollectionItem();
  const seed = useSeedCollections();
  const [editing, setEditing] = useState<string | null>(null);

  const meta = COLLECTIONS.find((c) => c.value === collection)!;

  const add = async () => {
    const title = window.prompt(`Nuevo elemento de ${meta.label}`);
    if (!title?.trim()) return;
    const id = await save.mutateAsync({
      collection,
      title: title.trim(),
      sort_order: items.length,
    });
    setEditing(id);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    next.forEach((it, i) => save.mutate({ id: it.id, sort_order: i }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={collection}
          className="max-w-[260px]"
          onChange={(e) => {
            setCollection(e.target.value as CmsCollection);
            setEditing(null);
          }}
        >
          {COLLECTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Btn variant="outline" onClick={add}>
          <Plus className="size-3" /> Nuevo
        </Btn>
        <Btn
          variant="ghost"
          loading={seed.isPending}
          onClick={() =>
            seed.mutate(undefined, {
              onSuccess: (n) =>
                toast.success(n ? `${n} elementos por defecto creados` : "Las colecciones ya tienen contenido"),
              onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
            })
          }
        >
          <Layers className="size-3" /> Contenido por defecto
        </Btn>
        <Chip>{items.length} elementos</Chip>
        <span className="text-xs text-muted-foreground">{meta.hint}</span>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Sin elementos en {meta.label}. Crea uno o carga el contenido por defecto.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={it.id} className="rounded-2xl border border-border/60 bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{it.title || it.label || "(sin título)"}</span>
                {it.value && <Chip>{it.value}</Chip>}
                {!it.visible && <Chip>Oculto</Chip>}
                <div className="ml-auto flex items-center gap-1">
                  <Btn variant="ghost" onClick={() => move(i, i - 1)}>
                    <ChevronUp className="size-3" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => move(i, i + 1)}>
                    <ChevronDown className="size-3" />
                  </Btn>
                  <Btn variant="ghost" onClick={() => save.mutate({ id: it.id, visible: !it.visible })}>
                    {it.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      const { id: _id, ...rest } = it;
                      save.mutate({ ...rest, title: `${it.title} (copia)`, sort_order: items.length });
                    }}
                  >
                    <Copy className="size-3" />
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      if (!confirm(`¿Eliminar "${it.title}"?`)) return;
                      del.mutate(it.id);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Btn>
                  <Btn variant="outline" onClick={() => setEditing(editing === it.id ? null : it.id)}>
                    {editing === it.id ? "Cerrar" : "Editar"}
                  </Btn>
                </div>
              </div>
              {editing === it.id && (
                <ItemForm item={it} onSave={(patch) => save.mutate({ id: it.id, ...patch })} />
              )}
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
  item: CmsCollectionItem;
  onSave: (patch: Partial<CmsCollectionItem>) => void;
}) {
  const [form, setForm] = useState({
    title: item.title ?? "",
    subtitle: item.subtitle ?? "",
    text: item.text ?? "",
    image: item.image ?? "",
    icon: item.icon ?? "",
    href: item.href ?? "",
    badge: item.badge ?? "",
    value: item.value ?? "",
    label: item.label ?? "",
    price: item.price ?? "",
    rating: item.rating ?? "",
    features: (item.features ?? []).join("\n"),
  });
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadCmsMedia(file, file.name);
      setForm((f) => ({ ...f, image: url }));
      toast.success("Imagen subida");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Field label="Título / nombre">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Subtítulo / cargo">
        <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Texto / descripción">
          <Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </Field>
      </div>
      <Field label="Cifra (contadores)">
        <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
      </Field>
      <Field label="Etiqueta (contadores)">
        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </Field>
      <Field label="Precio (planes)">
        <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      </Field>
      <Field label="Insignia">
        <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
      </Field>
      <Field label="Enlace">
        <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
      </Field>
      <Field label="Icono (lucide)">
        <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Beneficios / viñetas (una por línea)">
          <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Imagen">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={form.image}
              placeholder="https://…"
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-[11px] font-bold">
              {uploading ? "Subiendo…" : <><Upload className="size-3" /> Subir</>}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
            </label>
          </div>
        </Field>
      </div>
      <div className="sm:col-span-2 flex items-center justify-end">
        <Btn
          variant="solid"
          onClick={() => {
            onSave({
              title: form.title,
              subtitle: form.subtitle || null,
              text: form.text || null,
              image: form.image || null,
              icon: form.icon || null,
              href: form.href || null,
              badge: form.badge || null,
              value: form.value || null,
              label: form.label || null,
              price: form.price || null,
              rating: form.rating || null,
              features: form.features
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            });
            toast.success("Elemento guardado");
          }}
        >
          Guardar elemento
        </Btn>
      </div>
    </div>
  );
}
