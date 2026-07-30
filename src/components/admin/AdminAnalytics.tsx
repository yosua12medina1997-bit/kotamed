/** Dashboard analítico de la academia. */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, SectionTitle, Stat } from "./ui";
import { usePlans } from "./AdminPlans";

const db = supabase as any;

export default function AdminAnalytics() {
  const plansQ = usePlans();

  const dataQ = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [profiles, events, attempts, memberships, nodes, resources] = await Promise.all([
        db.from("profiles").select("id,created_at"),
        db.from("academy_study_events").select("area_slug,activity,minutes,created_at").limit(5000),
        db.from("academy_attempts").select("is_correct,created_at").limit(5000),
        db.from("user_memberships").select("plan_id,status,amount_paid,renews_at"),
        supabase.from("content_nodes").select("id,kind,is_published"),
        supabase.from("content_resources").select("id,kind"),
      ]);
      return {
        profiles: profiles.data ?? [],
        events: events.data ?? [],
        attempts: attempts.data ?? [],
        memberships: memberships.data ?? [],
        nodes: nodes.data ?? [],
        resources: resources.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    const d = dataQ.data;
    if (!d) return null;
    const now = Date.now();
    const days30 = now - 30 * 864e5;
    const days7 = now - 7 * 864e5;
    const newUsers = d.profiles.filter((p: any) => new Date(p.created_at).getTime() > days30).length;
    const recentEvents = d.events.filter((e: any) => new Date(e.created_at).getTime() > days7);
    const minutes = d.events.reduce((a: number, e: any) => a + Number(e.minutes || 0), 0);
    const correct = d.attempts.filter((a: any) => a.is_correct).length;
    const mrr = d.memberships.reduce((a: number, m: any) => {
      if (m.status !== "active") return a;
      const plan = plansQ.data?.find((p) => p.id === m.plan_id);
      if (!plan) return a;
      const monthly =
        plan.period === "anual" ? Number(plan.price_amount) / 12 : Number(plan.price_amount);
      return a + monthly;
    }, 0);

    const byArea = new Map<string, number>();
    d.events.forEach((e: any) =>
      byArea.set(e.area_slug, (byArea.get(e.area_slug) ?? 0) + Number(e.minutes || 0)),
    );
    const byActivity = new Map<string, number>();
    d.events.forEach((e: any) => byActivity.set(e.activity, (byActivity.get(e.activity) ?? 0) + 1));
    const byPlan = new Map<string, number>();
    d.memberships.forEach((m: any) => byPlan.set(m.plan_id, (byPlan.get(m.plan_id) ?? 0) + 1));

    return {
      users: d.profiles.length,
      newUsers,
      recentSessions: recentEvents.length,
      hours: minutes / 60,
      attempts: d.attempts.length,
      accuracy: d.attempts.length ? Math.round((correct / d.attempts.length) * 100) : 0,
      mrr,
      arr: mrr * 12,
      subs: d.memberships.filter((m: any) => m.status === "active").length,
      courses: d.nodes.filter((n: any) => n.kind === "course").length,
      lessons: d.nodes.filter((n: any) => n.kind === "lesson").length,
      resources: d.resources.length,
      byArea: [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      byActivity: [...byActivity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      byPlan,
    };
  }, [dataQ.data, plansQ.data]);

  if (dataQ.isLoading || !stats) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <SectionTitle title="Dashboard analítico" hint="Datos reales de la plataforma en tiempo real." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Usuarios" value={stats.users} hint={`+${stats.newUsers} en 30 días`} />
        <Stat label="Sesiones (7d)" value={stats.recentSessions} />
        <Stat label="Horas estudiadas" value={stats.hours.toFixed(1)} />
        <Stat label="Tasa de acierto" value={`${stats.accuracy}%`} hint={`${stats.attempts} preguntas`} />
        <Stat label="Suscripciones activas" value={stats.subs} />
        <Stat label="MRR" value={`S/ ${stats.mrr.toFixed(0)}`} />
        <Stat label="ARR" value={`S/ ${stats.arr.toFixed(0)}`} />
        <Stat
          label="Contenido"
          value={`${stats.courses} cursos`}
          hint={`${stats.lessons} lecciones · ${stats.resources} recursos`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <SectionTitle title="Horas por área" />
          <Bars data={stats.byArea} unit="h" transform={(v) => v / 60} />
        </Card>
        <Card>
          <SectionTitle title="Actividades más usadas" />
          <Bars data={stats.byActivity} unit="" />
        </Card>
      </div>

      <Card>
        <SectionTitle title="Distribución por plan" />
        <div className="space-y-2">
          {(plansQ.data ?? []).map((p) => {
            const count = stats.byPlan.get(p.id) ?? 0;
            const pct = stats.subs ? Math.round((count / Math.max(stats.subs, 1)) * 100) : 0;
            return (
              <div key={p.id} className="flex items-center gap-3 text-xs">
                <span className="w-28 font-bold truncate">{p.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>
                <span className="w-20 text-right text-muted-foreground">{count} usuarios</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Bars({
  data,
  unit,
  transform,
}: {
  data: [string, number][];
  unit: string;
  transform?: (v: number) => number;
}) {
  const values = data.map(([, v]) => (transform ? transform(v) : v));
  const max = Math.max(1, ...values);
  if (data.length === 0) return <p className="text-xs text-muted-foreground">Sin datos aún.</p>;
  return (
    <div className="space-y-2">
      {data.map(([label], i) => {
        const v = values[i];
        return (
          <div key={label} className="flex items-center gap-3 text-xs">
            <span className="w-32 truncate font-semibold">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <span className="w-16 text-right text-muted-foreground">
              {v.toFixed(unit === "h" ? 1 : 0)}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
