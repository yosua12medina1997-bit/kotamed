/**
 * KotaMed · Sidebar del Centro de Operaciones Clínicas (Neonatología).
 * Un único nivel de navegación: índice elegante y minimalista. Toda la
 * complejidad vive dentro de cada módulo. Incluye búsqueda global (⌘K),
 * favoritos por usuario, accesos recientes y modo compacto/expandido.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Hospital, PanelLeftClose, PanelLeftOpen, Search, Star } from "lucide-react";
import { navIcon, type NeoModule } from "@/lib/neonatal-nav";

const FAV_KEY = "kotamed.neo.favorites";
const RECENT_KEY = "kotamed.neo.recent";
const COMPACT_KEY = "kotamed.neo.compact";

const BADGES: Record<string, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "oklch(0.72 0.14 150)" },
  beta: { label: "Beta", color: "oklch(0.70 0.13 260)" },
  desarrollo: { label: "En desarrollo", color: "oklch(0.72 0.16 60)" },
};

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function HospitalSidebar({
  modules,
  active,
  onSelect,
  accent,
  serviceActive = true,
  openPatients = 0,
}: {
  modules: NeoModule[];
  active: string;
  onSelect: (id: string) => void;
  accent: string;
  serviceActive?: boolean;
  openPatients?: number;
}) {
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<string[]>(() => readList(FAV_KEY));
  const [recent, setRecent] = useState<string[]>(() => readList(RECENT_KEY));
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COMPACT_KEY) === "1";
  });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
      localStorage.setItem(COMPACT_KEY, compact ? "1" : "0");
    } catch {
      /* almacenamiento no disponible */
    }
  }, [favs, compact]);

  useEffect(() => {
    if (!active) return;
    setRecent((r) => {
      const next = [active, ...r.filter((x) => x !== active)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCompact(false);
        setTimeout(() => searchRef.current?.focus(), 30);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (mod) =>
        mod.label.toLowerCase().includes(q) ||
        mod.tabs.some((t) => t.label.toLowerCase().includes(q)),
    );
  }, [modules, query]);

  const favModules = modules.filter((mod) => favs.includes(mod.id));
  const recentModules = recent
    .map((id) => modules.find((mod) => mod.id === id))
    .filter((mod): mod is NeoModule => !!mod && mod.id !== active);

  const toggleFav = (id: string) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <aside
      className={`glass shrink-0 rounded-3xl p-2.5 transition-all duration-200 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto ${
        compact ? "w-full lg:w-[68px]" : "w-full lg:w-64"
      }`}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/50 p-2.5">
        <Hospital className="size-4 shrink-0" style={{ color: accent }} />
        {!compact && (
          <div className="min-w-0">
            <div className="truncate text-[11px] font-extrabold tracking-tight">Neonatología</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ background: serviceActive ? accent : "oklch(0.6 0.02 260)" }}
              />
              {serviceActive ? "Servicio activo" : "Inactivo"}
              {openPatients > 0 && <span>· {openPatients} pac.</span>}
            </div>
          </div>
        )}
        <button
          onClick={() => setCompact((v) => !v)}
          aria-label={compact ? "Expandir menú" : "Compactar menú"}
          className="ml-auto rounded-lg p-1 text-muted-foreground transition hover:bg-background/60 hover:text-foreground"
        >
          {compact ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </div>

      {!compact && (
        <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo…"
            aria-label="Buscar módulo"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      )}

      {!compact && favModules.length > 0 && !query && (
        <SidebarGroup label="Favoritos" icon={<Star className="size-3" />}>
          {favModules.map((mod) => (
            <MiniRow key={mod.id} mod={mod} active={active === mod.id} accent={accent} onSelect={onSelect} />
          ))}
        </SidebarGroup>
      )}

      <nav className="mt-2.5 space-y-0.5">
        {!compact && !query && (
          <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Módulos
          </div>
        )}
        {filtered.map((mod) => {
          const Icon = navIcon(mod.icon);
          const isActive = active === mod.id;
          const badge = mod.badge ? BADGES[mod.badge] : null;
          const fav = favs.includes(mod.id);
          return (
            <div key={mod.id} className="group flex items-center">
              <button
                title={mod.label}
                onClick={() => onSelect(mod.id)}
                className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold transition ${
                  isActive
                    ? "border border-transparent text-foreground"
                    : "border border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
                } ${compact ? "justify-center" : ""}`}
                style={isActive ? { background: `${accent}1f`, borderColor: `${accent}55` } : undefined}
              >
                <Icon className="size-4 shrink-0" style={{ color: isActive ? accent : undefined }} />
                {!compact && <span className="truncate">{mod.label}</span>}
                {!compact && badge && (
                  <span
                    className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
                    style={{ background: `${badge.color}22`, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                )}
              </button>
              {!compact && (
                <button
                  onClick={() => toggleFav(mod.id)}
                  aria-label="Marcar como favorito"
                  className={`ml-0.5 shrink-0 rounded-md p-1 transition ${
                    fav ? "text-amber-400" : "text-transparent group-hover:text-muted-foreground"
                  }`}
                >
                  <Star className="size-3" fill={fav ? "currentColor" : "none"} />
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && !compact && (
          <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">
            Sin resultados
          </div>
        )}
      </nav>

      {!compact && recentModules.length > 0 && !query && (
        <SidebarGroup label="Acceso reciente" icon={<Clock className="size-3" />}>
          {recentModules.slice(0, 4).map((mod) => (
            <MiniRow key={mod.id} mod={mod} active={false} accent={accent} onSelect={onSelect} />
          ))}
        </SidebarGroup>
      )}
    </aside>
  );
}

function SidebarGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-2">
      <div className="flex items-center gap-1.5 px-1 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MiniRow({
  mod,
  active,
  accent,
  onSelect,
}: {
  mod: NeoModule;
  active: boolean;
  accent: string;
  onSelect: (id: string) => void;
}) {
  const Icon = navIcon(mod.icon);
  return (
    <button
      onClick={() => onSelect(mod.id)}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition hover:bg-background/60 ${
        active ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5 shrink-0" style={active ? { color: accent } : undefined} />
      <span className="truncate">{mod.label}</span>
    </button>
  );
}
