/**
 * KOTAMED PROGRAM HEADER™ — cabecera universal reutilizable por TODOS los programas.
 * Estilo limpio, premium y minimalista (Apple / Linear / Notion).
 *
 * Personalizable desde el CMS (content_nodes.metadata.header):
 *   - image  → imagen principal opcional (derecha en desktop, debajo en móvil)
 *   - color  → paleta principal (preset o HEX personalizado)
 *
 * No crea diseños independientes por programa: un único componente + datos.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ImageIcon, Loader2, Palette, Settings2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgramHeaderConfig = {
  image?: string | null;
  color?: string | null;
};

/** Presets de color disponibles en el CMS. */
export const COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: "Turquesa", hex: "#12A5A8" },
  { label: "Azul", hex: "#2563EB" },
  { label: "Celeste", hex: "#0EA5E9" },
  { label: "Púrpura", hex: "#7C3AED" },
  { label: "Índigo", hex: "#4F46E5" },
  { label: "Esmeralda", hex: "#059669" },
  { label: "Ámbar", hex: "#D97706" },
  { label: "Rosa", hex: "#DB2777" },
  { label: "Grafito", hex: "#334155" },
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Paleta por defecto deducida del nombre/slug del programa (escalable, sin código por programa). */
export function defaultProgramColor(key: string): string {
  const k = key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/residentad|r1|r2|r3|apex/.test(k)) return "#7C3AED";
  if (/enam/.test(k)) return "#2563EB";
  if (/essalud/.test(k)) return "#0EA5E9";
  if (/pediatr|neonat|rotacion/.test(k)) return "#12A5A8";
  if (/emergenc|urgenc|trauma/.test(k)) return "#DB2777";
  if (/internad/.test(k)) return "#4F46E5";
  if (/basic|anatom|fisiolog|ciencia/.test(k)) return "#059669";
  // Determinista para programas nuevos creados desde el CMS
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) % COLOR_PRESETS.length;
  return COLOR_PRESETS[h]!.hex;
}

export function resolveHeaderColor(key: string, cfg?: ProgramHeaderConfig | null): string {
  const raw = (cfg?.color ?? "").trim();
  return HEX.test(raw) ? raw : defaultProgramColor(key);
}

