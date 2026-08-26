/**
 * KOTAMED NEXUS — shell del usuario final: sidebar mínimo, barra superior con
 * selector de apariencia (Claro / Oscuro / Ambiente), notificaciones y perfil.
 * Solo capa visual: no cambia rutas, permisos ni datos.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Home,
  Library,
  Moon,
  Search,
  Settings,
  Shield,
  Sparkles,
  Stethoscope,
  Sun,
  BarChart3,
  UserRound,
  LogOut,
  ChevronDown,
} from "lucide-react";
import kotaroLogo from "@/assets/kotaro-logo.png";
import { ProfileDialog } from "@/components/profile/ProfileDialog";
import type { Appearance, NexusEnv } from "@/lib/nexus-theme";

const NAV = [
  { label: "Inicio", to: "/dashboard", icon: Home },
  { label: "Mis cursos", to: "/programas", icon: GraduationCap },
  { label: "Clínica", to: "/programas/internado/areas", icon: Stethoscope },
  { label: "Kota AI", to: "/anatomy-lab", icon: Sparkles },
  { label: "Evaluaciones", to: "/programas/kotamed-apex", icon: ClipboardList },
  { label: "Biblioteca", to: "/programas", icon: Library },
  { label: "Mi progreso", to: "/dashboard", icon: BarChart3 },
] as const;

export function NexusShell({
  env,
  userId,
  displayName,
  email,
  avatarUrl,
  roleLabel,
  isAdmin,
  onSignOut,
  children,
}: {
  env: NexusEnv;
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  roleLabel?: string;
  isAdmin?: boolean;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div
      className={`nexus ${env.base === "dark" ? "nexus-dark dark" : "nexus-light"} min-h-screen`}
      style={env.ambientStyle}
    >
      <div aria-hidden className="nexus-ambient-layer" />

      <div className="relative z-10 flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="nexus-sidebar hidden w-[248px] shrink-0 flex-col px-5 py-7 lg:flex">
          <Link to="/" className="flex flex-col items-center gap-2 text-center">
            <img src={kotaroLogo} alt="KotaMed" className="size-14 object-contain" />
            <span className="text-lg font-black tracking-tight">
              KOTA<span className="text-[color:var(--nexus-teal)]">MED</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.42em] opacity-70">
              Nexus
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase leading-relaxed tracking-[0.16em] opacity-45">
              Tu entorno de
              <br />
              inteligencia médica
            </span>
          </Link>

          <nav className="mt-8 space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold transition ${
                    active ? "nexus-nav-active" : "nexus-nav"
                  }`}
                >
                  <item.icon className="size-[18px]" strokeWidth={2.1} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-[color:var(--nexus-border)] pt-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.24em] opacity-45">
              Apariencia
            </div>
            <div className="mt-3 flex gap-2">
              <AppearanceDot env={env} value="light" icon={<Sun className="size-4" />} />
              <AppearanceDot env={env} value="dark" icon={<Moon className="size-4" />} />
              <AppearanceDot env={env} value="ambient" icon={<span className="text-sm">✦</span>} />
            </div>
          </div>

          <div className="mt-auto space-y-1 pt-6">
            <button
              onClick={() => setProfileOpen(true)}
              className="nexus-nav flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold"
            >
              <UserRound className="size-[18px]" strokeWidth={2.1} /> Perfil
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              className="nexus-nav flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold"
            >
              <Settings className="size-[18px]" strokeWidth={2.1} /> Ajustes
            </button>
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="nexus-topbar sticky top-0 z-30 flex items-center gap-4 px-5 py-4 lg:px-8">
            <Link to="/dashboard" className="lg:hidden">
              <img src={kotaroLogo} alt="KotaMed" className="size-8 object-contain" />
            </Link>
            <label className="nexus-search hidden flex-1 items-center gap-3 rounded-2xl px-4 py-2.5 md:flex">
              <Search className="size-4 opacity-55" strokeWidth={2.2} />
              <input
                placeholder="Buscar cursos, temas, clases, casos..."
                className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:opacity-45"
              />
              <kbd className="rounded-lg border border-[color:var(--nexus-border)] px-1.5 py-0.5 text-[10px] font-bold opacity-55">
                ⌘K
              </kbd>
            </label>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden items-center gap-1.5 rounded-xl bg-[color:var(--nexus-teal)] px-3 py-2 text-[11px] font-black text-white sm:inline-flex"
                >
                  <Shield className="size-3.5" strokeWidth={2.5} /> Admin
                </Link>
              )}
              <button className="nexus-icon-btn relative" aria-label="Notificaciones">
                <Bell className="size-4" strokeWidth={2.2} />
              </button>
              <AppearanceMenu env={env} />
              <UserChip
                displayName={displayName}
                email={email}
                roleLabel={roleLabel}
                avatarUrl={avatarUrl}
                onProfile={() => setProfileOpen(true)}
                onSignOut={onSignOut}
              />
            </div>
          </header>

          <main className="flex-1 px-5 pb-14 pt-2 lg:px-8">{children}</main>
        </div>
      </div>

      <ProfileDialog userId={userId} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function AppearanceDot({
  env,
  value,
  icon,
}: {
  env: NexusEnv;
  value: Appearance;
  icon: ReactNode;
}) {
  const active = env.appearance === value;
  return (
    <button
      onClick={() => env.setAppearance(value)}
      aria-pressed={active}
      title={value === "light" ? "Claro" : value === "dark" ? "Oscuro" : "Ambiente"}
      className={`flex size-9 items-center justify-center rounded-xl transition ${
        active ? "nexus-node-active" : "nexus-icon-btn"
      }`}
    >
      {icon}
    </button>
  );
}

function AppearanceMenu({ env }: { env: NexusEnv }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options: { value: Appearance; label: string; icon: ReactNode }[] = [
    { value: "light", label: "Claro", icon: <Sun className="size-4" /> },
    { value: "dark", label: "Oscuro", icon: <Moon className="size-4" /> },
    { value: "ambient", label: "Ambiente", icon: <span>✦</span> },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="nexus-icon-btn"
        aria-label="Apariencia"
      >
        {env.appearance === "light" ? (
          <Sun className="size-4" strokeWidth={2.2} />
        ) : env.appearance === "dark" ? (
          <Moon className="size-4" strokeWidth={2.2} />
        ) : (
          <span className="text-[13px]">✦</span>
        )}
      </button>
      {open && (
        <div className="nexus-panel absolute right-0 mt-2 w-52 rounded-2xl p-2 shadow-2xl">
          <div className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] opacity-50">
            Apariencia
          </div>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                env.setAppearance(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                env.appearance === o.value ? "nexus-node-active" : "nexus-nav"
              }`}
            >
              {o.icon} {o.label}
            </button>
          ))}
          {env.appearance === "ambient" && (
            <div className="mt-1 px-2.5 py-1.5 text-[10px] font-semibold opacity-55">
              {env.phaseLabel}
              {env.weather !== "unknown" &&
                ` · ${env.weather === "clear" ? "despejado" : env.weather === "cloudy" ? "nublado" : "lluvia"}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserChip({
  displayName,
  email,
  roleLabel,
  avatarUrl,
  onProfile,
  onSignOut,
}: {
  displayName: string;
  email?: string;
  roleLabel?: string;
  avatarUrl?: string | null;
  onProfile: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-2xl px-1.5 py-1 transition hover:opacity-90"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Perfil" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-[color:var(--nexus-teal)]/15 text-[11px] font-black text-[color:var(--nexus-teal)]">
            {initials}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-55" strokeWidth={2.5} />
      </button>
      {open && (
        <div className="nexus-panel absolute right-0 mt-2 w-60 rounded-2xl p-2 shadow-2xl">
          <div className="border-b border-[color:var(--nexus-border)] px-3 py-2.5">
            <div className="truncate text-xs font-black">{displayName}</div>
            <div className="truncate text-[10px] opacity-60">{roleLabel || email}</div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
            className="nexus-nav mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold"
          >
            <UserRound className="size-4" /> Mi perfil
          </button>
          <Link
            to="/programas"
            className="nexus-nav flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold"
            onClick={() => setOpen(false)}
          >
            <BookOpen className="size-4" /> Mis cursos
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500/10"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
