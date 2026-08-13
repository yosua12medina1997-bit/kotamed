/**
 * Experiencia premium POST-MATRÍCULA.
 * No crea login, registro ni un segundo sistema de matrícula: solo lee el
 * estado real del usuario (RLS) y lo conduce a su espacio académico.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";
import kotaroLogo from "@/assets/kotaro-logo.png";
import {
  DynamicEnvironmentProvider,
  GlobalEnvironment,
} from "@/components/hero/DynamicEnvironment";
import {
  isActive,
  PROGRAM_LABELS,
  useMyEnrollments,
  useMyProfile,
  useSupabaseUser,
} from "@/lib/session";
import { useMyProgramEnrollments } from "@/lib/enrollments";
import { useMyAdmission } from "@/lib/admission";
import {
  messageForProgram,
  useWelcomeConfig,
  DEFAULT_WELCOME_CONFIG,
} from "@/lib/welcome-cms";

export const Route = createFileRoute("/_authenticated/bienvenida")({
  head: () => ({
    meta: [
      { title: "Bienvenido a KotaMed · Matrícula confirmada" },
      {
        name: "description",
        content: "Confirmación de matrícula y acceso a tu espacio académico en KotaMed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomeRoute,
});

const card =
  "rounded-3xl border border-white/10 bg-[color-mix(in_oklab,var(--card)_78%,transparent)] backdrop-blur-xl shadow-[0_24px_80px_-40px_oklch(0.5_0.12_220_/_0.6)]";

function WelcomeRoute() {
  return (
    <DynamicEnvironmentProvider>
      <div className="dark relative min-h-screen text-foreground">
        <GlobalEnvironment />
        <WelcomePage />
      </div>
    </DynamicEnvironmentProvider>
  );
}

function WelcomePage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const { data: profile } = useMyProfile(user?.id);
  const enrollmentsQ = useMyEnrollments(user?.id);
  const manualQ = useMyProgramEnrollments(user?.id);
  const admissionQ = useMyAdmission(user?.id);
  const cfg = useWelcomeConfig().data ?? DEFAULT_WELCOME_CONFIG;

  const loading =
    !user || enrollmentsQ.isLoading || manualQ.isLoading || admissionQ.isLoading;

  const enrollments = enrollmentsQ.data ?? [];
  const manual = manualQ.data ?? [];
  const admission = admissionQ.data ?? null;
  const activeLegacy = enrollments.filter(isActive);
  const hasAccess = activeLegacy.length > 0 || manual.length > 0;

  /** Destino real: primer nodo/programa vigente; si no, el panel existente. */
  const target = useMemo(() => {
    const slug = manual.find((m) => m.node?.slug)?.node?.slug ?? activeLegacy[0]?.program;
    return slug ? { to: "/programas/$slug" as const, params: { slug } } : null;
  }, [manual, activeLegacy]);

  const programTitle =
    manual.find((m) => m.node?.title)?.node?.title ??
    (activeLegacy[0]
      ? PROGRAM_LABELS[activeLegacy[0].program] ?? activeLegacy[0].program
      : admission?.program_title ?? "—");
  const programKey =
    manual.find((m) => m.node?.slug)?.node?.slug ??
    activeLegacy[0]?.program ??
    admission?.program_slug ??
    programTitle;

  const startedAt =
    manual[0]?.starts_at ?? activeLegacy[0]?.created_at ?? admission?.submitted_at ?? null;
  const expiresAt = manual[0]?.expires_at ?? activeLegacy[0]?.expires_at ?? null;
  const planName = admission?.plan_name ?? (hasAccess ? "Acceso académico" : "—");
  const displayName =
    profile?.full_name?.split(" ")[0] ||
    admission?.full_name?.split(" ")[0] ||
    profile?.email?.split("@")[0] ||
    "Estudiante";

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);

  /* Marca la bienvenida como vista para no repetirla en cada ingreso. */
  useEffect(() => {
    if (user && hasAccess) {
      try {
        window.localStorage.setItem(`kotamed:welcome-seen:${user.id}`, "1");
      } catch {
        /* almacenamiento no disponible */
      }
    }
  }, [user, hasAccess]);

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Shell displayName={displayName}>
        <PendingState admission={admission} enrollments={enrollments} />
      </Shell>
    );
  }

  return (
    <Shell displayName={displayName}>
      <section className={`${card} p-8 sm:p-10 animate-slide-up`}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="size-3" /> {cfg.eyebrow}
        </span>
        <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">
          {cfg.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm sm:text-base text-muted-foreground">{cfg.subtitle}</p>

        {cfg.showChecks && (
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {cfg.checks.map((c) => (
              <li
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300"
              >
                <CheckCircle2 className="size-3.5" strokeWidth={2.5} /> {c}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-t border-white/10 pt-7">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {cfg.greeting.replace("{nombre}", displayName)}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {messageForProgram(cfg, programKey)}
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
          {target ? (
            <Link
              to={target.to}
              params={target.params}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
            >
              {cfg.ctaLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
            >
              {cfg.ctaLabel}
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </Link>
          )}
          <span className="text-[11px] font-semibold text-muted-foreground">
            Acceso verificado con tu sesión y matrícula vigente.
          </span>
        </div>
      </section>

      {cfg.showPlanCard && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <InfoCell icon={CreditCard} label="Plan" value={planName} />
          <InfoCell icon={GraduationCap} label="Programa" value={programTitle} />
          <InfoCell icon={BadgeCheck} label="Estado" value="Activo" tone="ok" />
          <InfoCell icon={Clock} label="Fecha de inicio" value={fmt(startedAt)} />
          <InfoCell
            icon={CalendarClock}
            label="Vigencia"
            value={expiresAt ? fmt(expiresAt) : "Acceso continuo"}
          />
        </section>
      )}

      {cfg.showQuickLinks && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {target ? (
            <QuickLink icon={GraduationCap} label="Mi programa" to={target.to} params={target.params} />
          ) : (
            <QuickLink icon={GraduationCap} label="Mi programa" to="/programas" />
          )}
          <QuickLink icon={UserRound} label="Mi perfil" to="/dashboard" />
          <QuickLink icon={CreditCard} label="Mi plan" to="/admision" />
          <QuickLink icon={LifeBuoy} label="Centro de ayuda" href={cfg.helpUrl} />
        </section>
      )}

      {cfg.showProgress && (
        <section className={`${card} p-6`}>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {cfg.progressTitle}
          </div>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-3xl font-extrabold tracking-tight">0%</span>
            <div className="h-1.5 flex-1 rounded-full bg-white/10">
              <div className="h-full w-0 rounded-full bg-primary" />
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {cfg.progressEmpty}
          </p>
        </section>
      )}
    </Shell>
  );
}

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function Shell({ children, displayName }: { children: React.ReactNode; displayName: string }) {
  return (
    <div className="relative">
      <header className="flex items-center justify-between px-6 lg:px-10 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={kotaroLogo} alt="KotaMed" className="size-9 object-contain" />
          <span className="text-lg font-extrabold tracking-tighter">KOTAMED</span>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {displayName}
        </span>
      </header>
      <main className="mx-auto max-w-5xl px-5 sm:px-8 pb-16 space-y-4">{children}</main>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2.25} />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div
        className={`mt-1.5 text-sm font-extrabold tracking-tight ${
          tone === "ok" ? "text-emerald-300" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  to,
  params,
  href,
}: {
  icon: React.ElementType;
  label: string;
  to?: any;
  params?: any;
  href?: string;
}) {
  const cls =
    "flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--card)_70%,transparent)] px-4 py-3.5 text-xs font-bold backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/40";
  const inner = (
    <>
      <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      {label}
    </>
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} params={params} className={cls}>
      {inner}
    </Link>
  );
}

/** Estados: pendiente, rechazada/cancelada, vencida o sin matrícula. */
function PendingState({
  admission,
  enrollments,
}: {
  admission: { status?: string; submitted_at?: string | null } | null;
  enrollments: { expires_at: string }[];
}) {
  const status = admission?.status;
  const expired = enrollments.length > 0;
  const pending = status === "pending" || status === "reviewing";
  const cancelled = status === "rejected" || status === "refunded";

  const copy = pending
    ? {
        badge: "Matrícula en revisión",
        title: "Estamos validando tu matrícula",
        text: "Nuestro equipo revisa tu comprobante y datos. Tiempo estimado: 1–24 horas. Te avisaremos al confirmarse.",
        cta: "Ver estado de mi matrícula",
      }
    : cancelled
      ? {
          badge: "Matrícula por regularizar",
          title: "Tu matrícula no pudo completarse",
          text: "Revisa el detalle en el Centro de Admisión para regularizar tu inscripción.",
          cta: "Abrir Centro de Admisión",
        }
      : expired
        ? {
            badge: "Matrícula vencida",
            title: "Tu acceso ha expirado",
            text: "Renueva tu matrícula para recuperar el acceso a tu programa y contenido premium.",
            cta: "Renovar matrícula",
          }
        : {
            badge: "Sin matrícula activa",
            title: "Completa tu matrícula para ingresar",
            text: "Usa el Centro de Admisión existente para elegir programa, plan y registrar tu pago.",
            cta: "Ir al Centro de Admisión",
          };

  return (
    <section className={`${card} p-8 sm:p-10 animate-slide-up`}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300">
        <Clock className="size-3" /> {copy.badge}
      </span>
      <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{copy.title}</h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground">{copy.text}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          to="/admision"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-extrabold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          {copy.cta}
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-6 py-3.5 text-sm font-bold transition-transform hover:-translate-y-0.5"
        >
          Ir a mi panel
        </Link>
      </div>
    </section>
  );
}