export function ProgramHeader({
  slug,
  title,
  subtitle,
  tagline,
  description,
  audience,
  progressPct,
  stats,
  continueTo,
  programNodeId,
  metadata,
  isAdmin = false,
  eyebrow = "Programa académico",
}: {
  slug: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  audience?: string;
  progressPct: number;
  stats: { value: string; label: string }[];
  continueTo?: { to: string; params?: Record<string, string>; label: string };
  programNodeId?: string;
  metadata?: Record<string, unknown>;
  isAdmin?: boolean;
  eyebrow?: string;
}) {
  const cfg = (metadata?.["header"] ?? null) as ProgramHeaderConfig | null;
  const legacyCover =
    ((metadata?.["environment"] as { coverUrl?: string | null } | undefined)?.coverUrl ??
      (metadata?.["cover"] as string | undefined) ??
      null) || null;
  const image = (cfg?.image ?? legacyCover) || null;
  const color = resolveHeaderColor(`${slug} ${title}`, cfg);
  const [editing, setEditing] = useState(false);
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)));

  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-background/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_28px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur-xl animate-slide-up"
      style={{ ["--ph" as string]: color }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-[420px] rounded-full blur-3xl"
        style={{ background: `color-mix(in oklab, ${color} 18%, transparent)` }}
      />

      <div className="relative grid gap-8 p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}
            >
              {eyebrow}
            </span>
            {subtitle && (
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {subtitle}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight text-balance md:text-[2.6rem]">
            {title}
          </h1>
          {tagline && (
            <p className="mt-3 max-w-2xl text-[15px] font-semibold leading-relaxed text-foreground/80 text-pretty">
              {tagline}
            </p>
          )}
          {description && (
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {continueTo && (
              <Link
                to={continueTo.to}
                params={continueTo.params as never}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[12.5px] font-bold text-white transition hover:brightness-105"
                style={{ background: color }}
              >
                {continueTo.label}
                <ArrowRight className="size-4" />
              </Link>
            )}
            {audience && (
              <span className="rounded-2xl border border-border/60 px-3 py-2 text-[11.5px] font-semibold text-muted-foreground">
                {audience}
              </span>
            )}
            {isAdmin && programNodeId && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 px-3 py-2 text-[11.5px] font-bold transition hover:bg-background"
              >
                {editing ? <X className="size-3.5" /> : <Settings2 className="size-3.5" />}
                {editing ? "Cerrar" : "Personalizar"}
              </button>
            )}
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <div className="text-xl font-black tabular-nums tracking-tight">{s.value}</div>
                <div className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
            <div className="min-w-0">
              <div className="text-xl font-black tabular-nums tracking-tight" style={{ color }}>
                {pct}%
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Progreso
              </div>
            </div>
          </div>

          <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-foreground/[0.07]">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>

        {/* Imagen principal opcional: derecha en desktop, debajo en móvil, tamaño controlado */}
        {image && (
          <div className="order-last w-full md:w-[260px] lg:w-[320px]">
            <div
              className="relative overflow-hidden rounded-[1.75rem] border border-border/60"
              style={{ boxShadow: `0 30px 70px -50px color-mix(in oklab, ${color} 70%, transparent)` }}
            >
              <img
                src={image}
                alt={`Imagen del programa ${title}`}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: `linear-gradient(180deg, transparent 55%, color-mix(in oklab, ${color} 30%, transparent))` }}
              />
            </div>
          </div>
        )}
      </div>

      {editing && isAdmin && programNodeId && (
        <HeaderEditor
          programNodeId={programNodeId}
          metadata={metadata ?? {}}
          initial={{ image, color }}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function HeaderEditor({
  programNodeId,
  metadata,
  initial,
  onClose,
}: {
  programNodeId: string;
  metadata: Record<string, unknown>;
  initial: ProgramHeaderConfig;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [image, setImage] = useState(initial.image ?? "");
  const [color, setColor] = useState(initial.color ?? "");
  useEffect(() => {
    setImage(initial.image ?? "");
    setColor(initial.color ?? "");
  }, [initial.image, initial.color]);

  const save = useMutation({
    mutationFn: async () => {
      const next = {
        ...metadata,
        header: { image: image.trim() || null, color: color.trim() || null },
      };
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: next })
        .eq("id", programNodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-node"] });
      onClose();
    },
  });

  return (
    <div className="relative border-t border-border/60 bg-background/70 p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <ImageIcon className="size-3.5" /> Imagen principal (URL)
          </span>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://… (opcional)"
            className="mt-2 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Se muestra a la derecha del encabezado con tamaño controlado; en móvil pasa debajo.
          </span>
        </label>

        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Palette className="size-3.5" /> Paleta principal
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_PRESETS.map((p) => {
              const active = color.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  title={p.label}
                  onClick={() => setColor(p.hex)}
                  className="grid size-8 place-items-center rounded-full border border-border/60 transition hover:scale-105"
                  style={{ background: p.hex }}
                >
                  {active && <Check className="size-4 text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#HEX personalizado"
              className="w-40 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="color"
              value={HEX.test(color) ? color : "#12A5A8"}
              onChange={(e) => setColor(e.target.value)}
              className="size-9 cursor-pointer rounded-lg border border-border/60 bg-transparent"
              aria-label="Selector de color"
            />
            <button
              type="button"
              onClick={() => setColor("")}
              className="rounded-xl border border-border/60 px-3 py-2 text-[11px] font-bold transition hover:bg-background"
            >
              Automático
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[11.5px] font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Guardar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border/60 px-3.5 py-2 text-[11.5px] font-bold transition hover:bg-background"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
