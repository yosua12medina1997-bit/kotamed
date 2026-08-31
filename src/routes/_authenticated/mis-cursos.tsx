/**
 * MIS CURSOS — solo los programas donde el alumno está realmente matriculado,
 * con su última actividad real y avance. El Super Admin ve además el catálogo.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NexusShell } from "@/components/nexus/NexusShell";
import { useNexusEnv } from "@/lib/nexus-theme";
import {
  ROLE_LABELS,
  useIsAdmin,
  useIsSuperAdmin,
  useMyProfile,
  useMyRoles,
  useSupabaseUser,
} from "@/lib/session";
import { useMyProgramEnrollments } from "@/lib/enrollments";
import { useMyLearningActivity } from "@/lib/learning-activity";
import {
  useProgramCatalog,
  useSetProgramVisibility,
  type CatalogProgram,
} from "@/lib/content-catalog";

export const Route = createFileRoute("/_authenticated/mis-cursos")({
  head: () => ({
    meta: [
      { title: "Mis cursos · KotaMed Nexus" },
      {
        name: "description",
        content: "Tus programas matriculados en KotaMed con avance real y última actividad.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MisCursosPage,
});

function MisCursosPage() {
  const user = useSupabaseUser();
  const env = useNexusEnv();
  const profile = useMyProfile(user?.id);
  const roles = useMyRoles(user?.id);
  const isAdmin = useIsAdmin(user?.id).data ?? false;
  const isSuperAdmin = useIsSuperAdmin(user?.id).data ?? false;
  const enrollmentsQ = useMyProgramEnrollments(user?.id);
  const activityQ = useMyLearningActivity(user?.id, 20);
  const { programs } = useProgramCatalog({ includeIsolated: isSuperAdmin });

  const displayName =
    profile.data?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Colega";
  const roleLabel = ROLE_LABELS[(roles.data ?? [])[0] ?? "student"];

  const enrollments = enrollmentsQ.data ?? [];
  const activity = activityQ.data ?? [];

  const progressFor = (nodeId?: string | null) => {
    const rows = activity.filter((a) => a.node_id && a.node_id === nodeId);
    if (rows.length === 0) return 0;
    return Math.round(rows.reduce((s, r) => s + (r.progress_pct || 0), 0) / rows.length);
  };

  return (
    <NexusShell
      env={env}
      userId={user?.id ?? ""}
      displayName={displayName}
      email={user?.email}
      avatarUrl={profile.data?.avatar_url}
      roleLabel={roleLabel}
      isAdmin={isAdmin}
      onSignOut={() => supabase.auth.signOut()}
    >
      <div className="mx-auto w-full max-w-[1200px] animate-slide-up space-y-8 pt-4">
        <header>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--nexus-teal)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--nexus-teal)]">
            <GraduationCap className="size-3" /> Mis cursos
          </span>
          <h1 className="mt-3 text-[26px] font-black tracking-tight sm:text-[32px]">
            Tu trayectoria académica
          </h1>
          <p className="mt-2 max-w-2xl text-sm opacity-60">
            Aquí aparecen únicamente los programas y módulos donde tienes matrícula vigente.
          </p>
        </header>

        {enrollmentsQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm opacity-60">
            <Loader2 className="size-4 animate-spin" /> Cargando tus matrículas…
          </div>
        ) : enrollments.length === 0 ? (
          <div className="nexus-card rounded-3xl p-8">
            <h2 className="text-lg font-black tracking-tight">Aún no tienes cursos activos</h2>
            <p className="mt-2 text-sm opacity-60">
              Completa tu matrícula para desbloquear tus programas y su contenido.
            </p>
            <Link
              to="/admision"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[color:var(--nexus-teal)] px-5 py-3 text-xs font-black text-white"
            >
              Ir al Centro de Admisión <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => {
              const pct = progressFor(e.node?.id);
              return (
                <div key={e.id} className="nexus-card rounded-3xl p-6">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[color:var(--nexus-teal)]/10 text-[color:var(--nexus-teal)]">
                    <BookOpen className="size-5" strokeWidth={2.1} />
                  </div>
                  <h3 className="text-sm font-black tracking-tight">
                    {e.node?.title ?? "Programa"}
                  </h3>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] opacity-50">
                    {e.node?.kind ?? "módulo"}
                  </div>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--nexus-border)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--nexus-teal)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[10px] font-bold opacity-55">{pct}% de avance</div>
                  {e.expires_at && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold opacity-50">
                      <Clock className="size-3" /> Vigente hasta{" "}
                      {new Date(e.expires_at).toLocaleDateString()}
                    </div>
                  )}
                  {e.node?.slug && (
                    <Link
                      to="/programas/$slug"
                      params={{ slug: e.node.slug }}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--nexus-border)] px-4 py-2.5 text-[11px] font-black"
                    >
                      Entrar al curso <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activity.length > 0 && (
          <section>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] opacity-50">
              Actividad reciente
            </div>
            <div className="mt-3 space-y-2">
              {activity.slice(0, 8).map((a) => (
                <Link
                  key={a.id}
                  to={(a.path || "/dashboard") as never}
                  className="nexus-card flex items-center gap-3 rounded-2xl px-4 py-3"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[color:var(--nexus-teal)]/10 text-[color:var(--nexus-teal)]">
                    <Play className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black">
                      {a.label ?? "Contenido"}
                    </span>
                    <span className="block text-[10px] font-semibold opacity-55">
                      {new Date(a.last_seen_at).toLocaleString()} · {a.progress_pct}%
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 opacity-55" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {isSuperAdmin && <AdminCatalog programs={programs} />}
      </div>
    </NexusShell>
  );
}

type VisibilityFilter = "all" | "published" | "hidden";

/** Catálogo completo de programas con gestión de visibilidad (solo Super Admin). */
function AdminCatalog({ programs }: { programs: CatalogProgram[] }) {
  const [filter, setFilter] = useState<VisibilityFilter>("all");
  const setVisibility = useSetProgramVisibility();

  const counts = useMemo(
    () => ({
      all: programs.length,
      published: programs.filter((p) => p.isPublished).length,
      hidden: programs.filter((p) => !p.isPublished).length,
    }),
    [programs],
  );

  const list = useMemo(
    () =>
      programs.filter((p) =>
        filter === "all" ? true : filter === "published" ? p.isPublished : !p.isPublished,
      ),
    [programs, filter],
  );

  const tabs: { id: VisibilityFilter; label: string }[] = [
    { id: "all", label: `Todos (${counts.all})` },
    { id: "published", label: `Publicados (${counts.published})` },
    { id: "hidden", label: `Ocultos (${counts.hidden})` },
  ];

  return (
    <section>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] opacity-50">
            Catálogo completo · solo Super Admin
          </div>
          <p className="mt-1 text-[11px] font-semibold opacity-55">
            🟢 Visible para usuarios · ⚪ Oculto, solo administración.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-[color:var(--nexus-border)] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                filter === t.id
                  ? "bg-[color:var(--nexus-teal)] text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <div
            key={p.slug}
            className={`nexus-card rounded-2xl p-4 ${p.isPublished ? "" : "opacity-75"}`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-full ${
                  p.isPublished
                    ? "bg-emerald-500"
                    : "border border-[color:var(--nexus-border)] bg-transparent"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/programas/$slug"
                  params={{ slug: p.slug }}
                  className="block truncate text-xs font-black hover:underline"
                >
                  {p.title}
                </Link>
                <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] opacity-50">
                  {p.isPublished ? "Visible / Publicado" : "Oculto / No publicado"}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {p.nodeId ? (
                <button
                  type="button"
                  disabled={setVisibility.isPending}
                  onClick={() =>
                    setVisibility.mutate({ nodeId: p.nodeId!, visible: !p.isPublished })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--nexus-border)] px-2.5 py-1.5 text-[10px] font-black transition hover:bg-[color:var(--nexus-teal)]/10 disabled:opacity-50"
                >
                  {p.isPublished ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  {p.isPublished ? "Ocultar" : "Publicar"}
                </button>
              ) : (
                <span className="text-[10px] font-bold opacity-45">Programa base (siempre visible)</span>
              )}
              <Link
                to="/programas/$slug"
                params={{ slug: p.slug }}
                className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black opacity-70 hover:opacity-100"
              >
                Editar programa <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="nexus-card rounded-2xl p-5 text-xs font-semibold opacity-60">
            No hay programas en este filtro.
          </div>
        )}
      </div>
    </section>
  );
}
