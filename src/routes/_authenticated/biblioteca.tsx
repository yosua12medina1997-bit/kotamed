/**
 * BIBLIOTECA UNIVERSAL — buscador global de recursos médicos con filtros por
 * categoría, tipo, especialidad, año y favoritos. Todo el contenido se
 * administra desde CMS Studio (módulo «Biblioteca Universal»).
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Filter,
  Grid3x3,
  Library,
  List,
  Loader2,
  Search,
  Star,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NexusShell } from "@/components/nexus/NexusShell";
import { useNexusEnv } from "@/lib/nexus-theme";
import {
  ROLE_LABELS,
  useIsAdmin,
  useMyProfile,
  useMyRoles,
  useSupabaseUser,
} from "@/lib/session";
import {
  useLibraryCategories,
  useLibraryFavorites,
  useLibraryResources,
  useToggleFavorite,
  type LibraryResource,
} from "@/lib/library";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca Universal · KotaMed" },
      {
        name: "description",
        content:
          "Buscador maestro de libros, guías, artículos, videos y protocolos médicos de KotaMed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BibliotecaPage,
});

const TYPE_ICON: Record<string, React.ElementType> = {
  libro: BookOpen,
  guia: FileText,
  articulo: FileText,
  video: Video,
  documento: FileText,
  protocolo: FileText,
};

function BibliotecaPage() {
  const user = useSupabaseUser();
  const env = useNexusEnv(user?.id);
  const profile = useMyProfile(user?.id);
  const roles = useMyRoles(user?.id);
  const isAdmin = useIsAdmin(user?.id).data ?? false;

  const cats = useLibraryCategories();
  const res = useLibraryResources();
  const favs = useLibraryFavorites(user?.id);
  const toggleFav = useToggleFavorite(user?.id);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const displayName =
    profile.data?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Colega";
  const roleLabel = ROLE_LABELS[(roles.data ?? [])[0] ?? "student"];

  const items = res.data ?? [];
  const favIds = favs.data ?? [];

  const specialties = useMemo(
    () => [...new Set(items.map((i) => i.specialty).filter(Boolean))] as string[],
    [items],
  );
  const types = useMemo(() => [...new Set(items.map((i) => i.resource_type))], [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (cat && i.category_id !== cat && i.subcategory_id !== cat) return false;
      if (type && i.resource_type !== type) return false;
      if (specialty && i.specialty !== specialty) return false;
      if (onlyFavs && !favIds.includes(i.id)) return false;
      if (!term) return true;
      return [i.title, i.subtitle, i.description, i.author, i.specialty, ...(i.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [items, q, cat, type, specialty, onlyFavs, favIds]);

  return (
    <NexusShell
      env={env}
      userId={user?.id ?? ""}
      displayName={displayName}
      email={user?.email}
      avatarUrl={profile.data?.avatar_url}
      roleLabel={roleLabel}
      isAdmin={isAdmin}
      onSignOut={() => supabase.auth.signOut()}
    >
      <div className="mx-auto w-full max-w-[1300px] animate-slide-up space-y-6 pt-4">
        <header>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--nexus-teal)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--nexus-teal)]">
            <Library className="size-3" /> Biblioteca Universal
          </span>
          <h1 className="mt-3 text-[26px] font-black tracking-tight sm:text-[32px]">
            Todo el conocimiento médico de KotaMed
          </h1>
          <p className="mt-2 max-w-2xl text-sm opacity-60">
            Libros, guías, artículos, videos y protocolos organizados por categoría y especialidad.
          </p>
        </header>

        <div className="nexus-card rounded-3xl p-4">
          <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--nexus-border)] px-4 py-3">
            <Search className="size-4 opacity-55" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, autor, etiqueta o especialidad…"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:opacity-45"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] opacity-50">
              <Filter className="size-3" /> Filtros
            </span>
            <Sel value={cat} onChange={setCat} label="Categoría">
              {(cats.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? "↳ " : ""}
                  {c.name}
                </option>
              ))}
            </Sel>
            <Sel value={type} onChange={setType} label="Tipo">
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Sel>
            <Sel value={specialty} onChange={setSpecialty} label="Especialidad">
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Sel>
            <button
              onClick={() => setOnlyFavs((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--nexus-border)] px-3 py-2 text-[11px] font-black ${
                onlyFavs ? "text-amber-500" : "opacity-70"
              }`}
            >
              <Star className="size-3.5" /> Favoritos
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setLayout("grid")}
                aria-label="Cuadrícula"
                className={`nexus-icon-btn ${layout === "grid" ? "nexus-node-active" : ""}`}
              >
                <Grid3x3 className="size-4" />
              </button>
              <button
                onClick={() => setLayout("list")}
                aria-label="Lista"
                className={`nexus-icon-btn ${layout === "list" ? "nexus-node-active" : ""}`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {res.isLoading ? (
          <div className="flex items-center gap-2 text-sm opacity-60">
            <Loader2 className="size-4 animate-spin" /> Cargando biblioteca…
          </div>
        ) : filtered.length === 0 ? (
          <div className="nexus-card rounded-3xl p-8 text-sm opacity-65">
            No hay recursos que coincidan con tu búsqueda.
          </div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((r) => (
              <Card
                key={r.id}
                r={r}
                fav={favIds.includes(r.id)}
                onFav={() => toggleFav.mutate({ resourceId: r.id, on: !favIds.includes(r.id) })}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <Row
                key={r.id}
                r={r}
                fav={favIds.includes(r.id)}
                onFav={() => toggleFav.mutate({ resourceId: r.id, on: !favIds.includes(r.id) })}
              />
            ))}
          </div>
        )}
      </div>
    </NexusShell>
  );
}

function Sel({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-[color:var(--nexus-border)] bg-transparent px-3 py-2 text-[11px] font-bold outline-none"
    >
      <option value="">{label}: todas</option>
      {children}
    </select>
  );
}

function resourceHref(r: LibraryResource) {
  return r.external_url || r.file_url || r.video_url || "";
}

function Card({ r, fav, onFav }: { r: LibraryResource; fav: boolean; onFav: () => void }) {
  const Icon = TYPE_ICON[r.resource_type] ?? FileText;
  const href = resourceHref(r);
  return (
    <div className="nexus-card flex flex-col overflow-hidden rounded-3xl">
      {r.cover_url ? (
        <img src={r.cover_url} alt={r.title} loading="lazy" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-[color:var(--nexus-teal)]/10 text-[color:var(--nexus-teal)]">
          <Icon className="size-7" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-xs font-black tracking-tight">{r.title}</h3>
          <button onClick={onFav} aria-label="Favorito">
            <Star className={`size-4 ${fav ? "text-amber-500" : "opacity-35"}`} />
          </button>
        </div>
        <div className="mt-1 text-[10px] font-semibold opacity-55">
          {[r.author, r.year, r.specialty].filter(Boolean).join(" · ")}
        </div>
        {r.description && (
          <p className="mt-2 line-clamp-3 text-[11px] opacity-60">{r.description}</p>
        )}
        <div className="mt-auto pt-4">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[color:var(--nexus-border)] px-3 py-2 text-[11px] font-black"
            >
              Abrir recurso <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <span className="text-[10px] font-semibold opacity-45">Sin enlace disponible</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ r, fav, onFav }: { r: LibraryResource; fav: boolean; onFav: () => void }) {
  const Icon = TYPE_ICON[r.resource_type] ?? FileText;
  const href = resourceHref(r);
  return (
    <div className="nexus-card flex items-center gap-3 rounded-2xl px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--nexus-teal)]/10 text-[color:var(--nexus-teal)]">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black">{r.title}</span>
        <span className="block truncate text-[10px] font-semibold opacity-55">
          {[r.resource_type, r.author, r.year, r.specialty].filter(Boolean).join(" · ")}
        </span>
      </span>
      <button onClick={onFav} aria-label="Favorito">
        <Star className={`size-4 ${fav ? "text-amber-500" : "opacity-35"}`} />
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-[color:var(--nexus-border)] px-3 py-2 text-[11px] font-black"
        >
          Abrir
        </a>
      )}
    </div>
  );
}
