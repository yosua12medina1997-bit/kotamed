/**
 * KotaMed AI · Copiloto Clínico Neonatal.
 * Ensambla automáticamente todo el expediente del recién nacido (datos
 * generales, antecedentes maternos, escalas, evoluciones, laboratorios,
 * imágenes, medicación, nutrición y procedimientos) para que la IA nunca
 * vuelva a pedir información que ya existe en la historia clínica.
 * La configuración (prompts, modelo, funciones activas, bibliografía y
 * permisos) es 100 % editable por el administrador y persiste en la base de datos.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NEO_ROLES } from "@/lib/neonatal-nav";
import { dayOfLife, getUnit, hdb, type NeoPatient } from "@/lib/neonatal-hospital";

export const AI_DISCLAIMER =
  "La información proporcionada constituye apoyo para la toma de decisiones clínicas y no sustituye el criterio profesional del médico tratante.";

/* ================================================================== */
/*  FUNCIONES DEL COPILOTO                                             */
/* ================================================================== */

export type CopilotMode =
  | "resumen"
  | "interpretacion"
  | "docencia"
  | "laboratorio"
  | "imagen"
  | "evolucion"
  | "diferencial"
  | "medicamento"
  | "riesgos"
  | "bibliografia"
  | "pregunta";

export interface CopilotFunctionDef {
  id: CopilotMode;
  label: string;
  emoji: string;
  hint: string;
  /** Instrucción editable que se envía a la IA. */
  prompt: string;
  enabled: boolean;
  /** Solicita un texto adicional al usuario (laboratorio, fármaco, pregunta…). */
  input?: string;
}

const F = (
  id: CopilotMode,
  emoji: string,
  label: string,
  hint: string,
  prompt: string,
  input?: string,
): CopilotFunctionDef => ({ id, emoji, label, hint, prompt, enabled: true, ...(input ? { input } : {}) });

