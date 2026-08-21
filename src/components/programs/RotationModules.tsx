/**
 * Ecosistema académico premium de "Rotación Pediatría – HNSEB".
 * Solo se usa dentro de /programas/rotacion-pediatria-hnseb: reemplaza la
 * cuadrícula plana de módulos por tarjetas clínicas premium con gestión admin.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  Eye,
  EyeOff,
  FileQuestion,
  Layers,
  Loader2,
  MoreVertical,
  Save,
  Settings2,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type RotationArea = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
  description?: string | null;
};

const PALETTES = [
  { accent: "oklch(0.62 0.11 205)", soft: "oklch(0.96 0.02 205)" },
  { accent: "oklch(0.55 0.19 300)", soft: "oklch(0.96 0.025 300)" },
  { accent: "oklch(0.6 0.13 165)", soft: "oklch(0.96 0.03 165)" },
  { accent: "oklch(0.62 0.15 35)", soft: "oklch(0.96 0.03 35)" },
];

const RESOURCE_ICONS = [BookOpen, Stethoscope, FileQuestion, Brain];

function defaultDescription(title: string) {
  const t = title.toLowerCase();
  if (/emergen/.test(t))
    return "Observación, estabilización, Shock Trauma, procedimientos y toma de decisiones clínicas.";
  if (/hospitaliza/.test(t))
    return "Seguimiento clínico, evolución, patologías, casos y aprendizaje durante la hospitalización.";
  return "Ruta académica, contenido, casos clínicos, banco de preguntas, flashcards y tutor IA.";
}

function resources(title: string) {
  const t = title.toLowerCase();
  if (/emergen/.test(t))
    return ["Capítulos", "Casos clínicos", "Simuladores", "Preguntas"];
  return ["Capítulos", "Casos clínicos", "Preguntas", "Flashcards"];
}

/** Progreso visual determinista y estable por módulo (sin datos aún). */
function pseudoProgress(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return 45 + (h % 45);
}

export function RotationModules({
  programSlug,
  areas,
  isAdmin,
}: {
  programSlug: string;
  areas: RotationArea[];
  isAdmin: boolean;
}) {
  const visible = useMemo(
    () => (isAdmin ? areas : areas.filter((a) => a.is_published !== false)),
    [areas, isAdmin],
  );

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
      {visible.map((area, i) => (
        <ModuleCard
          key={area.id || area.slug}
          area={area}
          index={i}
          total={visible.length}
          siblings={visible}
          programSlug={programSlug}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

function ModuleCard({
  area,
  index,
  total,
  siblings,
  programSlug,
  isAdmin,
}: {
  area: RotationArea;
  index: number;
  total: number;
  siblings: RotationArea[];
  programSlug: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(area.title);
  const [desc, setDesc] = useState(area.description ?? "");
  useEffect(() => {
    setTitle(area.title);
    setDesc(area.description ?? "");
  }, [area.title, area.description]);

  const palette = PALETTES[index % PALETTES.length]!;
  const progress = pseudoProgress(area.slug || area.title);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["program-areas"] });
    qc.invalidateQueries({ queryKey: ["program-modules-hub", programSlug] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ title: title.trim(), description: desc.trim() || null })
        .eq("id", area.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(false);
      invalidate();
    },
  });

  const togglePublish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("content_nodes")
        .update({ is_published: !(area.is_published !== false) })
        .eq("id", area.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (dir: -1 | 1) => {
      const other = siblings[index + dir];
      if (!other) return;
      const a = supabase
        .from("content_nodes")
        .update({ sort_order: other.sort_order })
        .eq("id", area.id);
      const b = supabase
        .from("content_nodes")
        .update({ sort_order: area.sort_order })
        .eq("id", other.id);
      const [r1, r2] = await Promise.all([a, b]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("content_nodes").delete().eq("id", area.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const hidden = area.is_published === false;

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border border-border/60 bg-background/80 p-6 md:p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_45px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_28px_60px_-30px_rgba(15,23,42,0.45)] ${
        hidden ? "opacity-60" : ""
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full blur-3xl opacity-70 transition duration-500 group-hover:opacity-100"
        style={{ background: palette.soft }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className="inline-flex h-9 min-w-11 items-center justify-center rounded-2xl px-3 text-[13px] font-black tabular-nums"
          style={{ background: `${palette.accent}14`, color: palette.accent }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              title="Gestión del módulo"
              className="grid size-8 place-items-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition hover:text-foreground"
            >
              {menu ? <X className="size-3.5" /> : <MoreVertical className="size-3.5" />}
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-1 shadow-xl backdrop-blur">
                <MenuItem
                  icon={<Settings2 className="size-3.5" />}
                  label="Editar información"
                  onClick={() => {
                    setEditing(true);
                    setMenu(false);
                  }}
                />
                <Link
                  to="/programas/$slug/areas/$area"
                  params={{ slug: programSlug, area: area.slug }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] font-semibold text-foreground/85 transition hover:bg-primary/[0.07]"
                >
                  <Layers className="size-3.5" /> Gestionar contenido
                </Link>
                <MenuItem
                  icon={<ArrowUp className="size-3.5" />}
                  label="Mover arriba"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => reorder.mutate(-1)}
                />
                <MenuItem
                  icon={<ArrowDown className="size-3.5" />}
                  label="Mover abajo"
                  disabled={index === total - 1 || reorder.isPending}
                  onClick={() => reorder.mutate(1)}
                />
                <MenuItem
                  icon={hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  label={hidden ? "Activar módulo" : "Desactivar módulo"}
                  onClick={() => togglePublish.mutate()}
                />
                <MenuItem
                  icon={<Trash2 className="size-3.5" />}
                  label="Eliminar módulo"
                  danger
                  onClick={() => {
                    if (confirm(`¿Eliminar "${area.title}" y su contenido?`)) remove.mutate();
                    setMenu(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="relative mt-5 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-lg font-extrabold tracking-tight outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción del módulo…"
            className="min-h-20 w-full resize-y rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!title.trim() || save.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-border/60 px-3 py-2 text-[11px] font-bold transition hover:bg-background"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative mt-5">
          <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-balance">
            {area.title}
          </h3>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground text-pretty">
            {area.description?.trim() || defaultDescription(area.title)}
          </p>
        </div>
      )}

      <div className="relative mt-6">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <span>{hidden ? "Módulo desactivado" : "Progreso"}</span>
          <span className="tabular-nums" style={{ color: palette.accent }}>
            {progress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${progress}%`, background: palette.accent }}
          />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {resources(area.title).map((r, i) => {
          const Icon = RESOURCE_ICONS[i % RESOURCE_ICONS.length]!;
          return (
            <div key={r} className="flex items-center gap-1.5 min-w-0">
              <Icon className="size-3.5 shrink-0" style={{ color: palette.accent }} strokeWidth={2.2} />
              <span className="truncate text-[11px] font-semibold text-foreground/75">{r}</span>
            </div>
          );
        })}
      </div>

      <Link
        to="/programas/$slug/areas/$area"
        params={{ slug: programSlug, area: area.slug }}
        className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12.5px] font-bold text-white transition hover:brightness-105"
        style={{ background: palette.accent }}
      >
        Explorar módulo
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11.5px] font-semibold transition disabled:opacity-40 ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/85 hover:bg-primary/[0.07]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
