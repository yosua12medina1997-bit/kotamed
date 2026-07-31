import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import kotaroLogo from "@/assets/kotaro-logo.png";
import { useSupabaseUser } from "@/lib/session";
import AdmissionWizard from "@/components/admission/AdmissionWizard";

export const Route = createFileRoute("/_authenticated/admision")({
  head: () => ({
    meta: [
      { title: "Centro de Admisión · KotaMed" },
      {
        name: "description",
        content: "Completa tu matrícula en KotaMed: programa, plan, pago y validación.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmissionPage,
});

function AdmissionPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
      />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 relative">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.5} /> Volver al panel
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <img src={kotaroLogo} alt="KotaMed" className="size-8 object-contain" />
            <span className="font-extrabold tracking-tighter">KOTAMED</span>
          </Link>
        </div>

        <header className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="size-3.5" /> Centro de Admisión
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Completa tu matrícula
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Un proceso guiado en 5 pasos. Tu avance se guarda automáticamente y puedes
            retomarlo cuando quieras.
          </p>
        </header>

        <AdmissionWizard userId={user.id} />
      </div>
    </div>
  );
}
