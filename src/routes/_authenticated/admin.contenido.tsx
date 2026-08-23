import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import { moduleRowsForProgram } from "@/lib/program-modules";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
  Eye,
  EyeOff,
  Paperclip,
  Upload,
  Film,
  Link2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/contenido")({
  head: () => ({
    meta: [
      { title: "Editor de contenido · KotaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContenidoPage,
});

type NodeKind = "course" | "program" | "area" | "subarea" | "chapter" | "lesson";

type ContentNode = {
  id: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

const KIND_LABEL: Record<NodeKind, string> = {
  course: "Curso",
  program: "Programa",
  area: "Área",
  subarea: "Subárea",
  chapter: "Capítulo",
  lesson: "Lección",
};

const KIND_ORDER: NodeKind[] = ["course", "program", "area", "subarea", "chapter", "lesson"];

const CHILD_KINDS: Record<NodeKind | "root", NodeKind[]> = {
  root: ["course"],
  course: ["program"],
  program: ["area"],
  area: ["subarea", "chapter"],
  subarea: ["chapter"],
  chapter: ["lesson"],
  lesson: [],
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function ContenidoPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);
  const qc = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);
  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, navigate]);

  const nodesQ = useAllContentNodes(!!isAdmin);

  const idx = useMemo(() => buildAuditIndex((nodesQ.data ?? []) as AuditNode[]), [nodesQ.data]);
  const tree = idx.childrenOf as unknown as Map<string | null, ContentNode[]>;



  const createMut = useMutation({
    mutationFn: async (input: {
      parent_id: string | null;
      kind: NodeKind;
      title: string;
      slug: string;
      description?: string;
    }) => {
      if (!user) throw new Error("Necesitas iniciar sesión para editar contenido.");
      setMutationError(null);
      const siblings = tree.get(input.parent_id) ?? [];
      const sort_order = siblings.length;
      const slug = input.slug || slugify(input.title);
      const { data: created, error } = await supabase
        .from("content_nodes")
        .insert({
          parent_id: input.parent_id,
          kind: input.kind,
          title: input.title,
          slug,
          description: input.description || null,
          sort_order,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Al crear un PROGRAMA se generan automáticamente sus módulos base,
      // de modo que el programa nace con su ecosistema académico completo.
      if (input.kind === "program" && created?.id) {
        const rows = moduleRowsForProgram(slug, created.id).map((r) => ({
          ...r,
          created_by: user.id,
        }));
        const { error: modErr } = await supabase.from("content_nodes").insert(rows);
        if (modErr) throw modErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["program-areas"] });
    },
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo crear el contenido."),
  });

  const updateMut = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      slug?: string;
      description?: string | null;
      parent_id?: string | null;
      is_published?: boolean;

      sort_order?: number;
    }) => {
      setMutationError(null);
      const { id, ...rest } = input;
      const { error } = await supabase.from("content_nodes").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["program-areas"] });
    },
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo guardar el cambio."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      setMutationError(null);
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["program-areas"] });
    },
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo eliminar el contenido."),
  });

  if (adminLoading || isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const c = idx.counts;
  const CATEGORIES: { key: Category; label: string; icon: typeof Layers; count: number }[] = [
    { key: "all", label: "Todos", icon: Layers, count: c.total ?? 0 },
    { key: "programs", label: "Programas académicos", icon: GraduationCap, count: c.academicPrograms ?? 0 },
    { key: "library", label: "Biblioteca médica", icon: Library, count: c.libraries ?? 0 },
    { key: "courses", label: "Cursos y especialidades", icon: Stethoscope, count: c.rootCourses ?? 0 },
    { key: "sciences", label: "Ciencias médicas", icon: FlaskConical, count: c.sciences ?? 0 },
    { key: "unclassified", label: "Sin clasificar", icon: AlertTriangle, count: c.unclassified ?? 0 },
    { key: "drafts", label: "Borradores", icon: EyeOff, count: c.draft ?? 0 },
    { key: "published", label: "Publicados", icon: Eye, count: c.published ?? 0 },
  ];

  const passes = (n: AuditNode) => {
    if (kindFilter !== "all" && n.kind !== kindFilter) return false;
    if (stateFilter === "draft" && n.is_published) return false;
    if (stateFilter === "published" && !n.is_published) return false;
    if (visFilter === "unclassified" && !idx.unclassified.some((u) => u.id === n.id)) return false;
    if (visFilter === "ok" && idx.unclassified.some((u) => u.id === n.id)) return false;
    return true;
  };

  const results = search.trim() ? searchNodes(idx, search).filter(passes) : [];
  const selected = selectedId ? idx.byId.get(selectedId) : undefined;

  const cardsFor = (): AuditNode[] => {
    const base =
      category === "programs"
        ? idx.programs
        : category === "library"
          ? idx.libraries
          : category === "courses"
            ? idx.courses
            : category === "sciences"
              ? idx.sciences
              : idx.roots;
    return base.filter(passes);
  };

  const flatFor = (): AuditNode[] => {
    const base =
      category === "unclassified"
        ? idx.unclassified
        : category === "drafts"
          ? idx.nodes.filter((n) => !n.is_published)
          : idx.nodes.filter((n) => n.is_published);
    const list = base.filter(passes);
    return showAll ? list : list.slice(0, 200);
  };

  const isFlat = category === "unclassified" || category === "drafts" || category === "published";

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 md:px-6">
      <div className="max-w-[1400px] mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-5"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.5} /> Volver a admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Shield className="size-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Editor de contenido</h1>
            <p className="text-sm text-muted-foreground">
              Visualiza y gestiona el 100 % del ecosistema académico: cursos, programas, bibliotecas, áreas,
              capítulos y lecciones.
            </p>
          </div>
        </div>

        {/* Dashboard resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 mb-5">
          {[
            ["Cursos", c.course ?? 0],
            ["Programas", c.program ?? 0],
            ["Bibliotecas", c.libraries ?? 0],
            ["Áreas", c.area ?? 0],
            ["Subáreas", c.subarea ?? 0],
            ["Capítulos", c.chapter ?? 0],
            ["Lecciones", c.lesson ?? 0],
            ["Borradores", c.draft ?? 0],
            ["Sin clasificar", c.unclassified ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="glass rounded-2xl px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                {label}
              </div>
              <div className="text-xl font-extrabold tracking-tight">{value}</div>
            </div>
          ))}
        </div>

        {/* Buscador global + filtros */}
        <div className="glass rounded-2xl p-3 mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-white border border-border rounded-xl px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contenido… (nombre, slug, tipo, ruta)"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
            className="bg-white border border-border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none"
          >
            <option value="all">Tipo: todos</option>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}
            className="bg-white border border-border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none"
          >
            <option value="all">Estado: todos</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </select>
          <select
            value={visFilter}
            onChange={(e) => setVisFilter(e.target.value as typeof visFilter)}
            className="bg-white border border-border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none"
          >
            <option value="all">Visibilidad: todos</option>
            <option value="ok">Correctamente organizados</option>
            <option value="unclassified">Sin clasificar / huérfanos</option>
          </select>
        </div>

        {(mutationError || nodesQ.error) && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {mutationError ||
              (nodesQ.error instanceof Error ? nodesQ.error.message : "No se pudo cargar el contenido.")}
          </div>
        )}

        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          {/* Panel lateral */}
          <aside className="glass rounded-3xl p-3 h-max lg:sticky lg:top-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 pb-2">
              Categorías
            </div>
            <nav className="grid gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCategory(cat.key);
                    setSelectedId(null);
                    setShowAll(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-bold transition-colors ${
                    category === cat.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
                  }`}
                >
                  <cat.icon className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{cat.label}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      category === cat.key ? "opacity-80" : "text-muted-foreground"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </nav>

            <div className="mt-3 border-t border-border pt-3 px-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2">
                Acciones rápidas
              </div>
              <AddInline
                parentId={null}
                allowedKinds={CHILD_KINDS.root}
                onCreate={(v) => createMut.mutateAsync(v)}
              />
            </div>
          </aside>

          {/* Panel principal */}
          <section className="glass rounded-3xl p-4 md:p-5 min-h-[400px]">
            {nodesQ.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando todo el contenido…
              </div>
            ) : search.trim() ? (
              <>
                <Breadcrumbs items={[`Búsqueda: "${search.trim()}"`]} />
                <p className="text-xs text-muted-foreground mb-3">{results.length} resultado(s)</p>
                <FlatList
                  idx={idx}
                  nodes={results.slice(0, showAll ? results.length : 200)}
                  onOpen={(n) => {
                    setSearch("");
                    setCategory("all");
                    setSelectedId(n.id);
                  }}
                />
                {!showAll && results.length > 200 && (
                  <ShowMore total={results.length} onShowAll={() => setShowAll(true)} />
                )}
              </>
            ) : selected ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Breadcrumbs
                    items={[
                      "Inicio",
                      ...(idx.pathOf.get(selected.id) ?? []).map((p) => p.title),
                      selected.title,
                    ]}
                  />
                  <button
                    onClick={() => setSelectedId(null)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" /> Volver
                  </button>
                </div>
                <ul className="space-y-1.5">
                  <TreeItem
                    key={selected.id}
                    node={selected as unknown as ContentNode}
                    tree={tree}
                    depth={0}
                    onCreate={(v) => createMut.mutateAsync(v)}
                    onUpdate={(v) => updateMut.mutateAsync(v)}
                    onDelete={(id) => deleteMut.mutateAsync(id)}
                  />
                </ul>
              </>
            ) : isFlat ? (
              <>
                <Breadcrumbs items={["Inicio", CATEGORIES.find((x) => x.key === category)!.label]} />
                {category === "unclassified" && (
                  <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                    ⚠️ Contenido existente con relaciones atípicas o sin padre. Nada se modifica automáticamente:
                    usa “Organizar” y confirma explícitamente si deseas reubicarlo.
                  </p>
                )}
                <FlatList
                  idx={idx}
                  nodes={flatFor()}
                  organize={category === "unclassified"}
                  onOrganize={(n) => setOrganizing(n)}
                  onOpen={(n) => {
                    setCategory("all");
                    setSelectedId(n.id);
                  }}
                />
                {!showAll && (
                  <ShowMore
                    total={
                      category === "unclassified"
                        ? idx.unclassified.length
                        : category === "drafts"
                          ? (c.draft ?? 0)
                          : (c.published ?? 0)
                    }
                    onShowAll={() => setShowAll(true)}
                  />
                )}
              </>
            ) : (
              <>
                <Breadcrumbs items={["Inicio", CATEGORIES.find((x) => x.key === category)!.label]} />
                <CardGrid idx={idx} nodes={cardsFor()} onOpen={(n) => setSelectedId(n.id)} />
              </>
            )}
          </section>
        </div>
      </div>

      {organizing && (
        <OrganizeDialog
          node={organizing}
          idx={idx}
          onClose={() => setOrganizing(null)}
          onConfirm={async (parentId) => {
            await updateMut.mutateAsync({ id: organizing.id, parent_id: parentId });
            setOrganizing(null);
          }}
        />
      )}
    </div>
  );
}

type Category =
  | "all"
  | "programs"
  | "library"
  | "courses"
  | "sciences"
  | "unclassified"
  | "drafts"
  | "published";

function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold text-muted-foreground mb-3">
      {items.map((it, i) => (
        <span key={`${it}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3" />}
          <span className={i === items.length - 1 ? "text-foreground" : ""}>{it}</span>
        </span>
      ))}
    </div>
  );
}

function StateBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="text-[9px] uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
      Publicado
    </span>
  ) : (
    <span className="text-[9px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      Borrador
    </span>
  );
}

function CardGrid({
  idx,
  nodes,
  onOpen,
}: {
  idx: AuditIndex;
  nodes: AuditNode[];
  onOpen: (n: AuditNode) => void;
}) {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay elementos en esta categoría con los filtros actuales.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {nodes.map((n) => {
        const s = subtreeStats(idx, n.id);
        const path = idx.pathOf.get(n.id) ?? [];
        return (
          <button
            key={n.id}
            onClick={() => onOpen(n)}
            className="text-left rounded-2xl border border-border bg-white p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border bg-primary/10 text-primary border-primary/20">
                {KIND_LABEL[n.kind as NodeKind]}
              </span>
              <StateBadge published={n.is_published} />
            </div>
            <div className="text-sm font-extrabold tracking-tight line-clamp-2">{n.title}</div>
            <div className="text-[11px] text-muted-foreground font-mono truncate">/{n.slug}</div>
            {path.length > 0 && (
              <div className="text-[10px] text-muted-foreground/80 truncate mt-1">
                {path.map((p) => p.title).join(" > ")}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>{s.areas} áreas</span>
              <span>·</span>
              <span>{s.chapters} cap.</span>
              <span>·</span>
              <span>{s.lessons} lec.</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FlatList({
  idx,
  nodes,
  organize,
  onOrganize,
  onOpen,
}: {
  idx: AuditIndex;
  nodes: AuditNode[];
  organize?: boolean;
  onOrganize?: (n: AuditNode) => void;
  onOpen: (n: AuditNode) => void;
}) {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin elementos con los filtros actuales.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-white overflow-hidden">
      {nodes.map((n) => (
        <li key={n.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-black/[0.02]">
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border bg-black/[0.04] text-muted-foreground border-border shrink-0">
            {KIND_LABEL[n.kind as NodeKind]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{n.title}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              <span className="font-mono">/{n.slug}</span> · {pathLabel(idx, n)} ·{" "}
              {new Date(n.created_at).toLocaleDateString("es-PE")}
            </div>
          </div>
          <StateBadge published={n.is_published} />
          {organize && (
            <button
              onClick={() => onOrganize?.(n)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              Organizar
            </button>
          )}
          <button
            onClick={() => onOpen(n)}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
          >
            Ver contenido
          </button>
        </li>
      ))}
    </ul>
  );
}

function ShowMore({ total, onShowAll }: { total: number; onShowAll: () => void }) {
  if (total <= 200) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={onShowAll}
        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
      >
        Mostrar todo ({total})
      </button>
      <span className="text-[11px] text-muted-foreground">Mostrando los primeros 200 por rendimiento.</span>
    </div>
  );
}

/** Reubicación manual y explícita de contenido sin clasificar (no automática). */
function OrganizeDialog({
  node,
  idx,
  onClose,
  onConfirm,
}: {
  node: AuditNode;
  idx: AuditIndex;
  onClose: () => void;
  onConfirm: (parentId: string | null) => Promise<void>;
}) {
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const candidates = idx.nodes
    .filter((n) => n.id !== node.id && (CHILD_KINDS[n.kind as NodeKind] ?? []).includes(node.kind as NodeKind))
    .slice(0, 500);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="glass rounded-3xl w-full max-w-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold tracking-tight">Organizar contenido</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/[0.05]">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Vas a reubicar <b>{node.title}</b> (<span className="font-mono">/{node.slug}</span>). No se cambian su
          nombre, su slug ni su ID; sólo su elemento padre. Requiere tu confirmación explícita.
        </p>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm mb-4"
        >
          <option value="">Selecciona el nuevo elemento padre…</option>
          {candidates.map((n) => (
            <option key={n.id} value={n.id}>
              [{KIND_LABEL[n.kind as NodeKind]}] {pathLabel(idx, n)}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground">
            Cancelar
          </button>
          <button
            disabled={!target || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(target);
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Confirmar reubicación
          </button>
        </div>
      </div>
    </div>
  );
}


function TreeItem({
  node,
  tree,
  depth,
  onCreate,
  onUpdate,
  onDelete,
}: {
  node: ContentNode;
  tree: Map<string | null, ContentNode[]>;
  depth: number;
  onCreate: (v: {
    parent_id: string | null;
    kind: NodeKind;
    title: string;
    slug: string;
    description?: string;
  }) => Promise<unknown>;
  onUpdate: (v: {
    id: string;
    title?: string;
    slug?: string;
    description?: string | null;
    is_published?: boolean;
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const children = tree.get(node.id) ?? [];
  const [open, setOpen] = useState(depth < 1);
  const [editing, setEditing] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [description, setDescription] = useState(node.description ?? "");
  const [busy, setBusy] = useState(false);
  const allowed = CHILD_KINDS[node.kind];
  const expandable = children.length > 0 || allowed.length > 0;

  return (
    <li>
      <div
        className="group flex items-center gap-2 py-2 pr-2 rounded-xl hover:bg-black/[0.03] transition-colors"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 text-muted-foreground shrink-0 disabled:opacity-30"
          aria-label={open ? "Contraer" : "Expandir"}
          disabled={!expandable}
        >
          {expandable ? (
            open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>


        <span
          className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0 ${
            KIND_ORDER.indexOf(node.kind) < 2
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-black/[0.04] text-muted-foreground border-border"
          }`}
        >
          {KIND_LABEL[node.kind]}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate flex items-center gap-2">
            {node.title}
            {!node.is_published && (
              <span className="text-[9px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Borrador
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">/{node.slug}</div>
        </div>

        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {allowed.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              title={`Añadir ${allowed.map((k) => KIND_LABEL[k]).join(" / ").toLowerCase()}`}
              className="p-1.5 rounded-lg text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </button>
          )}

          <button
            onClick={() => setResourcesOpen((v) => !v)}
            title="Recursos (archivos, videos, enlaces)"
            className={`p-1.5 rounded-lg hover:bg-black/[0.05] ${resourcesOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Paperclip className="size-3.5" />
          </button>
          <button
            onClick={() =>
              onUpdate({ id: node.id, is_published: !node.is_published })
            }
            title={node.is_published ? "Ocultar" : "Publicar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            {node.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            title="Editar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar "${node.title}" y todo su contenido?`)) return;
              setBusy(true);
              try {
                await onDelete(node.id);
              } finally {
                setBusy(false);
              }
            }}
            title="Eliminar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
            disabled={busy}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div
          className="ml-2 mb-2 rounded-xl border border-border bg-white/60 p-3 grid gap-2"
          style={{ marginLeft: 8 + depth * 18 + 24 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full bg-white border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Slug
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 block w-full bg-white border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </label>
          </div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full bg-white border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setTitle(node.title);
                setSlug(node.slug);
                setDescription(node.description ?? "");
                setEditing(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-black/[0.05]"
            >
              <X className="size-3.5" /> Cancelar
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await onUpdate({
                    id: node.id,
                    title,
                    slug: slug || slugify(title),
                    description: description || null,
                  });
                  setEditing(false);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {resourcesOpen && (
        <div
          className="mb-2 rounded-xl border border-primary/20 bg-primary/[0.03] p-3"
          style={{ marginLeft: 8 + depth * 18 + 24 }}
        >
          <ResourcesPanel nodeId={node.id} nodeTitle={node.title} />
        </div>
      )}

      {open && (
        <>
          {allowed.length > 0 && (
            <div style={{ paddingLeft: 8 + (depth + 1) * 18 }} className="py-1">
              <AddInline parentId={node.id} allowedKinds={allowed} onCreate={onCreate} />
            </div>
          )}
          {children.length > 0 && (
            <ul className="space-y-1.5">
              {children.map((c) => (
                <TreeItem
                  key={c.id}
                  node={c}
                  tree={tree}
                  depth={depth + 1}
                  onCreate={onCreate}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

function AddInline({
  parentId,
  allowedKinds,
  onCreate,
}: {
  parentId: string | null;
  allowedKinds: NodeKind[];
  onCreate: (v: {
    parent_id: string | null;
    kind: NodeKind;
    title: string;
    slug: string;
    description?: string;
  }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<NodeKind>(allowedKinds[0]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 border border-dashed border-primary/40"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
        Añadir {allowedKinds.map((k) => KIND_LABEL[k]).join(" / ").toLowerCase()}
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        setError(null);
        try {
          await onCreate({
            parent_id: parentId,
            kind,
            title: title.trim(),
            slug: slugify(title),
          });
          setTitle("");
          setOpen(false);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo crear.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 flex-wrap"
    >
      {allowedKinds.length > 1 && (
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as NodeKind)}
          className="bg-white border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
        >
          {allowedKinds.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`Nombre del ${KIND_LABEL[kind].toLowerCase()}`}
        autoFocus
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring min-w-[220px]"
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Crear
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-black/[0.05]"
      >
        <X className="size-3.5" />
      </button>
      {error && <span className="basis-full text-[11px] font-semibold text-destructive">{error}</span>}
    </form>
  );
}

// -------------------- Resources panel --------------------

type ResourceKind = "file" | "video" | "link" | "text" | "image" | "audio" | "embed";

type ContentResource = {
  id: string;
  node_id: string;
  kind: ResourceKind;
  title: string;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  content: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

const RESOURCE_LABEL: Record<ResourceKind, string> = {
  file: "Archivo",
  video: "Video",
  link: "Enlace",
  text: "Nota",
  image: "Imagen",
  audio: "Audio",
  embed: "Embed",
};

function ResourceIcon({ kind, className }: { kind: ResourceKind; className?: string }) {
  const cls = className ?? "size-4";
  if (kind === "video") return <Film className={cls} />;
  if (kind === "link" || kind === "embed") return <Link2 className={cls} />;
  if (kind === "text") return <FileText className={cls} />;
  if (kind === "image") return <ImageIcon className={cls} />;
  return <Paperclip className={cls} />;
}

function ResourcesPanel({ nodeId, nodeTitle }: { nodeId: string; nodeTitle: string }) {
  const user = useSupabaseUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"file" | "video" | "link" | "text">("file");
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["content-resources", nodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_resources")
        .select("*")
        .eq("node_id", nodeId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentResource[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (r: Partial<ContentResource> & { kind: ResourceKind; title: string }) => {
      setError(null);
      const siblings = q.data ?? [];
      const { error } = await supabase.from("content_resources").insert({
        node_id: nodeId,
        kind: r.kind,
        title: r.title,
        url: r.url ?? null,
        storage_path: r.storage_path ?? null,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes ?? null,
        content: r.content ?? null,
        metadata: (r.metadata ?? {}) as never,
        sort_order: siblings.length,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo agregar el recurso."),
  });

  const updateMut = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ContentResource> }) => {
      setError(null);
      const { error } = await supabase.from("content_resources").update(input.patch as never).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const deleteMut = useMutation({
    mutationFn: async (r: ContentResource) => {
      setError(null);
      if (r.storage_path) {
        await supabase.storage.from("content").remove([r.storage_path]);
      }
      const { error } = await supabase.from("content_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo eliminar."),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Recursos de "{nodeTitle}"
        </div>
        <div className="text-[10px] text-muted-foreground">
          {q.data?.length ?? 0} elemento(s)
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-3">
        {(["file", "video", "link", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <ResourceIcon kind={t} className="size-3.5" />
            {t === "file" ? "Subir archivo" : t === "video" ? "Subir video" : t === "link" ? "Añadir enlace" : "Nota / texto"}
          </button>
        ))}
      </div>

      <div className="mb-4">
        {tab === "file" && (
          <UploadForm
            nodeId={nodeId}
            accept="*/*"
            kindHint="file"
            onDone={(payload) => createMut.mutateAsync(payload)}
            onError={(m) => setError(m)}
          />
        )}
        {tab === "video" && (
          <UploadForm
            nodeId={nodeId}
            accept="video/*"
            kindHint="video"
            onDone={(payload) => createMut.mutateAsync(payload)}
            onError={(m) => setError(m)}
          />
        )}
        {tab === "link" && (
          <LinkForm onCreate={(payload) => createMut.mutateAsync(payload)} />
        )}
        {tab === "text" && (
          <TextForm onCreate={(payload) => createMut.mutateAsync(payload)} />
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
          {error}
        </div>
      )}

      {q.isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="text-[12px] text-muted-foreground italic">Sin recursos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {q.data!.map((r) => (
            <ResourceRow
              key={r.id}
              r={r}
              onUpdate={(patch) => updateMut.mutateAsync({ id: r.id, patch })}
              onDelete={() => deleteMut.mutateAsync(r)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadForm({
  nodeId,
  accept,
  kindHint,
  onDone,
  onError,
}: {
  nodeId: string;
  accept: string;
  kindHint: "file" | "video";
  onDone: (payload: Partial<ContentResource> & { kind: ResourceKind; title: string }) => Promise<unknown>;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  return (
    <label className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-dashed border-primary/40 bg-white cursor-pointer hover:bg-primary/[0.04]">
      <Upload className="size-4 text-primary" />
      <span className="text-[12px] font-semibold text-foreground">
        {kindHint === "video" ? "Elegir video para subir" : "Elegir archivo(s) para subir"}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {busy ? progress ?? "Subiendo…" : "PDF, DOCX, PPTX, MP4, MP3, imágenes…"}
      </span>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          setBusy(true);
          try {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`);
              const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
              const path = `${nodeId}/${Date.now()}_${safe}`;
              const { error: upErr } = await supabase.storage
                .from("content")
                .upload(path, file, {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: file.type || undefined,
                });
              if (upErr) throw upErr;
              const isVideo = file.type.startsWith("video/") || kindHint === "video";
              const isImage = file.type.startsWith("image/");
              const isAudio = file.type.startsWith("audio/");
              const kind: ResourceKind = isVideo ? "video" : isImage ? "image" : isAudio ? "audio" : "file";
              await onDone({
                kind,
                title: file.name,
                storage_path: path,
                mime_type: file.type || null,
                size_bytes: file.size,
              });
            }
          } catch (err) {
            onError(err instanceof Error ? err.message : "Error al subir archivo.");
          } finally {
            setBusy(false);
            setProgress(null);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
      {busy && <Loader2 className="size-4 animate-spin text-primary" />}
    </label>
  );
}

function LinkForm({
  onCreate,
}: {
  onCreate: (payload: Partial<ContentResource> & { kind: ResourceKind; title: string }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const detectKind = (u: string): ResourceKind => {
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|player\.|\.mp4($|\?)/i.test(u)) return "video";
    return "link";
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!url.trim()) return;
        setBusy(true);
        try {
          await onCreate({
            kind: detectKind(url),
            title: title.trim() || url.trim(),
            url: url.trim(),
          });
          setTitle("");
          setUrl("");
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-border bg-white"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[160px]"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtube.com/… o cualquier URL"
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[220px] font-mono"
      />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Agregar
      </button>
    </form>
  );
}

function TextForm({
  onCreate,
}: {
  onCreate: (payload: Partial<ContentResource> & { kind: ResourceKind; title: string }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() && !content.trim()) return;
        setBusy(true);
        try {
          await onCreate({
            kind: "text",
            title: title.trim() || "Nota",
            content: content,
          });
          setTitle("");
          setContent("");
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-2 p-3 rounded-lg border border-border bg-white"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la nota"
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Escribe contenido, teoría, algoritmos, perlas clínicas… (soporta Markdown)"
        className="bg-white border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Guardar nota
        </button>
      </div>
    </form>
  );
}

function ResourceRow({
  r,
  onUpdate,
  onDelete,
}: {
  r: ContentResource;
  onUpdate: (patch: Partial<ContentResource>) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [url, setUrl] = useState(r.url ?? "");
  const [content, setContent] = useState(r.content ?? "");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function getSigned() {
    if (!r.storage_path) return;
    if (signedUrl) return;
    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(r.storage_path, 60 * 60);
    if (!error && data) setSignedUrl(data.signedUrl);
  }

  useEffect(() => {
    if (r.storage_path) getSigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.storage_path]);

  const sizeLabel = r.size_bytes
    ? r.size_bytes > 1024 * 1024
      ? `${(r.size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(r.size_bytes / 1024))} KB`
    : null;

  return (
    <li className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ResourceIcon kind={r.kind} className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-black/[0.04] text-muted-foreground border border-border">
              {RESOURCE_LABEL[r.kind]}
            </span>
            <span className="text-sm font-bold truncate">{r.title}</span>
            {!r.is_published && (
              <span className="text-[9px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Borrador
              </span>
            )}
            {sizeLabel && <span className="text-[10px] text-muted-foreground">{sizeLabel}</span>}
          </div>
          {r.kind === "text" && r.content && !editing && (
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{r.content}</p>
          )}
          {(r.url || signedUrl) && !editing && (
            <a
              href={r.url ?? signedUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline break-all"
            >
              <ExternalLink className="size-3" />
              {r.url ?? "Abrir archivo"}
            </a>
          )}
          {r.kind === "video" && signedUrl && !editing && (
            <video src={signedUrl} controls className="mt-2 w-full max-w-md rounded-lg border border-border" />
          )}
          {r.kind === "image" && signedUrl && !editing && (
            <img src={signedUrl} alt={r.title} className="mt-2 max-h-40 rounded-lg border border-border" />
          )}
          {r.kind === "audio" && signedUrl && !editing && (
            <audio src={signedUrl} controls className="mt-2 w-full" />
          )}

          {editing && (
            <div className="mt-2 grid gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                placeholder="Título"
              />
              {(r.kind === "link" || r.kind === "video" || r.kind === "embed") && !r.storage_path && (
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="URL"
                />
              )}
              {r.kind === "text" && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="bg-white border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTitle(r.title);
                    setUrl(r.url ?? "");
                    setContent(r.content ?? "");
                    setEditing(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-black/[0.05]"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onUpdate({
                        title: title.trim() || r.title,
                        url: r.storage_path ? r.url : url.trim() || null,
                        content: r.kind === "text" ? content : r.content,
                      });
                      setEditing(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              title="Abrir / descargar"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
            >
              <Download className="size-3.5" />
            </a>
          )}
          <button
            onClick={() => onUpdate({ is_published: !r.is_published })}
            title={r.is_published ? "Ocultar" : "Publicar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            {r.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            title="Editar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar "${r.title}"?`)) return;
              setBusy(true);
              try {
                await onDelete();
              } finally {
                setBusy(false);
              }
            }}
            title="Eliminar"
            disabled={busy}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
