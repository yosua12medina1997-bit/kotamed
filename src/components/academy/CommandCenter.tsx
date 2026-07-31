/**
 * 👑 COMMAND CENTER™ — centro de operaciones profesional del usuario.
 * Vive dentro del antiguo módulo "Configuración" del área; no altera rutas,
 * navegación ni componentes existentes. Workspaces internos: Overview,
 * Identity, Mastery, Performance, Missions, AI Coach, Legacy, System y Vault.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  Award,
  BookOpen,
  BrainCircuit,
  Crown,
  Flame,
  Gauge,
  LineChart,
  Lock,
  Rocket,
  Save,
  Settings,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { coachAnalyze, generateMissions } from "@/lib/academy-ai.functions";
import { useSupabaseUser } from "@/lib/session";
import { Btn, Chip, Empty, Field, Input, Metric, Panel, Select, Textarea } from "./ui";
import { db, fmtMinutes } from "./api";

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

type Identity = {
  fullName: string;
  title: string;
  specialty: string;
  subspecialty: string;
  academicLevel: string;
  residencyYear: string;
  hospital: string;
  university: string;
  competencies: string;
  interests: string;
  goals: string;
  purpose: string;
  mission: string;
  vision: string;
  evolution: string;
};

type Mission = {
  id: string;
  horizon: string;
  title: string;
  detail: string;
  metric: string;
  priority: number;
  done: boolean;
};

type LegacyEntry = {
  id: string;
  kind: string;
  title: string;
  place: string;
  date: string;
  notes: string;
};

type SystemPrefs = {
  language: string;
  appearance: string;
  notifications: boolean;
  digest: boolean;
  privacy: string;
  sync: boolean;
  deepWorkGoal: number;
};

type CenterDoc = {
  identity: Identity;
  missions: Mission[];
  legacy: LegacyEntry[];
  coach: any;
  system_prefs: SystemPrefs;
};

const EMPTY_IDENTITY: Identity = {
  fullName: "",
  title: "",
  specialty: "",
  subspecialty: "",
  academicLevel: "",
  residencyYear: "",
  hospital: "",
  university: "",
  competencies: "",
  interests: "",
  goals: "",
  purpose: "",
  mission: "",
  vision: "",
  evolution: "",
};

const EMPTY_PREFS: SystemPrefs = {
  language: "Español",
  appearance: "Sistema",
  notifications: true,
  digest: true,
  privacy: "Privado",
  sync: true,
  deepWorkGoal: 90,
};

const HORIZONS = [
  "diario",
  "semanal",
  "mensual",
  "anual",
  "residencia",
  "investigación",
  "publicaciones",
  "clínico",
] as const;

const LEGACY_KINDS = [
  "Caso clínico",
  "Procedimiento",
  "Certificado",
  "Congreso",
  "Rotación",
  "Publicación",
  "Investigación",
  "Tesis",
  "Logro",
  "Reconocimiento",
  "Experiencia",
] as const;

const WORKSPACES = [
  { id: "overview", label: "Overview", icon: Crown },
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "mastery", label: "Mastery", icon: Rocket },
  { id: "performance", label: "Performance", icon: LineChart },
  { id: "missions", label: "Missions", icon: Target },
  { id: "coach", label: "AI Coach", icon: BrainCircuit },
  { id: "legacy", label: "Legacy", icon: Award },
  { id: "system", label: "System", icon: Settings },
  { id: "vault", label: "Vault", icon: Lock },
] as const;

type WorkspaceId = (typeof WORKSPACES)[number]["id"];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ------------------------------------------------------------------ */
/*  Componente principal                                              */
/* ------------------------------------------------------------------ */

