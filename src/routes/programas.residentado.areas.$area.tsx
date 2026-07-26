import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  DEFAULT_ROUTE_STAGES,
  ENAM_AREAS,
  MODULE_SECTIONS,
  getEnamArea,
  type AreaLandingMeta,
  type EnamAreaMeta,
  type ModuleSectionId,
} from "@/lib/enam-modules";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";

export const Route = createFileRoute("/programas/residentado/areas/$area")({
  loader: ({ params }) => {
    const meta = getEnamArea(params.area);
    if (!meta) throw notFound();
    return { slug: params.area };
  },
  head: ({ loaderData }) => {
    const meta = loaderData ? getEnamArea(loaderData.slug) : null;
    if (!meta) {
      return {
        meta: [
          { title: "Módulo no encontrado · Kotaro Academy" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${meta.title} · Residentado · Kotaro Academy` },
        { name: "description", content: meta.description },
        { property: "og:title", content: `${meta.title} · Kotaro Academy` },
        { property: "og:description", content: meta.tagline },
      ],
    };
  },
  component: AreaModule,
});

type AreaRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  metadata: AreaLandingMeta | null;
};

type Subtema = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
};

function useAreaNode(areaSlug: string) {
  return useQuery({
    queryKey: ["enam-area-node", areaSlug],
    queryFn: async () => {
      const { data: parent, error: pe } = await supabase
        .from("content_nodes")
        .select("id")
        .eq("kind", "program")
        .eq("slug", "residentado")
        .maybeSingle();
      if (pe) throw pe;
      if (!parent) return null;
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,title,slug,description,metadata")
        .eq("parent_id", parent.id)
        .eq("kind", "area")
        .eq("slug", areaSlug)
        .maybeSingle();
      if (error) throw error;
      return data as AreaRow | null;
    },
  });
}

function useSubtemas(areaId: string | undefined) {
  return useQuery({
    queryKey: ["enam-area-subtemas", areaId],
    enabled: !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,title,slug,sort_order,is_published")
        .eq("parent_id", areaId!)
        .eq("kind", "subarea")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subtema[];
    },
  });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function AreaModule() {
  const { meta } = Route.useLoaderData() as { meta: EnamAreaMeta };
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: areaNode } = useAreaNode(meta.slug);
  const [section, setSection] = useState<ModuleSectionId>("presentacion");
  const Icon = meta.icon;

  const landing: AreaLandingMeta = (areaNode?.metadata ?? {}) as AreaLandingMeta;
  const routeStages = landing.routeStages ?? DEFAULT_ROUTE_STAGES;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full blur-[120px] animate-aurora"
        style={{ background: `color-mix(in oklab, ${meta.accent} 22%, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[5%] -right-[5%] w-[40%] h-[55%] rounded-full blur-[120px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.12 280) 14%, transparent)",
          animationDelay: "-5s",
        }}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
          <Link
            to="/programas/residentado/areas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3.5" /> Áreas
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="inline-flex size-6 items-center justify-center rounded-md border border-border/50"
              style={{ color: meta.accent }}
            >
              <Icon className="size-3.5" strokeWidth={2.4} />
            </span>
            <span className="font-semibold text-foreground truncate">{meta.title}</span>
            <span className="hidden md:inline text-muted-foreground/60">·</span>
            <span className="hidden md:inline text-muted-foreground truncate">
              {MODULE_SECTIONS.find((s) => s.id === section)?.label}
            </span>
          </div>
          {isAdmin && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border border-primary/30 bg-primary/10 text-primary">
              <Shield className="size-3" /> Admin
            </span>
          )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 relative grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
          <nav className="glass rounded-2xl p-2 sticky top-20">
            {MODULE_SECTIONS.map((s) => {
              const SIcon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition ${
                    active
                      ? "bg-foreground/5 text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                  }`}
                >
                  <SIcon
                    className="size-4 shrink-0"
                    strokeWidth={2.25}
                    style={active ? { color: meta.accent } : undefined}
                  />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9 xl:col-span-10 space-y-6">
          {section === "presentacion" && (
            <PresentacionSection
              meta={meta}
              areaNode={areaNode ?? null}
              landing={landing}
              isAdmin={!!isAdmin}
              onOpenRoute={() => setSection("ruta")}
              onOpenContent={() => setSection("contenido")}
            />
          )}
          {section === "ruta" && (
            <RutaSection
              meta={meta}
              areaNode={areaNode ?? null}
              stages={routeStages}
              isAdmin={!!isAdmin}
            />
          )}
          {section === "contenido" && (
            <ContenidoSection meta={meta} areaNode={areaNode ?? null} isAdmin={!!isAdmin} />
          )}
          {section !== "presentacion" &&
            section !== "ruta" &&
            section !== "contenido" && <PlaceholderSection sectionId={section} meta={meta} />}
        </main>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Presentación (landing)                                             */
/* ================================================================== */

function PresentacionSection({
  meta,
  areaNode,
  landing,
  isAdmin,
  onOpenRoute,
  onOpenContent,
}: {
  meta: EnamAreaMeta;
  areaNode: AreaRow | null;
  landing: AreaLandingMeta;
  isAdmin: boolean;
  onOpenRoute: () => void;
  onOpenContent: () => void;
}) {
  const Icon = meta.icon;
  const [editing, setEditing] = useState(false);
  const stats = [
    { label: "Módulos", value: landing.objectives?.length ?? "—" },
    { label: "Horas", value: landing.totalHours ?? "—" },
    { label: "Nivel", value: landing.level ?? "Todos" },
    { label: "Actualización", value: landing.updatedLabel ?? "—" },
  ];

  return (
    <>
      <section
        className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden animate-slide-up"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 opacity-70 bg-gradient-to-br ${meta.gradient}`}
        />
        <div className="relative">
          <div className="flex items-start gap-4">
            <div
              className="inline-flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-background/60 backdrop-blur"
              style={{ color: meta.accent }}
            >
              <Icon className="size-6" strokeWidth={2.25} />
            </div>
            <div className="flex-1">
              <span
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                style={{
                  color: meta.accent,
                  borderColor: `color-mix(in oklab, ${meta.accent} 40%, transparent)`,
                  background: `color-mix(in oklab, ${meta.accent} 10%, transparent)`,
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: meta.accent }}
                />
                Módulo académico
              </span>
              <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
                {areaNode?.title ?? meta.title}
              </h1>
              <p className="mt-3 text-lg text-foreground/85 font-medium">{meta.tagline}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
                {areaNode?.description ?? meta.description}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border/60 hover:bg-foreground/5"
              >
                <Pencil className="size-3.5" /> Editar
              </button>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border/50 bg-background/60 backdrop-blur p-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-1 text-lg font-extrabold tracking-tight">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={onOpenContent}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
              style={{ background: meta.accent }}
            >
              Comenzar ahora <ArrowRight className="size-4" />
            </button>
            <button
              onClick={onOpenRoute}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border/60 hover:bg-foreground/5"
            >
              Ver ruta académica
            </button>
          </div>
        </div>
      </section>

      {(landing.objectives?.length || isAdmin) && (
        <ObjectivesCard
          meta={meta}
          areaNode={areaNode}
          objectives={landing.objectives ?? []}
          isAdmin={isAdmin}
          landing={landing}
        />
      )}

      {editing && areaNode && (
        <LandingEditorModal
          area={areaNode}
          onClose={() => setEditing(false)}
        />
      )}
      {editing && !areaNode && (
        <MissingNodeToast onClose={() => setEditing(false)} />
      )}
    </>
  );
}

function ObjectivesCard({
  meta,
  areaNode,
  objectives,
  isAdmin,
  landing,
}: {
  meta: EnamAreaMeta;
  areaNode: AreaRow | null;
  objectives: string[];
  isAdmin: boolean;
  landing: AreaLandingMeta;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<string[]>(objectives);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async (next: string[]) => {
      if (!areaNode) throw new Error("Sin nodo");
      const md: AreaLandingMeta = { ...landing, objectives: next };
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: md as never })
        .eq("id", areaNode.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["enam-area-node"] });
    },
  });

  return (
    <section className="glass rounded-3xl p-7 animate-slide-up">
      <div className="flex items-center gap-2">
        <CheckCircle2
          className="size-4"
          strokeWidth={2.25}
          style={{ color: meta.accent }}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Competencias · Objetivos
        </span>
      </div>
      <h2 className="mt-2 text-xl font-extrabold tracking-tight">
        Lo que el estudiante dominará
      </h2>

      <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((o, idx) => (
          <li
            key={`${idx}-${o}`}
            className="flex items-start gap-2 text-sm text-foreground/85 rounded-xl border border-border/40 bg-background/40 backdrop-blur p-3"
          >
            <CheckCircle2
              className="size-4 mt-0.5 shrink-0"
              strokeWidth={2}
              style={{ color: meta.accent }}
            />
            <span className="flex-1">{o}</span>
            {isAdmin && (
              <button
                onClick={() => {
                  const next = items.filter((_, i) => i !== idx);
                  setItems(next);
                  setDirty(true);
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Eliminar objetivo"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && !isAdmin && (
          <li className="text-sm text-muted-foreground italic">
            Aún no se han definido objetivos.
          </li>
        )}
      </ul>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                setItems([...items, draft.trim()]);
                setDraft("");
                setDirty(true);
              }
            }}
            placeholder="Nuevo objetivo…"
            className="flex-1 min-w-[220px] rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => {
              if (!draft.trim()) return;
              setItems([...items, draft.trim()]);
              setDraft("");
              setDirty(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border/60 hover:bg-foreground/5"
          >
            <Plus className="size-3.5" /> Añadir
          </button>
          {dirty && (
            <button
              onClick={() => save.mutate(items)}
              disabled={save.isPending || !areaNode}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: meta.accent }}
            >
              {save.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Guardar
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function LandingEditorModal({
  area,
  onClose,
}: {
  area: AreaRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const md = (area.metadata ?? {}) as AreaLandingMeta;
  const [title, setTitle] = useState(area.title);
  const [description, setDescription] = useState(area.description ?? "");
  const [level, setLevel] = useState(md.level ?? "");
  const [totalHours, setTotalHours] = useState<string>(
    md.totalHours != null ? String(md.totalHours) : "",
  );
  const [professor, setProfessor] = useState(md.professor ?? "");
  const [updatedLabel, setUpdatedLabel] = useState(md.updatedLabel ?? "");
  const [coverUrl, setCoverUrl] = useState(md.coverUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(md.videoUrl ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const nextMeta: AreaLandingMeta = {
        ...md,
        level: level || undefined,
        totalHours: totalHours ? Number(totalHours) : undefined,
        professor: professor || undefined,
        updatedLabel: updatedLabel || undefined,
        coverUrl: coverUrl || undefined,
        videoUrl: videoUrl || undefined,
      };
      const { error } = await supabase
        .from("content_nodes")
        .update({
          title: title.trim() || area.title,
          description: description.trim() || null,
          metadata: nextMeta as never,
        })
        .eq("id", area.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enam-area-node"] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl glass rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold tracking-tight">Editar landing del módulo</h3>
          <button
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full hover:bg-foreground/5"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Nivel">
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="ej. Intermedio"
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Horas totales">
            <input
              inputMode="numeric"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Profesor / Autor">
            <input
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Etiqueta de actualización">
            <input
              value={updatedLabel}
              onChange={(e) => setUpdatedLabel(e.target.value)}
              placeholder="ej. Nov 2026"
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Portada (URL)">
            <input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Video de presentación (URL)" full>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="Descripción" full>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm font-semibold border border-border/60 hover:bg-foreground/5"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={full ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function MissingNodeToast({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl p-6 max-w-sm text-center"
      >
        <p className="text-sm text-foreground/80">
          Este módulo aún no está registrado en la base. Créalo desde{" "}
          <span className="font-semibold">/admin/contenido</span>.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Ruta Académica                                                     */
/* ================================================================== */

function RutaSection({
  meta,
  areaNode,
  stages,
  isAdmin,
}: {
  meta: EnamAreaMeta;
  areaNode: AreaRow | null;
  stages: string[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<string[]>(stages);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      if (!areaNode) throw new Error("Sin nodo");
      const md = (areaNode.metadata ?? {}) as AreaLandingMeta;
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: { ...md, routeStages: items } as never })
        .eq("id", areaNode.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["enam-area-node"] });
    },
  });

  return (
    <section className="glass rounded-3xl p-7 animate-slide-up">
      <div className="flex items-center gap-2">
        <Sparkles
          className="size-4"
          strokeWidth={2.25}
          style={{ color: meta.accent }}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Roadmap
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Ruta académica</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada etapa desbloquea la siguiente. Solo el admin puede reordenarla.
      </p>

      <ol className="mt-6 space-y-2">
        {items.map((stage, idx) => (
          <li
            key={`${idx}-${stage}`}
            className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/40 backdrop-blur p-3"
          >
            <span
              className="inline-flex size-8 items-center justify-center rounded-full text-xs font-extrabold text-white"
              style={{ background: meta.accent }}
            >
              {idx + 1}
            </span>
            <span className="flex-1 text-sm font-semibold">{stage}</span>
            {isAdmin ? (
              <div className="flex items-center gap-1">
                <button
                  disabled={idx === 0}
                  onClick={() => {
                    const next = [...items];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    setItems(next);
                    setDirty(true);
                  }}
                  className="text-xs px-2 py-1 rounded border border-border/50 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  disabled={idx === items.length - 1}
                  onClick={() => {
                    const next = [...items];
                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                    setItems(next);
                    setDirty(true);
                  }}
                  className="text-xs px-2 py-1 rounded border border-border/50 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    setItems(items.filter((_, i) => i !== idx));
                    setDirty(true);
                  }}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <ChevronRight className="size-4 text-muted-foreground/60" />
            )}
          </li>
        ))}
      </ol>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nueva etapa…"
            className="flex-1 min-w-[220px] rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => {
              if (!draft.trim()) return;
              setItems([...items, draft.trim()]);
              setDraft("");
              setDirty(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border/60 hover:bg-foreground/5"
          >
            <Plus className="size-3.5" /> Añadir
          </button>
          {dirty && (
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !areaNode}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: meta.accent }}
            >
              {save.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Guardar
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ================================================================== */
/*  Contenido — subtemas (subareas)                                    */
/* ================================================================== */

function ContenidoSection({
  meta,
  areaNode,
  isAdmin,
}: {
  meta: EnamAreaMeta;
  areaNode: AreaRow | null;
  isAdmin: boolean;
}) {
  const { data: subtemas = [] } = useSubtemas(areaNode?.id);
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["enam-area-subtemas", areaNode?.id] });

  const create = useMutation({
    mutationFn: async (title: string) => {
      if (!areaNode) throw new Error("Sin nodo");
      const next = (subtemas[subtemas.length - 1]?.sort_order ?? 0) + 10;
      const { error } = await supabase.from("content_nodes").insert({
        parent_id: areaNode.id,
        kind: "subarea",
        title,
        slug: slugify(title) || `sub-${Date.now()}`,
        sort_order: next,
        is_published: true,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ title: input.title, slug: slugify(input.title) } as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (input: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ sort_order: input.sort_order } as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const move = (idx: number, dir: -1 | 1) => {
    const swap = subtemas[idx + dir];
    const cur = subtemas[idx];
    if (!swap || !cur) return;
    reorder.mutate({ id: cur.id, sort_order: swap.sort_order });
    reorder.mutate({ id: swap.id, sort_order: cur.sort_order });
  };

  return (
    <section className="glass rounded-3xl p-7 animate-slide-up">
      <div className="flex items-center gap-2">
        <GraduationCap
          className="size-4"
          strokeWidth={2.25}
          style={{ color: meta.accent }}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Temas del módulo
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
        Contenido de {meta.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isAdmin
          ? "Añade, renombra o reordena los temas del módulo. Cada tema podrá contener clases, casos, preguntas y recursos."
          : "Explora los temas disponibles."}
      </p>

      {!areaNode && (
        <div className="mt-6 rounded-2xl border border-border/50 bg-background/40 p-6 text-center text-sm text-muted-foreground">
          Este módulo aún no está sembrado en la base.
        </div>
      )}

      {areaNode && (
        <ul className="mt-6 space-y-2">
          {subtemas.map((s, idx) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/40 backdrop-blur p-3"
            >
              <span
                className="inline-flex size-8 items-center justify-center rounded-full text-xs font-extrabold text-white"
                style={{ background: meta.accent }}
              >
                {idx + 1}
              </span>
              {editingId === s.id ? (
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editingTitle.trim()) {
                      update.mutate({ id: s.id, title: editingTitle.trim() });
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="flex-1 rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <span className="flex-1 text-sm font-semibold">{s.title}</span>
              )}
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                    className="text-xs px-2 py-1 rounded border border-border/50 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    disabled={idx === subtemas.length - 1}
                    onClick={() => move(idx, 1)}
                    className="text-xs px-2 py-1 rounded border border-border/50 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  {editingId === s.id ? (
                    <button
                      onClick={() =>
                        update.mutate({ id: s.id, title: editingTitle.trim() })
                      }
                      className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
                    >
                      <Save className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(s.id);
                        setEditingTitle(s.title);
                      }}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar "${s.title}"?`)) remove.mutate(s.id);
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
          {subtemas.length === 0 && (
            <li className="text-sm text-muted-foreground italic px-3 py-6 text-center">
              Sin temas todavía.
            </li>
          )}
        </ul>
      )}

      {isAdmin && areaNode && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) create.mutate(draft.trim());
            }}
            placeholder="Nuevo tema (ej. Hipertensión arterial)…"
            className="flex-1 min-w-[220px] rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => draft.trim() && create.mutate(draft.trim())}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: meta.accent }}
          >
            {create.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Añadir tema
          </button>
        </div>
      )}
    </section>
  );
}

/* ================================================================== */
/*  Placeholder for pending sections                                   */
/* ================================================================== */

function PlaceholderSection({
  sectionId,
  meta,
}: {
  sectionId: ModuleSectionId;
  meta: EnamAreaMeta;
}) {
  const s = MODULE_SECTIONS.find((x) => x.id === sectionId);
  if (!s) return null;
  const Icon = s.icon;
  return (
    <section className="glass rounded-3xl p-10 md:p-14 text-center animate-slide-up">
      <div
        className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-background/60"
        style={{ color: meta.accent }}
      >
        <Icon className="size-6" strokeWidth={2.25} />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{s.label}</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {s.hint}. Esta sección se activa en el próximo entregable del módulo{" "}
        <span className="font-semibold text-foreground">{meta.title}</span>.
      </p>
      <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-border/50 text-muted-foreground">
        <Lock className="size-3" /> En construcción
        <Clock className="size-3 ml-1" />
      </div>
    </section>
  );
}