export const DEFAULT_COPILOT_FUNCTIONS: CopilotFunctionDef[] = [
  F(
    "resumen",
    "🧠",
    "Resumen inteligente",
    "Resumen clínico, problemas activos, línea de tiempo, riesgos y objetivos del día.",
    `Elabora el resumen inteligente del paciente con estas secciones obligatorias:
1) Resumen clínico narrativo (máx. 140 palabras).
2) Problemas activos.
3) Línea de tiempo de los eventos relevantes por día de vida.
4) Diagnósticos principales y secundarios.
5) Estado actual y estabilidad.
6) Riesgos y alertas de seguridad.
7) Prioridades clínicas y objetivos del día.`,
  ),
  F(
    "interpretacion",
    "🔬",
    "Interpretación clínica",
    "Fisiopatología, complicaciones esperables, exámenes faltantes y conducta según guías.",
    `Explica el caso con rigor docente: por qué presenta este cuadro, qué significa,
fisiopatología implicada, complicaciones que pueden aparecer, exámenes que faltan,
diagnósticos diferenciales, conducta recomendada por las guías y evidencia que la respalda.`,
  ),
  F(
    "docencia",
    "🎓",
    "Aprender sobre este paciente",
    "Convierte al paciente en una clase personalizada por temas.",
    `Convierte a este paciente en una clase. Genera los temas que corresponden EXCLUSIVAMENTE
a su condición (por ejemplo prematuridad, SDR, CPAP, surfactante, PDA, NPT, nutrición enteral,
sepsis neonatal, HIV, ROP) y, para cada tema, un microresumen docente con puntos clave,
errores frecuentes y una pregunta de autoevaluación.`,
  ),
  F(
    "laboratorio",
    "🧪",
    "Explicación de laboratorios",
    "Qué es, valores normales, sensibilidad, especificidad, limitaciones y aplicación clínica.",
    `Para el examen indicado explica: qué es, cómo se interpreta, valores normales neonatales
por día de vida y edad gestacional, sensibilidad, especificidad, limitaciones, evidencia y
aplicación clínica concreta en ESTE paciente.`,
    "Examen o resultado a explicar (p. ej. PCR 32 mg/L)",
  ),
  F(
    "imagen",
    "🩻",
    "Interpretación de imágenes",
    "Radiografía, ecografía, ecocardiograma y gasometría.",
    `Interpreta el estudio descrito (radiografía, ecografía, ecocardiograma o gasometría):
hallazgo por hallazgo, correlación clínica con este paciente, diagnósticos compatibles,
limitaciones del estudio y conducta sugerida.`,
    "Descripción del estudio o informe",
  ),
  F(
    "evolucion",
    "📝",
    "Ayuda para evoluciones",
    "SOAP, notas, interconsultas, epicrisis y resumen de alta.",
    `Redacta el documento solicitado (SOAP, nota, interconsulta, epicrisis o resumen de alta)
usando únicamente datos presentes en la historia clínica, con lenguaje de historia clínica
hospitalaria peruana. No inventes datos ausentes; señala los vacíos como "no consignado".`,
    "Documento requerido y notas del interno",
  ),
  F(
    "diferencial",
    "🧩",
    "Diagnóstico diferencial",
    "Diferenciales ordenados por probabilidad con justificación y guías.",
    `Genera diagnósticos diferenciales ordenados por probabilidad. Para cada uno: justificación
con datos del expediente, hallazgos que lo apoyan y lo descartan, examen confirmatorio y guía
o evidencia que lo respalda.`,
  ),
  F(
    "medicamento",
    "💊",
    "Explicación de medicamentos",
    "Indicaciones, mecanismo, dosis neonatal, dilución, compatibilidad y monitorización.",
    `Para el fármaco indicado desarrolla: indicaciones, mecanismo de acción, dosis neonatal por
kg y por edad gestacional/postnatal, dilución y concentración final, compatibilidad IV,
efectos adversos, contraindicaciones, ajuste renal y hepático, monitorización, interacciones y
evidencia. Contextualiza la dosis con el peso real de este paciente.`,
    "Medicamento",
  ),
  F(
    "riesgos",
    "⚠️",
    "Riesgos automáticos",
    "Hipoglucemia, NEC, ROP, DBP, sepsis, HIV, hiperbilirrubinemia, anemia y más.",
    `Enumera los riesgos activos de este paciente (hipoglucemia, NEC, ROP, DBP, sepsis, HIV,
hiperbilirrubinemia, anemia, hemorragia, hipocalcemia, entre otros). Para cada riesgo: nivel
(alto/moderado/bajo), factores del expediente que lo determinan, vigilancia recomendada y
medida preventiva concreta.`,
  ),
  F(
    "bibliografia",
    "📚",
    "Bibliografía inteligente",
    "MINSA, AAP, OMS, NRP, NeoReviews, Pediatrics, Nelson, Cloherty, Avery, Fanaroff.",
    `Relaciona bibliografía pertinente a ESTE paciente. Para cada referencia indica fuente
(MINSA, AAP, OMS, NRP, NeoReviews, Pediatrics, Nelson, Cloherty, Avery, Fanaroff o guía
hospitalaria), el tema que resuelve y la recomendación puntual aplicable.`,
  ),
  F(
    "pregunta",
    "💬",
    "Preguntar a la IA",
    "Consulta clínica libre con todo el expediente ya cargado.",
    `Responde la consulta del usuario usando el expediente completo. No pidas datos que ya
están en la historia clínica. Estructura la respuesta en secciones claras y cita la evidencia.`,
    "Tu consulta clínica",
  ),
];

/* ================================================================== */
/*  CONFIGURACIÓN EDITABLE                                             */
/* ================================================================== */

export const COPILOT_MODELS = [
  { value: "google/gemini-3.6-flash", label: "KotaMed AI · Rápido (recomendado)" },
  { value: "google/gemini-3.5-flash", label: "KotaMed AI · Equilibrado" },
  { value: "google/gemini-3.1-pro-preview", label: "KotaMed AI · Razonamiento profundo" },
  { value: "google/gemini-2.5-flash-lite", label: "KotaMed AI · Económico" },
] as const;

