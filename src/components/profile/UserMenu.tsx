import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { ProfileDialog } from "./ProfileDialog";

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function UserMenu({
  userId,
  displayName,
  email,
  avatarUrl,
  onSignOut,
}: {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 pl-2 pr-2 py-1.5 rounded-xl hover:bg-black/[0.04] transition-colors"
      >
        <span className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-xs font-bold">{displayName}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{email}</span>
        </span>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Perfil"
            className="size-9 rounded-full border-2 border-white shadow-sm object-cover"
          />
        ) : (
          <span className="size-9 rounded-full border-2 border-white shadow-sm bg-primary/10 text-primary flex items-center justify-center text-xs font-extrabold">
            {initialsOf(displayName)}
          </span>
        )}
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 glass rounded-2xl border border-border/60 shadow-2xl p-2 animate-slide-up origin-top-right"
        >
          <div className="px-3 py-2.5 border-b border-border/60 mb-1">
            <div className="text-xs font-bold truncate">{displayName}</div>
            <div className="text-[10px] text-muted-foreground truncate">{email}</div>
          </div>
          <MenuItem
            icon={<UserRound className="size-4" strokeWidth={2.25} />}
            label="Mi Perfil"
            onClick={() => {
              setOpen(false);
              setProfileOpen(true);
            }}
          />
          <MenuItem
            icon={<Settings className="size-4" strokeWidth={2.25} />}
            label="Configuración"
            onClick={() => {
              setOpen(false);
              setProfileOpen(true);
            }}
          />
          <div className="my-1 h-px bg-border/60" />
          <MenuItem
            icon={<LogOut className="size-4" strokeWidth={2.25} />}
            label="Cerrar sesión"
            danger
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          />
        </div>
      )}

      <ProfileDialog userId={userId} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
        danger ? "text-rose-600 hover:bg-rose-500/5" : "hover:bg-black/[0.05]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
