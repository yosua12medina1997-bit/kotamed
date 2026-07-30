import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Layers,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Shield,
  Sparkles,
  Target,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  DownloadCloud,
} from "lucide-react";
import {
  ACCENT_CLASSES,
  CHAPTER_TEMPLATE,
  getProgram,
  PROGRAMS,
  type Program,
} from "@/lib/pediatria-programs";
import { ENAM_AREAS, type EnamAreaSlug } from "@/lib/enam-modules";

/** Match a free-text area title to an ENAM module slug (residentado only). */
function matchEnamSlug(title: string): EnamAreaSlug | null {
  const norm = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  for (const a of ENAM_AREAS) {
    const t = a.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (norm === t || norm.includes(t) || t.includes(norm)) return a.slug;
  }
  // heuristics by keyword
  if (/\bmedicina\s+interna\b/.test(norm)) return "medicina-interna";
  if (/\b(cirug|quirurg)/.test(norm)) return "ciencias-quirurgicas";
  if (/\b(gineco|obstetr)/.test(norm)) return "ginecologia-obstetricia";
  if (/\b(pediatr|neonat)/.test(norm)) return "pediatria-neonatologia";
  if (/\bsalud\s+publica\b|\bepidemiolog/.test(norm)) return "salud-publica";
  return null;
}
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";

export const Route = createFileRoute("/programas/$slug")({
  loader: ({ params }): { program: Program } => {
    const program = getProgram(params.slug);
    if (!program) throw notFound();
    return { program };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Programa no encontrado · Kotaro Academy" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { program } = loaderData;
    return {
      meta: [
        { title: `${program.title} · Kotaro Academy` },
        { name: "description", content: program.tagline },
        { property: "og:title", content: `${program.title} · Kotaro Academy` },
        { property: "og:description", content: program.description },
      ],
    };
  },
  component: ProgramDetail,
});

type AreaNode = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
};