export function CommandCenter({ meta }: { meta: EnamAreaMeta; isAdmin?: boolean }) {
  const accent = meta.accent;
  const qc = useQueryClient();
  const user = useSupabaseUser();
  const [ws, setWs] = useState<WorkspaceId>("overview");

  const doc = useQuery({
    queryKey: ["command-center", meta.slug, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("command_center")
        .select("identity,missions,legacy,coach,system_prefs")
        .eq("area_slug", meta.slug)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return {
        identity: { ...EMPTY_IDENTITY, ...(data?.identity ?? {}) },
        missions: (data?.missions ?? []) as Mission[],
        legacy: (data?.legacy ?? []) as LegacyEntry[],
        coach: data?.coach ?? null,
        system_prefs: { ...EMPTY_PREFS, ...(data?.system_prefs ?? {}) },
      } as CenterDoc;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<CenterDoc>) => {
      if (!user?.id) throw new Error("Inicia sesión.");
      const { error } = await db.from("command_center").upsert(
        {
          user_id: user.id,
          area_slug: meta.slug,
          ...patch,
        },
        { onConflict: "user_id,area_slug" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["command-center", meta.slug, user?.id] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar."),
  });

  const events = useQuery({
    queryKey: ["cc-events", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_study_events")
        .select("activity,minutes,topic,score,created_at")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const attempts = useQuery({
    queryKey: ["cc-attempts", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_attempts")
        .select("is_correct,seconds,topic,created_at")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const stats = useStats(events.data ?? [], attempts.data ?? []);
  const identity = doc.data?.identity ?? EMPTY_IDENTITY;
  const coach = doc.data?.coach ?? null;

  const statsText = useMemo(
    () =>
      [
        `Área: ${meta.title}`,
        `Minutos totales: ${stats.total}`,
        `Últimos 7 días: ${stats.week} min · 30 días: ${stats.month} min · 365 días: ${stats.year} min`,
        `Deep Work acumulado: ${stats.deepWork} min`,
        `Racha: ${stats.streak} días`,
        `Preguntas: ${stats.attempts} (aciertos ${stats.accuracy}%, tiempo medio ${stats.avgTime}s)`,
        `Actividades: ${stats.byActivity.map((a) => `${a.k}=${a.v}min`).join(", ") || "sin registro"}`,
        `Temas trabajados: ${stats.topics.map((t) => `${t.k}(${t.v})`).join(", ") || "sin registro"}`,
        `Temas con más errores: ${stats.weakTopics.join(", ") || "sin registro"}`,
      ].join("\n"),
    [meta.title, stats],
  );

  const identityText = useMemo(
    () =>
      Object.entries(identity)
        .filter(([, v]) => String(v).trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    [identity],
  );

  const runCoach = useServerFn(coachAnalyze);
  const runMissions = useServerFn(generateMissions);
  const [busy, setBusy] = useState<"coach" | "missions" | null>(null);

  async function analyze() {
    setBusy("coach");
    try {
      const report = await runCoach({
        data: { stats: statsText, identity: identityText, area: meta.title },
      });
      await save.mutateAsync({ coach: { ...report, at: new Date().toISOString() } as any });
      toast.success("Análisis del mentor actualizado.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo analizar.");
    } finally {
      setBusy(null);
    }
  }

  async function buildMissions() {
    setBusy("missions");
    try {
      const list = await runMissions({
        data: { stats: statsText, identity: identityText, area: meta.title },
      });
      const next: Mission[] = list.map((m: any) => ({
        id: uid(),
        horizon: String(m.horizon ?? "diario"),
        title: String(m.title ?? ""),
        detail: String(m.detail ?? ""),
        metric: String(m.metric ?? ""),
        priority: Number(m.priority ?? 3),
        done: false,
      }));
      const keep = (doc.data?.missions ?? []).filter((m) => m.done);
      await save.mutateAsync({ missions: [...keep, ...next] as any });
      toast.success("Misiones reajustadas por IA.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudieron generar misiones.");
    } finally {
      setBusy(null);
    }
  }

  const displayName =
    identity.fullName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "Doctor");

  return (
    <Panel
      title="👑 Command Center™"
      subtitle={`Puente de mando de ${meta.title}. Aquí no configuras una aplicación: diseñas la mejor versión de ti como especialista.`}
      icon={<Crown className="size-4" />}
      accent={accent}
      actions={
        <>
          <Btn onClick={analyze} loading={busy === "coach"} variant="outline">
            <BrainCircuit className="size-3.5" /> Analizar con AI Coach
          </Btn>
          <Btn onClick={buildMissions} loading={busy === "missions"} variant="solid" accent={accent}>
            <Target className="size-3.5" /> Reajustar misiones
          </Btn>
        </>
      }
    >
      {/* Navegación interna */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/50 bg-background/40 p-1.5">
        {WORKSPACES.map((w) => {
          const WIcon = w.icon;
          const active = ws === w.id;
          return (
            <button
              key={w.id}
              onClick={() => setWs(w.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                active
                  ? "bg-foreground/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={active ? { color: accent } : undefined}
            >
              <WIcon className="size-3.5" strokeWidth={2.3} /> {w.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-5">
        {ws === "overview" && (
          <Overview
            accent={accent}
            name={displayName}
            stats={stats}
            coach={coach}
            missions={doc.data?.missions ?? []}
            goal={doc.data?.system_prefs?.deepWorkGoal ?? 90}
          />
        )}
        {ws === "identity" && (
          <IdentityWorkspace
            accent={accent}
            value={identity}
            saving={save.isPending}
            onSave={(v) => save.mutate({ identity: v as any })}
          />
        )}
        {ws === "mastery" && (
          <MasteryWorkspace accent={accent} stats={stats} coach={coach} meta={meta} />
        )}
        {ws === "performance" && <PerformanceWorkspace accent={accent} stats={stats} />}
        {ws === "missions" && (
          <MissionsWorkspace
            accent={accent}
            missions={doc.data?.missions ?? []}
            onChange={(m) => save.mutate({ missions: m as any })}
          />
        )}
        {ws === "coach" && (
          <CoachWorkspace accent={accent} coach={coach} onRun={analyze} busy={busy === "coach"} />
        )}
        {ws === "legacy" && (
          <LegacyWorkspace
            accent={accent}
            entries={doc.data?.legacy ?? []}
            onChange={(l) => save.mutate({ legacy: l as any })}
          />
        )}
        {ws === "system" && (
          <SystemWorkspace
            accent={accent}
            prefs={doc.data?.system_prefs ?? EMPTY_PREFS}
            email={user?.email ?? ""}
            onSave={(p) => save.mutate({ system_prefs: p as any })}
          />
        )}
        {ws === "vault" && <VaultWorkspace accent={accent} meta={meta} />}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Métricas                                                           */
/* ------------------------------------------------------------------ */

type Stats = ReturnType<typeof computeStats>;

function computeStats(evs: any[], ats: any[]) {
  const now = Date.now();
  const byDay = new Map<string, number>();
  for (const e of evs) {
    const k = String(e.created_at).slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + (e.minutes ?? 0));
  }
  const since = (days: number) =>
    Math.round(
      evs
        .filter((e) => new Date(e.created_at).getTime() >= now - days * 86400000)
        .reduce((s, e) => s + (e.minutes ?? 0), 0),
    );
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const k = new Date(now - i * 86400000).toISOString().slice(0, 10);
    if ((byDay.get(k) ?? 0) > 0) streak++;
    else if (i > 0) break;
  }
  const group = (arr: any[], key: string) => {
    const m = new Map<string, number>();
    for (const x of arr) {
      const k = x[key] ? String(x[key]) : "General";
      m.set(k, (m.get(k) ?? 0) + (x.minutes ?? 1));
    }
    return [...m.entries()]
      .map(([k, v]) => ({ k, v: Math.round(v) }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 12);
  };
  const correct = ats.filter((a) => a.is_correct).length;
  const wrongByTopic = new Map<string, number>();
  for (const a of ats) {
    if (a.is_correct) continue;
    const k = a.topic ? String(a.topic) : "General";
    wrongByTopic.set(k, (wrongByTopic.get(k) ?? 0) + 1);
  }
  const deepWork = Math.round(
    evs
      .filter((e) => (e.minutes ?? 0) >= 45 || String(e.activity).includes("deep"))
      .reduce((s, e) => s + (e.minutes ?? 0), 0),
  );
  const total = Math.round(evs.reduce((s, e) => s + (e.minutes ?? 0), 0));
  const accuracy = ats.length ? Math.round((correct / ats.length) * 100) : 0;
  const heat = Array.from({ length: 126 }, (_, i) => {
    const d = new Date(now - (125 - i) * 86400000).toISOString().slice(0, 10);
    return { day: d, min: byDay.get(d) ?? 0 };
  });
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const from = now - (11 - i) * 7 * 86400000;
    const to = from + 7 * 86400000;
    const min = evs
      .filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t >= from && t < to;
      })
      .reduce((s, e) => s + (e.minutes ?? 0), 0);
    return Math.round(min);
  });
  const mastery = Math.min(
    100,
    Math.round(accuracy * 0.45 + Math.min(streak, 30) * 1.1 + Math.min(total / 60, 60) * 0.5),
  );
  return {
    total,
    week: since(7),
    month: since(30),
    year: since(365),
    deepWork,
    streak,
    attempts: ats.length,
    accuracy,
    avgTime: ats.length
      ? Math.round(ats.reduce((s, a) => s + (a.seconds ?? 0), 0) / ats.length)
      : 0,
    byActivity: group(evs, "activity"),
    topics: group(evs, "topic"),
    weakTopics: [...wrongByTopic.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k),
    heat,
    weeks,
    mastery,
    activeDays: [...byDay.values()].filter((v) => v > 0).length,
  };
}

function useStats(evs: any[], ats: any[]) {
  return useMemo(() => computeStats(evs, ats), [evs, ats]);
}

/* ------------------------------------------------------------------ */
/*  Overview                                                           */
/* ------------------------------------------------------------------ */

function Overview({
  accent,
  name,
  stats,
  coach,
  missions,
  goal,
}: {
  accent: string;
  name: string;
  stats: Stats;
  coach: any;
  missions: Mission[];
  goal: number;
}) {
  const priority =
    coach?.focusToday ||
    [...missions].filter((m) => !m.done).sort((a, b) => a.priority - b.priority)[0]?.title ||
    "Define tu primera misión del día en Missions.";
  const weekPct = Math.min(100, Math.round((stats.week / Math.max(goal * 5, 1)) * 100));
  const score = coach?.masteryScore ?? stats.mastery;

  return (
    <>
      <div
        className="rounded-3xl border border-border/50 p-6 md:p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 12%, transparent), transparent 70%)`,
        }}
      >
        <Chip accent={accent}>
          <Crown className="size-3" /> Command Center
        </Chip>
        <h3 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
          Bienvenido nuevamente, {name}.
        </h3>
        <p className="mt-2 text-sm text-foreground/80 max-w-2xl leading-relaxed">
          Cada sesión representa una oportunidad para perfeccionar tu criterio clínico, fortalecer
          tu conocimiento y acercarte a convertirte en un referente de tu especialidad. Tu evolución
          continúa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mastery Score" value={`${score}`} accent={accent} hint="0 – 100" />
        <Metric
          label="Nivel profesional"
          value={coach?.level ?? nivelDe(score)}
          accent={accent}
          hint="Calculado por IA"
        />
        <Metric
          label="Deep Work acumulado"
          value={fmtMinutes(stats.deepWork)}
          accent={accent}
          hint={`Meta diaria ${goal} min`}
        />
        <Metric
          label="Progreso semanal"
          value={`${weekPct}%`}
          accent={accent}
          hint={fmtMinutes(stats.week)}
        />
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Objetivo prioritario de hoy
        </div>
        <p className="mt-1.5 text-sm font-semibold">{priority}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoCard
          accent={accent}
          icon={<BookOpen className="size-3.5" />}
          label="Caso clínico recomendado"
          text={coach?.recommendedCase ?? "Ejecuta el AI Coach para recibir una recomendación."}
        />
        <InfoCard
          accent={accent}
          icon={<Sparkles className="size-3.5" />}
          label="Paper recomendado"
          text={coach?.recommendedPaper ?? "Ejecuta el AI Coach para recibir una recomendación."}
        />
        <InfoCard
          accent={accent}
          icon={<Flame className="size-3.5" />}
          label="Competencia que más mejoró"
          text={coach?.improvedCompetency ?? stats.topics[0]?.k ?? "Sin datos aún."}
        />
        <InfoCard
          accent={accent}
          icon={<Gauge className="size-3.5" />}
          label="Competencia que requiere atención"
          text={coach?.attentionCompetency ?? stats.weakTopics[0] ?? "Sin datos aún."}
        />
      </div>
    </>
  );
}

function nivelDe(score: number) {
  if (score >= 85) return "Referente";
  if (score >= 70) return "Especialista sólido";
  if (score >= 50) return "En consolidación";
  if (score >= 25) return "En formación";
  return "Iniciando";
}

function InfoCard({
  accent,
  icon,
  label,
  text,
}: {
  accent: string;
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-4 transition hover:-translate-y-0.5 hover:border-primary/30">
      <div
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {icon} {label}
      </div>
      <p className="mt-1.5 text-sm text-foreground/85 leading-relaxed">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Identity                                                           */
/* ------------------------------------------------------------------ */

function IdentityWorkspace({
  accent,
  value,
  saving,
  onSave,
}: {
  accent: string;
  value: Identity;
  saving: boolean;
  onSave: (v: Identity) => void;
}) {
  const [form, setForm] = useState<Identity>(value);
  useEffect(() => setForm(value), [value]);
  const set = (k: keyof Identity) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border/50 bg-background/40 p-6">
        <div className="flex items-center gap-4">
          <div
            className="inline-flex size-14 items-center justify-center rounded-2xl border border-border/50 text-lg font-extrabold"
            style={{ color: accent }}
          >
            {(form.fullName || "K").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">
              {form.fullName || "Perfil profesional"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {[form.title, form.specialty, form.subspecialty].filter(Boolean).join(" · ") ||
                "Completa tu identidad profesional"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.academicLevel && <Chip accent={accent}>{form.academicLevel}</Chip>}
              {form.residencyYear && <Chip>{form.residencyYear}</Chip>}
              {form.hospital && <Chip>{form.hospital}</Chip>}
              {form.university && <Chip>{form.university}</Chip>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nombre completo">
          <Input value={form.fullName} onChange={set("fullName")} />
        </Field>
        <Field label="Título profesional">
          <Input value={form.title} onChange={set("title")} placeholder="Médico cirujano" />
        </Field>
        <Field label="Especialidad">
          <Input value={form.specialty} onChange={set("specialty")} />
        </Field>
        <Field label="Subespecialidad">
          <Input value={form.subspecialty} onChange={set("subspecialty")} />
        </Field>
        <Field label="Nivel académico">
          <Input value={form.academicLevel} onChange={set("academicLevel")} />
        </Field>
        <Field label="Año de residencia">
          <Input value={form.residencyYear} onChange={set("residencyYear")} />
        </Field>
        <Field label="Hospital">
          <Input value={form.hospital} onChange={set("hospital")} />
        </Field>
        <Field label="Universidad">
          <Input value={form.university} onChange={set("university")} />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Competencias">
          <Textarea value={form.competencies} onChange={set("competencies")} />
        </Field>
        <Field label="Áreas de interés">
          <Textarea value={form.interests} onChange={set("interests")} />
        </Field>
        <Field label="Objetivos profesionales">
          <Textarea value={form.goals} onChange={set("goals")} />
        </Field>
        <Field label="Propósito">
          <Textarea value={form.purpose} onChange={set("purpose")} />
        </Field>
        <Field label="Misión">
          <Textarea value={form.mission} onChange={set("mission")} />
        </Field>
        <Field label="Visión">
          <Textarea value={form.vision} onChange={set("vision")} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Evolución profesional">
            <Textarea value={form.evolution} onChange={set("evolution")} />
          </Field>
        </div>
      </div>

      <Btn variant="solid" accent={accent} loading={saving} onClick={() => onSave(form)}>
        <Save className="size-3.5" /> Guardar identidad
      </Btn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mastery                                                            */
/* ------------------------------------------------------------------ */

function MasteryWorkspace({
  accent,
  stats,
  coach,
  meta,
}: {
  accent: string;
  stats: Stats;
  coach: any;
  meta: EnamAreaMeta;
}) {
  const due = useQuery({
    queryKey: ["cc-due", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_flashcard_reviews")
        .select("id,due_at")
        .lte("due_at", new Date().toISOString())
        .limit(500);
      if (error) throw error;
      return (data ?? []).length as number;
    },
  });

  const score = coach?.masteryScore ?? stats.mastery;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mastery Score" value={score} accent={accent} hint={nivelDe(score)} />
        <Metric label="Retención" value={`${stats.accuracy}%`} accent={accent} hint="Aciertos Q-Bank" />
        <Metric
          label="Repetición espaciada"
          value={due.data ?? 0}
          accent={accent}
          hint="Tarjetas pendientes hoy"
        />
        <Metric label="Racha" value={`${stats.streak} d`} accent={accent} hint="Días consecutivos" />
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Plan diario · Deep Work
        </div>
        {coach?.plan?.length ? (
          <ol className="mt-3 space-y-2">
            {coach.plan.map((b: any, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-lg border border-border/50 text-[10px] font-bold"
                  style={{ color: accent }}
                >
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold">{b.block}</span>{" "}
                  <span className="text-muted-foreground">· {b.minutes} min</span>
                  <span className="block text-xs text-muted-foreground">{b.why}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Ejecuta “Analizar con AI Coach” para generar tu plan diario de bloques Deep Work.
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ListCard
          accent={accent}
          title="Competencias dominadas / fortalezas"
          items={coach?.strengths ?? stats.topics.slice(0, 5).map((t) => t.k)}
          empty="Estudia y registra actividad para detectar fortalezas."
        />
        <ListCard
          accent={accent}
          title="Debilidades a reforzar"
          items={coach?.weaknesses ?? stats.weakTopics}
          empty="Sin errores registrados todavía."
        />
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Curva de aprendizaje · 12 semanas
        </div>
        <Sparkline values={stats.weeks} accent={accent} />
      </div>
    </div>
  );
}

function ListCard({
  accent,
  title,
  items,
  empty,
}: {
  accent: string;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {items?.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span style={{ color: accent }}>•</span>
              <span className="text-foreground/85">{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-3 flex items-end gap-1.5 h-24">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md transition-all"
          style={{
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: `color-mix(in oklab, ${accent} ${25 + (v / max) * 60}%, transparent)`,
          }}
          title={`${v} min`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Performance                                                        */
/* ------------------------------------------------------------------ */

function PerformanceWorkspace({ accent, stats }: { accent: string; stats: Stats }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Horas estudiadas" value={fmtMinutes(stats.total)} accent={accent} />
        <Metric label="Deep Work" value={fmtMinutes(stats.deepWork)} accent={accent} />
        <Metric label="Días activos" value={stats.activeDays} accent={accent} hint="Histórico" />
        <Metric label="Días consecutivos" value={stats.streak} accent={accent} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Semana" value={fmtMinutes(stats.week)} accent={accent} />
        <Metric label="Mes" value={fmtMinutes(stats.month)} accent={accent} />
        <Metric label="Año" value={fmtMinutes(stats.year)} accent={accent} />
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Mapa de calor · 18 semanas
        </div>
        <div className="mt-3 grid grid-flow-col grid-rows-7 gap-1">
          {stats.heat.map((d) => (
            <div
              key={d.day}
              title={`${d.day} · ${d.min} min`}
              className="size-3 rounded-[4px] border border-border/40"
              style={{
                background:
                  d.min > 0
                    ? `color-mix(in oklab, ${accent} ${Math.min(90, 20 + d.min)}%, transparent)`
                    : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tiempo por actividad
          </div>
          <BarList items={stats.byActivity} accent={accent} suffix=" min" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tiempo por tema / especialidad
          </div>
          <BarList items={stats.topics} accent={accent} suffix=" min" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Tendencia de mejora · minutos por semana
        </div>
        <Sparkline values={stats.weeks} accent={accent} />
        <div className="mt-2 text-xs text-muted-foreground">
          Precisión global {stats.accuracy}% en {stats.attempts} preguntas · tiempo medio{" "}
          {stats.avgTime}s.
        </div>
      </div>
    </div>
  );
}

function BarList({
  items,
  accent,
  suffix = "",
}: {
  items: { k: string; v: number }[];
  accent: string;
  suffix?: string;
}) {
  if (!items.length) return <Empty text="Sin registros todavía." />;
  const max = Math.max(...items.map((i) => i.v), 1);
  return (
    <div className="mt-3 space-y-2">
      {items.map((i) => (
        <div key={i.k}>
          <div className="flex justify-between text-xs">
            <span className="truncate">{i.k}</span>
            <span className="text-muted-foreground">
              {i.v}
              {suffix}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(i.v / max) * 100}%`, background: accent }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Missions                                                           */
/* ------------------------------------------------------------------ */

function MissionsWorkspace({
  accent,
  missions,
  onChange,
}: {
  accent: string;
  missions: Mission[];
  onChange: (m: Mission[]) => void;
}) {
  const [horizon, setHorizon] = useState<string>("todos");
  const [draft, setDraft] = useState({ horizon: "diario", title: "", metric: "" });

  const list = missions
    .filter((m) => horizon === "todos" || m.horizon === horizon)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {["todos", ...HORIZONS].map((h) => (
          <button
            key={h}
            onClick={() => setHorizon(h)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              horizon === h ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60"
            }`}
          >
            {h}
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[140px_1fr_180px_auto] items-end">
        <Field label="Horizonte">
          <Select
            value={draft.horizon}
            onChange={(e) => setDraft({ ...draft, horizon: e.target.value })}
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objetivo">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Dominar reanimación neonatal"
          />
        </Field>
        <Field label="Métrica">
          <Input
            value={draft.metric}
            onChange={(e) => setDraft({ ...draft, metric: e.target.value })}
            placeholder="90% en 40 preguntas"
          />
        </Field>
        <Btn
          variant="solid"
          accent={accent}
          onClick={() => {
            if (!draft.title.trim()) return;
            onChange([
              ...missions,
              {
                id: uid(),
                horizon: draft.horizon,
                title: draft.title.trim(),
                detail: "",
                metric: draft.metric,
                priority: 3,
                done: false,
              },
            ]);
            setDraft({ horizon: draft.horizon, title: "", metric: "" });
          }}
        >
          Añadir
        </Btn>
      </div>

      {list.length === 0 ? (
        <Empty text="Sin misiones. Usa “Reajustar misiones” para que la IA construya tu sistema de objetivos." />
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border border-border/50 bg-background/40 p-4 transition hover:border-primary/30 ${
                m.done ? "opacity-55" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={m.done}
                  onChange={() =>
                    onChange(missions.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))
                  }
                  className="mt-1 size-4 accent-current"
                  style={{ accentColor: accent }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip accent={accent}>{m.horizon}</Chip>
                    <Chip>P{m.priority}</Chip>
                    {m.metric && <Chip>{m.metric}</Chip>}
                  </div>
                  <h4
                    className={`mt-1.5 text-sm font-bold tracking-tight ${m.done ? "line-through" : ""}`}
                  >
                    {m.title}
                  </h4>
                  {m.detail && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.detail}</p>
                  )}
                </div>
                <button
                  onClick={() => onChange(missions.filter((x) => x.id !== m.id))}
                  className="text-muted-foreground hover:text-destructive transition"
                  aria-label="Eliminar misión"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Coach                                                           */
/* ------------------------------------------------------------------ */

function CoachWorkspace({
  accent,
  coach,
  onRun,
  busy,
}: {
  accent: string;
  coach: any;
  onRun: () => void;
  busy: boolean;
}) {
  if (!coach) {
    return (
      <div className="space-y-4">
        <Empty text="Tu mentor todavía no ha analizado tu desempeño. Ejecuta el análisis para recibir un diagnóstico completo de hábitos, retención, fatiga y riesgo de burnout." />
        <Btn variant="solid" accent={accent} loading={busy} onClick={onRun}>
          <BrainCircuit className="size-3.5" /> Ejecutar análisis
        </Btn>
      </div>
    );
  }
  const cards: [string, string][] = [
    ["Hábitos", coach.habits],
    ["Consistencia", coach.consistency],
    ["Retención", coach.retention],
    ["Fatiga", coach.fatigueRisk],
    ["Riesgo de burnout", coach.burnoutRisk],
    ["Foco de hoy", coach.focusToday],
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border/50 bg-background/40 p-6">
        <Chip accent={accent}>
          <BrainCircuit className="size-3" /> Mentor de élite
        </Chip>
        <p className="mt-3 text-sm text-foreground/85 leading-relaxed">{coach.greeting}</p>
        {coach.at && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Última lectura: {new Date(coach.at).toLocaleString("es-PE")}
          </p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <InfoCard key={k} accent={accent} icon={<Activity className="size-3.5" />} label={k} text={v} />
          ))}
      </div>
      <ListCard
        accent={accent}
        title="Ajustes automáticos al entrenamiento"
        items={coach.adjustments ?? []}
        empty="Sin ajustes propuestos."
      />
      <Btn variant="outline" loading={busy} onClick={onRun}>
        Volver a analizar
      </Btn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legacy                                                             */
/* ------------------------------------------------------------------ */

function LegacyWorkspace({
  accent,
  entries,
  onChange,
}: {
  accent: string;
  entries: LegacyEntry[];
  onChange: (l: LegacyEntry[]) => void;
}) {
  const [draft, setDraft] = useState<LegacyEntry>({
    id: "",
    kind: LEGACY_KINDS[0],
    title: "",
    place: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-5">
      <div className="grid gap-2 md:grid-cols-[170px_1fr_1fr_150px_auto] items-end">
        <Field label="Tipo">
          <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
            {LEGACY_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
        </Field>
        <Field label="Título">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Institución / lugar">
          <Input
            value={draft.place}
            onChange={(e) => setDraft({ ...draft, place: e.target.value })}
          />
        </Field>
        <Field label="Fecha">
          <Input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
        </Field>
        <Btn
          variant="solid"
          accent={accent}
          onClick={() => {
            if (!draft.title.trim()) return;
            onChange([...entries, { ...draft, id: uid() }]);
            setDraft({ ...draft, title: "", place: "", notes: "" });
          }}
        >
          Registrar
        </Btn>
      </div>

      {sorted.length === 0 ? (
        <Empty text="Tu portafolio profesional está vacío. Registra casos, procedimientos, congresos, publicaciones y reconocimientos: se construirá una línea de tiempo viva." />
      ) : (
        <div className="relative pl-6">
          <div
            className="absolute left-2 top-1 bottom-1 w-px"
            style={{ background: `color-mix(in oklab, ${accent} 45%, transparent)` }}
          />
          <div className="space-y-3">
            {sorted.map((e) => (
              <div
                key={e.id}
                className="relative rounded-2xl border border-border/50 bg-background/40 p-4"
              >
                <span
                  className="absolute -left-[19px] top-6 size-2.5 rounded-full"
                  style={{ background: accent }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip accent={accent}>{e.kind}</Chip>
                      <Chip>{e.date}</Chip>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold tracking-tight">{e.title}</h4>
                    {e.place && <p className="text-xs text-muted-foreground">{e.place}</p>}
                    {e.notes && <p className="mt-1 text-xs text-foreground/80">{e.notes}</p>}
                  </div>
                  <button
                    onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
                    className="text-muted-foreground hover:text-destructive transition"
                    aria-label="Eliminar registro"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  System                                                             */
/* ------------------------------------------------------------------ */

function SystemWorkspace({
  accent,
  prefs,
  email,
  onSave,
}: {
  accent: string;
  prefs: SystemPrefs;
  email: string;
  onSave: (p: SystemPrefs) => void;
}) {
  const [form, setForm] = useState<SystemPrefs>(prefs);
  useEffect(() => setForm(prefs), [prefs]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Cuenta
        </div>
        <p className="mt-1 text-sm font-semibold">{email || "Sesión no identificada"}</p>
        <p className="text-xs text-muted-foreground">
          Seguridad y privacidad gestionadas por KotaMed Cloud. Tu Command Center es privado: solo tú
          puedes leerlo o modificarlo.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Idioma">
          <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option>Español</option>
            <option>English</option>
            <option>Português</option>
          </Select>
        </Field>
        <Field label="Apariencia">
          <Select
            value={form.appearance}
            onChange={(e) => setForm({ ...form, appearance: e.target.value })}
          >
            <option>Sistema</option>
            <option>Claro</option>
            <option>Oscuro</option>
          </Select>
        </Field>
        <Field label="Privacidad del portafolio">
          <Select value={form.privacy} onChange={(e) => setForm({ ...form, privacy: e.target.value })}>
            <option>Privado</option>
            <option>Compartido con tutores</option>
          </Select>
        </Field>
        <Field label="Meta diaria de Deep Work (min)">
          <Input
            type="number"
            value={form.deepWorkGoal}
            onChange={(e) => setForm({ ...form, deepWorkGoal: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Toggle
          label="Notificaciones"
          value={form.notifications}
          onChange={(v) => setForm({ ...form, notifications: v })}
          accent={accent}
        />
        <Toggle
          label="Resumen semanal"
          value={form.digest}
          onChange={(v) => setForm({ ...form, digest: v })}
          accent={accent}
        />
        <Toggle
          label="Sincronización y respaldos"
          value={form.sync}
          onChange={(v) => setForm({ ...form, sync: v })}
          accent={accent}
        />
      </div>

      <Btn variant="solid" accent={accent} onClick={() => onSave(form)}>
        <Save className="size-3.5" /> Guardar preferencias
      </Btn>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm transition hover:border-primary/30"
    >
      <span>{label}</span>
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full transition"
        style={{ background: value ? accent : "color-mix(in oklab, currentColor 15%, transparent)" }}
      >
        <span
          className="absolute size-4 rounded-full bg-background transition-all"
          style={{ left: value ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Vault                                                              */
/* ------------------------------------------------------------------ */

function VaultWorkspace({ accent, meta }: { accent: string; meta: EnamAreaMeta }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("todos");

  const items = useQuery({
    queryKey: ["cc-vault", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_library_items")
        .select("id,title,kind,author,year,topic,subtopic,keywords,summary,url")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const kinds = useMemo(
    () => ["todos", ...new Set((items.data ?? []).map((i) => String(i.kind)))],
    [items.data],
  );

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (items.data ?? []).filter((i) => {
      if (kind !== "todos" && i.kind !== kind) return false;
      if (!terms.length) return true;
      const hay = [i.title, i.author, i.topic, i.subtopic, i.summary, (i.keywords ?? []).join(" ")]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [items.data, q, kind]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_200px]">
        <Field label="Búsqueda inteligente">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="sepsis neonatal, guía MINSA, protocolo, paper 2024…"
          />
        </Field>
        <Field label="Tipo">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
        </Field>
      </div>

      {filtered.length === 0 ? (
        <Empty text="El Vault indexa automáticamente todo el material de la Biblioteca del módulo: PDFs, libros, papers, guías, protocolos, imágenes, videos y notas." />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="flex flex-wrap gap-1.5">
                <Chip accent={accent}>{i.kind}</Chip>
                {i.year && <Chip>{i.year}</Chip>}
                {i.topic && <Chip>{i.topic}</Chip>}
              </div>
              <h4 className="mt-2 text-sm font-bold tracking-tight">{i.title}</h4>
              {i.author && <p className="text-xs text-muted-foreground">{i.author}</p>}
              {i.summary && (
                <p className="mt-1 text-xs text-foreground/80 line-clamp-3">{i.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
