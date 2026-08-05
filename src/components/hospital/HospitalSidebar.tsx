/**
 * KotaMed · Centro de Operaciones Clínicas — Sidebar del Servicio de Neonatología.
 * Navegación jerárquica tipo HIS/EMR: bloques, grupos colapsables, búsqueda
 * instantánea (Ctrl+K), accesos rápidos y persistencia del último menú abierto.
 * Solo presentación/navegación: no modifica la lógica clínica.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlarmSmoke,
  BarChart3,
  Baby,
  Bookmark,
  Building2,
  Calculator,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Hospital,
  Layers,
  LifeBuoy,
  type LucideIcon,
  MessageSquare,
  Microscope,
  Milk,
  Monitor,
  Pill,
  Search,
  Settings2,
  Shield,
  Star,
  Stethoscope,
  Syringe,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: { id: string; label: string }[];
  adminOnly?: boolean;
}

export interface NavBlock {
  id: string;
  label: string;
  items: NavItem[];
}

/** Estructura completa del Centro de Operaciones (escalable y reutilizable). */
export const HOSPITAL_NAV: NavBlock[] = [
  {
    id: "clinica",
    label: "Operación clínica",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: BarChart3,
        children: [
          { id: "dashboard", label: "Vista general" },
          { id: "censo", label: "Pacientes hospitalizados" },
          { id: "ocupacion", label: "Ocupación y camas" },
          { id: "altas", label: "Altas y referencias" },
          { id: "alertas", label: "Alertas clínicas" },
        ],
      },
      {
        id: "ingresos",
        label: "Ingresos",
        icon: Baby,
        children: [
          { id: "ingreso-nuevo", label: "Nuevo ingreso" },
          { id: "ingresos-dia", label: "Ingresos del día" },
          { id: "ingresos-partos", label: "Traslado desde sala de partos" },
          { id: "ingresos-referidos", label: "Referidos" },
        ],
      },
      { id: "areas", label: "Áreas de hospitalización", icon: Building2 },
      {
        id: "historia",
        label: "Historia clínica",
        icon: FileText,
        children: [
          { id: "historia", label: "Historia clínica" },
          { id: "historia-materna", label: "Antecedentes maternos" },
          { id: "historia-nacimiento", label: "Nacimiento y partograma" },
          { id: "historia-examen", label: "Examen físico" },
          { id: "historia-alta", label: "Epicrisis y alta" },
        ],
      },
      {
        id: "evolucion",
        label: "Evolución médica",
        icon: Stethoscope,
        children: [
          { id: "evolucion", label: "SOAP / evolución diaria" },
          { id: "evolucion-visita", label: "Pase de visita" },
          { id: "evolucion-guardia", label: "Entrega de guardia" },
          { id: "evolucion-checklist", label: "Checklist diario" },
        ],
      },
      {
        id: "ordenes",
        label: "Órdenes médicas",
        icon: Pill,
        children: [
          { id: "ordenes", label: "Medicamentos" },
          { id: "ordenes-liquidos", label: "Líquidos y NPT" },
          { id: "ordenes-nutricion", label: "Nutrición enteral" },
          { id: "ordenes-soporte", label: "Oxigenoterapia y fototerapia" },
        ],
      },
      {
        id: "examenes",
        label: "Exámenes auxiliares",
        icon: FlaskConical,
        children: [
          { id: "examenes", label: "Laboratorio" },
          { id: "examenes-micro", label: "Microbiología y cultivos" },
          { id: "examenes-imagen", label: "Imágenes" },
          { id: "examenes-tamizajes", label: "Tamizajes" },
        ],
      },
      { id: "procedimientos", label: "Procedimientos", icon: Syringe },
    ],
  },
  {
    id: "gestion",
    label: "Monitoreo y gestión",
    items: [
      {
        id: "monitoreo",
        label: "Monitoreo",
        icon: Monitor,
        children: [
          { id: "monitoreo", label: "Signos vitales" },
          { id: "monitoreo-balance", label: "Balance hídrico" },
          { id: "monitoreo-glucemia", label: "Glucemias y bilirrubina" },
          { id: "monitoreo-alarmas", label: "Alarmas clínicas" },
        ],
      },
      {
        id: "crecimiento",
        label: "Crecimiento y nutrición",
        icon: Milk,
        children: [
          { id: "crecimiento", label: "Peso y antropometría" },
          { id: "crecimiento-curvas", label: "Curvas Fenton / OMS" },
          { id: "crecimiento-lactancia", label: "Lactancia y banco de leche" },
        ],
      },
      { id: "calculos", label: "Calculadoras clínicas", icon: Calculator },
      {
        id: "indicadores",
        label: "Indicadores",
        icon: Activity,
        children: [
          { id: "indicadores", label: "KPIs del servicio" },
          { id: "indicadores-morbi", label: "Morbimortalidad" },
          { id: "indicadores-prema", label: "Prematuridad y bajo peso" },
        ],
      },
      { id: "archivo", label: "Archivo clínico", icon: Layers },
    ],
  },
  {
    id: "academico",
    label: "Formación académica",
    items: [
      { id: "guias", label: "Guías clínicas", icon: ClipboardList },
      { id: "casos", label: "Casos clínicos", icon: HeartPulse },
      { id: "docencia", label: "Docencia", icon: GraduationCap },
      { id: "investigacion", label: "Investigación", icon: Microscope },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { id: "administracion", label: "Administración", icon: Shield, adminOnly: true },
      { id: "configuracion", label: "Configuración", icon: Settings2 },
      { id: "ayuda", label: "Ayuda", icon: HelpCircle },
      { id: "feedback", label: "Feedback", icon: MessageSquare },
    ],
  },
];

