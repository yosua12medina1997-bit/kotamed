import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Brain,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Library,
  Loader2,
  Lock,
  Newspaper,
  Play,
  PlayCircle,
  Shield,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  isActive,
  PROGRAM_LABELS,
  useIsAdmin,
  useMyEnrollments,
  useMyProfile,
  useMyRoles,
  useIsSuperAdmin,
  useSupabaseUser,
  ROLE_LABELS,
  type Enrollment,
} from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { useProgramCatalog, type CatalogProgram } from "@/lib/content-catalog";
import { useMyAdmission } from "@/lib/admission";
import { useMyProgramEnrollments } from "@/lib/enrollments";
import { NexusShell } from "@/components/nexus/NexusShell";
import { AnatomicalCore } from "@/components/nexus/AnatomicalCore";
import { useNexusEnv } from "@/lib/nexus-theme";
import {
  DEFAULT_NEXUS_DASHBOARD,
  fillTemplate,
  useNexusDashboardConfig,
  type DashboardAction,
  type NexusDashboardConfig,
} from "@/lib/nexus-dashboard-cms";
import { useEffect } from "react";

/** Accesos incluidos en la experiencia Free (sin matrícula). */
const FREE_ITEMS = [
  { label: "Biblioteca gratuita", hint: "Selección abierta", icon: Library, to: "/programas" },
  { label: "Videos demo", hint: "Clases de bienvenida", icon: PlayCircle, to: "/programas" },
  { label: "Casos demo", hint: "5–10 casos clínicos", icon: Stethoscope, to: "/programas" },
  { label: "Flashcards muestra", hint: "Repaso guiado", icon: Layers, to: "/programas" },
  { label: "Anatomy Lab", hint: "Simulador 3D", icon: Layers, to: "/anatomy-lab" },
  { label: "Calculadoras", hint: "Herramientas médicas", icon: Calculator, to: "/programas" },
  { label: "KotaMed AI demo", hint: "Tutor inteligente", icon: Sparkles, to: "/programas" },
  { label: "Comunidad", hint: "Foro académico", icon: Users, to: "/programas" },
  { label: "Noticias", hint: "Actualizaciones", icon: Newspaper, to: "/" },
  { label: "Calendario", hint: "Eventos abiertos", icon: CalendarDays, to: "/" },
  { label: "Mi perfil", hint: "Datos y cuenta", icon: UserRound, to: "/admision" },
] as const;

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mi panel · KotaMed Nexus" },
      {
        name: "description",
        content:
          "KotaMed Nexus: tu entorno adaptativo de aprendizaje médico con progreso, clases y Kota AI.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const env = useNexusEnv();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: isSuperAdmin } = useIsSuperAdmin(user?.id);
  const { data: profile } = useMyProfile(user?.id);
  const { data: roles } = useMyRoles(user?.id);
  const enrollmentsQ = useMyEnrollments(user?.id);
  const manualQ = useMyProgramEnrollments(user?.id);

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);

  /* Bienvenida post-matrícula: se muestra una sola vez tras confirmarse el acceso. */
  const justEnrolled =
    !!user && ((enrollmentsQ.data ?? []).some(isActive) || (manualQ.data ?? []).length > 0);
  useEffect(() => {
    if (!user || !justEnrolled) return;
    let seen = true;
    try {
      seen = window.localStorage.getItem(`kotamed:welcome-seen:${user.id}`) === "1";
    } catch {
      seen = true;
    }
    if (!seen) navigate({ to: "/bienvenida", replace: true });
  }, [user, justEnrolled, navigate]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!user || enrollmentsQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enrollments = enrollmentsQ.data ?? [];
  const active = enrollments.filter(isActive);
  const hasAccess = isAdmin || active.length > 0 || (manualQ.data ?? []).length > 0;
  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Estudiante";
  const roleLabel = roles?.length ? ROLE_LABELS[roles[0]] ?? roles[0] : undefined;

  return (
    <NexusShell
      env={env}
      userId={user.id}
      displayName={displayName}
      email={profile?.email}
      avatarUrl={profile?.avatar_url ?? null}
      roleLabel={roleLabel}
      isAdmin={!!isAdmin}
      onSignOut={signOut}
    >
      {hasAccess ? (
        <EnrolledView
          active={active}
          displayName={displayName}
          isAdmin={!!isAdmin}
          isSuperAdmin={!!isSuperAdmin}
          manual={manualQ.data ?? []}
          greeting={env.greeting}
          coreIntensity={env.coreIntensity}
          envBase={env.base}
          reducedMotion={env.reducedMotion}
          lowPower={env.lowPower}
        />
      ) : (
        <LockedView
          enrollments={enrollments}
          email={profile?.email}
          userId={user.id}
          displayName={displayName}
          greeting={env.greeting}
          coreIntensity={env.coreIntensity}
          envBase={env.base}
          reducedMotion={env.reducedMotion}
          lowPower={env.lowPower}
        />
      )}
    </NexusShell>
  );
}

