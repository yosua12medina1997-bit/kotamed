/**
 * Vista de contenido académico 100% CMS (persistente y editable).
 *
 * Toda la jerarquía —bloques, categorías, subcategorías, temas, secciones,
 * contenido y recursos— vive en base de datos (`content_nodes` /
 * `content_resources`). El blueprint estático se usa únicamente como semilla
 * inicial la primera vez que un admin abre el módulo.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTopicLinkSearch } from "@/lib/topic-nav";
import {
  Baby,
  BookMarked,
  Calculator,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  Pencil,
  Image as ImageIcon,
  Play,

  Plus,
  Save,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useIsSuperAdmin, useSupabaseUser } from "@/lib/session";
import { TopicOrganizer } from "@/components/cms/TopicOrganizer";
import {
  PEDIATRIA_NEONATOLOGIA_BLUEPRINT,
  type BlueprintBlock,
} from "@/lib/pediatria-neonatologia-blueprint";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { readDeck } from "@/lib/topic-deck";

import { PharmaWorkspace } from "@/components/pharma/PharmaWorkspace";
import {
  KIND_LABEL,
  countTopics,
  filterTree,
  slugify,
  useCmsMutations,
  useCmsTree,
  useTreeStats,
  type CmsNode,
  type CmsScope,
} from "@/lib/pednn-cms";

/** Espacio de almacenamiento del contenido (permite reutilizar la vista). */
export interface ContenidoScope {
  rootSlug: string;
  rootTitle: string;
  /** Compatibilidad histórica (ya no se usan overrides JSON). */
  overridesSlug?: string;
  namespace: string;
}

const PEDNN_SCOPE: ContenidoScope = {
  rootSlug: "biblioteca-pediatria-neo",
  rootTitle: "Biblioteca · Pediatría & Neonatología",
  namespace: "pednn",
};

const DEFAULT_ACCENT = "hsl(var(--primary))";

