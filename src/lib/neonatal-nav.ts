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
  BrainCircuit,
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
  Sparkles,
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
  BrainCircuit,
  Sparkles,
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
  | "kotamed-ai"
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
  m("kotamed-ai", "KotaMed AI", "BrainCircuit", "tabs", [], {
    kind: "kotamed-ai",
    badge: "nuevo",
  }),

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
  /** Fórmula o método de cálculo mostrado en pantalla. */
  formula?: string;
  /** Valores normales o de referencia neonatales. */
  normal?: string;
  /** Fuente / bibliografía de respaldo. */
  refs?: string;
}

export interface CalcCategory {
  id: string;
  label: string;
  emoji: string;
  hint?: string;
  tools: CalcTool[];
}

const t = (
  id: string,
  label: string,
  hint: string,
  formula?: string,
  normal?: string,
  refs?: string,
): CalcTool => ({
  id,
  label,
  hint,
  ...(formula ? { formula } : {}),
  ...(normal ? { normal } : {}),
  ...(refs ? { refs } : {}),
});

export const CALC_CATEGORIES: CalcCategory[] = [
  {
    id: "antropometria",
    label: "Antropometría y edad",
    emoji: "📐",
    hint: "Clasificación por peso y edad gestacional, edad corregida y superficie corporal.",
    tools: [
      t("clasificacion", "Peso para edad gestacional", "Clasifica en PEG, AEG o GEG.", "Comparación del peso con la media de referencia para la EG", "AEG entre percentil 10 y 90", "Fenton 2013 · OMS"),
      t("corregida", "Edad corregida y postmenstrual", "Semanas postmenstruales y edad corregida a 40 sem.", "EPM = EG al nacer + días de vida / 7", "Corregida = EPM − 40 semanas", "AAP · Policy Statement Age Terminology"),
      t("peso", "Variación de peso", "Pérdida fisiológica y ganancia ponderal.", "g/kg/día = (peso actual − peso nacer) / (peso nacer/1000) / días", "Pérdida ≤ 10 % (RNT) y ≤ 15 % (pretérmino); ganancia 15–20 g/kg/día", "Cloherty · Fanaroff"),
      t("superficie", "Superficie corporal", "SC para dosis y aportes especiales.", "SC (m²) = √(talla cm × peso kg / 3600)", "RNT ≈ 0.20–0.25 m²", "Mosteller"),
    ],
  },
  {
    id: "liquidos",
    label: "Balance hídrico",
    emoji: "💧",
    hint: "Requerimiento hídrico, diuresis y balance de ingresos y egresos.",
    tools: [
      t("hidrico", "Requerimiento hídrico", "mL/kg/día según peso y día de vida.", "Volumen total = mL/kg/día × peso (kg)", "60–80 mL/kg/día el día 1, incrementos de 10–20 mL/kg/día", "MINSA · Cloherty"),
      t("balance", "Balance hídrico y diuresis", "Ingresos, egresos, diuresis en mL/kg/h.", "Diuresis = diuresis (mL) / peso (kg) / horas", "Diuresis normal 1–3 mL/kg/h", "Fanaroff & Martin"),
      t("deficit", "Déficit de bicarbonato", "Corrección de acidosis metabólica.", "HCO₃ a reponer = 0.3 × peso (kg) × exceso de base", "Corregir la mitad del déficit e reevaluar", "NRP · Cloherty"),
    ],
  },
  {
    id: "nutricion",
    label: "Nutrición y NPT",
    emoji: "🍼",
    hint: "GIR, nutrición parenteral, enteral, osmolaridad y aporte calórico.",
    tools: [
      t("npt", "NPT completa", "Volumen, GIR, kcal y electrolitos.", "Cálculo integrado de glucosa, aminoácidos, lípidos y electrolitos", "GIR 4–12 mg/kg/min · 90–120 kcal/kg/día", "ESPGHAN 2018"),
      t("gir", "GIR", "Velocidad de infusión de glucosa.", "GIR = (mL/día × %dextrosa × 10) / (peso kg × 1440)", "4–12 mg/kg/min", "ESPGHAN · Cloherty"),
      t("enteral", "Nutrición enteral", "Volumen por toma, intervalo y kcal.", "Volumen por toma = (mL/kg/día × peso) / tomas", "150–180 mL/kg/día al alcanzar aporte pleno", "ESPGHAN"),
      t("osmolaridad", "Osmolaridad de la mezcla", "Osmolaridad estimada para vía periférica.", "mOsm/L ≈ (g glucosa×5)+(g aminoácidos×10)+(mEq cationes×2)", "Vía periférica ≤ 900 mOsm/L", "ESPGHAN · A.S.P.E.N."),
    ],
  },
  {
    id: "medicamentos",
    label: "Medicamentos",
    emoji: "💊",
    hint: "Dosificación por peso, antibióticos, presets y volumen a administrar.",
    tools: [
      t("dose", "Dosis por peso", "mg/kg/dosis, mg/día y mL por dosis.", "Dosis = mg/kg × peso; mL = mg / concentración", "Verificar con protocolo del servicio", "Neofax · Cloherty"),
      t("ampicilina", "Ampicilina", "50 mg/kg/dosis.", "50 mg/kg/dosis", "c/12 h en ≤ 7 días de vida", "MINSA · Neofax"),
      t("gentamicina", "Gentamicina", "4 mg/kg/dosis.", "4 mg/kg/dosis", "Intervalo según EG y días de vida", "Neofax"),
      t("amikacina", "Amikacina", "15 mg/kg/dosis.", "15 mg/kg/dosis", "Intervalo 24–48 h según EG", "Neofax"),
      t("cafeina", "Cafeína citrato", "Carga 20 mg/kg, mantenimiento 5 mg/kg.", "Carga 20 mg/kg; mantenimiento 5–10 mg/kg/día", "Apnea del prematuro", "CAP Trial · AAP"),
      t("vitaminak", "Vitamina K", "1 mg IM (0.5 mg si < 1500 g).", "1 mg IM dosis única", "Profilaxis de enfermedad hemorrágica", "AAP"),
      t("surfactante", "Surfactante", "100–200 mg/kg intratraqueal.", "100–200 mg/kg", "Repetir a las 6–12 h si persiste requerimiento", "AAP · European Consensus"),
    ],
  },
  {
    id: "cardio",
    label: "Cardiología",
    emoji: "🫀",
    hint: "Score vasoactivo-inotrópico, adrenalina y dosis en infusión.",
    tools: [
      t("vis", "Score vasoactivo-inotrópico (VIS)", "Cuantifica el soporte hemodinámico.", "VIS = dopamina + dobutamina + 100×adrenalina + 10×milrinona + 10 000×vasopresina + 10×noradrenalina", "VIS > 20 indica soporte elevado", "Gaies et al., Pediatr Crit Care Med"),
      t("adrenalina", "Adrenalina", "Reanimación neonatal 1:10 000.", "0.02 mg/kg IV (0.2 mL/kg de 1:10 000)", "Repetir cada 3–5 min si FC < 60 lpm", "NRP 8.ª edición"),
      t("dose", "Infusión de inotrópicos", "Dosis por peso y dilución.", "mcg/kg/min a mL/h según concentración", "Titular por respuesta hemodinámica", "Neofax"),
    ],
  },
  {
    id: "respiratorio",
    label: "Respiratorio",
    emoji: "🫁",
    hint: "Índices de oxigenación, TET, surfactante y scores respiratorios.",
    tools: [
      t("io", "Índice de oxigenación (IO)", "Severidad de la insuficiencia respiratoria.", "IO = (MAP × FiO₂ × 100) / PaO₂", "IO > 15 grave; > 25 considerar ECMO/óxido nítrico", "AAP · Fanaroff"),
      t("aa", "Gradiente alvéolo-arterial", "Diferencia A-a de oxígeno.", "A-a = [FiO₂ × (Patm − 47) − PaCO₂/0.8] − PaO₂", "< 20 mmHg con FiO₂ 0.21", "Cloherty"),
      t("sf", "Relación SpO₂/FiO₂", "Alternativa no invasiva a PaO₂/FiO₂.", "S/F = SpO₂ / FiO₂", "S/F < 250 sugiere compromiso importante", "Pediatrics"),
      t("tet", "Tubo endotraqueal", "Diámetro y profundidad por peso.", "Profundidad (cm) = peso (kg) + 6", "TET 2.5 mm si < 1 kg; 3.0 si 1–2 kg; 3.5 si > 2 kg", "NRP"),
      t("silverman", "Silverman-Andersen", "Score de dificultad respiratoria.", "Suma de 5 ítems (0–2 cada uno)", "0–2 sin dificultad; ≥ 7 grave", "Silverman & Andersen"),
      t("downes", "Downes", "Severidad del distrés respiratorio.", "Suma de 5 ítems (0–2 cada uno)", "≤ 3 leve; 4–6 moderado; ≥ 7 grave", "Downes"),
      t("surfactante", "Surfactante", "Dosis por peso.", "100–200 mg/kg intratraqueal", "Técnica INSURE / LISA", "European Consensus 2022"),
    ],
  },
  {
    id: "laboratorio",
    label: "Laboratorio",
    emoji: "🧬",
    hint: "FENa, osmolaridad, anion gap y correcciones de sodio y calcio.",
    tools: [
      t("fena", "FENa", "Fracción excretada de sodio.", "FENa = (Na orina × Cr plasma) / (Na plasma × Cr orina) × 100", "< 1 % prerrenal; > 2.5 % renal (>3 % en pretérmino)", "Fanaroff"),
      t("osm", "Osmolaridad plasmática", "Osmolaridad calculada y brecha.", "Osm = 2×Na + glucosa/18 + urea/6", "275–295 mOsm/kg", "Cloherty"),
      t("aniongap", "Anion gap", "Diferencia aniónica para acidosis metabólica.", "AG = Na − (Cl + HCO₃)", "8–16 mEq/L", "Cloherty"),
      t("nacorr", "Sodio corregido", "Corrección por hiperglucemia.", "Na corregido = Na + 1.6 × (glucosa − 100)/100", "135–145 mEq/L", "Fanaroff"),
      t("cacorr", "Calcio corregido", "Corrección por albúmina.", "Ca corregido = Ca + 0.8 × (4 − albúmina)", "Ca total 8–10.4 mg/dL", "Cloherty"),
    ],
  },
  {
    id: "gasometria",
    label: "Gasometría",
    emoji: "🧪",
    hint: "Interpretación ácido-base completa con compensación.",
    tools: [
      t("gaso", "Interpretación ácido-base", "pH, pCO₂, HCO₃, EB y compensación.", "Clasificación por pH, pCO₂ y HCO₃ + anion gap", "pH 7.35–7.45 · pCO₂ 35–45 · HCO₃ 20–26 · EB ±4", "Cloherty · NRP"),
      t("deficit", "Déficit de bicarbonato", "Corrección de acidosis metabólica.", "HCO₃ = 0.3 × peso × exceso de base", "Corregir la mitad y reevaluar", "NRP"),
      t("aa", "Gradiente A-a", "Eficiencia del intercambio gaseoso.", "A-a = [FiO₂ × 713 − PaCO₂/0.8] − PaO₂", "< 20 mmHg en aire ambiente", "Cloherty"),
    ],
  },
  {
    id: "bilirrubina",
    label: "Hiperbilirrubinemia",
    emoji: "🌡️",
    hint: "Umbrales de fototerapia y exanguinotransfusión, y volumen de recambio.",
    tools: [
      t("bili", "Umbral de fototerapia", "Umbral según horas de vida, EG y riesgo.", "Nomograma AAP por horas de vida y factores de riesgo", "Umbral menor si EG < 38 sem o factores de riesgo", "AAP 2022 Hyperbilirubinemia Guideline"),
      t("exanguino", "Volumen de exanguinotransfusión", "Recambio de doble volemia.", "Volumen = 2 × 80 mL/kg × peso (kg)", "Alícuotas de 5–10 mL con monitorización continua", "AAP · Cloherty"),
    ],
  },
  {
    id: "neurologia",
    label: "Neurología",
    emoji: "🧠",
    hint: "Escalas de encefalopatía hipóxico-isquémica.",
    tools: [
      t("sarnat", "Sarnat modificado", "Estadificación de la encefalopatía.", "6 dominios clínicos, estadio I–III", "Estadio ≥ II candidato a hipotermia", "Sarnat & Sarnat · AAP"),
      t("thompson", "Score de Thompson", "Severidad y valor pronóstico en EHI.", "Suma de 9 ítems (0–3)", "> 10 sugiere EHI moderada-severa", "Thompson et al."),
    ],
  },
  {
    id: "infectologia",
    label: "Infectología",
    emoji: "🦠",
    hint: "Riesgo de sepsis neonatal precoz y esquemas antibióticos.",
    tools: [
      t("eos", "Riesgo de sepsis precoz", "Factores de riesgo materno y clínica del RN.", "Ponderación de factores de riesgo + estado clínico", "Clínica anormal → hemocultivo y antibióticos empíricos", "AAP · Kaiser EOS"),
      t("ampicilina", "Ampicilina", "Esquema empírico de primera línea.", "50 mg/kg/dosis", "c/12 h en ≤ 7 días de vida", "MINSA"),
      t("gentamicina", "Gentamicina", "Esquema empírico combinado.", "4 mg/kg/dosis", "Intervalo según EG", "Neofax"),
    ],
  },
  {
    id: "crecimiento",
    label: "Crecimiento",
    emoji: "📈",
    hint: "Ganancia ponderal, clasificación y edad corregida.",
    tools: [
      t("peso", "Ganancia ponderal", "% de variación y g/kg/día.", "g/kg/día = Δpeso / (peso nacer/1000) / días", "15–20 g/kg/día en el pretérmino estable", "Fenton · ESPGHAN"),
      t("clasificacion", "Clasificación por EG", "PEG, AEG o GEG.", "Percentil de peso para la edad gestacional", "AEG percentil 10–90", "Fenton 2013"),
      t("corregida", "Edad corregida", "Semanas postmenstruales.", "EPM = EG + días/7", "Seguimiento hasta 24 meses de edad corregida", "AAP"),
    ],
  },
  {
    id: "scores",
    label: "Scores clínicos",
    emoji: "📊",
    hint: "APGAR, Ballard, Capurro, SNAP-II, CRIB y escalas respiratorias.",
    tools: [
      t("apgar", "APGAR", "Al minuto y a los 5 minutos.", "Suma de 5 ítems (0–2)", "7–10 buena adaptación", "NRP"),
      t("ballard", "Ballard", "Edad gestacional por examen.", "Score neuromuscular + físico", "Margen ±2 semanas", "Ballard et al."),
      t("capurro", "Capurro", "Edad gestacional somática.", "EG = (204 + suma) / 7", "Margen ±1 semana", "Capurro"),
      t("silverman", "Silverman", "Dificultad respiratoria.", "Suma de 5 ítems (0–2)", "≥ 7 grave", "Silverman"),
      t("downes", "Downes", "Distrés respiratorio.", "Suma de 5 ítems (0–2)", "≥ 7 grave", "Downes"),
      t("crib", "CRIB II", "Riesgo de mortalidad en < 1500 g.", "Peso, EG, sexo y exceso de base", "Mayor puntaje, mayor mortalidad", "Parry et al."),
      t("snappe", "SNAPPE-II", "Severidad fisiológica neonatal.", "PA media, temperatura, PaO₂/FiO₂, pH, convulsiones, diuresis, peso, PEG, APGAR 5'", "> 40 alta severidad", "Richardson et al."),
    ],
  },
];


