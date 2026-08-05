/**
 * KotaMed · Hospitalización Neonatal (Internado Médico).
 * Estructura de unidades, configuración editable de campos, calculadoras
 * clínicas, escalas y hooks de datos. Todo el contenido clínico es dinámico
 * (base de datos) — aquí solo vive la estructura y la matemática.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Cliente sin tipar para las tablas neo_* (tipos generados pueden ir por detrás). */
export const hdb = supabase as any;

export const CLINICO_BUCKET = "clinico";

/* ================================================================== */
/*  UNIDADES                                                           */
/* ================================================================== */

export interface NeoUnit {
  slug: string;
  title: string;
  short: string;
  description: string;
  accent: string;
}

export const NEO_UNITS: NeoUnit[] = [
  {
    slug: "atencion-inmediata",
    title: "Atención Inmediata",
    short: "AI",
    description: "Recepción del recién nacido, APGAR, reanimación y profilaxis.",
    accent: "oklch(0.72 0.16 60)",
  },
  {
    slug: "alojamiento-conjunto",
    title: "Alojamiento Conjunto",
    short: "AC",
    description: "RN sano junto a su madre: lactancia, tamizajes y alta.",
    accent: "oklch(0.72 0.14 150)",
  },
  {
    slug: "intermedios-i",
    title: "Cuidados Intermedios I",
    short: "CI-I",
    description: "Patología leve: ictericia, riesgo de sepsis, bajo peso.",
    accent: "oklch(0.70 0.13 210)",
  },
  {
    slug: "intermedios-ii",
    title: "Cuidados Intermedios II",
    short: "CI-II",
    description: "Soporte no invasivo, NPT, prematuros estables.",
    accent: "oklch(0.68 0.13 260)",
  },
  {
    slug: "ucin",
    title: "UCI Neonatal (UCIN)",
    short: "UCIN",
    description: "Ventilación mecánica, inotrópicos, prematuro extremo.",
    accent: "oklch(0.65 0.18 25)",
  },
  {
    slug: "archivo",
    title: "Archivo Clínico",
    short: "ARC",
    description: "Altas, fallecidos y referencias — historial completo.",
    accent: "oklch(0.60 0.02 260)",
  },
];

export function getUnit(slug: string) {
  return NEO_UNITS.find((u) => u.slug === slug) ?? NEO_UNITS[0]!;
}

export const NEO_STATUS = [
  { value: "hospitalizado", label: "Hospitalizado" },
  { value: "alta", label: "De alta" },
  { value: "referido", label: "Referido" },
  { value: "fallecido", label: "Fallecido" },
] as const;

/* ================================================================== */
/*  CONFIGURACIÓN DINÁMICA DE CAMPOS (editable por admin)              */
/* ================================================================== */

export type FieldType = "text" | "number" | "textarea" | "select" | "date" | "time" | "checkbox";

export interface DynamicField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  unit?: string;
  hint?: string;
  required?: boolean;
}

export interface DynamicGroup {
  key: string;
  title: string;
  fields: DynamicField[];
}

export interface HospitalConfig {
  general: DynamicGroup[];
  maternal: DynamicGroup[];
  exam: DynamicGroup[];
  /** Plantillas de evolución (SOAP / tradicional). */
  templates: { key: string; title: string; body: string }[];
  /** Categorías de laboratorio disponibles. */
  labCategories: string[];
  /** Tipos de estudio de imagen. */
  mediaKinds: string[];
  /** Protocolos internos del servicio (texto libre, editable). */
  protocols: { key: string; title: string; body: string }[];
}

const f = (
  key: string,
  label: string,
  type: FieldType = "text",
  extra: Partial<DynamicField> = {},
): DynamicField => ({ key, label, type, ...extra });