/* ---------------------------------------------------------------- primitivos */

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`nexus-card rounded-3xl ${className}`}>{children}</section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-black uppercase tracking-[0.24em] opacity-55">{children}</div>
  );
}

function Ring({ value, size = 76 }: { value: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--nexus-border)"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--nexus-cyan)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 900ms var(--ease-out-expo)" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size / 4.6}
        fontWeight="800"
        fill="var(--nexus-text)"
      >
        {value}%
      </text>
    </svg>
  );
}

const ACTION_ICONS: Record<DashboardAction["icon"], React.ReactNode> = {
  book: <BookOpen className="size-4" />,
  case: <Stethoscope className="size-4" />,
  brain: <Brain className="size-4" />,
  calc: <Calculator className="size-4" />,
  library: <Library className="size-4" />,
  spark: <Sparkles className="size-4" />,
};

/* ------------------------------------------------------------- vista alumno */

function EnrolledView({
  active,
  displayName,
  isAdmin,
  isSuperAdmin,
  manual = [],
  greeting,
  coreIntensity,
  envBase,
  reducedMotion,
  lowPower,
}: {
  active: Enrollment[];
  displayName: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  manual?: { node: { slug: string; title: string } | null; expires_at: string | null }[];
  greeting: string;
  coreIntensity: number;
  envBase: "light" | "dark";
  reducedMotion: boolean;
  lowPower: boolean;
}) {
  // Solo el Super Admin ve absolutamente todos los programas, incluidos los que
  // viven dentro de bibliotecas internas y los que están en borrador.
  const { data: cfgData } = useNexusDashboardConfig();
  const cfg: NexusDashboardConfig = cfgData ?? DEFAULT_NEXUS_DASHBOARD;
  const { programs } = useProgramCatalog({ includeIsolated: isSuperAdmin });

  const mine = isSuperAdmin
    ? programs.map((p) => ({ slug: p.slug, expires_at: null as string | null }))
    : [
        ...active.map((e) => ({ slug: e.program as string, expires_at: e.expires_at })),
        ...manual
          .filter((m) => m.node?.slug)
          .map((m) => ({ slug: m.node!.slug, expires_at: m.expires_at })),
      ].filter((item, i, arr) => arr.findIndex((x) => x.slug === item.slug) === i);

  const myPrograms = mine
    .map(({ slug, expires_at }) => {
      const cat = programs.find((p) => p.slug === slug);
      return {
        slug,
        expires_at,
        title: cat?.title ?? PROGRAM_LABELS[slug as keyof typeof PROGRAM_LABELS] ?? slug,
        areas: cat?.areas ?? [],
        subtitle: cat?.subtitle ?? "Programa KotaMed",
      };
    })
    .filter((p) => !!p.title);

  const focus = myPrograms[0];
  const totalAreas = myPrograms.reduce((n, p) => n + p.areas.length, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] animate-slide-up space-y-6 pt-4">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Columna principal */}
        <div className="space-y-6">
          <header>
            <h1 className="text-[28px] font-black tracking-tight sm:text-[34px]">
              {fillTemplate(cfg.headline, { saludo: greeting, nombre: displayName })}{" "}
              <span className="align-middle">👋</span>
            </h1>
            <p className="mt-1.5 text-sm opacity-60">
              {myPrograms.length > 0
                ? `Tienes ${myPrograms.length} programa${myPrograms.length === 1 ? "" : "s"} activo${myPrograms.length === 1 ? "" : "s"} y ${totalAreas} área${totalAreas === 1 ? "" : "s"} por explorar.`
                : cfg.subtitle}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            {/* Continúa donde lo dejaste */}
            {cfg.showContinue && (
            <Panel className="flex flex-col p-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-[color:var(--nexus-teal)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--nexus-teal)]">
                <Play className="size-3" strokeWidth={3} /> {cfg.continueEyebrow}
              </span>
              <h2 className="mt-4 text-[22px] font-black leading-tight tracking-tight">
                {focus?.title ?? cfg.continueEmptyTitle}
              </h2>
              <p className="mt-1 text-xs font-semibold opacity-55">{focus?.subtitle}</p>
              <div className="mt-5 flex items-center gap-4">
                <Ring value={focus ? 0 : 0} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">
                    {cfg.completedLabel}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--nexus-border)]">
                    <div className="h-full w-[6%] rounded-full bg-[color:var(--nexus-cyan)]" />
                  </div>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-[11px] font-semibold opacity-65">
                <li className="flex items-center gap-2">
                  <Clock className="size-3.5" /> {focus?.areas.length ?? 0} áreas disponibles
                </li>
                <li className="flex items-center gap-2">
                  <CalendarDays className="size-3.5" />
                  {focus?.expires_at
                    ? `Acceso hasta ${new Date(focus.expires_at).toLocaleDateString()}`
                    : "Acceso vigente"}
                </li>
              </ul>
              {focus ? (
                <Link
                  to="/programas/$slug"
                  params={{ slug: focus.slug }}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--nexus-teal)] px-5 py-3.5 pt-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
                  style={{ marginTop: "1.75rem" }}
                >
                  {cfg.continueCta} <ArrowRight className="size-4" strokeWidth={2.6} />
                </Link>
              ) : (
                <Link
                  to="/programas"
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--nexus-teal)] px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  {cfg.continueEmptyCta} <ArrowRight className="size-4" strokeWidth={2.6} />
                </Link>
              )}
            </Panel>
            )}

            {/* MEDICAL CORE */}
            {cfg.showCore && (
            <div className="flex items-center justify-center py-4">
              <AnatomicalCore
                intensity={coreIntensity}
                base={envBase}
                reducedMotion={reducedMotion}
                lowPower={lowPower}
                contextLabel={focus ? focus.title : undefined}
              />
            </div>
            )}
          </div>

          {/* Mis cursos en progreso */}
          {cfg.showCourses && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>{cfg.coursesTitle}</Eyebrow>
              <Link
                to="/programas"
                className="inline-flex items-center gap-1.5 text-[11px] font-black text-[color:var(--nexus-teal)]"
              >
                {cfg.coursesLinkLabel} <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myPrograms.slice(0, cfg.coursesMax).map((p) => (
                <Link
                  key={p.slug}
                  to="/programas/$slug"
                  params={{ slug: p.slug }}
                  className="nexus-card group overflow-hidden rounded-3xl p-5 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-[color:var(--nexus-blue)]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[color:var(--nexus-blue)]">
                      Programa
                    </span>
                    <BookOpen className="size-4 opacity-45" strokeWidth={2.2} />
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-base font-black leading-tight tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold opacity-55">
                    {p.subtitle}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[11px] font-bold opacity-60">
                      {p.areas.length} áreas
                    </span>
                    <span className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--nexus-border)] transition group-hover:border-[color:var(--nexus-cyan)]">
                      <ChevronRight className="size-4" strokeWidth={2.5} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          )}
        </div>

        {/* Columna lateral */}
        <aside className="space-y-5">
          {cfg.showProgress && (
          <Panel className="p-6">
            <Eyebrow>{cfg.progressTitle}</Eyebrow>
            <div className="mt-5 flex items-center gap-5">
              <Ring value={myPrograms.length > 0 ? Math.min(96, myPrograms.length * 12) : 0} />
              <ul className="space-y-2 text-[11px] font-bold">
                <Stat color="var(--nexus-teal)" label="Programas" value={myPrograms.length} />
                <Stat color="var(--nexus-blue)" label="Áreas" value={totalAreas} />
                <Stat
                  color="var(--nexus-muted)"
                  label="Vigencias"
                  value={myPrograms.filter((p) => p.expires_at).length}
                />
              </ul>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[color:var(--nexus-border)] pt-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">
                  {cfg.levelLabel}
                </div>
                <div className="mt-1 text-sm font-black">
                  {isAdmin ? "Acceso total" : myPrograms.length > 1 ? "Avanzado" : "En ruta"}
                </div>
              </div>
              <Link
                to="/programas"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--nexus-border)] px-3 py-2 text-[11px] font-black"
              >
                {cfg.progressCta} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Panel>
          )}

          {cfg.showToday && (
          <Panel className="p-6">
            <Eyebrow>{cfg.todayTitle}</Eyebrow>
            <div className="mt-4 space-y-2">
              {cfg.todayActions.map((a, i) => {
                const dynamic = !a.to.trim();
                return (
                  <Action
                    key={`${a.title}-${i}`}
                    icon={ACTION_ICONS[a.icon] ?? ACTION_ICONS.book}
                    title={a.title}
                    hint={dynamic ? focus?.title ?? "Elige un programa" : a.hint}
                    to={dynamic ? (focus ? "/programas/$slug" : "/programas") : a.to}
                    params={dynamic && focus ? { slug: focus.slug } : undefined}
                  />
                );
              })}
            </div>
          </Panel>
          )}

          {cfg.showAi && (
          <Panel className="relative overflow-hidden p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--nexus-cyan) 40%, transparent), transparent 70%)",
                filter: "blur(18px)",
              }}
            />
            <h3 className="text-lg font-black tracking-tight">{cfg.aiTitle}</h3>
            <p className="mt-1 text-[11px] font-semibold opacity-60">{cfg.aiSubtitle}</p>
            <Link
              to={cfg.aiTo || "/anatomy-lab"}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--nexus-border)] bg-[color:var(--nexus-teal)]/10 px-4 py-3 text-xs font-black text-[color:var(--nexus-teal)] transition hover:-translate-y-0.5"
            >
              {cfg.aiCta} <ArrowRight className="size-3.5" />
            </Link>
          </Panel>
          )}

          {isAdmin && (
            <Panel className="p-5">
              <div className="flex items-center gap-2.5">
                <Shield className="size-4 text-[color:var(--nexus-teal)]" strokeWidth={2.4} />
                <div className="flex-1 text-xs font-black">Cuenta administradora</div>
              </div>
              <Link
                to="/admin"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--nexus-teal)] px-3 py-2.5 text-[11px] font-black text-white"
              >
                Abrir panel
              </Link>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="opacity-65">{label}</span>
      <span className="ml-auto font-black">{value}</span>
    </li>
  );
}

