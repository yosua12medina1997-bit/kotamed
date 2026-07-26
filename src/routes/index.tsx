import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ClipboardList,
  GraduationCap,
  Layers,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kotaro Academy · Preparación médica premium con IA" },
      {
        name: "description",
        content:
          "Plataforma premium de educación médica: ENAM, ESSALUD, internado y residencia de Pediatría. Tutor IA con evidencia AAP, Nelson y UpToDate.",
      },
      { property: "og:title", content: "Kotaro Academy · Educación médica premium" },
      {
        property: "og:description",
        content:
          "Prepárate para el Residentado y formación durante toda la residencia. Aprendizaje inteligente con IA basada en fuentes oficiales.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[130px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 22%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] -right-[10%] w-[50%] h-[65%] rounded-full blur-[130px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.14 285) 20%, transparent)",
          animationDelay: "-6s",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full blur-[130px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.78 0.13 20) 14%, transparent)",
          animationDelay: "-12s",
        }}
      />

      <Nav />

      <main className="relative">
        <Hero />
        <TrustBar />
        <Programs />
        <Pillars />
        <FinalCta />
        <Footer />
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="size-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Stethoscope className="size-5 text-primary-foreground" strokeWidth={2.25} />
          </span>
          <span className="font-extrabold tracking-tighter text-lg">KOTARO</span>
          <span className="hidden sm:inline text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">
            Academy
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
          <Link to="/programas" className="hover:text-foreground transition-colors">
            Programas
          </Link>
          <a href="#pilares" className="hover:text-foreground transition-colors">
            Metodología
          </a>
          <a href="#evidencia" className="hover:text-foreground transition-colors">
            Evidencia
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden sm:inline-flex text-sm font-semibold px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
            Iniciar sesión
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold hover:-translate-y-0.5 transition-transform shadow-sm"
          >
            Entrar
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-24 lg:pt-32 lg:pb-32 relative">
      <div className="max-w-3xl mx-auto text-center animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" strokeWidth={2.5} />
          Educación médica premium con IA
        </div>

        <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.02] text-balance">
          Domina la medicina.
          <br />
          <span className="text-primary">Desde el ENAM al especialista.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground text-pretty leading-relaxed max-w-2xl mx-auto">
          La plataforma más completa de preparación para el Residentado Médico y formación
          durante toda la residencia. Aprendizaje inteligente con evidencia científica de{" "}
          <strong className="text-foreground">AAP, Nelson y UpToDate</strong>.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/programas"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 transition-all"
          >
            Explorar programas
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-7 py-3.5 glass border border-border rounded-xl font-bold text-sm hover:bg-white/80 transition-colors"
          >
            Ver panel demo
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" strokeWidth={2.5} />
            Evidencia citada
          </span>
          <span>· Pediatría disponible</span>
          <span>· Sin tarjeta requerida</span>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const sources = ["AAP 2022", "Nelson 21ed", "UpToDate", "WHO", "Red Book", "ENAM · ESSALUD"];
  return (
    <section id="evidencia" className="border-y border-border/60 bg-white/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] mb-5">
          Basado en fuentes oficiales
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {sources.map((s) => (
            <span
              key={s}
              className="font-mono text-xs font-semibold text-muted-foreground/80"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Programs() {
  const items = [
    {
      title: "Preparación Residentado",
      sub: "ENAM · ESSALUD",
      desc: "Simulacros adaptativos y bancos de preguntas de alta frecuencia.",
      accent: "teal",
    },
    {
      title: "Internado Médico",
      sub: "Rotación Pediatría",
      desc: "Casos clínicos, checklists y algoritmos para la rotación.",
      accent: "indigo",
    },
    {
      title: "Residencia R1 · R2 · R3",
      sub: "Formación completa",
      desc: "Currículum longitudinal con perlas, guardias y liderazgo clínico.",
      accent: "violet",
    },
  ];
  const tint: Record<string, string> = {
    teal: "from-teal-400/20 to-teal-600/5 text-teal-700",
    indigo: "from-indigo-400/20 to-indigo-600/5 text-indigo-700",
    violet: "from-violet-400/20 to-violet-600/5 text-violet-700",
  };
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div className="max-w-2xl mb-12">
        <span className="text-primary font-bold text-xs uppercase tracking-widest">
          Programas
        </span>
        <h2 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">
          Un camino continuo,
          <br />
          desde el ENAM al residente.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((p) => (
          <div
            key={p.title}
            className="glass rounded-3xl p-7 hover:-translate-y-1 hover:shadow-xl transition-all group"
          >
            <div
              className={`size-11 rounded-xl bg-gradient-to-br ${tint[p.accent]} flex items-center justify-center mb-6`}
            >
              <GraduationCap className="size-5" strokeWidth={2.25} />
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {p.sub}
            </div>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight">{p.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          to="/programas"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          Ver los 5 programas de Pediatría
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      icon: Brain,
      title: "Tutor IA con evidencia",
      desc: "Respuestas citadas de AAP, Nelson y UpToDate. Sin alucinaciones.",
    },
    {
      icon: Layers,
      title: "Flashcards SRS",
      desc: "Repetición espaciada personalizada por tu curva de olvido.",
    },
    {
      icon: BookOpen,
      title: "Manuales premium",
      desc: "Texto curado por especialistas con perlas de alto rendimiento.",
    },
    {
      icon: ClipboardList,
      title: "Simulacros adaptativos",
      desc: "Nivel ENAM y ESSALUD con analítica de debilidades.",
    },
    {
      icon: Trophy,
      title: "Ranking y rachas",
      desc: "Motivación con gamificación clínica y logros por rotación.",
    },
    {
      icon: ShieldCheck,
      title: "Checklist de competencias",
      desc: "Estándar académico de 31 secciones por capítulo.",
    },
  ];
  return (
    <section id="pilares" className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div className="max-w-2xl mb-12">
        <span className="text-primary font-bold text-xs uppercase tracking-widest">
          Metodología
        </span>
        <h2 className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">
          Aprendizaje activo,
          <br />
          respaldado por evidencia.
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillars.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="glass rounded-2xl p-6 hover:bg-white/80 transition-colors"
          >
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Icon className="size-5" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
      <div className="glass rounded-[2rem] p-10 lg:p-16 text-center relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent)",
          }}
        />
        <div className="relative">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-balance">
            Empieza tu camino hoy.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-pretty">
            Únete a la próxima generación de médicos que estudian de forma inteligente,
            con evidencia y sin ruido.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 transition-all"
            >
              Ingresar a la plataforma
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </Link>
            <Link
              to="/programas"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-border rounded-xl font-bold text-sm hover:bg-white/60 transition-colors"
            >
              Ver programas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 mt-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-6 bg-primary rounded-md flex items-center justify-center">
            <Stethoscope className="size-3 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="font-extrabold tracking-tighter text-foreground">KOTARO</span>
          <span className="font-mono">· Academy</span>
        </div>
        <div className="font-mono">© 2026 · Educación médica premium con IA</div>
      </div>
    </footer>
  );
}
