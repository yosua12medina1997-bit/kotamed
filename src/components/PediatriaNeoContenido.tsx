/**
 * Vista de contenido exclusiva para el módulo Pediatría & Neonatología.
 * Muestra dos bloques (Neonatología / Pediatría) con categorías y temas.
 * Como admin: permite editar el título del tema, subir archivos, insertar
 * videos y enlaces, y publicar/ocultar recursos por tema.
 */

import { useMemo, useState } from "react";
import {
  Baby,
  BookMarked,
  Calculator,
  ChevronRight,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  Pencil,
  Play,
  Save,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import {
  PEDIATRIA_NEONATOLOGIA_BLUEPRINT,
  TOPIC_STANDARD_FORMAT,
  type BlueprintBlock,
  type BlueprintCategory,
  type BlueprintTopic,
} from "@/lib/pediatria-neonatologia-blueprint";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { ResourcesPanelStandalone } from "@/components/ResourcesPanelStandalone";
import { TopicPresenter } from "@/components/topic/TopicPresenter";
import { TopicEditor } from "@/components/topic/TopicEditor";
import { PharmaWorkspace, type PharmaDrug } from "@/components/pharma/PharmaWorkspace";

import type { Topic } from "@/lib/topic-schema";

type BlockKey = BlueprintBlock["key"];

const ROOT_SLUG = "biblioteca-pediatria-neo";
const ROOT_TITLE = "Biblioteca · Pediatría & Neonatología";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export function PediatriaNeoContenido({ meta }: { meta: EnamAreaMeta }) {
  const [active, setActive] = useState<BlockKey>("neonatologia");
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [pharmaOpen, setPharmaOpen] = useState(false);

  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);

  const block = useMemo(
    () => PEDIATRIA_NEONATOLOGIA_BLUEPRINT.find((b) => b.key === active)!,
    [active],
  );
  const filtered = useMemo(() => filterBlock(block, query), [block, query]);
  const totalTopics = useMemo(
    () =>
      PEDIATRIA_NEONATOLOGIA_BLUEPRINT.reduce(
        (acc, b) => acc + b.categories.reduce((a, c) => a + c.topics.length, 0),
        0,
      ),
    [],
  );

  return (
    <section className="glass rounded-3xl p-6 md:p-8 animate-slide-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="size-4" strokeWidth={2.25} style={{ color: meta.accent }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Biblioteca clínica · plan maestro
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                <Shield className="size-3" /> Editor activo
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
            Contenido de {meta.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Dividido en dos bloques independientes. Cada tema se despliega con la misma
            estructura estándar (resumen, guías, casos, flashcards, banco de preguntas).
            {isAdmin && " Como admin, puedes editar cada tema, subir archivos e insertar videos."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <Stat label="Bloques" value="2" accent={meta.accent} />
            <Stat
              label="Categorías"
              value={PEDIATRIA_NEONATOLOGIA_BLUEPRINT.reduce((a, b) => a + b.categories.length, 0)}
              accent={meta.accent}
            />
            <Stat label="Temas" value={totalTopics} accent={meta.accent} />
          </div>
          <button
            onClick={() => setPharmaOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-bold hover:border-primary/40"
          >
            <Calculator className="size-3.5" style={{ color: meta.accent }} />
            Calculadora farmacológica
          </button>
        </div>

      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {PEDIATRIA_NEONATOLOGIA_BLUEPRINT.map((b) => {
          const isActive = active === b.key;
          const Icon = b.key === "neonatologia" ? Baby : Stethoscope;
          return (
            <button
              key={b.key}
              onClick={() => {
                setActive(b.key);
                setOpenCat(null);
                setOpenTopic(null);
              }}
              className={`group inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/50 bg-background/40 hover:border-border text-foreground"
              }`}
              style={isActive ? { background: b.accent } : undefined}
            >
              <Icon className="size-4" strokeWidth={2.25} />
              <span>{b.title}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/25 text-white" : "bg-foreground/5 text-muted-foreground"
                }`}
              >
                {b.categories.reduce((a, c) => a + c.topics.length, 0)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar en ${block.title}… (ej. sepsis, TORCH, RCP)`}
          className="w-full rounded-xl border border-border/60 bg-background/60 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{block.tagline}</p>

      <div className="mt-6 space-y-3">
        {filtered.categories.map((cat) => {
          const isOpen = openCat === cat.key || query.trim().length > 0;
          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-border/50 bg-background/40 backdrop-blur overflow-hidden"
            >
              <div className="flex items-center">
                <button
                  onClick={() => setOpenCat((prev) => (prev === cat.key ? null : cat.key))}
                  className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left hover:bg-background/60 transition"
                >
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-lg text-[11px] font-extrabold text-white shrink-0"
                    style={{ background: block.accent }}
                  >
                    <ListChecks className="size-4" strokeWidth={2.5} />
                  </span>
                  <span className="flex-1 text-sm md:text-base font-bold tracking-tight">
                    {cat.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {cat.topics.length} temas
                  </span>
                  <ChevronRight
                    className={`size-4 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>
                {cat.key === "farmacologia" && (
                  <button
                    onClick={() => setPharmaOpen(true)}
                    className="mr-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] font-bold hover:border-primary/40"
                  >
                    <Calculator className="size-3.5" style={{ color: block.accent }} />
                    Abrir calculadora
                  </button>
                )}
              </div>



              {isOpen && (
                <ul className="divide-y divide-border/40 border-t border-border/40">
                  {cat.topics.map((topic) => {
                    const topicKey = `${block.key}::${cat.key}::${topic.title}`;
                    const topicOpen = openTopic === topicKey;
                    return (
                      <li key={topicKey} className="bg-background/20">
                        <button
                          onClick={() =>
                            setOpenTopic((prev) => (prev === topicKey ? null : topicKey))
                          }
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background/40 transition"
                        >
                          <span
                            className="size-1.5 rounded-full shrink-0"
                            style={{ background: block.accent }}
                          />
                          <span className="flex-1 text-sm font-semibold">{topic.title}</span>
                          {topic.items && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {topic.items.length} subtemas
                            </span>
                          )}
                          <ChevronRight
                            className={`size-3.5 text-muted-foreground transition ${topicOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                        {topicOpen && (
                          <TopicDetail
                            block={block}
                            category={cat}
                            topic={topic}
                            accent={block.accent}
                            isAdmin={!!isAdmin}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {filtered.categories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
            Sin coincidencias para "{query}".
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-border/50 bg-background/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="size-4" strokeWidth={2.25} style={{ color: meta.accent }} />
          <span className="font-bold text-foreground">Formato estándar</span>
        </div>
        Cada tema seguirá siempre la misma secuencia — resumen ejecutivo, fisiopatología,
        algoritmo, tratamiento basado en guías (MINSA / AAP / ESPGHAN / WHO), caso clínico
        interactivo, flashcards y banco de preguntas.
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

function TopicDetail({
  block,
  category,
  topic,
  accent,
  isAdmin,
}: {
  block: BlueprintBlock;
  category: BlueprintCategory;
  topic: BlueprintTopic;
  accent: string;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"plantilla" | "recursos">(
    isAdmin ? "recursos" : "plantilla",
  );

  const nodeQ = useTopicNode(block, category, topic, { create: isAdmin });

  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(topic.title);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const qc = useQueryClient();

  const storedTopic: Topic | null = useMemo(() => {
    const md = nodeQ.data?.metadata as { topic?: Topic } | null | undefined;
    return md?.topic ?? null;
  }, [nodeQ.data]);

  const renameMut = useMutation({
    mutationFn: async (title: string) => {
      if (!nodeQ.data) throw new Error("Nodo aún no listo");
      const { error } = await supabase
        .from("content_nodes")
        .update({ title, slug: slugify(title) })
        .eq("id", nodeQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pednn-topic-node"] });
      setEditing(false);
    },
  });

  const saveTopicMut = useMutation({
    mutationFn: async (t: Topic) => {
      if (!nodeQ.data) throw new Error("Nodo aún no listo");
      const currentMd = (nodeQ.data.metadata ?? {}) as Record<string, unknown>;
      const nextMd = { ...currentMd, topic: t };
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: nextMd })
        .eq("id", nodeQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pednn-topic-node"] });
      toast.success("Tema guardado");
      setEditorOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  const openPresenter = () => {
    if (!storedTopic) {
      toast.info(
        isAdmin
          ? "Este tema aún no tiene contenido. Ábrelo con IA para generarlo."
          : "Este tema aún no tiene contenido publicado.",
      );
      return;
    }
    setPresenterOpen(true);
  };

  return (
    <div className="px-4 pb-4 pt-1">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={openPresenter}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm"
          style={{ background: accent }}
        >
          <Play className="size-3" /> Abrir tema
        </button>
        {isAdmin && (
          <button
            onClick={() => setEditorOpen(true)}
            disabled={!nodeQ.data}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            <Sparkles className="size-3" /> Editar con IA
          </button>
        )}
        {isAdmin && (
          <>
            <button
              onClick={() => setTab("recursos")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                tab === "recursos"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              Recursos
            </button>
            <button
              onClick={() => setTab("plantilla")}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                tab === "plantilla"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              Plantilla
            </button>
          </>
        )}



        <div className="flex-1" />
        {isAdmin && editing ? (
          <div className="flex items-center gap-1">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => renameMut.mutate(newTitle.trim() || topic.title)}
              disabled={renameMut.isPending}
              className="p-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
              title="Guardar título"
            >
              {renameMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
            </button>
            <button
              onClick={() => {
                setNewTitle(topic.title);
                setEditing(false);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/[0.05]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : isAdmin ? (
          <button
            onClick={() => {
              setNewTitle(nodeQ.data?.title ?? topic.title);
              setEditing(true);
            }}
            disabled={!nodeQ.data}
            title="Renombrar sección"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <Pencil className="size-3" /> Renombrar
          </button>
        ) : null}
      </div>

      {storedTopic && (
        <div className="mb-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">{storedTopic.slides.length}</span>{" "}
          diapositivas · última actualización{" "}
          {storedTopic.meta?.updatedAt
            ? new Date(storedTopic.meta.updatedAt).toLocaleDateString()
            : "—"}
        </div>
      )}

      {tab === "recursos" && isAdmin ? (


        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
          {nodeQ.isLoading || !nodeQ.data ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Preparando editor del tema…
            </div>
          ) : nodeQ.error ? (
            <div className="text-xs text-destructive font-semibold">
              {nodeQ.error instanceof Error ? nodeQ.error.message : "No se pudo abrir el editor."}
            </div>
          ) : (
            <ResourcesPanelStandalone
              nodeId={nodeQ.data.id}
              nodeTitle={nodeQ.data.title}
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {topic.items && topic.items.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="size-1.5 rounded-full" style={{ background: accent }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Subtemas
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5">
                {topic.items.map((it) => (
                  <li
                    key={it}
                    className="text-xs font-medium text-foreground/80 flex items-center gap-1.5"
                  >
                    <ChevronRight className="size-3 shrink-0" style={{ color: accent }} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-border/50 bg-background/50 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="size-3.5" strokeWidth={2.5} style={{ color: accent }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Plantilla del tema
              </span>
            </div>
            <ol className="space-y-1 text-xs text-foreground/80 leading-relaxed">
              {TOPIC_STANDARD_FORMAT.map((s, i) => (
                <li key={s} className="flex items-start gap-1.5">
                  <span
                    className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                    style={{ background: accent }}
                  >
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {presenterOpen && storedTopic && (
        <TopicPresenter
          topic={storedTopic}
          accent={accent}
          onClose={() => setPresenterOpen(false)}
        />
      )}
      {editorOpen && isAdmin && (
        <TopicEditor
          initialTopic={storedTopic}
          fallbackTitle={topic.title}
          accent={accent}
          nodeId={nodeQ.data?.id ?? null}
          nodeTitle={nodeQ.data?.title ?? topic.title}
          onClose={() => setEditorOpen(false)}
          onSave={(t) => saveTopicMut.mutateAsync(t)}
          saving={saveTopicMut.isPending}
        />
      )}

    </div>
  );
}

/**
 * Asegura la ruta root → block → category → topic en `content_nodes` y
 * devuelve el nodo del tema con su metadata.
 * - Admin (`create: true`): crea nodos faltantes.
 * - Estudiante (`create: false`): sólo lookup; devuelve null si falta algún nivel.
 */
function useTopicNode(
  block: BlueprintBlock,
  category: BlueprintCategory,
  topic: BlueprintTopic,
  opts: { create: boolean },
) {
  const user = useSupabaseUser();
  return useQuery({
    queryKey: [
      "pednn-topic-node",
      block.key,
      category.key,
      slugify(topic.title),
      opts.create,
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      const uid = user!.id;
      const step = async (
        parent_id: string | null,
        kind: "course" | "program" | "area" | "chapter",
        title: string,
        slug: string,
      ) => {
        const existing = await selectNode(parent_id, slug);
        if (existing) return existing;
        if (!opts.create) return null;
        return await insertNode({ parent_id, kind, title, slug, userId: uid });
      };
      const root = await step(null, "course", ROOT_TITLE, ROOT_SLUG);
      if (!root) return null;
      const blockNode = await step(root.id, "program", block.title, block.key);
      if (!blockNode) return null;
      const catNode = await step(blockNode.id, "area", category.title, category.key);
      if (!catNode) return null;
      const topicNode = await step(catNode.id, "chapter", topic.title, slugify(topic.title));
      return topicNode;
    },
    staleTime: 60_000,
  });
}

async function selectNode(parent_id: string | null, slug: string) {
  let query = supabase
    .from("content_nodes")
    .select("id,parent_id,kind,title,slug,is_published,metadata")
    .eq("slug", slug)
    .limit(1);
  if (parent_id === null) query = query.is("parent_id", null);
  else query = query.eq("parent_id", parent_id);
  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function insertNode(input: {
  parent_id: string | null;
  kind: "course" | "program" | "area" | "subarea" | "chapter" | "lesson";
  title: string;
  slug: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("content_nodes")
    .insert({
      parent_id: input.parent_id,
      kind: input.kind,
      title: input.title,
      slug: input.slug,
      sort_order: 0,
      created_by: input.userId,
    })
    .select("id,parent_id,kind,title,slug,is_published,metadata")
    .single();
  if (error) throw error;
  return data!;
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

function filterBlock(block: BlueprintBlock, q: string): BlueprintBlock {
  const query = q.trim().toLowerCase();
  if (!query) return block;
  const categories: BlueprintCategory[] = [];
  for (const cat of block.categories) {
    const catMatch = cat.title.toLowerCase().includes(query);
    const topics = cat.topics.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.items?.some((i) => i.toLowerCase().includes(query)),
    );
    if (catMatch || topics.length > 0) {
      categories.push({ ...cat, topics: catMatch ? cat.topics : topics });
    }
  }
  return { ...block, categories };
}
