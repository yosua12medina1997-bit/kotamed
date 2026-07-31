import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardList,
  Home,
  Lock,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  Trophy,
  Loader2,
  CheckCircle2,
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

import doctorAvatar from "@/assets/doctor-avatar.jpg";
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
        isAdmin={!!isAdmin}
        onSignOut={signOut}
      />

      <main className="pt-16 min-h-screen relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
          {isAdmin && <AdminBanner />}

          {hasAccess ? (
            <EnrolledView active={active} displayName={displayName} isAdmin={!!isAdmin} />
          ) : (
            <LockedView enrollments={enrollments} email={profile?.email} />
          )}
        </div>
      </main>
    </div>
  );
}

function TopNav({
  displayName,
  email,
  isAdmin,
  onSignOut,
}: {
  displayName: string;
  email?: string;
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
        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="text-xs font-bold">{displayName}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{email}</span>
        </div>
        <img
          src={doctorAvatar}
          alt="Perfil"
          className="size-9 rounded-full border-2 border-white shadow-sm object-cover"
        />
        <button
          onClick={onSignOut}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" strokeWidth={2} />
        </button>
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
}: {
  enrollments: Enrollment[];
  email?: string;
}) {
  const expired = enrollments.filter((e) => !isActive(e));
  const { programs } = useProgramCatalog();

  return (
    <div className="animate-slide-up">
      <section className="glass rounded-3xl p-10 relative overflow-hidden text-center">
        <div className="mx-auto size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
          <Lock className="size-6" strokeWidth={2.25} />
        </div>
        <span className="text-primary font-bold text-xs uppercase tracking-widest">
          Acceso pendiente
        </span>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
          Tu cuenta aún no está matriculada
        </h1>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-pretty">
          El acceso al contenido académico se activa cuando el administrador de KotaMed
          matricula tu cuenta en uno o más programas.
          {expired.length > 0 && " Tienes matrículas anteriores vencidas."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`mailto:yosua12medina1997@gmail.com?subject=Solicitud%20de%20matr%C3%ADcula%20Kotaro%20Academy&body=Hola%2C%20soy%20${encodeURIComponent(email ?? "")}%20y%20solicito%20matr%C3%ADcula.`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            <Mail className="size-4" strokeWidth={2.5} /> Contactar al administrador
          </a>
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground">
            Cuenta: {email}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Vista previa · Programas disponibles
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
                Bloqueado hasta que el administrador te matricule.
              </p>
            </div>
          ))}

        </div>
      </section>
    </div>
  );
}
