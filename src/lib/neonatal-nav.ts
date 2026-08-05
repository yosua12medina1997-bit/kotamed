/**
 * KotaMed · Centro de Operaciones Clínicas (Neonatología).
 * Modelo de navegación modular: un solo nivel visible en el sidebar y toda la
 * complejidad organizada dentro de cada módulo (pestañas y tarjetas).
 * Todo es editable por el administrador y persiste en `neo_form_config`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlarmSmoke,
  Baby,
  BarChart3,
  BedDouble,
  BookOpen,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  Microscope,
  Milk,
  Monitor,
  Pill,
  Shield,
  Stethoscope,
  Syringe,
  TrendingUp,
} from "lucide-react";

export const hdbNav = supabase as any;

/** Iconos disponibles para el editor del administrador. */
export const NEO_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Baby,
  BedDouble,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  Syringe,
  Monitor,
  Milk,
  Calculator,
  ClipboardList,
  HeartPulse,
  GraduationCap,
  Microscope,
  BarChart3,
  Layers,
  Shield,
  BookOpen,
  Activity,
  AlarmSmoke,
  Building2,
  TrendingUp,
};

export function navIcon(name: string): LucideIcon {
  return NEO_ICONS[name] ?? LayoutDashboard;
}

export const NEO_ROLES = [
  { value: "interno", label: "Interno" },
  { value: "r1", label: "Residente R1" },
  { value: "r2", label: "Residente R2" },
  { value: "r3", label: "Residente R3" },
  { value: "asistente", label: "Asistente" },
  { value: "enfermeria", label: "Enfermería" },
  { value: "admin", label: "Administrador" },
] as const;

export type ModuleKind =
  | "dashboard"
  | "ingresos"
  | "hospitalizacion"
  | "calculadoras"
  | "generic";

export interface NeoTab {
  id: string;
  label: string;
  hint?: string;
}

export interface NeoModule {
  id: string;
  label: string;
  icon: string;
  kind: ModuleKind;
  /** Presentación interna: pestañas superiores o tarjetas. */
  layout: "tabs" | "cards";
  tabs: NeoTab[];
  enabled: boolean;
  hidden: boolean;
  badge?: "nuevo" | "beta" | "desarrollo" | null;
  roles: string[];
  adminOnly?: boolean;
}

export interface NeoNavConfig {
  modules: NeoModule[];
  /** Módulo de inicio por rol (id de módulo). */
  home: Record<string, string>;
  /** Accesos rápidos globales configurables. */
  quick: string[];
}

const m = (
  id: string,
  label: string,
  icon: string,
  layout: "tabs" | "cards",
  tabs: string[][],
  extra: Partial<NeoModule> = {},
): NeoModule => ({
  id,
  label,
  icon,
  kind: (extra.kind ?? "generic") as ModuleKind,
  layout,
  tabs: tabs.map(([tid, tlabel, hint]) => ({ id: tid!, label: tlabel!, ...(hint ? { hint } : {}) })),
  enabled: true,
  hidden: false,
  badge: null,
  roles: NEO_ROLES.map((r) => r.value),
  ...extra,
});