export const DEFAULT_HOSPITAL_CONFIG: HospitalConfig = {
  general: [
    {
      key: "identificacion",
      title: "Identificación del recién nacido",
      fields: [
        f("hc_madre", "HC de la madre"),
        f("cama", "Cama / incubadora"),
        f("tipo_parto", "Tipo de parto", "select", {
          options: ["Vaginal eutócico", "Vaginal instrumentado", "Cesárea electiva", "Cesárea de emergencia"],
        }),
        f("talla", "Talla", "number", { unit: "cm" }),
        f("perimetro_cefalico", "Perímetro cefálico", "number", { unit: "cm" }),
        f("perimetro_toracico", "Perímetro torácico", "number", { unit: "cm" }),
        f("apgar_1", "APGAR 1'", "number"),
        f("apgar_5", "APGAR 5'", "number"),
        f("clasificacion_peso", "Clasificación por peso", "select", {
          options: ["PEG (< p10)", "AEG (p10-p90)", "GEG (> p90)"],
        }),
        f("capurro_ballard", "Capurro / Ballard", "number", { unit: "sem" }),
      ],
    },
    {
      key: "reanimacion",
      title: "Atención inmediata / reanimación",
      fields: [
        f("liquido_amniotico", "Líquido amniótico", "select", {
          options: ["Claro", "Meconial fluido", "Meconial espeso", "Sanguinolento", "Fétido"],
        }),
        f("pasos_iniciales", "Pasos iniciales", "checkbox"),
        f("vpp", "Ventilación a presión positiva", "checkbox"),
        f("intubacion", "Intubación", "checkbox"),
        f("masaje_cardiaco", "Masaje cardíaco", "checkbox"),
        f("adrenalina", "Adrenalina", "checkbox"),
        f("profilaxis", "Profilaxis (vit. K / ocular)", "checkbox"),
        f("contacto_piel", "Contacto piel a piel", "checkbox"),
        f("observaciones_ai", "Observaciones", "textarea"),
      ],
    },
  ],
  maternal: [
    {
      key: "antecedentes",
      title: "Antecedentes maternos",
      fields: [
        f("edad_madre", "Edad materna", "number", { unit: "años" }),
        f("formula_obstetrica", "Fórmula obstétrica (G-P)"),
        f("cpn", "Controles prenatales", "number"),
        f("grupo_rh", "Grupo y factor"),
        f("serologias", "Serologías (VIH/Sífilis/HB)", "textarea"),
        f("patologia_materna", "Patología materna", "textarea", {
          hint: "PE, DM gestacional, ITU, RPM, corioamnionitis…",
        }),
        f("rpm_horas", "RPM", "number", { unit: "horas" }),
        f("corticoides", "Maduración pulmonar", "checkbox"),
        f("medicacion_materna", "Medicación en gestación", "textarea"),
      ],
    },
  ],
  exam: [
    {
      key: "vitales",
      title: "Funciones vitales al ingreso",
      fields: [
        f("fc", "FC", "number", { unit: "lpm" }),
        f("fr", "FR", "number", { unit: "rpm" }),
        f("t", "Temperatura", "number", { unit: "°C" }),
        f("sato2", "SatO₂", "number", { unit: "%" }),
        f("pa", "Presión arterial"),
        f("glucosa", "Glucemia", "number", { unit: "mg/dL" }),
        f("llenado_capilar", "Llenado capilar", "number", { unit: "seg" }),
      ],
    },
    {
      key: "segmentario",
      title: "Examen físico segmentario",
      fields: [
        f("piel", "Piel y mucosas", "textarea"),
        f("cabeza", "Cabeza y cuello", "textarea"),
        f("torax", "Tórax y pulmones", "textarea"),
        f("cardiovascular", "Cardiovascular", "textarea"),
        f("abdomen", "Abdomen y cordón", "textarea"),
        f("genitourinario", "Genitourinario", "textarea"),
        f("neurologico", "Neurológico y reflejos", "textarea"),
        f("osteomuscular", "Osteomuscular", "textarea"),
      ],
    },
  ],
  templates: [
    {
      key: "soap",
      title: "SOAP neonatal",
      body: "S: \nO: \nA: \nP: ",
    },
    {
      key: "tradicional",
      title: "Evolución tradicional",
      body: "Evolución:\n\nExamen físico:\n\nPlan de trabajo:",
    },
  ],
  labCategories: [
    "Hemograma",
    "PCR / Procalcitonina",
    "Bioquímica",
    "Electrolitos",
    "Bilirrubinas",
    "Gasometría (AGA)",
    "Hemocultivo",
    "Perfil de coagulación",
    "Tamizaje neonatal",
    "Otros",
  ],
  mediaKinds: ["Radiografía", "Ecografía", "Ecocardiografía", "Fotografía clínica", "Informe PDF", "Otro"],
  protocols: [
    { key: "sepsis", title: "Sepsis neonatal temprana", body: "Definir criterios, factores de riesgo y esquema antibiótico del servicio." },
    { key: "ictericia", title: "Ictericia neonatal", body: "Curvas de fototerapia y criterios de exanguinotransfusión." },
    { key: "sdr", title: "Síndrome de distrés respiratorio", body: "CPAP, surfactante y criterios de ventilación mecánica." },
  ],
};

/* ================================================================== */
/*  ESCALAS CLÍNICAS                                                   */
/* ================================================================== */