export interface CopilotConfig {
  system: string;
  model: string;
  functions: CopilotFunctionDef[];
  /** Protocolos del servicio que la IA debe respetar. */
  protocols: { title: string; body: string }[];
  /** Referencias preferentes del servicio. */
  references: string[];
  roles: string[];
  audit: boolean;
  disclaimer: string;
}

export const DEFAULT_COPILOT_CONFIG: CopilotConfig = {
  system: `Eres KOTAMED AI, copiloto clínico de un Servicio de Neonatología de nivel III en Perú.
Acompañas a internos, residentes, pediatras y neonatólogos.
Respondes en español clínico, preciso y sin relleno; nada de emojis ni markdown pesado.
Usas exclusivamente los datos del expediente entregado: nunca pidas información que ya está allí.
Te apoyas en evidencia vigente: MINSA Perú, AAP, OMS, NRP, NeoReviews, Pediatrics, Nelson 21ed,
Cloherty, Avery y Fanaroff. Cuando un dato falta, lo señalas como vacío de información.
Nunca reemplazas el juicio clínico del médico tratante.`,
  model: "google/gemini-3.6-flash",
  functions: DEFAULT_COPILOT_FUNCTIONS,
  protocols: [
    {
      title: "Riesgo de sepsis neonatal precoz",
      body: "Aplicar factores de riesgo materno (RPM > 18 h, fiebre materna, corioamnionitis, EGB) y evaluar con hemograma y PCR seriada a las 12–24 h.",
    },
    {
      title: "Umbral de hipoglucemia",
      body: "Mantener glucemia > 45 mg/dL en las primeras 48 h y > 50 mg/dL después; controles seriados en RN de riesgo.",
    },
  ],
  references: [
    "MINSA · NT de atención del recién nacido",
    "AAP · Clinical Practice Guidelines",
    "NRP 8.ª edición",
    "Cloherty · Manual of Neonatal Care",
    "Fanaroff & Martin · Neonatal-Perinatal Medicine",
    "NeoReviews / Pediatrics",
  ],
  roles: NEO_ROLES.map((r) => r.value),
  audit: true,
  disclaimer: AI_DISCLAIMER,
};

const AI_SCOPE = "internado:pediatria-neonatologia:hospitalizacion:ai";

function normalizeCopilot(cfg: Partial<CopilotConfig> | null): CopilotConfig {
  if (!cfg) return DEFAULT_COPILOT_CONFIG;
  const saved = cfg.functions ?? [];
  const functions = DEFAULT_COPILOT_FUNCTIONS.map((def) => {
    const hit = saved.find((s) => s.id === def.id);
    return hit ? { ...def, ...hit } : def;
  });
  return {
    ...DEFAULT_COPILOT_CONFIG,
    ...cfg,
    functions,
    protocols: cfg.protocols ?? DEFAULT_COPILOT_CONFIG.protocols,
    references: cfg.references ?? DEFAULT_COPILOT_CONFIG.references,
    roles: cfg.roles ?? DEFAULT_COPILOT_CONFIG.roles,
    disclaimer: cfg.disclaimer || AI_DISCLAIMER,
  };
}

export function useCopilotConfig() {
  return useQuery({
    queryKey: ["neo-ai-config", AI_SCOPE],
    queryFn: async (): Promise<CopilotConfig> => {
      const { data, error } = await hdb
        .from("neo_form_config")
        .select("config")
        .eq("scope", AI_SCOPE)
        .maybeSingle();
      if (error) throw error;
      return normalizeCopilot((data?.config ?? null) as Partial<CopilotConfig> | null);
    },
  });
}

export function useSaveCopilotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CopilotConfig) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await hdb
        .from("neo_form_config")
        .upsert({ scope: AI_SCOPE, config, updated_by: auth.user?.id ?? null }, { onConflict: "scope" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neo-ai-config", AI_SCOPE] }),
  });
}