export function PediatriaNeoContenido({
  meta,
  blueprint = PEDIATRIA_NEONATOLOGIA_BLUEPRINT,
  scope = PEDNN_SCOPE,
  heading,
  intro,
  showPharma = true,
}: {
  meta: EnamAreaMeta;
  /** Blueprint usado sólo como semilla inicial del CMS. */
  blueprint?: BlueprintBlock[];
  scope?: ContenidoScope;
  heading?: string;
  intro?: string;
  showPharma?: boolean;
}) {
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: isSuperAdmin } = useIsSuperAdmin(user?.id);

  const cmsScope: CmsScope = useMemo(
    () => ({
      rootSlug: scope.rootSlug,
      rootTitle: scope.rootTitle,
      namespace: scope.namespace,
      seed: blueprint,
    }),
    [scope.rootSlug, scope.rootTitle, scope.namespace, blueprint],
  );

  const tree = useCmsTree(cmsScope, !!isAdmin);
  const mut = useCmsMutations(cmsScope);

  const blocks = tree.data?.blocks ?? [];
  const visibleBlocks = useMemo(
    () => (isAdmin ? blocks : blocks.filter((b) => b.is_published)),
    [blocks, isAdmin],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pharmaOpen, setPharmaOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [newBlock, setNewBlock] = useState("");

  useEffect(() => {
    if (!activeId || !visibleBlocks.some((b) => b.id === activeId)) {
      setActiveId(visibleBlocks[0]?.id ?? null);
    }
  }, [visibleBlocks, activeId]);

  const block = visibleBlocks.find((b) => b.id === activeId) ?? visibleBlocks[0] ?? null;
  const accent = (block?.metadata?.accent as string) || meta.accent || DEFAULT_ACCENT;
  const stats = useTreeStats(visibleBlocks);

  const children = useMemo(
    () => (block ? filterTree(childrenOf(block, isAdmin), query) : []),
    [block, query, isAdmin],
  );

  if (tree.isLoading) {
    return (
      <section className="glass rounded-3xl p-8 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando contenido…
      </section>
    );
  }

  if (tree.error) {
    return (
      <section className="glass rounded-3xl p-8 text-sm font-semibold text-destructive">
        {tree.error instanceof Error ? tree.error.message : "No se pudo cargar el contenido."}
      </section>
    );
  }

  return (
    <section className="glass rounded-3xl p-6 md:p-8 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="size-4" strokeWidth={2.25} style={{ color: meta.accent }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Biblioteca clínica · CMS editable
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                <Shield className="size-3" /> Editor activo
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
            {heading ?? `Contenido de ${meta.title}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {intro ??
              "Estructura jerárquica editable: bloques, categorías, subcategorías, temas, secciones y recursos. Todo se guarda en base de datos."}
            {isAdmin && " Como admin puedes crear, renombrar, ordenar, duplicar, publicar y eliminar en cualquier nivel."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <Stat label="Bloques" value={stats.blocks} accent={meta.accent} />
            <Stat label="Categorías" value={stats.categories} accent={meta.accent} />
            <Stat label="Temas" value={stats.topics} accent={meta.accent} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isSuperAdmin && block && (
              <button
                onClick={() => setOrgOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-bold hover:border-primary/40"
              >
                <FolderTree className="size-3.5" style={{ color: meta.accent }} />
                Organizar temas
              </button>
            )}
            {showPharma && (
              <button
                onClick={() => setPharmaOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-bold hover:border-primary/40"
              >
                <Calculator className="size-3.5" style={{ color: meta.accent }} />
                Calculadora farmacológica
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bloques */}
      <div className="mt-6 flex flex-wrap gap-2">
        {visibleBlocks.map((b) => {
          const isActive = block?.id === b.id;
          const Icon = (b.metadata?.iconKey as string) === "neonatologia" ? Baby : Stethoscope;
          return (
            <button
              key={b.id}
              onClick={() => setActiveId(b.id)}
              className={`group inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/50 bg-background/40 hover:border-border text-foreground"
              }`}
              style={isActive ? { background: (b.metadata?.accent as string) || accent } : undefined}
            >
              <Icon className="size-4" strokeWidth={2.25} />
              <span>{b.title}</span>
              {!b.is_published && <EyeOff className="size-3.5 opacity-70" />}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/25 text-white" : "bg-foreground/5 text-muted-foreground"
                }`}
              >
                {countTopics(b)}
              </span>
            </button>
          );
        })}
        {isAdmin && (
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
                  metadata: { accent: meta.accent, iconKey: slugify(title) },
                },
                {
                  onSuccess: () => {
                    toast.success("Bloque creado");
                    setNewBlock("");
                  },
                  onError: (err: any) => toast.error(err?.message ?? "No se pudo crear"),
                },
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-border/70 bg-background/40 px-3 py-1.5"
          >
            <input
              value={newBlock}
              onChange={(e) => setNewBlock(e.target.value)}
              placeholder="Nuevo bloque…"
              className="w-36 bg-transparent text-xs outline-none"
            />
            <button
              type="submit"
              disabled={mut.create.isPending}
              className="rounded-lg p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
              aria-label="Agregar bloque"
            >
              <Plus className="size-3.5" />
            </button>
          </form>
        )}
      </div>

      {block && isAdmin && (
        <div className="mt-3">
          <NodeToolbar
            node={block}
            siblings={blocks}
            scope={cmsScope}
            accent={accent}
            onAfterDelete={() => setActiveId(null)}
          />
        </div>
      )}

      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar en ${block?.title ?? "el módulo"}… (ej. sepsis, TORCH, RCP)`}
          className="w-full rounded-xl border border-border/60 bg-background/60 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {block?.description && (
        <p className="mt-3 text-xs text-muted-foreground">{block.description}</p>
      )}

      {showPharma && (
        <button
          onClick={() => setPharmaOpen(true)}
          className="mt-4 w-full group flex items-center gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-left backdrop-blur transition hover:border-primary/40 hover:bg-background/70"
        >
          <span
            className="inline-flex size-9 items-center justify-center rounded-xl text-white shrink-0"
            style={{ background: accent }}
          >
            <Calculator className="size-4.5" strokeWidth={2.4} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold tracking-tight">
              Calculadora farmacológica pediátrica
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Acceso rápido desde el índice · dosis por peso, catálogo editable y cálculos clínicos
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
        </button>
      )}

      {/* Explorar categorías → categoría → temas */}
      <CategoryBrowser
        block={block}
        children={children}
        accent={accent}
        isAdmin={!!isAdmin}
        scope={cmsScope}
        searching={query.trim().length > 0}
        query={query}
        onOpenPharma={() => setPharmaOpen(true)}
      />


      <div className="mt-8 rounded-2xl border border-border/50 bg-background/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="size-4" strokeWidth={2.25} style={{ color: meta.accent }} />
          <span className="font-bold text-foreground">Formato de cada tema</span>
        </div>
        Cada tema define sus propias secciones editables (resumen, fisiopatología, algoritmo,
        tratamiento por guías, caso clínico, flashcards, banco de preguntas…) y sus recursos —
        archivos, videos, enlaces y notas — guardados en base de datos.
      </div>

      {pharmaOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur p-4"
          onClick={() => setPharmaOpen(false)}
        >
          <div
            className="w-full max-w-4xl my-8 rounded-3xl border border-border/60 bg-card p-4 md:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="size-4" style={{ color: meta.accent }} />
              <h3 className="text-sm font-extrabold tracking-tight">
                Calculadora farmacológica pediátrica
              </h3>
              <div className="flex-1" />
              <button
                onClick={() => setPharmaOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/[0.05]"
                aria-label="Cerrar calculadora"
              >
                <X className="size-4" />
              </button>
            </div>
            <PharmaWorkspace nodeId={null} isAdmin={!!isAdmin} accent={meta.accent} />
          </div>
        </div>
      )}
    </section>
  );
}

function childrenOf(node: CmsNode, isAdmin?: boolean | null) {
  return isAdmin ? node.children : node.children.filter((c) => c.is_published);
}

function isTopicKind(n: CmsNode) {
  return n.kind === "chapter" || n.kind === "lesson";
}

function isBranchKind(n: CmsNode) {
  return n.kind === "area" || n.kind === "subarea";
}

/** Todos los temas de una rama (recursivo), respetando permisos. */
function collectTopics(node: CmsNode, isAdmin: boolean): CmsNode[] {
  const out: CmsNode[] = [];
  const walk = (n: CmsNode) => {
    for (const c of childrenOf(n, isAdmin)) {
      if (isTopicKind(c)) out.push(c);
      walk(c);
    }
  };
  walk(node);
  return out;
}

/** Portada del tema: imagen definida en el CMS o primera diapositiva visual. */
function topicCover(node: CmsNode): string | null {
  const meta = node.metadata ?? {};
  const direct = (meta.cover ?? meta.coverUrl ?? meta.image) as string | undefined;
  if (typeof direct === "string" && direct.trim()) return direct;
  const deck = readDeck(meta);
  return deck?.slides[0]?.url || null;
}

/**
 * Navegación jerárquica clara: explorar categorías → seleccionar categoría →
 * ver todos los temas en tarjetas → abrir tema.
 */
function CategoryBrowser({
  block,
  children,
  accent,
  isAdmin,
  scope,
  searching,
  query,
  onOpenPharma,
}: {
  block: CmsNode | null;
  children: CmsNode[];
  accent: string;
  isAdmin: boolean;
  scope: CmsScope;
  searching: boolean;
  query: string;
  onOpenPharma: () => void;
}) {
  const [catId, setCatId] = useState<string | null>(null);
  const categories = useMemo(() => children.filter(isBranchKind), [children]);
  const looseTopics = useMemo(() => children.filter(isTopicKind), [children]);

  useEffect(() => {
    if (catId && !categories.some((c) => c.id === catId)) setCatId(null);
  }, [categories, catId]);

  const activeCat = categories.find((c) => c.id === catId) ?? null;

  if (searching) {
    const hits = block ? collectTopics(block, isAdmin) : [];
    const q = query.trim().toLowerCase();
    const filtered = hits.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q),
    );
    return (
      <div className="mt-6">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {filtered.length} temas para “{query}”
        </p>
        <TopicGrid topics={filtered} accent={accent} isAdmin={isAdmin} scope={scope} />
      </div>
    );
  }

  if (activeCat) {
    const kids = childrenOf(activeCat, isAdmin);
    const subs = kids.filter(isBranchKind);
    const topics = kids.filter(isTopicKind);
    return (
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setCatId(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 font-bold hover:border-primary/40"
          >
            <ChevronRight className="size-3.5 rotate-180" /> Categorías
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-extrabold">{activeCat.title}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            · {collectTopics(activeCat, isAdmin).length} temas
          </span>
          {slugify(activeCat.title).includes("farmacolog") && (
            <button
              onClick={onOpenPharma}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] font-bold hover:border-primary/40"
            >
              <Calculator className="size-3.5" style={{ color: accent }} /> Abrir calculadora
            </button>
          )}
        </div>

        {activeCat.description && (
          <p className="mt-2 text-xs text-muted-foreground">{activeCat.description}</p>
        )}

        {isAdmin && (
          <div className="mt-3">
            <NodeToolbar node={activeCat} siblings={categories} scope={scope} accent={accent} />
          </div>
        )}

        <div className="mt-5">
          <TopicGrid topics={topics} accent={accent} isAdmin={isAdmin} scope={scope} />
        </div>

        {subs.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Subcategorías
            </p>
            {subs.map((s) => (
              <BranchCard
                key={s.id}
                node={s}
                siblings={subs}
                accent={accent}
                isAdmin={isAdmin}
                scope={scope}
                forceOpen={false}
                onOpenPharma={onOpenPharma}
              />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-4">
            <AddChildForm
              parent={activeCat}
              siblings={activeCat.children.length}
              scope={scope}
              accent={accent}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {categories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const total = collectTopics(cat, isAdmin).length;
            const cover = topicCover(cat) ?? topicCover(collectTopics(cat, isAdmin)[0] ?? cat);
            return (
              <button
                key={cat.id}
                onClick={() => setCatId(cat.id)}
                className="group overflow-hidden rounded-2xl border border-border/50 bg-background/40 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div
                  className="relative h-24 w-full overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}
                >
                  {cover && (
                    <img
                      src={cover}
                      alt={cat.title}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-80 transition group-hover:scale-105 group-hover:opacity-100"
                    />
                  )}
                  <span className="absolute left-3 top-3 inline-flex size-8 items-center justify-center rounded-lg bg-black/35 text-white backdrop-blur">
                    <ListChecks className="size-4" strokeWidth={2.5} />
                  </span>
                  {!cat.is_published && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                      <EyeOff className="size-3" /> oculto
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-extrabold tracking-tight">{cat.title}</p>
                  {cat.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {total} temas
                    <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {looseTopics.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Temas directos
          </p>
          <TopicGrid topics={looseTopics} accent={accent} isAdmin={isAdmin} scope={scope} />
        </div>
      )}

      {categories.length === 0 && looseTopics.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
          {isAdmin
            ? "Este bloque aún no tiene categorías. Crea la primera abajo."
            : "Contenido en preparación."}
        </div>
      )}

      {isAdmin && block && (
        <div className="mt-4">
          <AddChildForm
            parent={block}
            siblings={block.children.length}
            scope={scope}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}

function TopicGrid({
  topics,
  accent,
  isAdmin,
  scope,
}: {
  topics: CmsNode[];
  accent: string;
  isAdmin: boolean;
  scope: CmsScope;
}) {
  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-xs text-muted-foreground">
        Aún no hay temas en esta categoría.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {topics.map((t, i) => (
        <TopicCard
          key={t.id}
          node={t}
          index={i + 1}
          siblings={topics}
          accent={accent}
          isAdmin={isAdmin}
          scope={scope}
        />
      ))}
    </div>
  );
}

/** Tarjeta de tema: portada grande, metadatos y navegación a su página propia. */
function TopicCard({
  node,
  index,
  siblings,
  accent,
  isAdmin,
  scope,
}: {
  node: CmsNode;
  index: number;
  siblings: CmsNode[];
  accent: string;
  isAdmin: boolean;
  scope: CmsScope;
}) {
  const deck = readDeck(node.metadata);
  const hasDeck = !!deck && deck.slides.length > 0;
  const hasText = !!node.metadata?.topic;
  const cover = topicCover(node);
  const items: string[] = Array.isArray(node.metadata?.items) ? node.metadata.items : [];
  const backSearch = useTopicLinkSearch();

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/40 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl">
      <Link
        to="/tema/$topicId"
        params={{ topicId: node.id }}
        search={backSearch}
        className="relative block h-40 w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}
      >
        {cover ? (
          <img
            src={cover}
            alt={node.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 120% at 20% 0%, ${accent} 0%, transparent 65%)`,
            }}
          />
        )}
        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <span className="absolute left-3 top-3 rounded-lg bg-black/45 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur">
          Tema {index}
        </span>
        {!node.is_published && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
            <EyeOff className="size-3" /> oculto
          </span>
        )}
        {!cover && (
          <span className="absolute inset-x-4 bottom-3 line-clamp-2 text-sm font-extrabold text-white">
            {node.title}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-extrabold leading-snug tracking-tight">{node.title}</h3>
        {node.description && (
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{node.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-widest">
          {hasDeck && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">
              <ImageIcon className="size-3" /> {deck!.slides.length} diapositivas
            </span>
          )}
          {hasText && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">
              <FileText className="size-3" /> contenido
            </span>
          )}
          {items.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">
              {items.length} subtemas
            </span>
          )}
          {!hasDeck && !hasText && (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2 py-0.5 text-muted-foreground">
              en preparación
            </span>
          )}
        </div>
        <div className="mt-auto pt-3">
          {isAdmin && (
            <div className="mb-2">
              <NodeToolbar node={node} siblings={siblings} scope={scope} accent={accent} />
            </div>
          )}
          <Link
            to="/tema/$topicId"
            params={{ topicId: node.id }}
            search={backSearch}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold text-white shadow-sm transition hover:opacity-90"
            style={{ background: accent }}
          >
            <Play className="size-3" /> Abrir tema
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}


/** Categoría o subcategoría: agrupa subcategorías y temas. */
function BranchCard({
  node,
  siblings,
  accent,
  isAdmin,
  scope,
  forceOpen,
  onOpenPharma,
  depth = 0,
}: {
  node: CmsNode;
  siblings: CmsNode[];
  accent: string;
  isAdmin: boolean;
  scope: CmsScope;
  forceOpen: boolean;
  onOpenPharma: () => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;
  const kids = childrenOf(node, isAdmin);
  const topics = kids.filter((k) => k.kind === "chapter" || k.kind === "lesson");
  const branches = kids.filter((k) => k.kind === "area" || k.kind === "subarea");

  return (
    <div
      className={`rounded-2xl border border-border/50 bg-background/40 backdrop-blur overflow-hidden ${
        depth > 0 ? "ml-3" : ""
      }`}
    >
      <div className="flex items-center">
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left hover:bg-background/60 transition"
        >
          <span
            className="inline-flex size-8 items-center justify-center rounded-lg text-[11px] font-extrabold text-white shrink-0"
            style={{ background: accent }}
          >
            <ListChecks className="size-4" strokeWidth={2.5} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm md:text-base font-bold tracking-tight truncate">
              {node.title}
            </span>
            {node.description && (
              <span className="block text-[11px] text-muted-foreground truncate">
                {node.description}
              </span>
            )}
          </span>
          {!node.is_published && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <EyeOff className="size-3" /> oculto
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {countTopics(node)} temas
          </span>
          <ChevronRight
            className={`size-4 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
        {slugify(node.title).includes("farmacolog") && (
          <button
            onClick={onOpenPharma}
            className="mr-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] font-bold hover:border-primary/40"
          >
            <Calculator className="size-3.5" style={{ color: accent }} />
            Abrir calculadora
          </button>
        )}
      </div>

      {isAdmin && isOpen && (
        <div className="border-t border-border/40 bg-background/30 px-4 py-2">
          <NodeToolbar node={node} siblings={siblings} scope={scope} accent={accent} />
        </div>
      )}

      {isOpen && (
        <div className="border-t border-border/40">
          {branches.length > 0 && (
            <div className="space-y-2 p-3">
              {branches.map((b) => (
                <BranchCard
                  key={b.id}
                  node={b}
                  siblings={branches}
                  accent={accent}
                  isAdmin={isAdmin}
                  scope={scope}
                  forceOpen={forceOpen}
                  onOpenPharma={onOpenPharma}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
          <ul className="divide-y divide-border/40">
            {topics.map((topic) => (
              <TopicRow key={topic.id} node={topic} accent={accent} />
            ))}
            {isAdmin && (
              <li className="bg-background/30 px-4 py-2.5">
                <AddChildForm
                  parent={node}
                  siblings={node.children.length}
                  scope={scope}
                  accent={accent}
                />
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function TopicRow({ node, accent }: { node: CmsNode; accent: string }) {
  const items: string[] = Array.isArray(node.metadata?.items) ? node.metadata.items : [];
  const backSearch = useTopicLinkSearch();

  return (
    <li className="bg-background/20">
      <Link
        to="/tema/$topicId"
        params={{ topicId: node.id }}
        search={backSearch}
        className="w-full min-w-0 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background/40 transition"
      >
        <span className="size-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <span className="flex-1 min-w-0 truncate text-sm font-semibold">{node.title}</span>
        {!node.is_published && <EyeOff className="size-3.5 text-muted-foreground" />}
        {items.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {items.length} subtemas
          </span>
        )}
        <ChevronRight className="size-3.5 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** Barra de acciones admin de un nodo: renombrar, describir, ordenar, publicar, duplicar, eliminar. */
function NodeToolbar({
  node,
  siblings,
  scope,
  accent,
  onAfterDelete,
}: {
  node: CmsNode;
  siblings: CmsNode[];
  scope: CmsScope;
  accent: string;
  onAfterDelete?: () => void;
}) {
  const mut = useCmsMutations(scope);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description ?? "");

  const busy = mut.update.isPending || mut.move.isPending || mut.remove.isPending || mut.duplicate.isPending;

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
          placeholder="Título"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
          placeholder="Descripción (opcional)"
        />
        <button
          onClick={() =>
            mut.update.mutate(
              {
                id: node.id,
                patch: {
                  title: title.trim() || node.title,
                  description: description.trim() || null,
                },
              },
              {
                onSuccess: () => {
                  toast.success("Guardado");
                  setEditing(false);
                },
                onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
              },
            )
          }
          disabled={busy}
          className="rounded-lg bg-primary p-1.5 text-primary-foreground disabled:opacity-50"
          aria-label="Guardar"
        >
          {mut.update.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
        </button>
        <button
          onClick={() => {
            setTitle(node.title);
            setDescription(node.description ?? "");
            setEditing(false);
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-foreground/[0.05]"
          aria-label="Cancelar"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  const btn =
    "inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
        style={{ background: accent }}
      >
        {KIND_LABEL[node.kind]}
      </span>
      <button className={btn} onClick={() => setEditing(true)} disabled={busy}>
        <Pencil className="size-3" /> Editar
      </button>
      <button
        className={btn}
        disabled={busy}
        onClick={() => mut.move.mutate({ node, siblings, dir: -1 })}
      >
        <ChevronDown className="size-3 rotate-180" /> Subir
      </button>
      <button
        className={btn}
        disabled={busy}
        onClick={() => mut.move.mutate({ node, siblings, dir: 1 })}
      >
        <ChevronDown className="size-3" /> Bajar
      </button>
      <button
        className={btn}
        disabled={busy}
        onClick={() =>
          mut.update.mutate(
            { id: node.id, patch: { is_published: !node.is_published } },
            {
              onSuccess: () =>
                toast.success(node.is_published ? "Oculto para estudiantes" : "Publicado"),
              onError: (e: any) => toast.error(e?.message ?? "No se pudo cambiar"),
            },
          )
        }
      >
        {node.is_published ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        {node.is_published ? "Ocultar" : "Publicar"}
      </button>
      <button
        className={btn}
        disabled={busy}
        onClick={() =>
          mut.duplicate.mutate(
            { node, siblings: siblings.length },
            {
              onSuccess: () => toast.success("Duplicado"),
              onError: (e: any) => toast.error(e?.message ?? "No se pudo duplicar"),
            },
          )
        }
      >
        <Copy className="size-3" /> Duplicar
      </button>
      <button
        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-2 py-1 text-[10px] font-bold text-destructive hover:bg-destructive/10 disabled:opacity-40"
        disabled={busy}
        onClick={() => {
          if (!confirm(`¿Eliminar "${node.title}" y todo su contenido?`)) return;
          mut.remove.mutate(node.id, {
            onSuccess: () => {
              toast.success("Eliminado");
              onAfterDelete?.();
            },
            onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
          });
        }}
      >
        <Trash2 className="size-3" /> Eliminar
      </button>
    </div>
  );
}

/** Formulario para crear hijos (categoría / subcategoría / tema). */
function AddChildForm({
  parent,
  siblings,
  scope,
  accent,
}: {
  parent: CmsNode;
  siblings: number;
  scope: CmsScope;
  accent: string;
}) {
  const mut = useCmsMutations(scope);
  const options = childKindOptions(parent.kind);
  const [kind, setKind] = useState(options[0] ?? "chapter");
  const [title, setTitle] = useState("");

  if (options.length === 0) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        if (!clean) return;
        mut.create.mutate(
          {
            parentId: parent.id,
            kind,
            title: clean,
            siblings,
            metadata: kind === "chapter" ? { items: [], sections: [] } : {},
          },
          {
            onSuccess: () => {
              toast.success(`${KIND_LABEL[kind]} creada`);
              setTitle("");
            },
            onError: (err: any) => toast.error(err?.message ?? "No se pudo crear"),
          },
        );
      }}
      className="flex items-center gap-2"
    >
      {options.length > 1 && (
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-[11px] font-bold outline-none"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {KIND_LABEL[o]}
            </option>
          ))}
        </select>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`Nueva ${KIND_LABEL[kind].toLowerCase()} en "${parent.title}"…`}
        className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="submit"
        disabled={mut.create.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        style={{ background: accent }}
      >
        {mut.create.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Plus className="size-3.5" />
        )}
        Agregar
      </button>
    </form>
  );
}

function childKindOptions(kind: CmsNode["kind"]): CmsNode["kind"][] {
  if (kind === "course") return ["program"];
  if (kind === "program") return ["area"];
  if (kind === "area") return ["chapter", "subarea"];
  if (kind === "subarea") return ["chapter"];
  if (kind === "chapter") return ["lesson"];
  return [];
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2 min-w-[72px] text-center">
      <div
        className="text-lg font-extrabold tracking-tight leading-none"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
