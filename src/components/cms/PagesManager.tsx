/**
 * Administrador de páginas del CMS: tabla con búsqueda, filtros por tipo y
 * estado, ruta calculada, marca de página principal y acciones rápidas.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  FilePlus2,
  Home,
  PencilLine,
  Rocket,
  Search,
  Trash2,
} from "lucide-react";
import { Btn, Chip, Input, Panel, Select } from "@/components/academy/ui";
import { supabase } from "@/integrations/supabase/client";
import {
  useCmsPages,
  useDeleteCmsPage,
  useSaveCmsPage,
  type CmsPage,
  type CmsPageKind,
} from "@/lib/cms";
import { usePublishPage, usePublishStatus, useUnpublishPage } from "@/lib/cms-publish";
import { pagePath, useHomePageId, useSetHomePage } from "@/lib/cms-routes";

export const PAGE_KINDS: { value: CmsPageKind; label: string }[] = [
  { value: "page", label: "Páginas" },
  { value: "program", label: "Programas" },
  { value: "course", label: "Cursos" },
  { value: "specialty", label: "Especialidades" },
  { value: "landing", label: "Landing pages" },
  { value: "library", label: "Biblioteca" },
  { value: "event", label: "Eventos" },
  { value: "diploma", label: "Diplomados" },
  { value: "manual", label: "Manuales" },
  { value: "simulator", label: "Simuladores" },
  { value: "research", label: "Investigaciones" },
  { value: "news", label: "Noticias" },
  { value: "blog", label: "Blog" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function PagesManager({
  onEdit,
  safeMode,
}: {
  onEdit: (pageId: string) => void;
  safeMode?: boolean;
}) {
  const { data: pages = [], isLoading } = useCmsPages();
  const { data: homeId } = useHomePageId();
  const setHome = useSetHomePage();
  const savePage = useSaveCmsPage();
  const deletePage = useDeleteCmsPage();
  const publish = usePublishPage();
  const unpublish = useUnpublishPage();
  const { data: status } = usePublishStatus();
  const pending = useMemo(
    () => new Set((status?.rows ?? []).filter((r) => r.pending).map((r) => r.page.id)),
    [status],
  );

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | CmsPageKind>("all");
  const [state, setState] = useState<"all" | "published" | "draft">("all");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pages
      .filter((p) => (kind === "all" ? true : p.kind === kind))
      .filter((p) =>
        state === "all" ? true : state === "published" ? p.status === "published" : p.status !== "published",
      )
      .filter(
        (p) => !query || p.title.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query),
      )
      .sort(
        (a, b) =>
          Number(homeId === b.id) - Number(homeId === a.id) ||
          a.kind.localeCompare(b.kind) ||
          a.title.localeCompare(b.title),
      );
  }, [pages, q, kind, state, homeId]);

  const createPage = async () => {
    const title = window.prompt("Nombre de la nueva página");
    if (!title?.trim()) return;
    const id = await savePage.mutateAsync({
      kind: kind === "all" ? "page" : kind,
      title: title.trim(),
      slug: slugify(title),
      status: "draft",
      seo: { title: `${title.trim()} · KotaMed`, index: true },
    } as Partial<CmsPage>);
    toast.success("Página creada");
    onEdit(id);
  };

  const rename = async (p: CmsPage) => {
    const title = window.prompt("Nuevo nombre de la página", p.title);
    if (!title?.trim()) return;
    await savePage.mutateAsync({ id: p.id, title: title.trim() });
    toast.success("Nombre actualizado");
  };

  const editSlug = async (p: CmsPage) => {
    const slug = window.prompt(
      "Nueva dirección (slug). Se recomienda crear una redirección desde la ruta anterior.",
      p.slug,
    );
    if (!slug?.trim()) return;
    const clean = slugify(slug);
    if (pages.some((x) => x.id !== p.id && x.slug === clean)) {
      toast.error("Ese slug ya está en uso por otra página.");
      return;
    }
    await savePage.mutateAsync({ id: p.id, slug: clean });
    if (window.confirm(`¿Crear redirección /p/${p.slug} → /p/${clean}?`)) {
      const { error } = await supabase
        .from("cms_redirects")
        .upsert(
          { from_path: `/p/${p.slug}`, to_path: `/p/${clean}`, code: 301, is_active: true } as never,
          { onConflict: "from_path" },
        );
      if (error) toast.error(error.message);
      else toast.success("Redirección creada");
    }
    toast.success("Dirección actualizada");
  };

  const duplicate = async (p: CmsPage) => {
    const id = await savePage.mutateAsync({
      kind: p.kind,
      title: `${p.title} (copia)`,
      slug: `${p.slug}-copia-${Math.random().toString(36).slice(2, 6)}`,
      status: "draft",
      seo: p.seo,
      theme: p.theme,
      metadata: p.metadata,
    } as Partial<CmsPage>);
    const { data: blocks } = await supabase
      .from("cms_blocks")
      .select("type,name,sort_order,visible,props,style")
      .eq("page_id", p.id)
      .order("sort_order");
    if (blocks?.length) {
      const { error } = await supabase
        .from("cms_blocks")
        .insert(blocks.map((b) => ({ ...b, page_id: id })) as never);
      if (error) toast.error(error.message);
    }
    toast.success("Página duplicada como borrador");
    onEdit(id);
  };

  return (
    <Panel
      title="Administrador de páginas"
      accent="hsl(var(--primary))"
      actions={
        <Btn variant="solid" onClick={createPage}>
          <FilePlus2 className="size-3.5" /> Nueva página
        </Btn>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o dirección…"
          />
        </div>
        <Select value={kind} onChange={(e) => setKind(e.target.value as never)}>
          <option value="all">Todos los tipos</option>
          {PAGE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
        <Select value={state} onChange={(e) => setState(e.target.value as never)}>
          <option value="all">Todos los estados</option>
          <option value="published">Publicadas</option>
          <option value="draft">Borradores</option>
        </Select>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-2 py-2">Página</th>
              <th className="px-2 py-2">Ruta</th>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                  Cargando páginas…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                  Sin resultados con los filtros actuales.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const isHome = homeId === p.id;
                const path = pagePath(p.slug, isHome);
                return (
                  <tr key={p.id} className="border-t border-border/50 align-middle">
                    <td className="px-2 py-2">
                      <button onClick={() => onEdit(p.id)} className="font-bold hover:text-primary">
                        {p.title}
                      </button>
                      {isHome && (
                        <span className="ml-1.5 align-middle">
                          <Chip accent="#10b981">Home</Chip>
                        </span>
                      )}
                      {pending.has(p.id) && (
                        <span className="ml-1.5 align-middle">
                          <Chip accent="#f59e0b">Cambios sin publicar</Chip>
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{path}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {PAGE_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind}
                    </td>
                    <td className="px-2 py-2">
                      <Chip accent={p.status === "published" ? "#10b981" : "#64748b"}>
                        {p.status === "published" ? "Producción" : "Borrador"}
                      </Chip>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Btn variant="ghost" onClick={() => onEdit(p.id)} title="Editar en el constructor">
                          <PencilLine className="size-3.5" />
                        </Btn>
                        <a href={`/p/${p.slug}?preview=draft`} target="_blank" rel="noreferrer">
                          <Btn variant="ghost" title="Vista previa del borrador">
                            <Eye className="size-3.5" />
                          </Btn>
                        </a>
                        <Btn variant="ghost" onClick={() => rename(p)} title="Renombrar">
                          Aa
                        </Btn>
                        <Btn variant="ghost" onClick={() => editSlug(p)} title="Cambiar dirección">
                          /slug
                        </Btn>
                        <Btn variant="ghost" onClick={() => duplicate(p)} title="Duplicar">
                          <Copy className="size-3.5" />
                        </Btn>
                        <Btn
                          variant="ghost"
                          title={isHome ? "Quitar como página principal" : "Marcar como página principal"}
                          loading={setHome.isPending}
                          onClick={() =>
                            setHome.mutate(isHome ? null : p.id, {
                              onSuccess: () =>
                                toast.success(isHome ? "Home restaurada por defecto" : "Nueva página principal"),
                            })
                          }
                        >
                          <Home className={`size-3.5 ${isHome ? "text-primary" : ""}`} />
                        </Btn>
                        {p.status === "published" ? (
                          <Btn
                            variant="ghost"
                            loading={unpublish.isPending}
                            onClick={() => {
                              if (!window.confirm("¿Retirar la página de producción?")) return;
                              unpublish.mutate(p.id, {
                                onSuccess: () => toast.success("Página retirada de producción"),
                                onError: (e) => toast.error(String((e as Error).message)),
                              });
                            }}
                          >
                            Despublicar
                          </Btn>
                        ) : (
                          <Btn
                            variant="outline"
                            disabled={safeMode}
                            loading={publish.isPending}
                            onClick={() =>
                              publish.mutate(
                                { pageId: p.id },
                                {
                                  onSuccess: (r) => toast.success(`Publicado · v${r.version}`),
                                  onError: (e) => toast.error(String((e as Error).message)),
                                },
                              )
                            }
                          >
                            <Rocket className="size-3.5" /> Publicar
                          </Btn>
                        )}
                        <Btn
                          variant="ghost"
                          onClick={() => {
                            if (!window.confirm(`¿Eliminar "${p.title}" y todos sus bloques?`)) return;
                            deletePage.mutate(p.id, {
                              onSuccess: () => toast.success("Página eliminada"),
                            });
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