/* ================================================================== */
/*  EXPEDIENTE COMPLETO → CONTEXTO PARA LA IA                          */
/* ================================================================== */

export interface PatientDossier {
  evolutions: any[];
  labs: any[];
  media: any[];
  medications: any[];
  nutrition: any[];
  procedures: any[];
}

const EMPTY_DOSSIER: PatientDossier = {
  evolutions: [],
  labs: [],
  media: [],
  medications: [],
  nutrition: [],
  procedures: [],
};

/** Descarga en paralelo todo el expediente clínico del paciente. */
export function usePatientDossier(patientId: string | null) {
  return useQuery({
    queryKey: ["neo-dossier", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<PatientDossier> => {
      const tables: [keyof PatientDossier, string, string][] = [
        ["evolutions", "neo_evolutions", "recorded_at"],
        ["labs", "neo_labs", "taken_at"],
        ["media", "neo_media", "taken_at"],
        ["medications", "neo_medications", "started_at"],
        ["nutrition", "neo_nutrition", "recorded_at"],
        ["procedures", "neo_procedures", "performed_at"],
      ];
      const out: PatientDossier = { ...EMPTY_DOSSIER };
      await Promise.all(
        tables.map(async ([key, table, order]) => {
          const { data } = await hdb
            .from(table)
            .select("*")
            .eq("patient_id", patientId)
            .order(order, { ascending: true });
          out[key] = data ?? [];
        }),
      );
      return out;
    },
  });
}

function kv(obj: Record<string, any> | null | undefined) {
  if (!obj) return "";
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join("; ");
}

function block(title: string, body: string) {
  return body.trim() ? `\n## ${title}\n${body.trim()}` : "";
}

/** Convierte todo el expediente en un texto clínico ordenado para la IA. */
export function buildPatientContext(patient: NeoPatient, d: PatientDossier = EMPTY_DOSSIER) {
  const dol = dayOfLife(patient.fecha_nacimiento);
  const eg = patient.edad_gestacional;
  const pm = eg ? eg + dol / 7 : null;
  const identity = [
    `Paciente: ${patient.apellidos} ${patient.nombres}`,
    patient.hc ? `HC: ${patient.hc}` : "",
    `Unidad: ${getUnit(patient.unit).title}`,
    `Estado: ${patient.status}`,
    patient.sexo ? `Sexo: ${patient.sexo}` : "",
    `Edad gestacional al nacer: ${eg ?? "no consignada"} semanas`,
    `Edad cronológica: ${dol} días de vida`,
    pm ? `Edad postmenstrual: ${pm.toFixed(1)} semanas` : "",
    `Peso al nacer: ${patient.peso_nacimiento ?? "no consignado"} g`,
    patient.diagnostico_ingreso ? `Diagnóstico de ingreso: ${patient.diagnostico_ingreso}` : "",
    patient.medico_responsable ? `Médico responsable: ${patient.medico_responsable}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const dx = (patient.diagnoses ?? [])
    .map((x: any) => `- ${x.text}${x.kind ? ` (${x.kind})` : ""}`)
    .join("\n");

  const evo = d.evolutions
    .slice(-12)
    .map((e: any) => {
      const c = e.content ?? {};
      const body =
        typeof c === "string"
          ? c
          : Object.entries(c)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
              .join(" | ");
      return `- Día ${e.day_number} (${String(e.recorded_at).slice(0, 16)}) ${body}${
        kv(e.vitals) ? ` || Vitales: ${kv(e.vitals)}` : ""
      }`;
    })
    .join("\n");

  const labs = d.labs
    .slice(-20)
    .map(
      (l: any) =>
        `- ${String(l.taken_at).slice(0, 10)} [${l.category}] ${l.name}: ${kv(l.results) || "sin valores"}${
          l.interpretation ? ` → ${l.interpretation}` : ""
        }`,
    )
    .join("\n");

  const media = d.media
    .slice(-12)
    .map(
      (m: any) =>
        `- ${String(m.taken_at).slice(0, 10)} ${m.kind ?? "estudio"}: ${m.findings ?? m.comments ?? "sin informe"}`,
    )
    .join("\n");

  const meds = d.medications
    .map(
      (m: any) =>
        `- ${m.name}${m.dose ? ` ${m.dose}` : ""}${m.route ? ` ${m.route}` : ""}${
          m.frequency ? ` ${m.frequency}` : ""
        } (${m.status ?? "activo"}${m.started_at ? `, inicio ${String(m.started_at).slice(0, 10)}` : ""})`,
    )
    .join("\n");

  const nut = d.nutrition
    .slice(-10)
    .map((n: any) => `- ${String(n.recorded_at).slice(0, 10)} ${kv(n) || "sin datos"}`)
    .join("\n");

  const proc = d.procedures
    .map(
      (p: any) =>
        `- ${String(p.performed_at ?? "").slice(0, 10)} ${p.name ?? p.kind ?? "procedimiento"}: ${
          p.notes ?? p.detail ?? ""
        }`,
    )
    .join("\n");

  return [
    `# EXPEDIENTE CLÍNICO NEONATAL`,
    identity,
    block("Diagnósticos", dx),
    block("Datos generales", kv(patient.general)),
    block("Antecedentes maternos, embarazo y parto", kv(patient.maternal)),
    block("Examen físico", kv(patient.exam)),
    block("Escalas (APGAR, Silverman, Ballard, Capurro, Downes)", kv(patient.scales)),
    block("Evoluciones y signos vitales", evo),
    block("Laboratorios y cultivos", labs),
    block("Imágenes, ecografías y ecocardiogramas", media),
    block("Medicación e indicaciones", meds),
    block("Nutrición, NPT y balance", nut),
    block("Procedimientos", proc),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 24000);
}

/** Alertas y riesgos calculados localmente (sin IA) para la pantalla del módulo. */
export function computeRiskFlags(patient: NeoPatient) {
  const eg = patient.edad_gestacional ?? 40;
  const pn = patient.peso_nacimiento ?? 3000;
  const dol = dayOfLife(patient.fecha_nacimiento);
  const flags: { label: string; level: "alto" | "moderado" | "bajo"; why: string }[] = [];
  const add = (label: string, level: "alto" | "moderado" | "bajo", why: string) =>
    flags.push({ label, level, why });

  if (eg < 32) add("Prematuridad extrema", "alto", `${eg} semanas de edad gestacional`);
  else if (eg < 37) add("Prematuridad", "moderado", `${eg} semanas de edad gestacional`);
  if (pn < 1000) add("Peso extremadamente bajo", "alto", `${pn} g al nacer`);
  else if (pn < 1500) add("Muy bajo peso al nacer", "alto", `${pn} g al nacer`);
  else if (pn < 2500) add("Bajo peso al nacer", "moderado", `${pn} g al nacer`);
  if (eg < 34 || pn < 2000) add("Riesgo de hipoglucemia", "moderado", "Prematuro y/o bajo peso");
  if (eg < 32 || pn < 1500) {
    add("Riesgo de enterocolitis (NEC)", "moderado", "Prematuro de muy bajo peso");
    add("Riesgo de ROP", "moderado", "Requiere tamizaje oftalmológico programado");
    add("Riesgo de DBP", "moderado", "Vigilar dependencia de oxígeno a las 36 semanas");
    add("Riesgo de HIV", "moderado", "Ecografía transfontanelar seriada");
  }
  if (dol <= 3) add("Riesgo de sepsis precoz", "moderado", `${dol} día(s) de vida`);
  else add("Riesgo de sepsis tardía", "bajo", "Vigilancia de accesos e invasivos");
  if (dol >= 1 && dol <= 7) add("Riesgo de hiperbilirrubinemia", "moderado", "Ventana de ictericia fisiológica y patológica");
  if (eg < 34) add("Riesgo de anemia del prematuro", "bajo", "Control de hematocrito seriado");
  return flags;
}