function Action({
  icon,
  title,
  hint,
  to,
  params,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  to: string;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      className="group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 transition hover:border-[color:var(--nexus-border)]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--nexus-teal)]/10 text-[color:var(--nexus-teal)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black">{title}</span>
        <span className="block truncate text-[10px] font-semibold opacity-55">{hint}</span>
      </span>
      <span className="inline-flex size-7 items-center justify-center rounded-full border border-[color:var(--nexus-border)] transition group-hover:border-[color:var(--nexus-cyan)]">
        <ArrowRight className="size-3.5" strokeWidth={2.4} />
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------- vista free */

function LockedView({
  enrollments,
  email,
  userId,
  displayName,
  greeting,
  coreIntensity,
  envBase,
  reducedMotion,
  lowPower,
}: {
  enrollments: Enrollment[];
  email?: string;
  userId?: string;
  displayName: string;
  greeting: string;
  coreIntensity: number;
  envBase: "light" | "dark";
  reducedMotion: boolean;
  lowPower: boolean;
}) {
  const expired = enrollments.filter((e) => !isActive(e));
  const { programs } = useProgramCatalog();
  const admissionQ = useMyAdmission(userId);
  const admission = admissionQ.data ?? null;
  const pending = admission && (admission.status === "pending" || admission.status === "reviewing");
  const rejected = admission && (admission.status === "rejected" || admission.status === "refunded");

  return (
    <div className="mx-auto w-full max-w-[1440px] animate-slide-up space-y-8 pt-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--nexus-teal)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--nexus-teal)]">
              <Sparkles className="size-3" /> Miembro Free
            </span>
            {pending && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                <Clock className="size-3" /> Matrícula pendiente
              </span>
            )}
            {rejected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
                Matrícula por regularizar
              </span>
            )}
          </div>
          <h1 className="mt-4 text-[28px] font-black tracking-tight sm:text-[34px]">
            {greeting}, {displayName} 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm opacity-60">
            {pending
              ? "Tu matrícula está siendo revisada por el equipo de KotaMed. Tiempo estimado: 1–24 horas. Mientras tanto, explora todo el contenido gratuito."
              : "Ya formas parte del ecosistema KotaMed. Explora el contenido gratuito y completa tu matrícula cuando quieras para desbloquear el acceso premium."}
            {expired.length > 0 && " Tienes matrículas anteriores vencidas."}
          </p>
          <div className="mt-3 text-[11px] font-bold opacity-50">Cuenta: {email}</div>

          <Panel className="mt-6 p-7">
            <Eyebrow>Centro de admisión</Eyebrow>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              {pending ? "Tu matrícula está en revisión" : "Completa tu matrícula"}
            </h2>
            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                "Internado Médico",
                "Residentado (ENAM · ESSALUD)",
                "Cursos y diplomados",
                "Biblioteca premium",
                "Simulaciones con IA",
                "Certificados",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2
                    className="size-3.5 shrink-0 text-[color:var(--nexus-teal)]"
                    strokeWidth={2.5}
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/admision"
                className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--nexus-teal)] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                {pending ? "Ver estado de mi matrícula" : "Matricularme"}
                <ArrowRight className="size-4" strokeWidth={2.6} />
              </Link>
              <div className="text-[11px] font-bold opacity-55">
                {admission?.submitted_at ? "Solicitud enviada" : "Sin solicitud enviada"}
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex items-center justify-center">
          <AnatomicalCore
            intensity={coreIntensity}
            base={envBase}
            reducedMotion={reducedMotion}
            lowPower={lowPower}
          />
        </div>
      </div>

      <section>
        <Eyebrow>Contenido gratuito · disponible ahora</Eyebrow>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {FREE_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="nexus-card rounded-3xl p-5 hover:-translate-y-1"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-[color:var(--nexus-teal)]/10 text-[color:var(--nexus-teal)]">
                <item.icon className="size-4" strokeWidth={2.25} />
              </div>
              <div className="text-xs font-black tracking-tight">{item.label}</div>
              <div className="mt-1 text-[10px] font-semibold opacity-55">{item.hint}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Eyebrow>Programas premium · se desbloquean al aprobarse tu matrícula</Eyebrow>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <div key={p.slug} className="nexus-card relative overflow-hidden rounded-3xl p-6">
              <div className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-lg border border-[color:var(--nexus-border)]">
                <Lock className="size-3.5 opacity-55" strokeWidth={2.25} />
              </div>
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-[color:var(--nexus-border)]">
                <BookOpen className="size-5 opacity-60" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-black tracking-tight">{p.title}</h3>
              <p className="mt-1 text-[11px] font-semibold opacity-55">
                Incluido en los planes Premium, Pro y Elite.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