/** Arquitectura por defecto del Centro de Operaciones. */
export const DEFAULT_NEO_MODULES: NeoModule[] = [
  m("dashboard", "Dashboard", "LayoutDashboard", "tabs", [
    ["general", "Vista general"],
    ["ocupacion", "Ocupación y camas"],
    ["alertas", "Alertas clínicas"],
  ], { kind: "dashboard" }),
  m("ingresos", "Ingresos", "Baby", "tabs", [
    ["nuevo", "Nuevo ingreso"],
    ["dia", "Ingresos del día"],
    ["espera", "Lista de espera"],
    ["referidos", "Referidos"],
    ["traslado", "Traslado"],
    ["estadisticas", "Estadísticas"],
  ], { kind: "ingresos" }),
  m("hospitalizacion", "Hospitalización", "BedDouble", "cards", [], { kind: "hospitalizacion" }),
  m("historia", "Historia Clínica", "FileText", "tabs", [
    ["generales", "Datos generales"],
    ["antecedentes", "Antecedentes"],
    ["embarazo", "Embarazo"],
    ["parto", "Parto"],
    ["inmediata", "Atención inmediata"],
    ["examen", "Examen físico"],
    ["diagnosticos", "Diagnósticos"],
    ["evoluciones", "Evoluciones"],
    ["interconsultas", "Interconsultas"],
    ["epicrisis", "Epicrisis"],
    ["alta", "Alta"],
  ]),
  m("evolucion", "Evolución", "Stethoscope", "tabs", [
    ["soap", "SOAP"],
    ["notas", "Notas médicas"],
    ["guardia", "Entrega de guardia"],
    ["visita", "Pase de visita"],
    ["checklist", "Checklist"],
    ["interconsultas", "Interconsultas"],
    ["indicaciones", "Indicaciones"],
  ]),
  m("ordenes", "Órdenes", "Pill", "cards", [
    ["medicamentos", "Medicamentos", "Prescripción por peso y esquema antibiótico."],
    ["liquidos", "Líquidos", "Requerimiento hídrico y velocidad de infusión."],
    ["npt", "NPT", "Nutrición parenteral total: GIR, aportes y kcal."],
    ["enteral", "Nutrición enteral", "Volúmenes por toma y progresión."],
    ["oxigeno", "Oxígeno", "Cánula, CPAP y ventilación mecánica."],
    ["fototerapia", "Fototerapia", "Indicación, horas y control de bilirrubina."],
    ["procedimientos", "Procedimientos", "Órdenes de procedimientos invasivos."],
    ["transfusiones", "Transfusiones", "Hemoderivados y volúmenes."],
    ["restricciones", "Restricciones", "Aislamiento, NPO y precauciones."],
  ]),
  m("examenes", "Exámenes", "FlaskConical", "cards", [
    ["laboratorio", "Laboratorio", "Hemograma, bioquímica y coagulación."],
    ["microbiologia", "Microbiología", "Cultivos, gram y antibiograma."],
    ["imagenes", "Imágenes", "Radiografía, TEM y RM."],
    ["gasometria", "Gasometría", "Estado ácido-base y oxigenación."],
    ["tamizajes", "Tamizajes", "Metabólico, auditivo, visual y cardiopatías."],
    ["ecografia", "Ecografía", "Transfontanelar, abdominal y renal."],
    ["ecocardiograma", "Ecocardiograma", "Cardiopatías y ductus."],
    ["resultados", "Resultados", "Bandeja de resultados del servicio."],
  ]),
  m("procedimientos", "Procedimientos", "Syringe", "cards", [
    ["picc", "PICC", "Catéter central de inserción periférica."],
    ["umbilical", "Catéter umbilical", "Arterial y venoso."],
    ["cpap", "CPAP", "Soporte no invasivo."],
    ["intubacion", "Intubación", "Tamaño de TET y profundidad."],
    ["surfactante", "Surfactante", "Dosis y técnica INSURE/LISA."],
    ["puncion", "Punción lumbar", "Técnica y análisis de LCR."],
    ["exanguino", "Exanguinotransfusión", "Volumen y monitoreo."],
  ]),
  m("monitoreo", "Monitoreo", "Monitor", "tabs", [
    ["vitales", "Signos vitales"],
    ["balance", "Balance hídrico"],
    ["peso", "Peso"],
    ["curvas", "Curvas"],
    ["bilirrubina", "Bilirrubina"],
    ["glucemias", "Glucemias"],
    ["alarmas", "Alarmas"],
    ["oxigeno", "Oxígeno"],
  ]),
  m("nutricion", "Nutrición y crecimiento", "Milk", "tabs", [
    ["peso", "Peso"],
    ["longitud", "Longitud"],
    ["pc", "Perímetro cefálico"],
    ["fenton", "Fenton"],
    ["oms", "OMS"],
    ["lactancia", "Lactancia"],
    ["banco", "Banco de leche"],
    ["npt", "NPT"],
  ]),
  m("calculadoras", "Calculadoras", "Calculator", "cards", [], { kind: "calculadoras" }),
  m("biblioteca", "Guías clínicas", "ClipboardList", "cards", [
    ["minsa", "MINSA", "Normas técnicas nacionales."],
    ["aap", "AAP", "American Academy of Pediatrics."],
    ["oms", "OMS", "Recomendaciones globales."],
    ["nrp", "NRP", "Reanimación neonatal."],
    ["protocolos", "Protocolos", "Protocolos del servicio."],
    ["hospital", "Guías del hospital", "Documentos institucionales."],
    ["consensos", "Consensos", "Consensos de sociedades científicas."],
  ]),
  m("casos", "Casos clínicos", "HeartPulse", "cards", [
    ["prematuridad", "Prematuridad", "Manejo del prematuro y sus complicaciones."],
    ["asfixia", "Asfixia", "Encefalopatía hipóxico-isquémica."],
    ["sepsis", "Sepsis", "Temprana, tardía y shock séptico."],
    ["ictericia", "Hiperbilirrubinemia", "Fototerapia y exanguino."],
    ["hipoglicemia", "Hipoglicemia", "Umbrales y manejo."],
    ["cardiopatias", "Cardiopatías", "Ductus y cardiopatías congénitas."],
    ["malformaciones", "Malformaciones", "Abordaje inicial y quirúrgico."],
    ["enterocolitis", "Enterocolitis", "Estadios de Bell y manejo."],
  ]),
  m("docencia", "Docencia", "GraduationCap", "tabs", [
    ["cursos", "Cursos"],
    ["seminarios", "Seminarios"],
    ["flashcards", "Flashcards"],
    ["videos", "Vídeos"],
    ["biblioteca", "Biblioteca"],
    ["evaluaciones", "Evaluaciones"],
  ]),
  m("investigacion", "Investigación", "Microscope", "tabs", [
    ["pubmed", "PubMed"],
    ["neoreviews", "NeoReviews"],
    ["pediatrics", "Pediatrics"],
    ["aap", "AAP"],
    ["nejm", "NEJM"],
    ["articulos", "Artículos"],
    ["protocolos", "Protocolos"],
  ]),
  m("indicadores", "Indicadores", "BarChart3", "tabs", [
    ["ocupacion", "Ocupación"],
    ["mortalidad", "Mortalidad"],
    ["prematuridad", "Prematuridad"],
    ["sepsis", "Sepsis"],
    ["ventilados", "Ventilados"],
    ["altas", "Altas"],
    ["bajopeso", "Bajo peso"],
    ["fototerapia", "Fototerapia"],
  ]),
  m("archivo", "Archivo clínico", "Layers", "tabs", [
    ["altas", "Altas"],
    ["fallecidos", "Fallecidos"],
    ["transferidos", "Transferidos"],
    ["referencias", "Referencias"],
    ["historial", "Historial"],
    ["exportar", "Exportar"],
  ]),
  m("administracion", "Administración", "Shield", "tabs", [
    ["modulos", "Módulos"],
    ["formularios", "Formularios"],
    ["usuarios", "Usuarios"],
    ["roles", "Roles y permisos"],
    ["camas", "Habitaciones y camas"],
    ["protocolos", "Protocolos"],
    ["plantillas", "Plantillas"],
    ["logs", "Logs"],
  ], { adminOnly: true }),
];

