import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardList,
  Home,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Trophy,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Clock,
  Users,
  Newspaper,
  CalendarDays,
  Calculator,
  Layers,
  Stethoscope,
  PlayCircle,
  Library,
  UserRound,
} from "lucide-react";
import kotaroLogo from "@/assets/kotaro-logo.png";
import { supabase } from "@/integrations/supabase/client";
import {
  isActive,
  PROGRAM_LABELS,
  useIsAdmin,
  useMyEnrollments,
  useMyProfile,
  useSupabaseUser,
  type Enrollment,
} from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { useProgramCatalog } from "@/lib/content-catalog";
import { useMyAdmission } from "@/lib/admission";

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

import { UserMenu } from "@/components/profile/UserMenu";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mi panel · KotaMed" },
      { name: "description", content: "Panel académico personal en KotaMed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: profile } = useMyProfile(user?.id);
  const enrollmentsQ = useMyEnrollments(user?.id);

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!user || enrollmentsQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enrollments = enrollmentsQ.data ?? [];
  const active = enrollments.filter(isActive);
  const hasAccess = isAdmin || active.length > 0;
  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Estudiante";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[20%] -right-[5%] w-[40%] h-[60%] rounded-full blur-[120px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.12 280) 18%, transparent)",
          animationDelay: "-5s",
        }}
      />

      <TopNav
        displayName={displayName}
        email={profile?.email}
        avatarUrl={profile?.avatar_url ?? null}
        userId={user.id}
        isAdmin={!!isAdmin}
        onSignOut={signOut}
      />

      <main className="pt-16 min-h-screen relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
          {isAdmin && <AdminBanner />}

          {hasAccess ? (
            <EnrolledView active={active} displayName={displayName} isAdmin={!!isAdmin} />
          ) : (
            <LockedView enrollments={enrollments} email={profile?.email} userId={user.id} />
          )}
        </div>
      </main>
    </div>
  );
}

function TopNav({
  displayName,
  email,
  avatarUrl,
  userId,
  isAdmin,
  onSignOut,
}: {
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  userId: string;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  return (
    <header className="fixed top-0 inset-x-0 h-16 glass z-40 px-6 lg:px-10 flex items-center justify-between border-b border-border/60">
      <Link to="/" className="flex items-center gap-2.5">
        <img src={kotaroLogo} alt="KotaMed" className="size-9 object-contain" />
        <span className="font-extrabold tracking-tighter text-lg">KOTAMED</span>
      </Link>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            to="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-bold hover:-translate-y-0.5 transition-transform"
          >
            <Shield className="size-3.5" strokeWidth={2.5} /> Admin
          </Link>
        )}
        <UserMenu
          userId={userId}
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}


function AdminBanner() {
  return (
    <div className="mb-6 glass rounded-2xl p-4 flex items-center gap-3 border-l-4 border-primary">
      <Shield className="size-5 text-primary shrink-0" strokeWidth={2.25} />
      <div className="flex-1">
        <div className="text-sm font-bold">Cuenta administradora</div>
        <div className="text-xs text-muted-foreground">
          Puedes matricular estudiantes y ver todas las matrículas.
        </div>
      </div>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:-translate-y-0.5 transition-transform"
      >
        Abrir panel
      </Link>
    </div>
  );
}