type ProgramNodeMeta = {
  chapterFeatures?: string[];
  chapterTemplate?: string[];
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

function useProgramNode(slug: string) {
  return useQuery({
    queryKey: ["program-node", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,title,slug,description,metadata")
        .eq("kind", "program")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useAreas(programNodeId: string | undefined) {
  return useQuery({
    queryKey: ["program-areas", programNodeId],
    enabled: !!programNodeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,title,slug,sort_order,is_published")
        .eq("parent_id", programNodeId!)
        .eq("kind", "area")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AreaNode[];
    },
  });
}

function ProgramDetail() {
  const { program } = Route.useLoaderData() as { program: Program };
  const accent = ACCENT_CLASSES[program.accent];
  const others = PROGRAMS.filter((p) => p.id !== program.id);

  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: programNode } = useProgramNode(program.slug);
  const { data: dbAreas } = useAreas(programNode?.id);

  const meta = (programNode?.metadata ?? {}) as ProgramNodeMeta;
  const areas: string[] = dbAreas && dbAreas.length > 0
    ? dbAreas.map((a) => a.title)
    : program.areas;
  const liveTitle = programNode?.title || program.title;
  const liveDescription = programNode?.description || program.description;
  const chapterFeatures = meta.chapterFeatures ?? program.chapterFeatures;
  const chapterTemplate = meta.chapterTemplate ?? CHAPTER_TEMPLATE.map((c) => c.title);


  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] -right-[5%] w-[40%] h-[55%] rounded-full blur-[120px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.12 280) 16%, transparent)",
          animationDelay: "-5s",
        }}
      />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12 relative">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/programas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3.5" /> Programas
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${accent.chip}`}>
            {program.subtitle}
          </span>
          {isAdmin && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border border-primary/30 bg-primary/10 text-primary">
              <Shield className="size-3" /> Modo admin — edición activa
            </span>
          )}
        </div>

        <section className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden animate-slide-up">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${accent.chip}`}
            >
              <span className={`size-1.5 rounded-full ${accent.dot}`} />
              Programa académico
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">
              {liveTitle}
            </h1>
            <p className="mt-4 text-lg text-foreground/85 font-medium text-pretty">
              {program.tagline}
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed text-pretty">
              {liveDescription}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="size-3.5" />
              <span className="font-semibold">Dirigido a:</span>
              <span>{program.audience}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6 mt-8">
          <div className="col-span-12 xl:col-span-8 space-y-6">
            {program.objectives && (
              <section className="glass rounded-3xl p-7 animate-slide-up">
                <SectionHeader
                  icon={<ListChecks className="size-4" strokeWidth={2.25} />}
                  eyebrow="Objetivos"
                  title="El estudiante aprenderá a"
                />
                <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {program.objectives.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-sm text-foreground/85">
                      <CheckCircle2
                        className={`size-4 mt-0.5 shrink-0 ${accent.dot.replace("bg-", "text-")}`}
                        strokeWidth={2}
                      />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <AreasSection
              program={program}
              accent={accent}
              areas={areas}
              dbAreas={dbAreas ?? []}
              programNodeId={programNode?.id}
              isAdmin={!!isAdmin}
              fallback={program.areas}
            />

            {(chapterFeatures || isAdmin) && (
              <ChapterFeaturesSection
                accent={accent}
                features={chapterFeatures ?? []}
                programNodeId={programNode?.id}
                metadata={meta}
                isAdmin={!!isAdmin}
              />
            )}

            <ChapterTemplateSection
              template={chapterTemplate}
              programNodeId={programNode?.id}
              metadata={meta}
              isAdmin={!!isAdmin}
            />
          </div>

          <aside className="col-span-12 xl:col-span-4 space-y-6">
            <div className="glass rounded-3xl p-6 animate-slide-up" style={{ animationDelay: "80ms" }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-4 text-primary" strokeWidth={2.25} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Otros programas
                </span>
              </div>
              <div className="space-y-2">
                {others.map((p) => {
                  const a = ACCENT_CLASSES[p.accent];
                  return (
                    <Link
                      key={p.id}
                      to="/programas/$slug"
                      params={{ slug: p.slug }}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/70 transition"
                    >
                      <span className={`size-2 mt-1.5 rounded-full shrink-0 ${a.dot}`} />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {p.subtitle}
                        </span>
                        <span className="block text-xs font-bold leading-tight truncate">
                          {p.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-3xl p-6 animate-slide-up" style={{ animationDelay: "140ms" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Recorrido académico
              </span>
              <ol className="mt-4 space-y-3 relative">
                <div className="absolute left-[11px] top-1 bottom-1 w-px bg-black/[0.06]" />
                {PROGRAMS.map((p) => {
                  const active = p.id === program.id;
                  const a = ACCENT_CLASSES[p.accent];
                  return (
                    <li key={p.id} className="relative pl-8">
                      {active ? (
                        <div className={`absolute left-0 top-0.5 size-6 rounded-full ${a.dot} flex items-center justify-center ring-4 ring-background shadow-lg`}>
                          <span className="size-2 rounded-full bg-white" />
                        </div>
                      ) : (
                        <div className="absolute left-[5px] top-1.5 size-3 rounded-full bg-background border-2 border-black/10" />
                      )}
                      <span className={`block text-xs font-bold leading-tight ${active ? "text-foreground" : "text-muted-foreground"}`}>
                        {p.title.replace("Residencia de Pediatría — ", "")}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-tight">
                        {p.subtitle}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Areas (persisted in content_nodes as children of the program)
// ─────────────────────────────────────────────────────────────

function AreasSection({
  program,
  accent,
  areas,
  dbAreas,
  programNodeId,
  isAdmin,
  fallback,
}: {
  program: Program;
  accent: (typeof ACCENT_CLASSES)[Program["accent"]];
  areas: string[];
  dbAreas: AreaNode[];
  programNodeId: string | undefined;
  isAdmin: boolean;
  fallback: string[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const hasDb = dbAreas.length > 0;

  const seed = useMutation({
    mutationFn: async () => {
      if (!programNodeId) throw new Error("Programa no inicializado");
      const rows = fallback.map((title, i) => ({
        parent_id: programNodeId,
        kind: "area",
        title,
        slug: slugify(title) || `area-${i + 1}`,
        sort_order: (i + 1) * 10,
        is_published: true,
      }));
      const { error } = await supabase.from("content_nodes").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-areas", programNodeId] }),
  });

  const addArea = useMutation({
    mutationFn: async (title: string) => {
      if (!programNodeId) throw new Error("Programa no inicializado");
      const nextOrder = (dbAreas[dbAreas.length - 1]?.sort_order ?? 0) + 10;
      const { error } = await supabase.from("content_nodes").insert({
        parent_id: programNodeId,
        kind: "area",
        title,
        slug: slugify(title) || `area-${Date.now()}`,
        sort_order: nextOrder,
        is_published: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      qc.invalidateQueries({ queryKey: ["program-areas", programNodeId] });
    },
  });

  const updateArea = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ title, slug: slugify(title) || id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-areas", programNodeId] }),
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-areas", programNodeId] }),
  });

  const reorder = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase.from("content_nodes").update({ sort_order }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-areas", programNodeId] }),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const a = dbAreas[idx];
    const b = dbAreas[idx + dir];
    if (!a || !b) return;
    reorder.mutate({ id: a.id, sort_order: b.sort_order });
    reorder.mutate({ id: b.id, sort_order: a.sort_order });
  };

  return (
    <section className="glass rounded-3xl p-7 animate-slide-up" style={{ animationDelay: "60ms" }}>
      <div className="flex items-center justify-between gap-3">
        <SectionHeader
          icon={<Layers className="size-4" strokeWidth={2.25} />}
          eyebrow={program.id === "residentado" ? "Áreas académicas" : "Módulos y áreas"}
          title={program.id === "residentado" ? "Estructura del programa" : "Contenido del programa"}
          hint={`${areas.length} ${program.id === "residentado" ? "áreas" : "módulos"}`}
        />
        {isAdmin && programNodeId && (
          <div className="flex items-center gap-2">
            {!hasDb && (
              <button
                onClick={() => seed.mutate()}
                disabled={seed.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition"
              >
                {seed.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <DownloadCloud className="size-3.5" />}
                Sembrar plantilla
              </button>
            )}
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-white transition"
            >
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Cerrar" : "Editar"}
            </button>
          </div>
        )}
      </div>

      {!editing && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {areas.map((area, i) => {
            const enamSlug = program.id === "residentado" ? matchEnamSlug(area) : null;
            const inner = (
              <>
                <span className={`size-7 rounded-lg flex items-center justify-center text-[10px] font-bold tabular-nums ${accent.chip} border`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-semibold text-foreground/85 leading-tight flex-1">{area}</span>
                {enamSlug && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition">
                    Abrir →
                  </span>
                )}
              </>
            );
            const cls =
              "group flex items-center gap-3 rounded-xl border border-border bg-white/60 hover:bg-white/90 transition p-3";
            return enamSlug ? (
              <Link
                key={`${area}-${i}`}
                to="/programas/residentado/areas/$area"
                params={{ area: enamSlug }}
                className={cls + " hover:border-primary/40 hover:-translate-y-0.5"}
              >
                {inner}
              </Link>
            ) : (
              <div key={`${area}-${i}`} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {editing && isAdmin && (
        <div className="mt-5 space-y-2">
          {!hasDb && (
            <p className="text-[11px] text-muted-foreground italic">
              Aún no hay áreas persistidas. Pulsa "Sembrar plantilla" para importar las áreas por defecto y empezar a editar.
            </p>
          )}
          {dbAreas.map((a, i) => (
            <AreaEditRow
              key={a.id}
              area={a}
              index={i}
              total={dbAreas.length}
              accent={accent}
              onSave={(title) => updateArea.mutate({ id: a.id, title })}
              onDelete={() => {
                if (confirm(`¿Eliminar "${a.title}"? Esto borra también su contenido en cascada.`)) {
                  deleteArea.mutate(a.id);
                }
              }}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
          {hasDb && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim()) addArea.mutate(newTitle.trim());
              }}
              className="flex gap-2 pt-2"
            >
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nueva área…"
                className="flex-1 rounded-lg border border-border bg-white/70 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={!newTitle.trim() || addArea.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              >
                {addArea.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Añadir
              </button>
            </form>
          )}
        </div>
      )}

      {program.id === "residentado" && !editing && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] text-foreground/80 leading-relaxed max-w-xl">
            Cada área es un ecosistema independiente con ruta académica, contenido, casos, banco, flashcards, simuladores, biblioteca y tutor IA.
          </p>
          <Link
            to="/programas/residentado/areas"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Ver módulos ENAM <Sparkles className="size-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}

function AreaEditRow({
  area,
  index,
  total,
  accent,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  area: AreaNode;
  index: number;
  total: number;
  accent: (typeof ACCENT_CLASSES)[Program["accent"]];
  onSave: (title: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [title, setTitle] = useState(area.title);
  useEffect(() => setTitle(area.title), [area.title]);
  const dirty = title !== area.title;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-white/70 p-2">
      <span className={`size-7 rounded-lg flex items-center justify-center text-[10px] font-bold tabular-nums ${accent.chip} border shrink-0`}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 rounded-md bg-transparent px-2 py-1 text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center gap-1">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1.5 rounded-md hover:bg-black/[0.05] disabled:opacity-30"
          title="Subir"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1.5 rounded-md hover:bg-black/[0.05] disabled:opacity-30"
          title="Bajar"
        >
          <ArrowDown className="size-3.5" />
        </button>
        {dirty && (
          <button
            onClick={() => onSave(title.trim())}
            className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            title="Guardar"
          >
            <Save className="size-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chapter features & template (persisted in program.metadata)
// ─────────────────────────────────────────────────────────────

function useMetadataMutation(programNodeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (metadata: ProgramNodeMeta) => {
      if (!programNodeId) throw new Error("Programa no inicializado");
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: metadata as never })
        .eq("id", programNodeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-node"] }),
  });
}

function ChapterFeaturesSection({
  accent,
  features,
  programNodeId,
  metadata,
  isAdmin,
}: {
  accent: (typeof ACCENT_CLASSES)[Program["accent"]];
  features: string[];
  programNodeId: string | undefined;
  metadata: ProgramNodeMeta;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<string[]>(features);
  const [draft, setDraft] = useState("");
  const save = useMetadataMutation(programNodeId);

  useEffect(() => setList(features), [features.join("|")]);

  const commit = (next: string[]) => {
    setList(next);
    save.mutate({ ...metadata, chapterFeatures: next });
  };

  return (
    <section className="glass rounded-3xl p-7 animate-slide-up" style={{ animationDelay: "120ms" }}>
      <div className="flex items-center justify-between gap-3">
        <SectionHeader
          icon={<BookOpen className="size-4" strokeWidth={2.25} />}
          eyebrow="Cada tema incluirá"
          title="Recursos por capítulo"
        />
        {isAdmin && programNodeId && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-white transition"
          >
            {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? "Cerrar" : "Editar"}
          </button>
        )}
      </div>

      {!editing && list.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {list.map((f) => (
            <span key={f} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${accent.chip}`}>
              {f}
            </span>
          ))}
        </div>
      )}

      {editing && (
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {list.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${accent.chip}`}
              >
                {f}
                <button
                  onClick={() => commit(list.filter((_, j) => j !== i))}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim();
              if (v) {
                commit([...list, v]);
                setDraft("");
              }
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nuevo recurso (ej. Videoclase)…"
              className="flex-1 rounded-lg border border-border bg-white/70 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-3.5" /> Añadir
            </button>
          </form>
          {save.isPending && (
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Guardando…
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ChapterTemplateSection({
  template,
  programNodeId,
  metadata,
  isAdmin,
}: {
  template: string[];
  programNodeId: string | undefined;
  metadata: ProgramNodeMeta;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<string[]>(template);
  const [draft, setDraft] = useState("");
  const save = useMetadataMutation(programNodeId);

  useEffect(() => setList(template), [template.join("|")]);

  const commit = (next: string[]) => {
    setList(next);
    save.mutate({ ...metadata, chapterTemplate: next });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <section className="glass rounded-3xl p-7 animate-slide-up" style={{ animationDelay: "180ms" }}>
      <div className="flex items-center justify-between gap-3">
        <SectionHeader
          icon={<ClipboardList className="size-4" strokeWidth={2.25} />}
          eyebrow="Plantilla estándar"
          title="Estructura de cada capítulo"
          hint={`${list.length} bloques`}
        />
        {isAdmin && programNodeId && (
          <div className="flex items-center gap-2">
            {editing && (
              <button
                onClick={() => commit(CHAPTER_TEMPLATE.map((c) => c.title))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-white transition"
              >
                Restaurar plantilla
              </button>
            )}
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-white transition"
            >
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Cerrar" : "Editar"}
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        Independientemente del programa, todos los capítulos usan la misma plantilla para mantener una experiencia consistente.
      </p>

      {!editing && (
        <ol className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {list.map((s, i) => (
            <li key={`${s}-${i}`} className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-medium">{s}</span>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <div className="mt-5 space-y-1.5">
          {list.map((s, i) => (
            <TemplateEditRow
              key={`${s}-${i}`}
              index={i}
              total={list.length}
              value={s}
              onChange={(v) => {
                const next = [...list];
                next[i] = v;
                commit(next);
              }}
              onDelete={() => commit(list.filter((_, j) => j !== i))}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim();
              if (v) {
                commit([...list, v]);
                setDraft("");
              }
            }}
            className="flex gap-2 pt-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nuevo bloque (ej. Casos avanzados)…"
              className="flex-1 rounded-lg border border-border bg-white/70 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-3.5" /> Añadir bloque
            </button>
          </form>
          {save.isPending && (
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> Guardando…
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function TemplateEditRow({
  index,
  total,
  value,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const dirty = local !== value;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white/70 p-1.5">
      <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums w-6 pl-1">
        {String(index + 1).padStart(2, "0")}
      </span>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="flex-1 rounded bg-transparent px-2 py-1 text-[11px] font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center gap-0.5">
        <button onClick={onMoveUp} disabled={index === 0} className="p-1 rounded hover:bg-black/[0.05] disabled:opacity-30">
          <ArrowUp className="size-3" />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 rounded hover:bg-black/[0.05] disabled:opacity-30">
          <ArrowDown className="size-3" />
        </button>
        {dirty && (
          <button onClick={() => onChange(local.trim())} className="p-1 rounded bg-primary text-primary-foreground">
            <Save className="size-3" />
          </button>
        )}
        <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-destructive">
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  hint,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-lg bg-black/[0.04] flex items-center justify-center text-foreground">
          {icon}
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </span>
          <span className="text-sm font-bold tracking-tight">{title}</span>
        </div>
      </div>
      {hint && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
          {hint}
        </span>
      )}
    </div>
  );
}
