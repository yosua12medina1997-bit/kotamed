/**
 * CMS Studio → módulo "Todos los programas".
 * Lista TODOS los programas (content_nodes.kind = 'program') y permite editarlos
 * al 100%: título, slug, descripción, subtítulo, lema, público objetivo, orden,
 * publicación, imágenes (núcleo visual, portada y banner) y el ambiente visual
 * (núcleo, acentos, luz, movimiento, atmósfera y decoraciones).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePicker } from "@/components/cms/ImagePicker";
import {
  CORE_IMAGES,
  CORE_LABELS,
  coreImage,
  resolveProgramEnvironment,
  type CoreKey,
  type ProgramEnvironment,
} from "@/lib/program-environments";

const input =
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary/60";
const label = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1";
const card = "rounded-2xl border border-border/60 bg-background p-3 space-y-3";

type ProgramRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  parent_id: string | null;
  metadata: Record<string, unknown>;
};

type Draft = {
  title: string;
  slug: string;
  description: string;
  subtitle: string;
  tagline: string;
  audience: string;
  sort_order: number;
  is_published: boolean;
  cover: string;
  banner: string;
  env: ProgramEnvironment;
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

function useAllPrograms() {
  return useQuery({
    queryKey: ["cms-all-programs"],
    queryFn: async () => {
      const rows: ProgramRow[] = [];
      const size = 1000;
      for (let from = 0; ; from += size) {
        const { data, error } = await supabase
          .from("content_nodes")
          .select("id,slug,title,description,sort_order,is_published,parent_id,metadata")
          .eq("kind", "program")
          .order("sort_order", { ascending: true })
          .range(from, from + size - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as ProgramRow[]));
        if (!data || data.length < size) break;
      }
      return rows;
    },
  });
}

function toDraft(row: ProgramRow): Draft {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const env = resolveProgramEnvironment(
    row.slug,
    row.title,
    (meta.environment ?? null) as Partial<ProgramEnvironment> | null,
  );
  return {
    title: row.title ?? "",
    slug: row.slug ?? "",
    description: row.description ?? "",
    subtitle: String(meta.subtitle ?? ""),
    tagline: String(meta.tagline ?? ""),
    audience: String(meta.audience ?? ""),
    sort_order: row.sort_order ?? 0,
    is_published: !!row.is_published,
    cover: String(meta.cover ?? ""),
    banner: String(meta.banner ?? ""),
    env,
  };
}

export function ProgramsStudio() {
  const qc = useQueryClient();
  const { data: programs, isLoading } = useAllPrograms();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = useMemo(() => {
    const rows = programs ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (p) => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term),
    );
  }, [programs, q]);

  const selected = (programs ?? []).find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && (programs?.length ?? 0) > 0) setSelectedId(programs![0]!.id);
  }, [programs, selectedId]);

  useEffect(() => {
    if (selected) setDraft(toDraft(selected));
  }, [selectedId, selected?.updated_at as never]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async () => {
      if (!selected || !draft) return;
      const meta = { ...((selected.metadata ?? {}) as Record<string, unknown>) };
      meta.subtitle = draft.subtitle || undefined;
      meta.tagline = draft.tagline || undefined;
      meta.audience = draft.audience || undefined;
      meta.cover = draft.cover || undefined;
      meta.banner = draft.banner || undefined;
      meta.environment = { ...draft.env };
      const { error } = await supabase
        .from("content_nodes")
        .update({
          title: draft.title.trim() || selected.title,
          slug: slugify(draft.slug) || selected.slug,
          description: draft.description || null,
          sort_order: Number(draft.sort_order) || 0,
          is_published: draft.is_published,
          metadata: meta as never,
        })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programa actualizado");
      qc.invalidateQueries({ queryKey: ["cms-all-programs"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-catalog"] });
    },
    onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
  });

  const create = useMutation({
    mutationFn: async () => {
      const base = "nuevo-programa";
      let slug = base;
      let i = 2;
      const taken = new Set((programs ?? []).map((p) => p.slug));
      while (taken.has(slug)) slug = `${base}-${i++}`;
      const { data, error } = await supabase
        .from("content_nodes")
        .insert({
          kind: "program",
          slug,
          title: "Nuevo programa",
          description: "",
          is_published: false,
          sort_order: (programs?.length ?? 0) + 1,
          metadata: {} as never,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async (id) => {
      await qc.invalidateQueries({ queryKey: ["cms-all-programs"] });
      setSelectedId(id);
      toast.success("Programa creado (borrador)");
    },
    onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["cms-all-programs"] });
      toast.success("Programa eliminado");
    },
    onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
  });

  const togglePublish = useMutation({
    mutationFn: async (row: ProgramRow) => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ is_published: !row.is_published })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-all-programs"] }),
    onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
  });

  const patch = (fn: (d: Draft) => void) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando todos los programas…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background p-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Todos los programas · edición total</h2>
          <p className="text-[11px] text-muted-foreground">
            {programs?.length ?? 0} programas detectados. Cada uno se edita al 100%: textos, orden,
            publicación, imágenes y ambiente visual de su página <code>/programas/&lt;slug&gt;</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted/50"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Nuevo
            programa
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            onClick={() => save.mutate()}
            disabled={!draft || save.isPending}
          >
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
          </button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* ------------------------- listado ------------------------- */}
        <aside className={card}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${input} pl-7`}
              placeholder="Buscar programa…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-[70vh] space-y-1 overflow-auto pr-1">
            {list.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 ${
                  p.id === selectedId ? "border-primary/60 bg-primary/5" : "border-border/50"
                }`}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(p.id)}>
                  <span className="block truncate text-xs font-bold">{p.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">/{p.slug}</span>
                </button>
                <button
                  title={p.is_published ? "Publicado" : "Borrador"}
                  onClick={() => togglePublish.mutate(p)}
                  className={p.is_published ? "text-emerald-500" : "text-muted-foreground"}
                >
                  {p.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
                <button
                  title="Eliminar"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`)) remove.mutate(p.id);
                  }}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {list.length === 0 && (
              <p className="p-3 text-[11px] text-muted-foreground">Sin resultados para “{q}”.</p>
            )}
          </div>
        </aside>

        {/* ------------------------- editor ------------------------- */}
        {!draft || !selected ? (
          <div className={card}>
            <p className="p-4 text-xs text-muted-foreground">Selecciona un programa para editarlo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={card}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <span className={label}>Título</span>
                  <input className={input} value={draft.title} onChange={(e) => patch((d) => void (d.title = e.target.value))} />
                </div>
                <div>
                  <span className={label}>Slug (ruta pública)</span>
                  <input className={input} value={draft.slug} onChange={(e) => patch((d) => void (d.slug = e.target.value))} />
                  <p className="mt-1 text-[10px] text-muted-foreground">/programas/{slugify(draft.slug)}</p>
                </div>
                <div>
                  <span className={label}>Subtítulo (etiqueta)</span>
                  <input className={input} value={draft.subtitle} onChange={(e) => patch((d) => void (d.subtitle = e.target.value))} />
                </div>
                <div>
                  <span className={label}>Lema / tagline</span>
                  <input className={input} value={draft.tagline} onChange={(e) => patch((d) => void (d.tagline = e.target.value))} />
                </div>
                <div className="md:col-span-2">
                  <span className={label}>Descripción</span>
                  <textarea
                    className={`${input} min-h-[90px]`}
                    value={draft.description}
                    onChange={(e) => patch((d) => void (d.description = e.target.value))}
                  />
                </div>
                <div>
                  <span className={label}>Dirigido a</span>
                  <input className={input} value={draft.audience} onChange={(e) => patch((d) => void (d.audience = e.target.value))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={label}>Orden</span>
                    <input
                      type="number"
                      className={input}
                      value={draft.sort_order}
                      onChange={(e) => patch((d) => void (d.sort_order = Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <span className={label}>Estado</span>
                    <select
                      className={input}
                      value={draft.is_published ? "1" : "0"}
                      onChange={(e) => patch((d) => void (d.is_published = e.target.value === "1"))}
                    >
                      <option value="1">Publicado</option>
                      <option value="0">Borrador</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------------- imágenes ---------------------- */}
            <div className={card}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Imágenes</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <ImagePicker
                    label="Núcleo visual (hero)"
                    value={draft.env.coverUrl ?? ""}
                    onChange={(url) => patch((d) => void (d.env.coverUrl = url))}
                    aiHint={`Imagen 3D holográfica premium para el programa ${draft.title}, fondo transparente, luz clínica cian`}
                  />
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-2">
                    <img src={coreImage(draft.env)} alt="Vista previa del núcleo" className="mx-auto h-32 object-contain" />
                  </div>
                  {draft.env.coverUrl && (
                    <button
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => patch((d) => void (d.env.coverUrl = ""))}
                    >
                      <RotateCcw className="size-3" /> Volver al núcleo por defecto
                    </button>
                  )}
                </div>
                <ImagePicker
                  label="Portada (tarjetas y hub)"
                  value={draft.cover}
                  onChange={(url) => patch((d) => void (d.cover = url))}
                  aiHint={`Portada editorial médica para ${draft.title}`}
                />
                <ImagePicker
                  label="Banner panorámico"
                  value={draft.banner}
                  onChange={(url) => patch((d) => void (d.banner = url))}
                  aiHint={`Banner panorámico cinematográfico para ${draft.title}`}
                />
              </div>
            </div>

            {/* ---------------------- ambiente ---------------------- */}
            <div className={card}>
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Sparkles className="size-3.5" /> Ambiente visual del programa
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <span className={label}>Núcleo visual</span>
                  <select
                    className={input}
                    value={draft.env.core}
                    onChange={(e) => patch((d) => void (d.env.core = e.target.value as CoreKey))}
                  >
                    {(Object.keys(CORE_IMAGES) as CoreKey[]).map((k) => (
                      <option key={k} value={k}>
                        {CORE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={label}>Atmósfera (frase)</span>
                  <input className={input} value={draft.env.mood} onChange={(e) => patch((d) => void (d.env.mood = e.target.value))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={label}>Acento 1 (r,g,b)</span>
                    <input className={input} value={draft.env.accent} onChange={(e) => patch((d) => void (d.env.accent = e.target.value))} />
                    <div className="mt-1 h-2 rounded-full" style={{ background: `rgb(${draft.env.accent})` }} />
                  </div>
                  <div>
                    <span className={label}>Acento 2 (r,g,b)</span>
                    <input className={input} value={draft.env.accent2} onChange={(e) => patch((d) => void (d.env.accent2 = e.target.value))} />
                    <div className="mt-1 h-2 rounded-full" style={{ background: `rgb(${draft.env.accent2})` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={label}>Luz ({draft.env.light.toFixed(2)})</span>
                    <input
                      type="range"
                      min={0.4}
                      max={1.4}
                      step={0.02}
                      value={draft.env.light}
                      onChange={(e) => patch((d) => void (d.env.light = Number(e.target.value)))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className={label}>Movimiento ({draft.env.motion.toFixed(2)})</span>
                    <input
                      type="range"
                      min={0}
                      max={1.4}
                      step={0.02}
                      value={draft.env.motion}
                      onChange={(e) => patch((d) => void (d.env.motion = Number(e.target.value)))}
                      className="w-full"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={draft.env.rings}
                    onChange={(e) => patch((d) => void (d.env.rings = e.target.checked))}
                  />
                  Anillos orbitales
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={draft.env.grid}
                    onChange={(e) => patch((d) => void (d.env.grid = e.target.checked))}
                  />
                  Retícula técnica de fondo
                </label>
              </div>

              <div
                className="relative overflow-hidden rounded-2xl border border-border/60 p-4"
                style={{
                  background: `radial-gradient(120% 90% at 80% 20%, rgba(${draft.env.accent},0.22), transparent 60%), radial-gradient(90% 80% at 10% 90%, rgba(${draft.env.accent2},0.18), transparent 60%)`,
                }}
              >
                <div className="flex items-center gap-4">
                  <img src={coreImage(draft.env)} alt="" className="h-28 object-contain" style={{ filter: `brightness(${draft.env.light})` }} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{draft.env.mood}</p>
                    <p className="truncate text-sm font-bold">{draft.title}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{draft.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href={`/programas/${slugify(draft.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Ver página pública →
                </a>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                >
                  {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
                  cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
