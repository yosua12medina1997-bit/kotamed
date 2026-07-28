/**
 * Vista de contenido exclusiva para el módulo Pediatría & Neonatología.
 * Muestra dos bloques (Neonatología / Pediatría) con categorías y temas.
 * Como admin: permite editar el título del tema, subir archivos, insertar
 * videos y enlaces, y publicar/ocultar recursos por tema.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Baby,
  BookMarked,
  ChevronRight,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  Pencil,
  Save,
  Search,
  Shield,
  Stethoscope,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
        <div className="flex items-center gap-3">
          <Stat label="Bloques" value="2" accent={meta.accent} />
          <Stat
            label="Categorías"
            value={PEDIATRIA_NEONATOLOGIA_BLUEPRINT.reduce((a, b) => a + b.categories.length, 0)}
            accent={meta.accent}
          />
          <Stat label="Temas" value={totalTopics} accent={meta.accent} />
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
              <button
                onClick={() => setOpenCat((prev) => (prev === cat.key ? null : cat.key))}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-background/60 transition"
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
  const [tab, setTab] = useState<"plantilla" | "recursos">(isAdmin ? "recursos" : "plantilla");
  const nodeQ = useTopicNode(block, category, topic, isAdmin);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(topic.title);
  const qc = useQueryClient();

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

  return (
    <div className="px-4 pb-4 pt-1">
      {isAdmin && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab("recursos")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
              tab === "recursos"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Editor de recursos
          </button>
          <button
            onClick={() => setTab("plantilla")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
              tab === "plantilla"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            Plantilla estándar
          </button>
          <div className="flex-1" />
          {editing ? (
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
          ) : (
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
          )}
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
    </div>
  );
}

/**
 * Asegura la ruta root → block → category → topic en `content_nodes` y
 * devuelve el nodo del tema. Solo se ejecuta si el usuario es admin.
 */
function useTopicNode(
  block: BlueprintBlock,
  category: BlueprintCategory,
  topic: BlueprintTopic,
  enabled: boolean,
) {
  const user = useSupabaseUser();
  return useQuery({
    queryKey: [
      "pednn-topic-node",
      block.key,
      category.key,
      slugify(topic.title),
    ],
    enabled: enabled && !!user?.id,
    queryFn: async () => {
      const uid = user!.id;
      const root = await ensureNode({
        parent_id: null,
        kind: "course",
        title: ROOT_TITLE,
        slug: ROOT_SLUG,
        userId: uid,
      });
      const blockNode = await ensureNode({
        parent_id: root.id,
        kind: "program",
        title: block.title,
        slug: block.key,
        userId: uid,
      });
      const catNode = await ensureNode({
        parent_id: blockNode.id,
        kind: "area",
        title: category.title,
        slug: category.key,
        userId: uid,
      });
      const topicNode = await ensureNode({
        parent_id: catNode.id,
        kind: "chapter",
        title: topic.title,
        slug: slugify(topic.title),
        userId: uid,
      });
      return topicNode;
    },
    staleTime: 60_000,
  });
}

async function ensureNode(input: {
  parent_id: string | null;
  kind: "course" | "program" | "area" | "subarea" | "chapter" | "lesson";
  title: string;
  slug: string;
  userId: string;
}) {
  // Look up by (parent_id, slug)
  let query = supabase
    .from("content_nodes")
    .select("id,parent_id,kind,title,slug,is_published")
    .eq("slug", input.slug)
    .limit(1);
  if (input.parent_id === null) query = query.is("parent_id", null);
  else query = query.eq("parent_id", input.parent_id);
  const { data: found, error: selErr } = await query;
  if (selErr) throw selErr;
  if (found && found.length > 0) return found[0];

  const { data: created, error: insErr } = await supabase
    .from("content_nodes")
    .insert({
      parent_id: input.parent_id,
      kind: input.kind,
      title: input.title,
      slug: input.slug,
      sort_order: 0,
      created_by: input.userId,
    })
    .select("id,parent_id,kind,title,slug,is_published")
    .single();
  if (insErr) throw insErr;
  return created!;
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

// silence unused import warning in strict setups
void useEffect;
