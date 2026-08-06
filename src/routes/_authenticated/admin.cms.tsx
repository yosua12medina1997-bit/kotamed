/**
 * CMS Studio — constructor visual por bloques de KotaMed.
 * Administra páginas (inicio, programas, cursos, especialidades, landings…),
 * bloques con drag & drop, contenido con IA, medios, SEO, versiones y publicación.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  FilePlus2,
  GripVertical,
  History,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  Rocket,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  Wand2,
} from "lucide-react";
import { Btn, Chip, Field, Input, Panel, Select, Textarea } from "@/components/academy/ui";
import { CmsBlockView } from "@/components/cms/CmsBlocks";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import { generateCmsBlock, generateCmsPagePlan } from "@/lib/cms-ai.functions";
import {
  BLOCK_GROUPS,
  BLOCK_LABEL,
  LIST_BLOCKS,
  defaultBlock,
  uploadCmsMedia,
  useCmsBlocks,
  useCmsPages,
  useCmsVersions,
  useDeleteCmsPage,
  useRestoreVersion,
  useSaveCmsPage,
  useSnapshotPage,
  type CmsBlock,
  type CmsBlockType,
  type CmsItem,
  type CmsPage,
  type CmsPageKind,
} from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/cms")({
  head: () => ({
    meta: [
      { title: "CMS Studio · KotaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CmsStudioPage,
});

const KINDS: { value: CmsPageKind; label: string }[] = [
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

const DEVICES = [
  { id: "desktop", icon: Monitor, width: "100%" },
  { id: "tablet", icon: Tablet, width: "834px" },
  { id: "mobile", icon: Smartphone, width: "420px" },
] as const;

type DraftBlock = CmsBlock & { _new?: boolean };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CmsStudioPage() {
  const user = useSupabaseUser();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);
  const loading = user === undefined || adminLoading;
  const qc = useQueryClient();
  const { data: pages = [], isLoading: pagesLoading } = useCmsPages();
  const savePage = useSaveCmsPage();
  const deletePage = useDeleteCmsPage();

  const [kind, setKind] = useState<CmsPageKind>("page");
  const [pageId, setPageId] = useState<string | null>(null);
  const page = pages.find((p) => p.id === pageId) ?? null;

  const { data: blocks = [], isLoading: blocksLoading } = useCmsBlocks(pageId);
  const snapshot = useSnapshotPage(pageId);

  const [draft, setDraft] = useState<DraftBlock[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [tab, setTab] = useState<"contenido" | "diseno" | "avanzado">("contenido");
  const [saving, setSaving] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [pageDraft, setPageDraft] = useState<Partial<CmsPage>>({});

  const history = useRef<DraftBlock[][]>([]);
  const future = useRef<DraftBlock[][]>([]);

  useEffect(() => {
    if (!pageId) return;
    setDraft(blocks as DraftBlock[]);
    setRemoved([]);
    setDirty(false);
    history.current = [];
    future.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, blocks.length, blocksLoading]);

  useEffect(() => {
    setPageDraft(page ? { title: page.title, slug: page.slug, seo: page.seo, status: page.status } : {});
  }, [page]);

  useEffect(() => {
    if (!pageId && pages.length) {
      const first = pages.find((p) => p.kind === kind) ?? pages[0]!;
      setPageId(first.id);
      setKind(first.kind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  const commitDraft = (next: DraftBlock[]) => {
    history.current = [...history.current.slice(-30), draft];
    future.current = [];
    setDraft(next);
    setDirty(true);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(draft);
    setDraft(prev);
    setDirty(true);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(draft);
    setDraft(next);
    setDirty(true);
  };

  const block = draft.find((b) => b.id === selected) ?? null;
  const patchBlock = (id: string, p: Partial<DraftBlock>) =>
    commitDraft(draft.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const addBlock = (type: CmsBlockType) => {
    const base = defaultBlock(type);
    const nb: DraftBlock = {
      id: `new-${crypto.randomUUID()}`,
      page_id: pageId ?? "",
      type,
      name: null,
      sort_order: draft.length,
      visible: true,
      props: base.props,
      style: base.style,
      _new: true,
    };
    commitDraft([...draft, nb]);
    setSelected(nb.id);
    setTab("contenido");
  };

  const duplicateBlock = (b: DraftBlock) => {
    const copy: DraftBlock = {
      ...b,
      id: `new-${crypto.randomUUID()}`,
      _new: true,
      sort_order: b.sort_order + 1,
    };
    const i = draft.findIndex((x) => x.id === b.id);
    commitDraft([...draft.slice(0, i + 1), copy, ...draft.slice(i + 1)]);
    setSelected(copy.id);
  };

  const deleteBlock = (b: DraftBlock) => {
    if (!b._new) setRemoved((r) => [...r, b.id]);
    commitDraft(draft.filter((x) => x.id !== b.id));
    if (selected === b.id) setSelected(null);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = draft.findIndex((b) => b.id === active.id);
    const to = draft.findIndex((b) => b.id === over.id);
    commitDraft(arrayMove(draft, from, to));
  };

  const save = async () => {
    if (!pageId) return;
    setSaving(true);
    try {
      await snapshot.mutateAsync("Guardado automático antes de cambios");
      for (const id of removed) {
        const { error } = await supabase.from("cms_blocks").delete().eq("id", id);
        if (error) throw error;
      }
      for (let i = 0; i < draft.length; i++) {
        const b = draft[i]!;
        const row = {
          page_id: pageId,
          type: b.type,
          name: b.name,
          sort_order: i,
          visible: b.visible,
          props: b.props,
          style: b.style,
        };
        if (b._new) {
          const { error } = await supabase.from("cms_blocks").insert(row as never);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("cms_blocks").update(row as never).eq("id", b.id);
          if (error) throw error;
        }
      }
      await savePage.mutateAsync({ id: pageId, ...pageDraft });
      setRemoved([]);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      toast.success("Cambios guardados");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!pageId || !page) return;
    const next = page.status === "published" ? "draft" : "published";
    await savePage.mutateAsync({
      id: pageId,
      status: next as CmsPage["status"],
      published_at: next === "published" ? new Date().toISOString() : null,
    });
    setPageDraft((d) => ({ ...d, status: next as CmsPage["status"] }));
    toast.success(next === "published" ? "Página publicada" : "Página en borrador");
  };

  const createPage = async () => {
    const title = window.prompt("Nombre de la página / landing");
    if (!title?.trim()) return;
    const slug = slugify(title);
    const id = await savePage.mutateAsync({
      kind,
      title: title.trim(),
      slug,
      status: "draft",
      seo: { title: `${title.trim()} · KotaMed`, index: true },
    } as Partial<CmsPage>);
    setPageId(id);
    toast.success("Página creada. Añade bloques desde la biblioteca.");
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-black">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El CMS Studio está disponible solo para administradores.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-primary">
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  const kindPages = pages.filter((p) => p.kind === kind);

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      {/* -------- Barra superior -------- */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Admin
        </Link>
        <span className="text-sm font-black tracking-tight">CMS Studio</span>
        <span className="text-xs text-muted-foreground">
          {KINDS.find((k) => k.value === kind)?.label} ›{" "}
          <b className="text-foreground">{page?.title ?? "—"}</b>
        </span>
        {page && (
          <Chip accent={page.status === "published" ? undefined : undefined}>
            {page.status === "published" ? "Publicado" : "Borrador"}
          </Chip>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="mr-1 flex rounded-lg border border-border/60 p-0.5">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={`rounded-md px-2 py-1 ${device === d.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                title={d.id}
              >
                <d.icon className="size-4" />
              </button>
            ))}
          </div>
          <Btn variant="ghost" onClick={undo}>
            <Undo2 className="size-3.5" />
          </Btn>
          <Btn variant="ghost" onClick={redo}>
            <Redo2 className="size-3.5" />
          </Btn>
          <Btn variant="ghost" onClick={() => setShowVersions((v) => !v)}>
            <History className="size-3.5" /> Versiones
          </Btn>
          <Btn variant="outline" onClick={() => setShowSeo((v) => !v)}>
            SEO
          </Btn>
          {page && (
            <Btn variant="outline" onClick={publish}>
              <Rocket className="size-3.5" /> {page.status === "published" ? "Despublicar" : "Publicar"}
            </Btn>
          )}
          <Btn variant="solid" onClick={save} loading={saving} disabled={!pageId}>
            <Save className="size-3.5" /> Guardar cambios{dirty ? " •" : ""}
          </Btn>
        </div>
      </header>

      <div className="grid gap-3 p-3 xl:grid-cols-[210px_230px_1fr_320px]">
        {/* -------- Navegación del CMS -------- */}
        <aside className="space-y-1 rounded-2xl border border-border/60 bg-background p-2">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Gestión de contenido
          </div>
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => {
                setKind(k.value);
                const first = pages.find((p) => p.kind === k.value);
                setPageId(first?.id ?? null);
                setSelected(null);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                kind === k.value ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              }`}
            >
              {k.label}
              <span className="text-[10px] text-muted-foreground">
                {pages.filter((p) => p.kind === k.value).length}
              </span>
            </button>
          ))}

          <div className="mt-3 border-t border-border/60 pt-2">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {KINDS.find((k) => k.value === kind)?.label}
            </div>
            {pagesLoading ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">Cargando…</div>
            ) : kindPages.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">Sin páginas todavía.</div>
            ) : (
              kindPages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPageId(p.id);
                    setSelected(null);
                  }}
                  className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                    pageId === p.id ? "bg-muted font-bold" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="flex-1 truncate">{p.title}</span>
                  {p.status !== "published" && <span className="text-[9px] text-muted-foreground">borr.</span>}
                </button>
              ))
            )}
            <Btn variant="outline" className="mt-2 w-full" onClick={createPage}>
              <FilePlus2 className="size-3" /> Nueva página
            </Btn>
            {page && (
              <Btn
                variant="ghost"
                className="mt-1 w-full"
                onClick={() => {
                  if (!confirm(`¿Eliminar la página "${page.title}" y todos sus bloques?`)) return;
                  deletePage.mutate(page.id, {
                    onSuccess: () => {
                      setPageId(null);
                      toast.success("Página eliminada");
                    },
                  });
                }}
              >
                <Trash2 className="size-3" /> Eliminar página
              </Btn>
            )}
          </div>
        </aside>

        {/* -------- Biblioteca de bloques + orden -------- */}
        <aside className="space-y-3 rounded-2xl border border-border/60 bg-background p-2">
          <div>
            <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Bloques
            </div>
            {BLOCK_GROUPS.map((g) => (
              <div key={g.group} className="mb-2">
                <div className="px-1 py-1 text-[10px] font-semibold uppercase text-muted-foreground/70">
                  {g.group}
                </div>
                <div className="space-y-1">
                  {g.types.map((t) => (
                    <button
                      key={t}
                      disabled={!pageId}
                      onClick={() => addBlock(t)}
                      className="flex w-full items-center gap-1.5 rounded-lg border border-border/50 px-2 py-1.5 text-left text-xs font-semibold transition hover:border-primary/50 disabled:opacity-40"
                    >
                      <Plus className="size-3 text-muted-foreground" /> {BLOCK_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 pt-2">
            <div className="px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Estructura de la página
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={draft.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {draft.map((b) => (
                    <SortableRow
                      key={b.id}
                      block={b}
                      active={selected === b.id}
                      onSelect={() => setSelected(b.id)}
                      onToggle={() => patchBlock(b.id, { visible: !b.visible })}
                      onDuplicate={() => duplicateBlock(b)}
                      onDelete={() => deleteBlock(b)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {draft.length === 0 && (
              <div className="px-1 py-2 text-xs text-muted-foreground">
                Añade bloques desde la biblioteca o usa Studio AI.
              </div>
            )}
          </div>
        </aside>

        {/* -------- Lienzo -------- */}
        <main className="min-h-[70vh] rounded-2xl border border-border/60 bg-background p-3">
          {showVersions && pageId ? (
            <VersionsPanel pageId={pageId} onClose={() => setShowVersions(false)} />
          ) : showSeo && page ? (
            <SeoPanel
              page={page}
              draft={pageDraft}
              setDraft={(d) => {
                setPageDraft(d);
                setDirty(true);
              }}
              onClose={() => setShowSeo(false)}
            />
          ) : !page ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Selecciona o crea una página para comenzar.
            </div>
          ) : (
            <div className="mx-auto overflow-hidden rounded-xl border border-border/50" style={{ maxWidth: DEVICES.find((d) => d.id === device)!.width }}>
              <div className="bg-background">
                {draft.length === 0 ? (
                  <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                    Página vacía. Añade el primer bloque.
                  </div>
                ) : (
                  draft.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelected(b.id)}
                      className={`relative cursor-pointer ${selected === b.id ? "ring-2 ring-primary ring-inset" : ""} ${
                        b.visible ? "" : "opacity-40"
                      }`}
                    >
                      <span className="absolute left-2 top-2 z-10 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        {BLOCK_LABEL[b.type]}
                      </span>
                      <CmsBlockView block={b} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* -------- Inspector -------- */}
        <aside className="space-y-3 rounded-2xl border border-border/60 bg-background p-3">
          <StudioAi pageId={pageId} page={page} onDone={() => qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] })} />
          {!block ? (
            <div className="text-xs text-muted-foreground">
              Selecciona un bloque en el lienzo para editar su contenido, diseño y opciones avanzadas.
            </div>
          ) : (
            <>
              <div className="flex rounded-lg border border-border/60 p-0.5 text-xs font-semibold">
                {(["contenido", "diseno", "avanzado"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-md px-2 py-1 capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  >
                    {t === "diseno" ? "Diseño" : t}
                  </button>
                ))}
              </div>
              <Inspector
                block={block}
                page={page}
                tab={tab}
                onPatch={(p) => patchBlock(block.id, p)}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/* --------------------------- Fila ordenable ------------------------ */

function SortableRow({
  block,
  active,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  block: DraftBlock;
  active: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] ${
        active ? "border-primary/60 bg-primary/5" : "border-border/50"
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="size-3.5" />
      </button>
      <button onClick={onSelect} className="flex-1 truncate text-left font-semibold">
        {block.props.title || BLOCK_LABEL[block.type]}
      </button>
      <button onClick={onToggle} title="Ocultar/mostrar" className="text-muted-foreground hover:text-foreground">
        {block.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      </button>
      <button onClick={onDuplicate} title="Duplicar" className="text-muted-foreground hover:text-foreground">
        <Copy className="size-3.5" />
      </button>
      <button onClick={onDelete} title="Eliminar" className="text-muted-foreground hover:text-destructive">
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------ Inspector -------------------------- */

function Inspector({
  block,
  page,
  tab,
  onPatch,
}: {
  block: DraftBlock;
  page: CmsPage | null;
  tab: "contenido" | "diseno" | "avanzado";
  onPatch: (p: Partial<DraftBlock>) => void;
}) {
  const [aiBusy, setAiBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [hint, setHint] = useState("");
  const props = block.props;
  const style = block.style ?? {};
  const setProps = (p: Partial<typeof props>) => onPatch({ props: { ...props, ...p } });
  const setStyle = (s: Partial<typeof style>) => onPatch({ style: { ...style, ...s } });
  const items = props.items ?? [];
  const setItems = (next: CmsItem[]) => setProps({ items: next });

  const runAi = async () => {
    setAiBusy(true);
    try {
      const res = await generateCmsBlock({
        data: {
          blockType: block.type,
          pageTitle: page?.title,
          pageKind: page?.kind,
          instruction: hint || undefined,
          current: JSON.stringify(props).slice(0, 6000),
          itemCount: Math.max(items.length || 4, 3),
        },
      });
      const generated = JSON.parse(res.json) as Record<string, unknown>;
      setProps(generated as never);
      toast.success("Contenido generado con IA");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setAiBusy(false);
    }
  };

  const genImage = async (target: "block" | number) => {
    const base = typeof target === "number" ? items[target]?.title : props.title;
    const prompt = window.prompt("Describe la imagen a generar", base || "Equipo médico en formación");
    if (!prompt) return;
    setImgBusy(true);
    try {
      const res = await fetch("/api/cms-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) throw new Error("La IA no devolvió una imagen.");
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const url = await uploadCmsMedia(blob, `${block.type}.png`);
      if (typeof target === "number") {
        setItems(items.map((it, i) => (i === target ? { ...it, image: url } : it)));
      } else {
        setProps({ image: url });
      }
      toast.success("Imagen generada");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setImgBusy(false);
    }
  };

  const upload = async (file: File, target: "block" | "poster" | number) => {
    try {
      const url = await uploadCmsMedia(file, file.name);
      if (typeof target === "number") setItems(items.map((it, i) => (i === target ? { ...it, image: url } : it)));
      else if (target === "poster") setProps({ poster: url });
      else if (file.type.startsWith("video")) setProps({ video: url, videoKind: "upload" });
      else setProps({ image: url });
      toast.success("Archivo subido");
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    }
  };

  if (tab === "diseno") {
    return (
      <div className="space-y-3">
        <Field label="Alineación">
          <Select value={style.align ?? "center"} onChange={(e) => setStyle({ align: e.target.value as never })}>
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </Select>
        </Field>
        <Field label="Espaciado vertical">
          <Select value={style.paddingY ?? "lg"} onChange={(e) => setStyle({ paddingY: e.target.value as never })}>
            <option value="sm">Compacto</option>
            <option value="md">Medio</option>
            <option value="lg">Amplio</option>
            <option value="xl">Extra amplio</option>
          </Select>
        </Field>
        <Field label="Fondo">
          <Select value={style.tone ?? "plain"} onChange={(e) => setStyle({ tone: e.target.value as never })}>
            <option value="plain">Transparente</option>
            <option value="muted">Suave</option>
            <option value="accent">Color de marca</option>
            <option value="gradient">Degradado</option>
          </Select>
        </Field>
        <Field label="Columnas">
          <Select
            value={String(style.columns ?? 3)}
            onChange={(e) => setStyle({ columns: Number(e.target.value) as never })}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (tab === "avanzado") {
    return (
      <div className="space-y-3">
        <Field label="Nombre interno del bloque">
          <Input value={block.name ?? ""} onChange={(e) => onPatch({ name: e.target.value })} />
        </Field>
        <Field label="Visibilidad">
          <Select
            value={block.visible ? "1" : "0"}
            onChange={(e) => onPatch({ visible: e.target.value === "1" })}
          >
            <option value="1">Visible</option>
            <option value="0">Oculto</option>
          </Select>
        </Field>
        <Field label="Video">
          <Select
            value={props.videoKind ?? "youtube"}
            onChange={(e) => setProps({ videoKind: e.target.value as never })}
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="mp4">MP4 (enlace)</option>
            <option value="upload">Archivo subido</option>
          </Select>
        </Field>
        <Field label="URL del video">
          <Input value={props.video ?? ""} onChange={(e) => setProps({ video: e.target.value })} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold">
          <Upload className="size-3.5" /> Subir video o miniatura
          <input
            type="file"
            className="hidden"
            accept="video/*,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f, f.type.startsWith("image") ? "poster" : "block");
            }}
          />
        </label>
        <div className="text-[11px] text-muted-foreground">Tipo de bloque: {BLOCK_LABEL[block.type]}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-2">
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Indicación para la IA (opcional)"
        />
        <Btn variant="solid" className="mt-2 w-full" loading={aiBusy} onClick={runAi}>
          <Sparkles className="size-3.5" /> Generar con IA
        </Btn>
      </div>

      <Field label="Antetítulo">
        <Input value={props.eyebrow ?? ""} onChange={(e) => setProps({ eyebrow: e.target.value })} />
      </Field>
      <Field label="Título">
        <Input value={props.title ?? ""} onChange={(e) => setProps({ title: e.target.value })} />
      </Field>
      <Field label="Subtítulo">
        <Textarea
          rows={2}
          value={props.subtitle ?? ""}
          onChange={(e) => setProps({ subtitle: e.target.value })}
        />
      </Field>
      <Field label="Descripción">
        <Textarea
          rows={3}
          value={props.description ?? ""}
          onChange={(e) => setProps({ description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Botón principal">
          <Input value={props.primaryLabel ?? ""} onChange={(e) => setProps({ primaryLabel: e.target.value })} />
        </Field>
        <Field label="Enlace">
          <Input value={props.primaryHref ?? ""} onChange={(e) => setProps({ primaryHref: e.target.value })} />
        </Field>
        <Field label="Botón secundario">
          <Input
            value={props.secondaryLabel ?? ""}
            onChange={(e) => setProps({ secondaryLabel: e.target.value })}
          />
        </Field>
        <Field label="Enlace">
          <Input value={props.secondaryHref ?? ""} onChange={(e) => setProps({ secondaryHref: e.target.value })} />
        </Field>
      </div>

      <Field label="Imagen del bloque">
        <div className="space-y-1.5">
          {props.image && <img src={props.image} alt="" className="h-24 w-full rounded-lg object-cover" />}
          <Input value={props.image ?? ""} onChange={(e) => setProps({ image: e.target.value })} />
          <div className="flex gap-1.5">
            <Btn variant="outline" loading={imgBusy} onClick={() => genImage("block")}>
              <ImageIcon className="size-3" /> Generar imagen IA
            </Btn>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold">
              <Upload className="size-3" /> Subir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f, "block");
                }}
              />
            </label>
          </div>
        </div>
      </Field>

      {LIST_BLOCKS.includes(block.type) && (
        <div className="space-y-2 border-t border-border/60 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Elementos
            </span>
            <Btn variant="outline" onClick={() => setItems([...items, { title: "Nuevo elemento" }])}>
              <Plus className="size-3" />
            </Btn>
          </div>
          {items.map((it, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-border/50 p-2">
              <div className="flex items-center gap-1">
                <Input
                  value={it.title ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  placeholder="Título / pregunta"
                />
                <button
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <Textarea
                rows={2}
                value={it.text ?? ""}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                placeholder="Texto / respuesta"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  value={it.value ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  placeholder="Valor"
                />
                <Input
                  value={it.label ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Etiqueta"
                />
                <Input
                  value={it.icon ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
                  placeholder="Icono (lucide)"
                />
                <Input
                  value={it.href ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}
                  placeholder="Enlace"
                />
                <Input
                  value={it.price ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                  placeholder="Precio"
                />
                <Input
                  value={it.badge ?? ""}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, badge: e.target.value } : x)))}
                  placeholder="Insignia"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {it.image && <img src={it.image} alt="" className="size-10 rounded object-cover" />}
                <Btn variant="ghost" onClick={() => genImage(i)}>
                  <ImageIcon className="size-3" /> IA
                </Btn>
                <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Upload className="size-3" /> Subir
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f, i);
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Studio AI -------------------------- */

function StudioAi({
  pageId,
  page,
  onDone,
}: {
  pageId: string | null;
  page: CmsPage | null;
  onDone: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const savePage = useSaveCmsPage();

  const build = async () => {
    if (!pageId) return toast.error("Selecciona una página primero.");
    if (brief.trim().length < 4) return toast.error("Describe la página que quieres construir.");
    setBusy(true);
    try {
      const allowed = BLOCK_GROUPS.flatMap((g) => g.types);
      const res = await generateCmsPagePlan({
        data: { brief, pageKind: page?.kind, allowed },
      });
      const plan = JSON.parse(res.json) as {
        seo?: Record<string, string>;
        blocks?: { type: string; props: Record<string, unknown> }[];
      };
      const { count } = await supabase
        .from("cms_blocks")
        .select("id", { count: "exact", head: true })
        .eq("page_id", pageId);
      const base = count ?? 0;
      const rows = (plan.blocks ?? [])
        .filter((b) => allowed.includes(b.type as CmsBlockType))
        .map((b, i) => {
          const d = defaultBlock(b.type as CmsBlockType);
          return {
            page_id: pageId,
            type: b.type,
            sort_order: base + i,
            visible: true,
            props: { ...d.props, ...b.props },
            style: d.style,
          };
        });
      if (!rows.length) throw new Error("La IA no propuso bloques válidos.");
      const { error } = await supabase.from("cms_blocks").insert(rows as never);
      if (error) throw error;
      if (plan.seo && page) {
        await savePage.mutateAsync({ id: page.id, seo: { ...page.seo, ...plan.seo } });
      }
      setBrief("");
      onDone();
      toast.success(`Studio AI creó ${rows.length} bloques`);
    } catch (e) {
      toast.error(String((e as { message?: string })?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <Wand2 className="size-3.5" /> KotaMed Studio AI
      </div>
      <Textarea
        rows={2}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder='Ej. "Landing para Internado Médico con cronograma, docentes y planes"'
      />
      <Btn variant="solid" className="mt-2 w-full" loading={busy} onClick={build}>
        <Sparkles className="size-3.5" /> Construir página completa
      </Btn>
    </div>
  );
}

/* ------------------------------- SEO ------------------------------- */

function SeoPanel({
  page,
  draft,
  setDraft,
  onClose,
}: {
  page: CmsPage;
  draft: Partial<CmsPage>;
  setDraft: (d: Partial<CmsPage>) => void;
  onClose: () => void;
}) {
  const seo = draft.seo ?? page.seo ?? {};
  const set = (p: Partial<typeof seo>) => setDraft({ ...draft, seo: { ...seo, ...p } });
  return (
    <Panel title="SEO y publicación" accent="hsl(var(--primary))" actions={<Btn onClick={onClose}>Volver al lienzo</Btn>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Título de la página">
          <Input value={draft.title ?? page.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </Field>
        <Field label="Dirección (slug)">
          <Input value={draft.slug ?? page.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
        </Field>
        <Field label="Meta título">
          <Input value={seo.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Canónica">
          <Input value={seo.canonical ?? ""} onChange={(e) => set({ canonical: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Meta descripción">
            <Textarea rows={2} value={seo.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </div>
        <Field label="Imagen para redes (URL)">
          <Input value={seo.ogImage ?? ""} onChange={(e) => set({ ogImage: e.target.value })} />
        </Field>
        <Field label="Palabras clave">
          <Input value={seo.keywords ?? ""} onChange={(e) => set({ keywords: e.target.value })} />
        </Field>
        <Field label="Indexación">
          <Select value={seo.index === false ? "0" : "1"} onChange={(e) => set({ index: e.target.value === "1" })}>
            <option value="1">Indexar en buscadores</option>
            <option value="0">No indexar</option>
          </Select>
        </Field>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Recuerda pulsar “Guardar cambios” para aplicar estos ajustes.
      </p>
    </Panel>
  );
}

/* ----------------------------- Versiones --------------------------- */

function VersionsPanel({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const { data: versions = [], isLoading } = useCmsVersions(pageId);
  const restore = useRestoreVersion(pageId);
  const snap = useSnapshotPage(pageId);
  return (
    <Panel
      title="Historial de versiones"
      accent="hsl(var(--primary))"
      actions={
        <div className="flex gap-1">
          <Btn
            variant="outline"
            loading={snap.isPending}
            onClick={() =>
              snap.mutate("Versión manual", { onSuccess: () => toast.success("Versión guardada") })
            }
          >
            Guardar versión
          </Btn>
          <Btn onClick={onClose}>Volver al lienzo</Btn>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Cargando…</div>
      ) : versions.length === 0 ? (
        <div className="text-xs text-muted-foreground">Aún no hay versiones guardadas.</div>
      ) : (
        <ul className="space-y-1.5">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs"
            >
              <span className="font-bold">v{v.version}</span>
              <span className="text-muted-foreground">{new Date(v.created_at).toLocaleString("es-PE")}</span>
              <span className="flex-1 truncate text-muted-foreground">{v.note}</span>
              <Btn
                variant="outline"
                onClick={() => {
                  if (!confirm("¿Restaurar esta versión? Se reemplazan los bloques actuales.")) return;
                  restore.mutate(v, { onSuccess: () => toast.success("Versión restaurada") });
                }}
              >
                Restaurar
              </Btn>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