function EnrolledView({
  active,
  displayName,
  isAdmin,
}: {
  active: Enrollment[];
  displayName: string;
  isAdmin: boolean;
}) {
  const { programs } = useProgramCatalog();
  return (


    <div className="space-y-8 animate-slide-up">
      <section className="glass rounded-3xl p-8">
        <span className="text-primary font-bold text-xs uppercase tracking-widest">
          Bienvenido de vuelta
        </span>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
          Hola, {displayName}
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          {isAdmin
            ? "Tienes acceso administrativo total. Elige un programa para explorar el contenido."
            : `Tienes acceso a ${active.length} programa${active.length === 1 ? "" : "s"}.`}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
          {isAdmin ? "Todos los programas" : "Mis programas"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(isAdmin
            ? programs.map((p) => ({ slug: p.slug, expires_at: null as string | null }))
            : active.map((e) => ({ slug: e.program as string, expires_at: e.expires_at }))
          ).map(({ slug, expires_at }) => {
            const cat = programs.find((p) => p.slug === slug);
            const label =
              cat?.title ?? PROGRAM_LABELS[slug as keyof typeof PROGRAM_LABELS] ?? slug;
            return (
              <Link
                key={slug}
                to="/programas/$slug"
                params={{ slug }}
                className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <BookOpen className="size-5" strokeWidth={2.25} />
                  </div>
                  <CheckCircle2 className="size-4 text-emerald-500 ml-auto" strokeWidth={2.5} />
                </div>
                <h3 className="font-bold text-base tracking-tight">{label}</h3>
                {cat && cat.areas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cat.areas.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="px-2 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground"
                      >
                        {a}
                      </span>
                    ))}
                    {cat.areas.length > 3 && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        +{cat.areas.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>{expires_at ? `Vence ${new Date(expires_at).toLocaleDateString()}` : "Acceso admin"}</span>
                  <span className="text-primary group-hover:underline">Abrir →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>


      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniCard icon={<Home className="size-4" />} label="Continuar" value="Ictericia" />
        <MiniCard icon={<Sparkles className="size-4" />} label="Tutor IA" value="Activo" />
        <MiniCard icon={<ClipboardList className="size-4" />} label="Simulacros" value="0" />
        <MiniCard icon={<Trophy className="size-4" />} label="Racha" value="—" />
      </section>
    </div>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function LockedView({
  enrollments,
  email,
  userId,
}: {
  enrollments: Enrollment[];
  email?: string;
  userId?: string;
}) {
  const expired = enrollments.filter((e) => !isActive(e));
  const { programs } = useProgramCatalog();
  const admissionQ = useMyAdmission(userId);
  const admission = admissionQ.data ?? null;
  const pending =
    admission && (admission.status === "pending" || admission.status === "reviewing");
  const rejected =
    admission && (admission.status === "rejected" || admission.status === "refunded");

  return (
    <div className="animate-slide-up space-y-8">
      {/* Bienvenida FREE */}
      <section className="glass rounded-3xl p-8 sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-widest">
            <Sparkles className="size-3" /> Miembro Free
          </span>
          {pending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-extrabold uppercase tracking-widest">
              <Clock className="size-3" /> Matrícula pendiente
            </span>
          )}
          {rejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-extrabold uppercase tracking-widest">
              Matrícula por regularizar
            </span>
          )}
        </div>
        <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
          Bienvenido a KotaMed
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl text-pretty">
          {pending
            ? "Tu matrícula está siendo revisada por el equipo de KotaMed. Tiempo estimado: 1–24 horas. Mientras tanto, explora todo el contenido gratuito."
            : "Ya formas parte del ecosistema KotaMed. Explora el contenido gratuito y completa tu matrícula cuando quieras para desbloquear el acceso premium."}
          {expired.length > 0 && " Tienes matrículas anteriores vencidas."}
        </p>
        <div className="mt-5 text-[11px] font-semibold text-muted-foreground">
          Cuenta: {email}
        </div>
      </section>

      {/* Card grande: completar matrícula */}
      <section className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden border-l-4 border-primary">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <div className="flex-1">
            <span className="text-primary font-bold text-xs uppercase tracking-widest">
              Centro de Admisión
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {pending ? "Tu matrícula está en revisión" : "Completa tu matrícula"}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg">
              Obtén acceso a Internado, Residentado, cursos, biblioteca premium y simulaciones
              con KotaMed AI.
            </p>
            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Internado Médico",
                "Residentado (ENAM · ESSALUD)",
                "Cursos y diplomados",
                "Biblioteca premium",
                "Simulaciones con IA",
                "Certificados",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/admision"
              className="mt-7 inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              {pending ? "Ver estado de mi matrícula" : "Matricularme"}
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </Link>
          </div>
          <div className="w-full lg:w-64 rounded-2xl border border-border p-5 bg-background/40">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tu progreso de admisión
            </div>
            <ol className="mt-4 space-y-3">
              {[
                { label: "Cuenta creada", done: true },
                { label: "Miembro Free", done: true },
                { label: "Solicitud enviada", done: !!admission?.submitted_at },
                { label: "Validación del equipo", done: false },
                { label: "Alumno activo", done: false },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-xs font-semibold">
                  {s.done ? (
                    <CheckCircle2 className="size-4 text-emerald-500" strokeWidth={2.5} />
                  ) : (
                    <span className="size-4 rounded-full border-2 border-border" />
                  )}
                  <span className={s.done ? "" : "text-muted-foreground"}>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Contenido gratuito */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Contenido gratuito · disponible ahora
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {FREE_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="glass rounded-2xl p-5 hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <item.icon className="size-4" strokeWidth={2.25} />
              </div>
              <div className="font-bold text-xs tracking-tight">{item.label}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{item.hint}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Programas premium (bloqueados) */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Programas premium · se desbloquean al aprobarse tu matrícula
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <div
              key={p.slug}
              className="glass rounded-2xl p-6 relative overflow-hidden opacity-90"
            >
              <div className="absolute top-3 right-3 size-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
                <Lock className="size-3.5 text-muted-foreground" strokeWidth={2.25} />
              </div>
              <div className="size-10 rounded-xl bg-black/[0.04] text-muted-foreground flex items-center justify-center mb-3">
                <BookOpen className="size-5" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-sm tracking-tight">{p.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Incluido en los planes Premium, Pro y Elite.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