const STORE_KEY = "kotamed.neo.sidebar";

export function HospitalSidebar({
  active,
  onSelect,
  units,
  unit,
  onUnit,
  accent,
  isAdmin,
  openPatients = 0,
  serviceActive = true,
}: {
  active: string;
  onSelect: (id: string) => void;
  units: { slug: string; title: string; short: string; accent: string }[];
  unit: string;
  onUnit: (slug: string) => void;
  accent: string;
  isAdmin: boolean;
  openPatients?: number;
  serviceActive?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { areas: true };
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "") || { areas: true };
    } catch {
      return { areas: true };
    }
  });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(open));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const blocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOSPITAL_NAV.map((b) => ({
      ...b,
      items: b.items.filter((i) => {
        if (i.adminOnly && !isAdmin) return false;
        if (!q) return true;
        return (
          i.label.toLowerCase().includes(q) ||
          (i.children ?? []).some((c) => c.label.toLowerCase().includes(q))
        );
      }),
    })).filter((b) => b.items.length > 0);
  }, [query, isAdmin]);

  const toggle = (id: string) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  return (
    <aside className="glass w-full lg:w-72 shrink-0 rounded-3xl p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      {/* Encabezado del servicio */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          <Hospital className="size-3.5" /> Servicio de Neonatología
        </div>
        <div className="mt-1 text-sm font-extrabold tracking-tight">Hospitalización Neonatal</div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: serviceActive ? accent : "oklch(0.6 0.02 260)" }}
          />
          {serviceActive ? "Servicio activo" : "Servicio inactivo"}
        </div>
      </div>

      {/* Búsqueda global */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el menú…"
          aria-label="Buscar en el menú"
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded-md border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Bloques */}
      <nav className="mt-3 space-y-4">
        {blocks.map((block) => (
          <div key={block.id}>
            <div className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {block.label}
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {block.items.map((item) => {
                const isActive =
                  active === item.id ||
                  (item.children ?? []).some((c) => c.id === active) ||
                  (item.id === "areas" && active === "areas");
                const expanded = !!open[item.id] || !!query;
                const hasChildren = item.id === "areas" || !!item.children?.length;
                return (
                  <li key={item.id}>
                    <button
                      title={item.label}
                      onClick={() => {
                        onSelect(item.children?.[0]?.id ?? item.id);
                        if (hasChildren) toggle(item.id);
                      }}
                      className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold transition ${
                        isActive
                          ? "border border-transparent text-foreground"
                          : "border border-transparent hover:bg-background/60"
                      }`}
                      style={isActive ? { background: `${accent}1f`, borderColor: `${accent}55` } : undefined}
                    >
                      <item.icon className="size-4 shrink-0" style={{ color: isActive ? accent : undefined }} />
                      <span className="truncate">{item.label}</span>
                      {hasChildren && (
                        <ChevronDown
                          className={`ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {hasChildren && expanded && (
                      <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                        {item.id === "areas"
                          ? units.map((u) => (
                              <li key={u.slug}>
                                <button
                                  onClick={() => {
                                    onUnit(u.slug);
                                    onSelect("areas");
                                  }}
                                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition hover:bg-background/60 ${
                                    unit === u.slug && active === "areas"
                                      ? "font-bold text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className="inline-block size-1.5 rounded-full"
                                    style={{ background: u.accent }}
                                  />
                                  <span className="truncate">{u.title}</span>
                                </button>
                              </li>
                            ))
                          : item.children!.map((c) => (
                              <li key={c.id}>
                                <button
                                  onClick={() => onSelect(c.id)}
                                  className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-[11px] transition hover:bg-background/60 ${
                                    active === c.id ? "font-bold text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {c.label}
                                </button>
                              </li>
                            ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Accesos rápidos */}
      <div className="mt-4 rounded-2xl border border-border/50 bg-background/50 p-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Accesos rápidos
        </div>
        <div className="mt-2 space-y-0.5">
          <QuickRow icon={Star} label="Favoritos" onClick={() => onSelect("dashboard")} />
          <QuickRow icon={Clock} label="Acceso reciente" onClick={() => onSelect("censo")} />
          <QuickRow
            icon={Bookmark}
            label="Pacientes abiertos"
            badge={openPatients}
            onClick={() => onSelect("censo")}
          />
          <QuickRow icon={Calculator} label="Últimos cálculos" onClick={() => onSelect("calculos")} />
          <QuickRow icon={AlarmSmoke} label="Alertas activas" onClick={() => onSelect("alertas")} />
          <QuickRow icon={LifeBuoy} label="Ayuda rápida" onClick={() => onSelect("ayuda")} />
        </div>
      </div>
    </aside>
  );
}

function QuickRow({
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-muted-foreground transition hover:bg-background/60 hover:text-foreground"
    >
      <Icon className="size-3.5" />
      <span className="truncate">{label}</span>
      {!!badge && (
        <span className="ml-auto rounded-full bg-primary/15 px-1.5 text-[9px] font-bold text-primary">
          {badge}
        </span>
      )}
    </button>
  );
}