export const SILVERMAN_ITEMS = [
  { key: "torax", label: "Movimiento tóraco-abdominal" },
  { key: "tiraje", label: "Tiraje intercostal" },
  { key: "retraccion", label: "Retracción xifoidea" },
  { key: "aleteo", label: "Aleteo nasal" },
  { key: "quejido", label: "Quejido espiratorio" },
];

export const DOWNES_ITEMS = [
  { key: "fr", label: "Frecuencia respiratoria" },
  { key: "cianosis", label: "Cianosis" },
  { key: "retraccion", label: "Retracción" },
  { key: "quejido", label: "Quejido" },
  { key: "murmullo", label: "Murmullo vesicular" },
];

export function scaleTotal(values: Record<string, number> | undefined) {
  if (!values) return 0;
  return Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function silvermanReading(total: number) {
  if (total === 0) return "Sin dificultad respiratoria";
  if (total <= 3) return "Dificultad respiratoria leve";
  if (total <= 6) return "Dificultad respiratoria moderada";
  return "Dificultad respiratoria severa";
}

export function downesReading(total: number) {
  if (total <= 3) return "Distrés leve — oxígeno por cánula";
  if (total <= 6) return "Distrés moderado — considerar CPAP";
  return "Distrés severo — considerar ventilación mecánica";
}

/* ================================================================== */
/*  CALCULADORAS                                                       */
/* ================================================================== */

/** Requerimiento hídrico por día de vida (mL/kg/día) según peso. */
export function fluidRequirement(weightKg: number, dayOfLife: number) {
  const day = Math.max(1, Math.min(10, Math.round(dayOfLife)));
  const table = weightKg < 1
    ? [100, 120, 140, 150, 160, 170, 180, 180, 180, 180]
    : weightKg < 1.5
      ? [80, 100, 120, 130, 140, 150, 160, 160, 160, 160]
      : [60, 80, 100, 120, 140, 150, 150, 150, 150, 150];
  const mlKgDay = table[day - 1]!;
  const total = mlKgDay * weightKg;
  return { mlKgDay, totalMlDay: total, mlHour: total / 24 };
}

/** Nutrición parenteral total: cálculo de aportes y volúmenes. */
export interface NptInput {
  weightKg: number;
  totalMlKgDay: number;
  glucosePercent: number;
  aminoAcidsGKg: number;
  lipidsGKg: number;
  naMeqKg: number;
  kMeqKg: number;
  caMgKg: number;
  enteralMlKgDay: number;
}

export function calcNpt(i: NptInput) {
  const w = Math.max(0.3, i.weightKg || 0.3);
  const totalMl = i.totalMlKgDay * w;
  const enteralMl = i.enteralMlKgDay * w;
  const parenteralMl = Math.max(0, totalMl - enteralMl);
  const glucoseG = (parenteralMl * i.glucosePercent) / 100;
  const gir = (glucoseG * 1000) / (w * 1440); // mg/kg/min
  const aaG = i.aminoAcidsGKg * w;
  const lipG = i.lipidsGKg * w;
  const kcal = glucoseG * 3.4 + aaG * 4 + lipG * 9;
  return {
    totalMl,
    enteralMl,
    parenteralMl,
    mlHour: parenteralMl / 24,
    glucoseG,
    gir,
    aaG,
    lipG,
    lipidMl20: lipG / 0.2,
    naMeq: i.naMeqKg * w,
    kMeq: i.kMeqKg * w,
    caMg: i.caMgKg * w,
    kcal,
    kcalKg: kcal / w,
  };
}

/** Fórmula maternizada / lactancia: volumen por toma. */
export function calcFeeding(weightKg: number, mlKgDay: number, feedsPerDay: number) {
  const total = weightKg * mlKgDay;
  const perFeed = feedsPerDay > 0 ? total / feedsPerDay : 0;
  return {
    totalMlDay: total,
    perFeed,
    intervalHours: feedsPerDay > 0 ? 24 / feedsPerDay : 0,
    kcalKg: (total * 0.67) / Math.max(0.3, weightKg),
  };
}

/** Balance hídrico de 24 h. */
export function calcBalance(input: {
  weightKg: number;
  inputsMl: number;
  urineMl: number;
  urineHours: number;
  otherLossesMl: number;
}) {
  const w = Math.max(0.3, input.weightKg || 0.3);
  const hours = Math.max(1, input.urineHours || 24);
  const diuresis = input.urineMl / w / hours; // mL/kg/h
  const balance = input.inputsMl - (input.urineMl + input.otherLossesMl);
  return {
    diuresis,
    balance,
    balanceMlKg: balance / w,
    reading:
      diuresis < 1
        ? "Oliguria (< 1 mL/kg/h) — evaluar perfusión y aportes"
        : diuresis > 5
          ? "Poliuria (> 5 mL/kg/h) — evaluar glucosuria/tubulopatía"
          : "Diuresis adecuada",
  };
}

/** Dosis por peso. */
export function calcDose(weightKg: number, mgKgDose: number, dosesPerDay: number, concentrationMgMl: number) {
  const perDose = weightKg * mgKgDose;
  return {
    perDoseMg: perDose,
    perDayMg: perDose * Math.max(1, dosesPerDay),
    perDoseMl: concentrationMgMl > 0 ? perDose / concentrationMgMl : 0,
  };
}

export function dayOfLife(birth?: string | null, ref: Date = new Date()) {
  if (!birth) return 1;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return 1;
  const diff = Math.floor((ref.getTime() - b.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

/* ================================================================== */
/*  TIPOS DE FILA                                                      */
/* ================================================================== */

export interface NeoPatient {
  id: string;
  program_slug: string;
  area_slug: string;
  unit: string;
  hc: string | null;
  apellidos: string;
  nombres: string;
  sexo: string | null;
  fecha_nacimiento: string | null;
  hora_nacimiento: string | null;
  edad_gestacional: number | null;
  peso_nacimiento: number | null;
  diagnostico_ingreso: string | null;
  medico_responsable: string | null;
  fecha_ingreso: string;
  status: string;
  general: Record<string, any>;
  maternal: Record<string, any>;
  exam: Record<string, any>;
  diagnoses: { text: string; kind?: string }[];
  scales: Record<string, any>;
  ai_summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ================================================================== */
/*  HOOKS                                                             */
/* ================================================================== */

const CONFIG_SCOPE = "internado:pediatria-neonatologia:hospitalizacion";

export function useHospitalConfig() {
  return useQuery({
    queryKey: ["neo-config", CONFIG_SCOPE],
    queryFn: async (): Promise<HospitalConfig> => {
      const { data, error } = await hdb
        .from("neo_form_config")
        .select("config")
        .eq("scope", CONFIG_SCOPE)
        .maybeSingle();
      if (error) throw error;
      const cfg = (data?.config ?? null) as Partial<HospitalConfig> | null;
      if (!cfg) return DEFAULT_HOSPITAL_CONFIG;
      return { ...DEFAULT_HOSPITAL_CONFIG, ...cfg };
    },
  });
}

export function useSaveHospitalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: HospitalConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb
        .from("neo_form_config")
        .upsert({ scope: CONFIG_SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-config", CONFIG_SCOPE] }),
  });
}

export function usePatients(unit?: string, search = "") {
  return useQuery({
    queryKey: ["neo-patients", unit ?? "all", search],
    queryFn: async (): Promise<NeoPatient[]> => {
      let q = hdb.from("neo_patients").select("*").order("created_at", { ascending: false });
      if (unit) q = q.eq("unit", unit);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as NeoPatient[];
      const s = search.trim().toLowerCase();
      if (!s) return rows;
      return rows.filter((r) =>
        `${r.apellidos} ${r.nombres} ${r.hc ?? ""} ${r.diagnostico_ingreso ?? ""}`.toLowerCase().includes(s),
      );
    },
  });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: ["neo-patient", id],
    enabled: !!id,
    queryFn: async (): Promise<NeoPatient | null> => {
      const { data, error } = await hdb.from("neo_patients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as NeoPatient | null;
    },
  });
}

export function useChildRows(table: string, patientId: string | null, orderBy: string, asc = false) {
  return useQuery({
    queryKey: ["neo-child", table, patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await hdb
        .from(table)
        .select("*")
        .eq("patient_id", patientId)
        .order(orderBy, { ascending: asc });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function logAudit(input: {
  patientId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  detail?: Record<string, unknown>;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await hdb.from("neo_audit_log").insert({
      patient_id: input.patientId ?? null,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      action: input.action,
      detail: input.detail ?? {},
      actor: auth.user.id,
      actor_email: auth.user.email ?? null,
    });
  } catch {
    /* auditoría silenciosa */
  }
}

/** Sube un archivo clínico al bucket privado y devuelve su ruta + URL firmada. */
export async function uploadClinicalFile(patientId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${patientId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(CLINICO_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from(CLINICO_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  return { path, url: data?.signedUrl ?? null, mime: file.type };
}

export async function signedClinicalUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(CLINICO_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