export const DEFAULT_NEO_NAV: NeoNavConfig = {
  modules: DEFAULT_NEO_MODULES,
  home: {},
  quick: ["dashboard", "ingresos", "hospitalizacion", "calculadoras"],
};

/* ================================================================== */
/*  CALCULADORAS — Centro de Herramientas Clínicas                     */
/* ================================================================== */

export interface CalcTool {
  id: string;
  label: string;
  hint: string;
}

export interface CalcCategory {
  id: string;
  label: string;
  emoji: string;
  tools: CalcTool[];
}

export const CALC_CATEGORIES: CalcCategory[] = [
  {
    id: "nutricion",
    label: "Nutrición",
    emoji: "🍼",
    tools: [
      { id: "npt", label: "NPT", hint: "Nutrición parenteral total: GIR, aportes y kcal." },
      { id: "gir", label: "GIR", hint: "Velocidad de infusión de glucosa (mg/kg/min)." },
      { id: "enteral", label: "Nutrición enteral", hint: "Volumen por toma e intervalo." },
      { id: "hidrico", label: "Requerimiento hídrico", hint: "mL/kg/día por día de vida." },
      { id: "balance", label: "Balance", hint: "Ingresos, egresos y diuresis." },
    ],
  },
  {
    id: "liquidos",
    label: "Líquidos",
    emoji: "💧",
    tools: [
      { id: "hidrico", label: "Requerimiento hídrico", hint: "Según peso y día de vida." },
      { id: "balance", label: "Balance hídrico", hint: "Diuresis en mL/kg/h." },
      { id: "gir", label: "GIR", hint: "Aporte de glucosa." },
    ],
  },
  {
    id: "dosis",
    label: "Dosis",
    emoji: "💊",
    tools: [
      { id: "dose", label: "Dosis por peso", hint: "mg/kg/dosis, mg/día y mL por dosis." },
      { id: "ampicilina", label: "Ampicilina", hint: "50 mg/kg/dosis." },
      { id: "gentamicina", label: "Gentamicina", hint: "4 mg/kg/dosis." },
      { id: "amikacina", label: "Amikacina", hint: "15 mg/kg/dosis." },
      { id: "cafeina", label: "Cafeína", hint: "Carga 20 mg/kg, mantenimiento 5 mg/kg." },
      { id: "vitaminak", label: "Vitamina K", hint: "1 mg IM (0.5 mg si < 1500 g)." },
      { id: "adrenalina", label: "Adrenalina", hint: "0.02 mg/kg IV (1:10 000)." },
      { id: "surfactante", label: "Surfactante", hint: "100–200 mg/kg intratraqueal." },
    ],
  },
  {
    id: "cardio",
    label: "Cardiología",
    emoji: "🫀",
    tools: [
      { id: "dose", label: "Inotrópicos", hint: "Dosis por peso y dilución." },
      { id: "adrenalina", label: "Adrenalina", hint: "Reanimación neonatal." },
    ],
  },
  {
    id: "respiratorio",
    label: "Respiratorio",
    emoji: "🫁",
    tools: [
      { id: "tet", label: "Tubo endotraqueal", hint: "Diámetro y profundidad por peso." },
      { id: "silverman", label: "Silverman-Andersen", hint: "Score de dificultad respiratoria." },
      { id: "downes", label: "Downes", hint: "Severidad del distrés respiratorio." },
      { id: "surfactante", label: "Surfactante", hint: "Dosis por peso." },
    ],
  },
  {
    id: "laboratorio",
    label: "Laboratorio",
    emoji: "🧬",
    tools: [
      { id: "corregida", label: "Edad corregida", hint: "Edad postmenstrual y corregida." },
      { id: "balance", label: "Balance", hint: "Control de aportes y pérdidas." },
    ],
  },
  {
    id: "crecimiento",
    label: "Crecimiento",
    emoji: "📈",
    tools: [
      { id: "peso", label: "Variación de peso", hint: "% de pérdida y ganancia g/kg/día." },
      { id: "corregida", label: "Edad corregida", hint: "Semanas postmenstruales." },
    ],
  },
  {
    id: "scores",
    label: "Scores clínicos",
    emoji: "📊",
    tools: [
      { id: "apgar", label: "APGAR", hint: "Al minuto y a los 5 minutos." },
      { id: "silverman", label: "Silverman", hint: "Dificultad respiratoria." },
      { id: "downes", label: "Downes", hint: "Distrés respiratorio." },
      { id: "ballard", label: "Ballard", hint: "Edad gestacional por examen." },
      { id: "capurro", label: "Capurro", hint: "Edad gestacional somática." },
    ],
  },
];