/* ================================================================== */
/*  PERSISTENCIA                                                       */
/* ================================================================== */

const NAV_SCOPE = "internado:pediatria-neonatologia:hospitalizacion:nav";

function normalize(cfg: Partial<NeoNavConfig> | null): NeoNavConfig {
  if (!cfg?.modules?.length) return DEFAULT_NEO_NAV;
  const saved = cfg.modules.map((mod) => ({
    ...mod,
    tabs: mod.tabs ?? [],
    roles: mod.roles ?? NEO_ROLES.map((r) => r.value),
    badge: mod.badge ?? null,
    enabled: mod.enabled !== false,
    hidden: mod.hidden === true,
    layout: mod.layout ?? "tabs",
    kind: mod.kind ?? "generic",
  }));
  // Los módulos nuevos incorporados por la plataforma se insertan en su
  // posición por defecto, sin borrar la arquitectura que el admin ya configuró.
  const modules = [...saved];
  DEFAULT_NEO_MODULES.forEach((def, defIndex) => {
    if (modules.some((s) => s.id === def.id)) return;
    // Busca el módulo por defecto previo que sí exista para anclar la posición.
    let anchor = -1;
    for (let i = defIndex - 1; i >= 0; i--) {
      const prev = DEFAULT_NEO_MODULES[i];
      const at = prev ? modules.findIndex((s) => s.id === prev.id) : -1;
      if (at >= 0) {
        anchor = at;
        break;
      }
    }
    modules.splice(anchor + 1, 0, { ...def, badge: def.badge ?? null });
  });
  return {
    modules,
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
