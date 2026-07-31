/**
 * Puerta de acceso a módulos privados: sesión + matrícula/membresía vigente.
 * No altera el diseño existente: solo intercepta el contenido cuando no hay permiso.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, Lock, ShieldCheck, LifeBuoy, LayoutDashboard, Sparkles } from "lucide-react";
import { useSupabaseUser } from "@/lib/session";
import { checkProgramAccess } from "@/lib/access.functions";

export function ModuleGate({
  programSlug,
  moduleName,
  children,
}: {
  programSlug: string;
  moduleName?: string;
  children: ReactNode;
}) {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const check = useServerFn(checkProgramAccess);

  const access = useQuery({
    queryKey: ["module-access", programSlug, user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: () => check({ data: { slug: programSlug } }),
  });

  const initialHref = useRef(href);
  const sentToLogin = useRef(false);
  useEffect(() => {
    if (user === null && !sentToLogin.current) {
      sentToLogin.current = true;
      const dest = initialHref.current;
      navigate({
        to: "/auth",
        search: dest.startsWith("/auth") ? {} : { redirect: dest },
        replace: true,
      });
    }
  }, [user, navigate]);

  if (user === undefined || (user && access.isPending)) return <GateShell spinner />;
  if (user === null) return <GateShell spinner />;

  if (access.data?.allowed) return <>{children}</>;

  return <NotEnrolled moduleName={moduleName} error={!!access.error} />;
}

function GateShell({ spinner }: { spinner?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      {spinner && <Loader2 className="size-6 animate-spin text-primary" />}
    </div>
  );
}

function NotEnrolled({ moduleName, error }: { moduleName?: string; error?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[130px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)" }}
      />
      <div className="relative w-full max-w-xl glass rounded-3xl p-8 md:p-10 text-center">
        <span className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Lock className="size-5" strokeWidth={2.25} />
        </span>
        <h1 className="mt-5 text-2xl md:text-3xl font-extrabold tracking-tight">
          {error
            ? "No pudimos verificar tu matrícula"
            : "Este curso no forma parte de tu matrícula"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Tu cuenta ha sido autenticada correctamente. Sin embargo,
          {moduleName ? ` «${moduleName}»` : " este curso"} no se encuentra habilitado para tu
          perfil académico. Para acceder debes adquirir la matrícula correspondiente o comunicarte
          con administración.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch justify-center gap-3">
          <Link
            to="/programas"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            <Sparkles className="size-4" />
            Ver planes
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl font-semibold text-sm hover:bg-muted/60 transition-colors"
          >
            <LayoutDashboard className="size-4" />
            Mis cursos
          </Link>
          <a
            href="mailto:soporte@kotaroacademy.com"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl font-semibold text-sm hover:bg-muted/60 transition-colors"
          >
            <LifeBuoy className="size-4" />
            Contactar soporte
          </a>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground inline-flex items-center gap-1.5 justify-center">
          <ShieldCheck className="size-3.5" />
          Verificación de matrícula realizada en el servidor
        </p>
      </div>
    </div>
  );
}
