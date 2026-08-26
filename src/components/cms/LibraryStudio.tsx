/**
 * Biblioteca Universal — administración desde CMS Studio:
 * categorías/subcategorías ilimitadas y recursos con metadatos completos.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Star, Trash2 } from "lucide-react";
import { Btn, Chip, Field, Input, Panel, Select, Textarea } from "@/components/academy/ui";
import {
  RESOURCE_STATUS,
  RESOURCE_TYPES,
  useDeleteLibraryCategory,
  useDeleteLibraryResource,
  useLibraryCategories,
  useLibraryResources,
  useSaveLibraryCategory,
  useSaveLibraryResource,
  type LibraryCategory,
  type LibraryResource,
} from "@/lib/library";

export function LibraryStudio() {
  const cats = useLibraryCategories();
  const res = useLibraryResources({ includeDrafts: true });
  const saveCat = useSaveLibraryCategory();
  const delCat = useDeleteLibraryCategory();
  const saveRes = useSaveLibraryResource();
  const delRes = useDeleteLibraryResource();

  const [cat, setCat] = useState<Partial<LibraryCategory>>({ is_published: true, sort_order: 0 });
  const [item, setItem] = useState<Partial<LibraryResource>>({
    status: "draft",
    resource_type: "documento",
    access_level: "authenticated",
  });

  const roots = useMemo(() => (cats.data ?? []).filter((c) => !c.parent_id), [cats.data]);
  const subs = useMemo(
    () => (cats.data ?? []).filter((c) => c.parent_id === item.category_id),
    [cats.data, item.category_id],
  );

  const submitCat = () => {
    if (!cat.name?.trim()) return toast.error("Indica el nombre de la categoría.");
    saveCat.mutate(cat, {
      onSuccess: () => {
        toast.success("Categoría guardada");
        setCat({ is_published: true, sort_order: 0 });
      },
      onError: (e) => toast.error(String((e as Error).message)),
    });
  };

  const submitRes = () => {
    if (!item.title?.trim()) return toast.error("Indica el título del recurso.");
    saveRes.mutate(
      {
        ...item,
        tags:
          typeof (item as any).tagsText === "string"
            ? (item as any).tagsText.split(",").map((t: string) => t.trim()).filter(Boolean)
            : item.tags,
      },
      {
        onSuccess: () => {
          toast.success("Recurso guardado");
          setItem({ status: "draft", resource_type: "documento", access_level: "authenticated" });
        },
        onError: (e) => toast.error(String((e as Error).message)),
      },
    );
  };

  return (
    <div className="space-y-3">
      <Panel
        title="Categorías de la biblioteca"
        accent="hsl(var(--primary))"
        subtitle="Estructura ilimitada: crea categorías principales y subcategorías anidadas."
        actions={
          <Btn variant="solid" loading={saveCat.isPending} onClick={submitCat}>
            {cat.id ? <Save className="size-3.5" /> : <Plus className="size-3.5" />}
            {cat.id ? "Guardar" : "Añadir"}
          </Btn>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Nombre">
            <Input value={cat.name ?? ""} onChange={(e) => setCat({ ...cat, name: e.target.value })} />
          </Field>
          <Field label="Categoría padre">
            <Select
              value={cat.parent_id ?? ""}
              onChange={(e) => setCat({ ...cat, parent_id: e.target.value || null })}
            >
              <option value="">— Principal —</option>
              {roots.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Orden">
            <Input
              type="number"
              value={String(cat.sort_order ?? 0)}
              onChange={(e) => setCat({ ...cat, sort_order: Number(e.target.value) })}
            />
          </Field>
          <Field label="Publicada">
            <Select
              value={cat.is_published === false ? "0" : "1"}
              onChange={(e) => setCat({ ...cat, is_published: e.target.value === "1" })}
            >
              <option value="1">Sí</option>
              <option value="0">No</option>
            </Select>
          </Field>
          <Field label="Descripción">
            <Input
              value={cat.description ?? ""}
              onChange={(e) => setCat({ ...cat, description: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-3 space-y-1.5">
          {(cats.data ?? []).map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs"
            >
              <span className="font-bold">
                {c.parent_id ? "↳ " : ""}
                {c.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{c.slug}</span>
              <Chip accent={c.is_published ? "#10b981" : "#64748b"}>
                {c.is_published ? "Publicada" : "Oculta"}
              </Chip>
              <div className="ml-auto flex items-center gap-1">
                <Btn variant="ghost" onClick={() => setCat(c)}>
                  Editar
                </Btn>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar «${c.name}» y sus subcategorías?`)) return;
                    delCat.mutate(c.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Btn>
              </div>
            </div>
          ))}
          {(cats.data ?? []).length === 0 && (
            <div className="text-xs text-muted-foreground">Aún no hay categorías creadas.</div>
          )}
        </div>
      </Panel>

      <Panel
        title="Recursos de la biblioteca"
        accent="#0ea5e9"
        subtitle="Metadatos completos: autor, año, especialidad, etiquetas, fuente bibliográfica, DOI y archivos."
        actions={
          <Btn variant="solid" loading={saveRes.isPending} onClick={submitRes}>
            {item.id ? <Save className="size-3.5" /> : <Plus className="size-3.5" />}
            {item.id ? "Guardar" : "Añadir"}
          </Btn>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Título">
            <Input value={item.title ?? ""} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={item.subtitle ?? ""}
              onChange={(e) => setItem({ ...item, subtitle: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={item.resource_type ?? "documento"}
              onChange={(e) => setItem({ ...item, resource_type: e.target.value })}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select
              value={item.status ?? "draft"}
              onChange={(e) => setItem({ ...item, status: e.target.value })}
            >
              {RESOURCE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s === "draft" ? "Borrador" : s === "published" ? "Publicado" : "Archivado"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría">
            <Select
              value={item.category_id ?? ""}
              onChange={(e) => setItem({ ...item, category_id: e.target.value || null, subcategory_id: null })}
            >
              <option value="">— Sin categoría —</option>
              {roots.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subcategoría">
            <Select
              value={item.subcategory_id ?? ""}
              onChange={(e) => setItem({ ...item, subcategory_id: e.target.value || null })}
            >
              <option value="">— Ninguna —</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Autor">
            <Input value={item.author ?? ""} onChange={(e) => setItem({ ...item, author: e.target.value })} />
          </Field>
          <Field label="Editorial">
            <Input
              value={item.publisher ?? ""}
              onChange={(e) => setItem({ ...item, publisher: e.target.value })}
            />
          </Field>
          <Field label="Año">
            <Input
              type="number"
              value={item.year ? String(item.year) : ""}
              onChange={(e) => setItem({ ...item, year: Number(e.target.value) || null })}
            />
          </Field>
          <Field label="Especialidad">
            <Input
              value={item.specialty ?? ""}
              onChange={(e) => setItem({ ...item, specialty: e.target.value })}
            />
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <Input
              value={(item as any).tagsText ?? (item.tags ?? []).join(", ")}
              onChange={(e) => setItem({ ...item, ...( { tagsText: e.target.value } as any) })}
            />
          </Field>
          <Field label="DOI">
            <Input value={item.doi ?? ""} onChange={(e) => setItem({ ...item, doi: e.target.value })} />
          </Field>
          <Field label="Portada (URL)">
            <Input
              value={item.cover_url ?? ""}
              onChange={(e) => setItem({ ...item, cover_url: e.target.value })}
            />
          </Field>
          <Field label="Enlace externo">
            <Input
              value={item.external_url ?? ""}
              onChange={(e) => setItem({ ...item, external_url: e.target.value })}
            />
          </Field>
          <Field label="Archivo (URL)">
            <Input
              value={item.file_url ?? ""}
              onChange={(e) => setItem({ ...item, file_url: e.target.value })}
            />
          </Field>
          <Field label="Video (URL)">
            <Input
              value={item.video_url ?? ""}
              onChange={(e) => setItem({ ...item, video_url: e.target.value })}
            />
          </Field>
          <Field label="Destacado">
            <Select
              value={item.is_featured ? "1" : "0"}
              onChange={(e) => setItem({ ...item, is_featured: e.target.value === "1" })}
            >
              <option value="0">No</option>
              <option value="1">Sí</option>
            </Select>
          </Field>
          <Field label="Fuente bibliográfica">
            <Input
              value={item.bibliographic_source ?? ""}
              onChange={(e) => setItem({ ...item, bibliographic_source: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-2">
          <Field label="Descripción">
            <Textarea
              rows={3}
              value={item.description ?? ""}
              onChange={(e) => setItem({ ...item, description: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-3 space-y-1.5">
          {(res.data ?? []).map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs"
            >
              {r.is_featured && <Star className="size-3.5 text-amber-500" />}
              <span className="font-bold">{r.title}</span>
              <Chip accent="#0ea5e9">{r.resource_type}</Chip>
              <Chip accent={r.status === "published" ? "#10b981" : "#64748b"}>
                {r.status === "published" ? "Publicado" : r.status === "draft" ? "Borrador" : "Archivado"}
              </Chip>
              <div className="ml-auto flex items-center gap-1">
                <Btn
                  variant="ghost"
                  onClick={() =>
                    saveRes.mutate({
                      id: r.id,
                      status: r.status === "published" ? "draft" : "published",
                    })
                  }
                >
                  {r.status === "published" ? "Despublicar" : "Publicar"}
                </Btn>
                <Btn variant="ghost" onClick={() => setItem({ ...r, ...({ tagsText: (r.tags ?? []).join(", ") } as any) })}>
                  Editar
                </Btn>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar «${r.title}»?`)) return;
                    delRes.mutate(r.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Btn>
              </div>
            </div>
          ))}
          {(res.data ?? []).length === 0 && (
            <div className="text-xs text-muted-foreground">Todavía no hay recursos en la biblioteca.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}
