/**
 * CONSTRUCTOR DE CONTENIDO (Content Builder) — motor universal de KotaMed.
 *
 * Misma arquitectura que "Biblioteca Clínica → Contenido de Pediatría &
 * Neonatología", pero disponible para cualquier programa (Academy, Biblioteca,
 * Pediatría, Ginecología, Cardiología…) sin escribir código.
 *
 * Todo se persiste en `content_nodes` / `content_resources`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ResourcesPanelStandalone } from "@/components/ResourcesPanelStandalone";
import { logCmsAudit } from "@/lib/cms-publish";
import {
  KIND_LABEL,
  filterTree,
  useCmsMutations,
  useCmsTree,
  type CmsNode,
  type CmsScope,
  type NodeKind,
} from "@/lib/pednn-cms";
import {
  DEFAULT_LEVEL_LABELS,
  LEVEL_PRESETS,
  SECTION_TYPES,
  STATUS_META,
  TEMPLATES,
  VISIBILITY_META,
  childKindFor,
  computeStats,
  flattenTree,
  levelLabels,
  nodeStatus,
  plural,
  sectionTypeLabel,
  statusPatch,
  useProgramRootMutations,
  useProgramRoots,
  type ContentStatus,
  type ProgramRoot,
  type SectionType,
  type VisibilityLevel,
} from "@/lib/content-builder";

const STATUS_ORDER: ContentStatus[] = ["draft", "review", "published", "hidden", "archived"];

export function ContentBuilder() {
  const roots = useProgramRoots();
  const rootMut = useProgramRootMutations();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const list = roots.data ?? [];
  const active = useMemo(
    () => list.find((r) => r.slug === activeSlug) ?? list[0] ?? null,
    [list, activeSlug],
  );

  useEffect(() => {
    if (!activeSlug && list[0]) setActiveSlug(list[0].slug);
  }, [list, activeSlug]);

  return (
    <div className="space-y-5">
      {/* Selector de programas */}
      <div className="glass rounded-3xl p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Constructor de contenido · CMS editable
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
            <Shield className="size-3" /> Editor activo
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {roots.isLoading && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Cargando programas…
            </span>
          )}
          {list.map((r) => {
            const st = nodeStatus(r);
            const isActive = active?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveSlug(r.slug)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background/50 hover:border-primary/40"
                }`}
                style={isActive && r.metadata?.color ? { background: r.metadata.color } : undefined}
              >
                {r.metadata?.icon ? <span>{r.metadata.icon}</span> : <FileText className="size-3.5" />}
                {r.title}
                {st !== "published" && (
                  <span className="text-[9px] font-bold uppercase opacity-70">{STATUS_META[st].label}</span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-border/70 bg-background/40 px-3.5 py-2 text-sm font-semibold hover:border-primary/50"
          >
            <Plus className="size-3.5" /> Nuevo programa
          </button>
          {active && (
            <button
              onClick={() => setShowConfig(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-[11px] font-bold hover:border-primary/40"
            >
              <Settings2 className="size-3.5" /> Configuración
            </button>
          )}
        </div>
      </div>

      {active ? (
        <ProgramWorkspace root={active} />
      ) : (
        !roots.isLoading && (
          <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
            Aún no hay programas de contenido. Crea el primero con “Nuevo programa”.
          </div>
        )
      )}

      {showNew && (
        <ProgramDialog
          title="Nuevo programa de contenido"
          onClose={() => setShowNew(false)}
          onSubmit={async (form) => {
            const created = await rootMut.create.mutateAsync({ ...form, sort_order: list.length });
            await logCmsAudit({ entity: "content-program", entityId: created.id, entityLabel: created.title, action: "creó un programa de contenido" });
            setActiveSlug(created.slug);
            setShowNew(false);
            toast.success("Programa creado");
          }}
        />
      )}

      {showConfig && active && (
        <ProgramDialog
          title={`Configuración · ${active.title}`}
          initial={active}
          onClose={() => setShowConfig(false)}
          onDuplicate={async () => {
            const copy = await rootMut.duplicate.mutateAsync(active);
            setActiveSlug(copy.slug);
            setShowConfig(false);
            toast.success("Programa duplicado");
          }}
          onDelete={async () => {
            if (!confirm(`¿Eliminar “${active.title}”? Se eliminará todo su contenido. Considera archivarlo en su lugar.`)) return;
            await rootMut.remove.mutateAsync(active.id);
            await logCmsAudit({ entity: "content-program", entityId: active.id, entityLabel: active.title, action: "eliminó un programa de contenido" });
            setActiveSlug(null);
            setShowConfig(false);
            toast.success("Programa eliminado");
          }}
          onSubmit={async (form) => {
            const status = form.status ?? nodeStatus(active);
            await rootMut.update.mutateAsync({
              id: active.id,
              patch: {
                title: form.title,
                description: form.description ?? null,
                is_published: status === "published",
                metadata: {
                  ...active.metadata,
                  status,
                  icon: form.icon ?? null,
                  color: form.color ?? null,
                  image: form.image ?? null,
                  route: form.route ?? null,
                  levels: form.levels ?? {},
                  useSubareas: form.useSubareas ?? true,
                  sectionTypes: form.sectionTypes ?? [],
                  visibility: form.visibility ?? "premium",
                },
              },
            });
            await logCmsAudit({ entity: "content-program", entityId: active.id, entityLabel: form.title, action: "actualizó un programa de contenido" });
            setShowConfig(false);
            toast.success("Programa actualizado");
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ workspace */

function ProgramWorkspace({ root }: { root: ProgramRoot }) {
  const scope: CmsScope = useMemo(
    () => ({ rootSlug: root.slug, rootTitle: root.title, namespace: `builder-${root.slug}`, seed: [] }),
    [root.slug, root.title],
  );
  const tree = useCmsTree(scope, true);
  const mut = useCmsMutations(scope);
  const labels = levelLabels(root);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openTopic, setOpenTopic] = useState<CmsNode | null>(null);
  const [newBlock, setNewBlock] = useState("");

  const blocks = tree.data?.blocks ?? [];
  const stats = computeStats(blocks);

  const filtered = useMemo(() => {
    const byStatus = (list: CmsNode[]): CmsNode[] =>
      list
        .filter((n) => statusFilter === "all" || nodeStatus(n) === statusFilter)
        .map((n) => ({ ...n, children: byStatus(n.children) }));
    return filterTree(statusFilter === "all" ? blocks : byStatus(blocks), query);
  }, [blocks, query, statusFilter]);

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return flattenTree(blocks)
      .filter((e) => e.node.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [blocks, query]);

  const bulk = async (status: ContentStatus) => {
    const all = flattenTree(blocks).map((e) => e.node);
    for (const id of selected) {
      const node = all.find((n) => n.id === id);
      if (node) await mut.update.mutateAsync({ id, patch: statusPatch(node, status) as never });
    }
    setSelected([]);
    toast.success(`${STATUS_META[status].label}: ${selected.length} elemento(s)`);
  };

  if (tree.isLoading) {
    return (
      <div className="glass rounded-3xl p-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando estructura…
      </div>
    );
  }

  return (
    <section className="glass rounded-3xl p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Contenido de {root.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {root.description ||
              `Estructura jerárquica editable: ${plural(labels.program).toLowerCase()}, ${plural(labels.area).toLowerCase()}, ${plural(labels.subarea).toLowerCase()}, ${plural(labels.chapter).toLowerCase()}, ${plural(labels.lesson).toLowerCase()} y recursos.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Stat label={plural(labels.program)} value={stats.blocks} />
          <Stat label={plural(labels.area)} value={stats.categories} />
          <Stat label={plural(labels.chapter)} value={stats.topics} />
          <Stat label={plural(labels.lesson)} value={stats.sections} />
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en todo el programa… (bloques, categorías, temas, secciones)"
            className="w-full rounded-xl border border-border/60 bg-background/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContentStatus | "all")}
          className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-sm outline-none"
        >
          <option value="all">Todos los estados</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      {searchHits.length > 0 && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-background/50 p-3 text-xs">
          <div className="mb-1 font-bold uppercase tracking-widest text-muted-foreground">Resultados</div>
          <ul className="space-y-1">
            {searchHits.map(({ node, chain }) => (
              <li key={node.id} className="text-muted-foreground">
                {[root.title, ...chain.map((c) => c.title)].join(" → ")}{" "}
                <span className="font-semibold text-foreground">{node.title}</span>{" "}
                <span className="opacity-60">({KIND_LABEL[node.kind]})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <span className="font-bold">{selected.length} seleccionados</span>
          <button onClick={() => bulk("published")} className="rounded-lg border border-border/60 px-2 py-1 font-semibold hover:border-primary/40">Publicar</button>
          <button onClick={() => bulk("hidden")} className="rounded-lg border border-border/60 px-2 py-1 font-semibold hover:border-primary/40">Ocultar</button>
          <button onClick={() => bulk("archived")} className="rounded-lg border border-border/60 px-2 py-1 font-semibold hover:border-primary/40">Archivar</button>
          <button onClick={() => setSelected([])} className="ml-auto opacity-70 hover:opacity-100">Cancelar</button>
        </div>
      )}

      {/* Árbol */}
      <div className="mt-5 space-y-2">
        {filtered.map((block) => (
          <NodeRow
            key={block.id}
            node={block}
            siblings={filtered}
            root={root}
            scope={scope}
            depth={0}
            labels={labels}
            forceOpen={query.trim().length > 0}
            selected={selected}
            onToggleSelect={(id) =>
              setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }
            onOpenTopic={setOpenTopic}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Sin contenido todavía. Crea el primer {labels.program.toLowerCase()}.
          </div>
        )}
      </div>

      {/* Nuevo bloque */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const title = newBlock.trim();
          if (!title || !tree.data?.root) return;
          mut.create.mutate(
            {
              parentId: tree.data.root.id,
              kind: "program",
              title,
              siblings: blocks.length,
              metadata: { status: "draft" },
            },
            {
              onSuccess: () => {
                setNewBlock("");
                toast.success(`${labels.program} creado`);
              },
              onError: (err: any) => toast.error(err?.message ?? "No se pudo crear"),
            },
          );
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background/40 px-3 py-2"
      >
        <Plus className="size-3.5 text-primary" />
        <input
          value={newBlock}
          onChange={(e) => setNewBlock(e.target.value)}
          placeholder={`Nuevo ${labels.program.toLowerCase()}…`}
          className="w-48 bg-transparent text-sm outline-none"
        />
        <button type="submit" className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
          Agregar
        </button>
      </form>

      {openTopic && (
        <TopicDrawer
          topic={openTopic}
          root={root}
          scope={scope}
          labels={labels}
          onClose={() => setOpenTopic(null)}
        />
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 px-3 py-2 text-center">
      <div className="text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------- nodo del árbol */

function NodeRow({
  node,
  siblings,
  root,
  scope,
  depth,
  labels,
  forceOpen,
  selected,
  onToggleSelect,
  onOpenTopic,
}: {
  node: CmsNode;
  siblings: CmsNode[];
  root: ProgramRoot;
  scope: CmsScope;
  depth: number;
  labels: Record<NodeKind, string>;
  forceOpen: boolean;
  selected: string[];
  onToggleSelect: (id: string) => void;
  onOpenTopic: (n: CmsNode) => void;
}) {
  const mut = useCmsMutations(scope);
  const [open, setOpen] = useState(depth === 0);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [menu, setMenu] = useState(false);

  const childKind = childKindFor(node.kind, root);
  const status = nodeStatus(node);
  const expanded = forceOpen || open;

  const setStatus = (s: ContentStatus) =>
    mut.update.mutate(
      { id: node.id, patch: statusPatch(node, s) as never },
      { onSuccess: () => toast.success(STATUS_META[s].label) },
    );

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border/50 pl-3" : ""}>
      <div className="group flex items-center gap-2 rounded-2xl border border-border/60 bg-background/50 px-3 py-2">
        {node.children.length > 0 || childKind ? (
          <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {node.kind === "chapter" && (
          <input
            type="checkbox"
            checked={selected.includes(node.id)}
            onChange={() => onToggleSelect(node.id)}
            className="size-3.5 accent-[hsl(var(--primary))]"
          />
        )}

        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.update.mutate(
                { id: node.id, patch: { title: title.trim() || node.title } },
                { onSuccess: () => setEditing(false) },
              );
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-sm outline-none"
            />
            <button type="submit" className="text-[11px] font-bold text-primary">Guardar</button>
            <button type="button" onClick={() => setEditing(false)} className="text-[11px] opacity-60">Cancelar</button>
          </form>
        ) : (
          <button
            onClick={() => (node.kind === "chapter" ? onOpenTopic(node) : setOpen((v) => !v))}
            className="flex-1 truncate text-left text-sm font-semibold"
          >
            {node.title}
          </button>
        )}

        <span className="hidden rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:inline">
          {labels[node.kind] ?? KIND_LABEL[node.kind]}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${STATUS_META[status].tone}`}>
          {STATUS_META[status].label}
        </span>

        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="rounded-lg p-1 hover:bg-muted/60" aria-label="Acciones">
            <MoreVertical className="size-4" />
          </button>
          {menu && (
            <div
              className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl"
              onMouseLeave={() => setMenu(false)}
            >
              <MenuItem icon={Pencil} label="Editar nombre" onClick={() => { setEditing(true); setMenu(false); }} />
              {node.kind === "chapter" && (
                <MenuItem icon={FileText} label="Abrir tema" onClick={() => { onOpenTopic(node); setMenu(false); }} />
              )}
              <MenuItem icon={ChevronRight} label="Subir" rotate onClick={() => { mut.move.mutate({ node, siblings, dir: -1 }); setMenu(false); }} />
              <MenuItem icon={ChevronRight} label="Bajar" onClick={() => { mut.move.mutate({ node, siblings, dir: 1 }); setMenu(false); }} />
              <MenuItem icon={Copy} label="Duplicar" onClick={() => { mut.duplicate.mutate({ node, siblings: siblings.length }); setMenu(false); }} />
              <MenuItem icon={Eye} label="Publicar" onClick={() => { setStatus("published"); setMenu(false); }} />
              <MenuItem icon={EyeOff} label="Ocultar" onClick={() => { setStatus("hidden"); setMenu(false); }} />
              <MenuItem icon={Archive} label={status === "archived" ? "Restaurar" : "Archivar"} onClick={() => { setStatus(status === "archived" ? "draft" : "archived"); setMenu(false); }} />
              <MenuItem
                icon={Trash2}
                label="Eliminar"
                danger
                onClick={() => {
                  setMenu(false);
                  if (!confirm(`¿Eliminar “${node.title}”? Esta acción eliminará también sus secciones y recursos asociados.`)) return;
                  mut.remove.mutate(node.id, { onSuccess: () => toast.success("Eliminado") });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              siblings={node.children}
              root={root}
              scope={scope}
              depth={depth + 1}
              labels={labels}
              forceOpen={forceOpen}
              selected={selected}
              onToggleSelect={onToggleSelect}
              onOpenTopic={onOpenTopic}
            />
          ))}

          {childKind && (
            <div className="ml-4 pl-3">
              {adding ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = newTitle.trim();
                    if (!t) return;
                    mut.create.mutate(
                      { parentId: node.id, kind: childKind, title: t, siblings: node.children.length, metadata: { status: "draft" } },
                      {
                        onSuccess: () => {
                          setNewTitle("");
                          setAdding(false);
                          toast.success(`${labels[childKind]} creado`);
                        },
                        onError: (err: any) => toast.error(err?.message ?? "No se pudo crear"),
                      },
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/40 px-2.5 py-1.5"
                >
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={`Nuevo ${labels[childKind].toLowerCase()}…`}
                    className="w-44 bg-transparent text-xs outline-none"
                  />
                  <button type="submit" className="text-[11px] font-bold text-primary">Agregar</button>
                  <button type="button" onClick={() => setAdding(false)} className="text-[11px] opacity-60">✕</button>
                </form>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border/60 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="size-3" /> Nuevo {labels[childKind].toLowerCase()}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  rotate,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  rotate?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-muted/60 ${
        danger ? "text-destructive" : ""
      }`}
    >
      <Icon className={`size-3.5 ${rotate ? "-rotate-90" : ""}`} /> {label}
    </button>
  );
}

/* --------------------------------------------------------------- tema (drawer) */

function TopicDrawer({
  topic,
  root,
  scope,
  labels,
  onClose,
}: {
  topic: CmsNode;
  root: ProgramRoot;
  scope: CmsScope;
  labels: Record<NodeKind, string>;
  onClose: () => void;
}) {
  const tree = useCmsTree(scope, true);
  const mut = useCmsMutations(scope);
  const [tab, setTab] = useState<"secciones" | "recursos">("secciones");
  const [newSection, setNewSection] = useState("");
  const [newType, setNewType] = useState<SectionType>("text");

  // El árbol se recarga tras cada mutación: buscamos la versión viva del tema.
  const live = useMemo(() => {
    const found = flattenTree(tree.data?.blocks ?? []).find((e) => e.node.id === topic.id);
    return found?.node ?? topic;
  }, [tree.data, topic]);

  const applyTemplate = async (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    for (const [i, s] of tpl.sections.entries()) {
      await mut.create.mutateAsync({
        parentId: live.id,
        kind: "lesson",
        title: s.title,
        siblings: live.children.length + i,
        metadata: { sectionType: s.type, status: "draft" },
      });
    }
    toast.success("Plantilla aplicada");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-background p-5 shadow-2xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {labels.chapter} · {root.title}
            </div>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">{live.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/60"><X className="size-4" /></button>
        </div>

        <div className="mt-4 flex gap-2">
          {(["secciones", "recursos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize ${
                tab === t ? "bg-primary text-primary-foreground" : "border border-border/60 bg-background/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "secciones" ? (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/50 p-3">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Plantillas</span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:border-primary/40"
                >
                  {t.label}
                </button>
              ))}
            </div>

            {live.children.map((s) => (
              <SectionCard key={s.id} section={s} siblings={live.children} scope={scope} root={root} />
            ))}
            {live.children.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Este {labels.chapter.toLowerCase()} no tiene {plural(labels.lesson).toLowerCase()} todavía.
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = newSection.trim();
                if (!t) return;
                mut.create.mutate(
                  {
                    parentId: live.id,
                    kind: "lesson",
                    title: t,
                    siblings: live.children.length,
                    metadata: { sectionType: newType, status: "draft" },
                  },
                  { onSuccess: () => { setNewSection(""); toast.success(`${labels.lesson} creada`); } },
                );
              }}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background/40 p-3"
            >
              <input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder={`Nueva ${labels.lesson.toLowerCase()}…`}
                className="flex-1 min-w-40 bg-transparent text-sm outline-none"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as SectionType)}
                className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs"
              >
                {SECTION_TYPES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
                Agregar sección
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-5">
            <ResourcesPanelStandalone nodeId={live.id} nodeTitle={live.title} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- sección editable */

function SectionCard({
  section,
  siblings,
  scope,
  root,
}: {
  section: CmsNode;
  siblings: CmsNode[];
  scope: CmsScope;
  root: ProgramRoot;
}) {
  const mut = useCmsMutations(scope);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [type, setType] = useState<SectionType>((section.metadata?.sectionType as SectionType) ?? "text");
  const [body, setBody] = useState<string>((section.metadata?.body as string) ?? "");
  const [table, setTable] = useState<{ headers: string[]; rows: string[][] }>(
    (section.metadata?.table as any) ?? { headers: ["Columna 1", "Columna 2"], rows: [["", ""]] },
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  // Autosave con debounce (no se pierde contenido al cambiar de sección).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      mut.update.mutate(
        {
          id: section.id,
          patch: {
            title: title.trim() || section.title,
            metadata: { ...(section.metadata ?? {}), sectionType: type, body, table },
          } as never,
        },
        { onSuccess: () => setSaveState("saved") },
      );
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, type, body, table]);

  const status = nodeStatus(section);
  const usesTable = type === "table" || type === "questions" || type === "flashcards";

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <span className="flex-1 truncate text-sm font-semibold">{title}</span>
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {sectionTypeLabel(type)}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_META[status].tone}`}>
          {STATUS_META[status].label}
        </span>
        <button onClick={() => mut.move.mutate({ node: section, siblings, dir: -1 })} className="rounded-lg p-1 hover:bg-muted/60" aria-label="Subir">
          <ChevronRight className="size-3.5 -rotate-90" />
        </button>
        <button onClick={() => mut.move.mutate({ node: section, siblings, dir: 1 })} className="rounded-lg p-1 hover:bg-muted/60" aria-label="Bajar">
          <ChevronRight className="size-3.5 rotate-90" />
        </button>
        <button onClick={() => mut.duplicate.mutate({ node: section, siblings: siblings.length })} className="rounded-lg p-1 hover:bg-muted/60" aria-label="Duplicar">
          <Copy className="size-3.5" />
        </button>
        <button
          onClick={() => {
            if (!confirm(`¿Eliminar la sección “${section.title}”?`)) return;
            mut.remove.mutate(section.id);
          }}
          className="rounded-lg p-1 text-destructive hover:bg-destructive/10"
          aria-label="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-40 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-sm outline-none"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SectionType)}
              className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs"
            >
              {SECTION_TYPES.filter((s) => {
                const allowed = (root.metadata?.sectionTypes as SectionType[]) ?? [];
                return allowed.length === 0 || allowed.includes(s.id);
              }).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => mut.update.mutate({ id: section.id, patch: statusPatch(section, e.target.value as ContentStatus) as never })}
              className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Contenido (Markdown: **negrita**, *cursiva*, listas, títulos, enlaces, citas…)"
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          {usesTable && <TableEditor value={table} onChange={setTable} />}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado ✓" : "Autoguardado activo"}
            </span>
            <ResourcesToggle nodeId={section.id} nodeTitle={section.title} />
          </div>
        </div>
      )}
    </div>
  );
}

function ResourcesToggle({ nodeId, nodeTitle }: { nodeId: string; nodeTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen((v) => !v)} className="font-bold text-primary">
        {open ? "Ocultar recursos" : "Recursos de la sección"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <ResourcesPanelStandalone nodeId={nodeId} nodeTitle={nodeTitle} />
          </div>
        </div>
      )}
    </>
  );
}

function TableEditor({
  value,
  onChange,
}: {
  value: { headers: string[]; rows: string[][] };
  onChange: (v: { headers: string[]; rows: string[][] }) => void;
}) {
  const setHeader = (i: number, v: string) => {
    const headers = [...value.headers];
    headers[i] = v;
    onChange({ ...value, headers });
  };
  const setCell = (r: number, c: number, v: string) => {
    const rows = value.rows.map((row) => [...row]);
    rows[r]![c] = v;
    onChange({ ...value, rows });
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {value.headers.map((h, i) => (
              <th key={i} className="border-b border-border/60 p-1">
                <input value={h} onChange={(e) => setHeader(i, e.target.value)} className="w-full bg-transparent px-1 py-1 font-bold outline-none" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className="border-b border-border/40 p-1">
                  <input value={cell} onChange={(e) => setCell(r, c, e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2 p-2">
        <button
          onClick={() => onChange({ ...value, rows: [...value.rows, value.headers.map(() => "")] })}
          className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold"
        >
          + Fila
        </button>
        <button
          onClick={() => onChange({ headers: [...value.headers, `Columna ${value.headers.length + 1}`], rows: value.rows.map((r) => [...r, ""]) })}
          className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold"
        >
          + Columna
        </button>
        <button
          onClick={() => onChange({ ...value, rows: value.rows.slice(0, -1) })}
          className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold"
        >
          − Fila
        </button>
        <button
          onClick={() => onChange({ headers: value.headers.slice(0, -1), rows: value.rows.map((r) => r.slice(0, -1)) })}
          className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold"
        >
          − Columna
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- diálogo programa */

function ProgramDialog({
  title,
  initial,
  onClose,
  onSubmit,
  onDelete,
  onDuplicate,
}: {
  title: string;
  initial?: ProgramRoot;
  onClose: () => void;
  onSubmit: (form: any) => Promise<void> | void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    slug: initial?.slug ?? "",
    icon: (initial?.metadata?.icon as string) ?? "",
    color: (initial?.metadata?.color as string) ?? "",
    image: (initial?.metadata?.image as string) ?? "",
    route: (initial?.metadata?.route as string) ?? "",
    useSubareas: (initial?.metadata?.useSubareas ?? true) !== false,
    visibility: ((initial?.metadata?.visibility as VisibilityLevel) ?? "premium") as VisibilityLevel,
    status: initial ? nodeStatus(initial) : ("published" as ContentStatus),
    levels: { ...DEFAULT_LEVEL_LABELS, ...((initial?.metadata?.levels as any) ?? {}) },
    sectionTypes: ((initial?.metadata?.sectionTypes as SectionType[]) ?? []) as SectionType[],
  });
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/60"><X className="size-4" /></button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Nombre"><input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} /></Field>
          <Field label="Slug"><input value={form.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="cardiologia" className={inputCls} /></Field>
          <Field label="Descripción" full>
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={inputCls} />
          </Field>
          <Field label="Icono (emoji)"><input value={form.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="🫀" className={inputCls} /></Field>
          <Field label="Color"><input value={form.color} onChange={(e) => set({ color: e.target.value })} placeholder="#0ea5e9" className={inputCls} /></Field>
          <Field label="Imagen (URL)"><input value={form.image} onChange={(e) => set({ image: e.target.value })} className={inputCls} /></Field>
          <Field label="Ruta base"><input value={form.route} onChange={(e) => set({ route: e.target.value })} placeholder="/cardiologia" className={inputCls} /></Field>
          <Field label="Estado">
            <select value={form.status} onChange={(e) => set({ status: e.target.value as ContentStatus })} className={inputCls}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </Field>
          <Field label="Visibilidad">
            <select value={form.visibility} onChange={(e) => set({ visibility: e.target.value as VisibilityLevel })} className={inputCls}>
              {Object.entries(VISIBILITY_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-5 rounded-2xl border border-border/60 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nomenclatura de niveles</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVEL_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => set({ levels: { ...DEFAULT_LEVEL_LABELS, ...p.labels } })}
                className="rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold hover:border-primary/40"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(Object.keys(DEFAULT_LEVEL_LABELS) as (keyof typeof DEFAULT_LEVEL_LABELS)[]).map((k) => (
              <label key={k} className="text-[11px] font-semibold text-muted-foreground">
                {DEFAULT_LEVEL_LABELS[k]}
                <input
                  value={form.levels[k] ?? ""}
                  onChange={(e) => set({ levels: { ...form.levels, [k]: e.target.value } })}
                  className={inputCls}
                />
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={form.useSubareas} onChange={(e) => set({ useSubareas: e.target.checked })} />
            Usar nivel de {form.levels.subarea?.toLowerCase() || "subcategoría"} (opcional)
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tipos de sección disponibles (vacío = todos)
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SECTION_TYPES.map((s) => {
              const on = form.sectionTypes.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    set({
                      sectionTypes: on ? form.sectionTypes.filter((x) => x !== s.id) : [...form.sectionTypes, s.id],
                    })
                  }
                  className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                    on ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            disabled={busy || !form.title.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(form);
              } catch (err: any) {
                toast.error(err?.message ?? "No se pudo guardar");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
          {onDuplicate && (
            <button onClick={onDuplicate} className="rounded-xl border border-border/60 px-3 py-2 text-sm font-semibold">Duplicar</button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="ml-auto rounded-xl border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive">
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`text-[11px] font-semibold text-muted-foreground ${full ? "md:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