/* ================================================================== */
/*  PERSISTENCIA                                                       */
/* ================================================================== */

const NAV_SCOPE = "internado:pediatria-neonatologia:hospitalizacion:nav";

function normalize(cfg: Partial<NeoNavConfig> | null): NeoNavConfig {
  if (!cfg?.modules?.length) return DEFAULT_NEO_NAV;
  return {
    modules: cfg.modules.map((mod) => ({
      ...mod,
      tabs: mod.tabs ?? [],
      roles: mod.roles ?? NEO_ROLES.map((r) => r.value),
      badge: mod.badge ?? null,
      enabled: mod.enabled !== false,
      hidden: mod.hidden === true,
      layout: mod.layout ?? "tabs",
      kind: mod.kind ?? "generic",
    })),
    home: cfg.home ?? {},
    quick: cfg.quick ?? DEFAULT_NEO_NAV.quick,
  };
}

export function useNeoNav() {
  return useQuery({
    queryKey: ["neo-nav", NAV_SCOPE],
    queryFn: async (): Promise<NeoNavConfig> => {
      const { data, error } = await hdbNav
        .from("neo_form_config")
        .select("config")
        .eq("scope", NAV_SCOPE)
        .maybeSingle();
      if (error) throw error;
      return normalize((data?.config ?? null) as Partial<NeoNavConfig> | null);
    },
  });
}

export function useSaveNeoNav() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: NeoNavConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdbNav
        .from("neo_form_config")
        .upsert(
          { scope: NAV_SCOPE, config, updated_by: auth.user?.id ?? null },
          { onConflict: "scope" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-nav", NAV_SCOPE] }),
  });
}
