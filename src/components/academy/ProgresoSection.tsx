/**
 * Progreso: horas estudiadas, rachas, mapa de calor, dominio por actividad,
 * curva de aprendizaje y recomendador IA.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flame, LineChart, Sparkles } from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { recommendPlan } from "@/lib/academy-ai.functions";
import { Btn, Chip, Empty, Metric, Panel } from "./ui";
import { db, fmtMinutes } from "./api";

type Ev = {
  id: string;
  activity: string;
  minutes: number;
  topic: string | null;
  score: number | null;
  created_at: string;
};

type Attempt = { is_correct: boolean; seconds: number; created_at: string };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ProgresoSection({ meta }: { meta: EnamAreaMeta; isAdmin?: boolean }) {
  const accent = meta.accent;
  const rec = useServerFn(recommendPlan);
  const [plan, setPlan] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const events = useQuery({
    queryKey: ["academy-events", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_study_events")
        .select("id,activity,minutes,topic,score,created_at")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Ev[];
    },
  });

  const attempts = useQuery({
    queryKey: ["academy-attempts", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_attempts")
        .select("is_correct,seconds,created_at")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const stats = useMemo(() => {
    const evs = events.data ?? [];
    const at = attempts.data ?? [];
    const now = new Date();
    const byDay = new Map<string, number>();
    for (const e of evs) {
      const k = e.created_at.slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + e.minutes);
    }
    const since = (days: number) => {
      const limit = new Date(now.getTime() - days * 86400000);
      return evs
        .filter((e) => new Date(e.created_at) >= limit)
        .reduce((s, e) => s + e.minutes, 0);
    };
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const k = dayKey(new Date(now.getTime() - i * 86400000));
      if ((byDay.get(k) ?? 0) > 0) streak++;
      else if (i > 0) break;
    }
    const correct = at.filter((a) => a.is_correct).length;
    const avgTime = at.length
      ? Math.round(at.reduce((s, a) => s + (a.seconds ?? 0), 0) / at.length)
      : 0;
    const byActivity = new Map<string, number>();
    for (const e of evs) byActivity.set(e.activity, (byActivity.get(e.activity) ?? 0) + e.minutes);
    const scored = evs.filter((e) => e.score !== null);
    return {
      total: evs.reduce((s, e) => s + e.minutes, 0),
      day: since(1),
      week: since(7),
      month: since(30),
      year: since(365),
      streak,
      byDay,
      answered: at.length,
      correct,
      accuracy: at.length ? Math.round((correct / at.length) * 100) : 0,
      avgTime,
      byActivity: Array.from(byActivity.entries()).sort((a, b) => b[1] - a[1]),
      curve: scored
        .slice(0, 20)
        .reverse()
        .map((e) => Math.round(e.score ?? 0)),
      lastWeekMinutes: since(7),
      prevWeekMinutes: since(14) - since(7),
    };
  }, [events.data, attempts.data]);

  const heat = useMemo(() => {
    const cells: { key: string; minutes: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const k = dayKey(new Date(Date.now() - i * 86400000));
      cells.push({ key: k, minutes: stats.byDay.get(k) ?? 0 });
    }
    return cells;
  }, [stats.byDay]);

  const askPlan = async () => {
    setBusy(true);
    try {
      const summary = `Área: ${meta.title}
Minutos totales: ${stats.total}; hoy: ${stats.day}; 7d: ${stats.week}; 30d: ${stats.month}
Racha: ${stats.streak} días
Preguntas respondidas: ${stats.answered}, aciertos: ${stats.correct} (${stats.accuracy}%), tiempo medio ${stats.avgTime}s
Minutos por actividad: ${stats.byActivity.map(([a, m]) => `${a}=${m}`).join(", ") || "sin datos"}
Últimos puntajes: ${stats.curve.join(", ") || "sin datos"}
Temas recientes: ${(events.data ?? [])
        .slice(0, 15)
        .map((e) => e.topic)
        .filter(Boolean)
        .join(", ") || "sin datos"}`;
      setPlan(await rec({ data: { stats: summary } }));
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el plan");
    } finally {
      setBusy(false);
    }
  };

  const delta = stats.lastWeekMinutes - stats.prevWeekMinutes;

  return (
    <Panel
      accent={accent}
      icon={<LineChart className="size-4" strokeWidth={2.25} />}
      title="Mi progreso"
      subtitle="Horas, rachas, dominio, curva de aprendizaje y recomendaciones inteligentes."
      actions={
        <Btn variant="solid" accent={accent} loading={busy} onClick={askPlan}>
          <Sparkles className="size-3" /> Recomendador IA
        </Btn>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Horas totales" value={fmtMinutes(stats.total)} accent={accent} />
        <Metric label="Esta semana" value={fmtMinutes(stats.week)} accent={accent}
          hint={`${delta >= 0 ? "+" : ""}${delta} min vs. semana previa`} />
        <Metric label="Este mes" value={fmtMinutes(stats.month)} accent={accent} />
        <Metric
          label="Racha"
          value={`${stats.streak} días`}
          accent={accent}
          hint={stats.streak > 0 ? "¡Sigue así!" : "Empieza hoy"}
        />
        <Metric label="Preguntas respondidas" value={stats.answered} accent={accent} />
        <Metric label="Precisión" value={`${stats.accuracy}%`} accent={accent} />
        <Metric label="Tiempo medio" value={`${stats.avgTime}s`} accent={accent} />
        <Metric label="Este año" value={fmtMinutes(stats.year)} accent={accent} />
      </div>

      <div className="mt-6">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Mapa de calor · últimas 12 semanas
        </h4>
        <div className="flex flex-wrap gap-1">
          {heat.map((c) => {
            const level = c.minutes === 0 ? 0 : c.minutes < 15 ? 1 : c.minutes < 40 ? 2 : c.minutes < 90 ? 3 : 4;
            return (
              <div
                key={c.key}
                title={`${c.key}: ${c.minutes} min`}
                className="size-3.5 rounded-[4px] border border-border/40"
                style={{ background: level === 0 ? "transparent" : accent, opacity: level === 0 ? 1 : 0.2 + level * 0.2 }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Dominio por actividad
          </h4>
          {stats.byActivity.length === 0 ? (
            <Empty text="Sin actividad registrada todavía." />
          ) : (
            <div className="space-y-2">
              {stats.byActivity.map(([a, m]) => {
                const max = stats.byActivity[0][1] || 1;
                return (
                  <div key={a}>
                    <div className="flex justify-between text-[11px]">
                      <span className="capitalize">{a}</span>
                      <span className="font-bold">{fmtMinutes(m)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-foreground/[0.06]">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${(m / max) * 100}%`, background: accent }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Curva de aprendizaje
          </h4>
          {stats.curve.length === 0 ? (
            <Empty text="Resuelve casos o preguntas para ver tu curva." />
          ) : (
            <div className="flex h-28 items-end gap-1">
              {stats.curve.map((v, i) => (
                <div
                  key={i}
                  title={`${v}%`}
                  className="flex-1 rounded-t"
                  style={{ height: `${Math.max(4, v)}%`, background: accent, opacity: 0.35 + (i / stats.curve.length) * 0.65 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {plan && (
        <div className="mt-6 rounded-2xl border border-border/50 bg-background/40 p-4">
          <div className="flex items-center gap-2">
            <Flame className="size-4" style={{ color: accent }} />
            <h4 className="text-sm font-bold">Plan recomendado</h4>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{plan.summary}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Fortalezas
              </h5>
              <ul className="mt-1 space-y-1 text-xs">
                {plan.strengths?.map((s: string, i: number) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Debilidades
              </h5>
              <ul className="mt-1 space-y-1 text-xs">
                {plan.weaknesses?.map((s: string, i: number) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {plan.actions?.map((a: any, i: number) => (
              <div key={i} className="rounded-xl border border-border/50 bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  <Chip accent={accent}>{a.kind}</Chip>
                  <Chip>Prioridad {a.priority}</Chip>
                </div>
                <p className="mt-1.5 text-xs font-bold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
