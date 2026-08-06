import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Brain,
  Calendar,
  ClipboardList,
  Crown,
  FlaskConical,
  GraduationCap,
  Layers,
  LineChart,
  MonitorPlay,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
  Users,
} from "lucide-react";
import { useProgramCatalog } from "@/lib/content-catalog";
import { usePublicCmsPage } from "@/lib/cms";
import { CmsBlockView } from "@/components/cms/CmsBlocks";
import kotaroLogo from "@/assets/kotaro-logo.png";
import audEstudiantes from "@/assets/aud-estudiantes.jpg";
import audInternos from "@/assets/aud-internos.jpg";
import audResidentes from "@/assets/aud-residentes.jpg";
import audMedicos from "@/assets/aud-medicos.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KotaMed · Educación médica premium con IA" },
      {
        name: "description",
        content:
          "Formamos hoy, cuidamos el mañana. Plataforma integral de educación médica con IA: ENAM, ESSALUD, internado y residencia. Evidencia AAP, Nelson y UpToDate.",
      },
      { property: "og:title", content: "KotaMed · Educación médica premium con IA" },
      {
        property: "og:description",
        content:
          "Aprende, practica y evoluciona con casos reales, simulaciones y acompañamiento personalizado impulsado por inteligencia artificial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  const { data: cms } = usePublicCmsPage("home");
  const cmsBlocks = cms?.blocks ?? [];

  return (
    <div id="top" className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <Ambience />
      <Nav />
      <main className="relative">
        {cmsBlocks.length > 0 ? (
          cmsBlocks.map((b) => <CmsBlockView key={b.id} block={b} />)
        ) : (
          <>
            <Hero />
            <FeatureRail />
            <ImpactAndAudience />
            <TrustBar />
            <Programs />
            <Pillars />
            <FinalCta />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}


/* ------------------------------------------------------------------ */

function Ambience() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-[20%] right-[-15%] w-[70%] h-[70%] rounded-full blur-[150px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 16%, transparent)" }}
      />
      <div
        className="absolute top-[35%] -left-[15%] w-[50%] h-[55%] rounded-full blur-[150px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.72 0.13 245) 12%, transparent)",
          animationDelay: "-8s",
        }}
      />
      <div
        className="absolute bottom-[-15%] left-[25%] w-[55%] h-[45%] rounded-full blur-[160px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.11 300) 9%, transparent)",
          animationDelay: "-15s",
        }}
      />
    </div>
  );
}

/* ------------------------------- Header --------------------------- */

const NAV_LINKS = [
  { label: "Inicio", href: "#top" },
  { label: "Metodología", href: "#metodologia" },
  { label: "Recursos", href: "#recursos" },
  { label: "Evidencia", href: "#evidencia" },
  { label: "Nosotros", href: "#impacto" },
] as const;

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50 px-3 sm:px-6 pt-3 sm:pt-5">
      <header
        className={`mx-auto max-w-7xl rounded-2xl transition-all duration-500 ${
          scrolled
            ? "glass shadow-[0_18px_50px_-24px_oklch(0.24_0.04_258_/_0.35)] bg-white/70"
            : "border border-transparent"
        }`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 h-16 lg:grid-cols-[auto_1fr_auto]">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src={kotaroLogo}
              alt="KotaMed"
              className="size-9 shrink-0 object-contain"
              width={36}
              height={36}
            />
            <span className="min-w-0 leading-none">
              <span className="block truncate text-[15px] font-extrabold tracking-tight">
                KOTAMED
              </span>
              <span className="hidden sm:block text-[8.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Educación médica premium con IA
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-7 text-[13px] font-semibold text-muted-foreground">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="relative py-1 transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-x-100"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/programas"
              className="relative py-1 transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-x-100"
            >
              Academia
            </Link>
          </nav>

          <div className="flex items-center justify-end gap-2">
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center rounded-xl border border-border bg-white/70 px-4 py-2 text-[13px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/programas"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
            >
              Comenzar ahora
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}

/* -------------------------------- Hero ---------------------------- */

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 lg:px-10 pt-14 pb-10 lg:pt-24 lg:pb-20">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — message */}
        <div className="animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Crown className="size-3.5 text-primary" strokeWidth={2.5} />
            Plataforma líder en educación médica
          </span>

          <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tighter text-balance md:text-6xl lg:text-[4.25rem]">
            Formamos hoy,
            <br />
            cuidamos <span className="text-primary">el mañana</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground text-pretty">
            Plataforma integral de educación médica con inteligencia artificial. Aprende,
            practica y evoluciona con casos reales, simulaciones y acompañamiento
            personalizado.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/programas"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
            >
              <Rocket className="size-4" strokeWidth={2.25} />
              Comenzar mi aprendizaje
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </Link>
            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white/70 px-7 py-4 text-sm font-bold backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="grid size-6 place-items-center rounded-full border border-border">
                <Play className="size-3 fill-current" strokeWidth={0} />
              </span>
              Explorar plataforma
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-[11.5px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" strokeWidth={2.5} />
              Contenido actualizado
            </span>
            <span className="flex items-center gap-1.5">
              <Brain className="size-3.5 text-primary" strokeWidth={2.5} />
              Simulaciones IA
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" strokeWidth={2.5} />
              Certificación premium
            </span>
          </div>
        </div>

        {/* Right — centered Core emblem with floating dashboard cards */}
        <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl">
          <div className="flex justify-center lg:-translate-x-[22%] lg:-translate-y-1 xl:-translate-x-[26%]">
            <CoreEmblem />
          </div>
          <div className="hidden lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:flex-col lg:justify-center lg:gap-3 lg:translate-x-8">
            <div className="w-56">
              <ProgressCard />
            </div>
            <div className="w-56">
              <LiveClassCard />
            </div>
            <div className="w-56">
              <SimulationCard />
            </div>
          </div>
          <div className="mt-6 grid gap-3.5 lg:hidden">
            <ProgressCard />
            <LiveClassCard />
            <SimulationCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function CoreEmblem() {
  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[18rem] sm:max-w-[24rem] lg:max-w-[30rem] place-items-center">
      <div
        aria-hidden
        className="absolute inset-[8%] rounded-full blur-3xl animate-halo"
        style={{ background: "color-mix(in oklab, var(--primary) 22%, transparent)" }}
      />
      <div
        aria-hidden
        className="absolute inset-[4%] rounded-full border border-primary/15 animate-orbit"
      >
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-primary/70" />
      </div>
      <div
        aria-hidden
        className="absolute inset-[16%] rounded-full border border-dashed border-primary/20 animate-orbit-reverse"
      >
        <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary/50" />
      </div>

      <div className="relative grid size-[64%] place-items-center rounded-full bg-white/55 backdrop-blur-md ring-1 ring-inset ring-white/60 shadow-[0_30px_80px_-40px_oklch(0.24_0.04_258_/_0.45)] animate-float-slow">
        <img
          src={kotaroLogo}
          alt="KotaMed Core — isotipo de KotaMed"
          className="size-[68%] object-contain"
        />
        <svg
          aria-hidden
          viewBox="0 0 200 40"
          className="absolute bottom-[16%] w-[62%] text-primary"
          fill="none"
        >
          <path
            d="M0 20h52l8-13 9 26 8-13h34l7-9 8 18 7-9h57"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-ecg"
          />
        </svg>
      </div>

      <span className="absolute inset-x-0 -bottom-1 text-center text-[9.5px] font-bold uppercase tracking-[0.32em] text-muted-foreground">
        Inteligencia · Medicina · Educación
      </span>
    </div>
  );
}

function ProgressCard() {
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary p-4 text-primary-foreground shadow-[0_20px_50px_-28px_oklch(0.24_0.04_258_/_0.5)] transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">
            Tu progreso actual
          </div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight">78%</div>
        </div>
        <LineChart className="size-5 shrink-0 opacity-80" strokeWidth={2.25} />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div className="h-full w-[78%] rounded-full bg-white/90" />
      </div>
      <div className="mt-2 text-[10.5px] font-semibold opacity-85">
        ¡Vas por excelente camino!
      </div>
    </div>
  );
}

function LiveClassCard() {
  return (
    <div className="rounded-2xl border border-border bg-white/85 p-4 backdrop-blur-md shadow-[0_20px_50px_-30px_oklch(0.24_0.04_258_/_0.4)] transition-transform hover:-translate-y-0.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Próxima clase en vivo
      </div>
      <div className="mt-1 text-sm font-extrabold tracking-tight text-primary">
        Urgencias Pediátricas
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <Calendar className="size-3.5" strokeWidth={2.25} />
        Hoy · 08:00 PM
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="size-3.5" strokeWidth={2.25} />
          </span>
          <span className="truncate text-[11.5px] font-bold">KotaMed AI</span>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10.5px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <MonitorPlay className="size-3" strokeWidth={2.5} />
          Unirse
        </Link>
      </div>
    </div>
  );
}

function SimulationCard() {
  return (
    <div className="rounded-2xl border border-border bg-white/85 p-4 backdrop-blur-md shadow-[0_20px_50px_-30px_oklch(0.24_0.04_258_/_0.4)] transition-transform hover:-translate-y-0.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Simulación recomendada
      </div>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 text-[13px] font-extrabold leading-snug tracking-tight">
          Caso: Dificultad Respiratoria Aguda
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <FlaskConical className="size-5" strokeWidth={2} />
        </span>
      </div>
      <Link
        to="/programas/residentado/areas"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[10.5px] font-bold text-background transition-transform hover:-translate-y-0.5"
      >
        Iniciar simulación
        <ArrowRight className="size-3" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

/* ---------------------------- Feature rail ------------------------ */

const RAIL = [
  {
    icon: MonitorPlay,
    title: "KotaMed Campus",
    desc: "Cursos, clases y evaluaciones",
    to: "/dashboard" as const,
  },
  {
    icon: ClipboardList,
    title: "KotaMed Clinical",
    desc: "Ciencias clínicas por especialidad",
    to: "/programas/residentado/areas" as const,
  },
  {
    icon: Brain,
    title: "KotaMed Labs",
    desc: "Simuladores y algoritmos",
    to: "/programas/residentado/areas" as const,
  },
  {
    icon: BookOpen,
    title: "KotaMed Library",
    desc: "Libros, guías y protocolos",
    to: "/programas" as const,
  },
  {
    icon: BadgeCheck,
    title: "KotaMed Exams",
    desc: "ENAM, ESSALUD y Residentado",
    to: "/dashboard" as const,
  },
  {
    icon: Sparkles,
    title: "KotaMed AI",
    desc: "Tu tutor inteligente",
    to: "/dashboard" as const,
  },
];

function FeatureRail() {
  return (
    <section id="recursos" className="mx-auto max-w-7xl px-6 lg:px-10 pb-16 lg:pb-24">
      <div className="glass rounded-3xl bg-white/70 p-2 shadow-[0_30px_70px_-45px_oklch(0.24_0.04_258_/_0.45)]">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {RAIL.map(({ icon: Icon, title, desc, to }) => (
            <Link
              key={title}
              to={to}
              className="group flex items-center gap-3 rounded-2xl px-4 py-4 transition-colors hover:bg-primary/5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Icon className="size-4.5" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-bold leading-snug">{title}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{desc}</span>
              </span>
              <ArrowRight
                className="ml-auto size-3.5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                strokeWidth={2.5}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------ Impact + audience ----------------------- */

const STATS = [
  { icon: Users, value: "25K+", label: "Estudiantes activos" },
  { icon: MonitorPlay, value: "2,500+", label: "Clases impartidas" },
  { icon: Trophy, value: "98%", label: "Satisfacción" },
  { icon: Award, value: "50+", label: "Docentes expertos" },
];

const AUDIENCE = [
  {
    icon: GraduationCap,
    image: audEstudiantes,
    title: "Estudiantes de Medicina",
    desc: "Aprende desde donde estés y a tu ritmo.",
  },
  {
    icon: Stethoscope,
    image: audInternos,
    title: "Internos",
    desc: "Potencia tu desempeño en el hospital.",
  },
  {
    icon: Brain,
    image: audResidentes,
    title: "Residentes",
    desc: "Domina tu especialidad con casos reales.",
  },
  {
    icon: ShieldCheck,
    image: audMedicos,
    title: "Médicos",
    desc: "Educación continua de alto nivel.",
  },
];


function ImpactAndAudience() {
  return (
    <section id="impacto" className="mx-auto max-w-7xl px-6 lg:px-10 pb-20 lg:pb-28">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-primary-foreground shadow-[0_35px_80px_-45px_oklch(0.24_0.04_258_/_0.6)]"
          style={{
            background:
              "linear-gradient(150deg, oklch(0.32 0.06 200), oklch(0.24 0.05 220) 55%, oklch(0.2 0.04 240))",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
          />
          <div className="relative">
            <h2 className="text-lg font-extrabold tracking-tight">Impacto que nos impulsa</h2>
            <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-2">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label}>
                  <Icon className="size-4.5 opacity-70" strokeWidth={2} />
                  <div className="mt-2 text-2xl font-extrabold tracking-tight">{value}</div>
                  <div className="text-[11px] font-semibold leading-snug opacity-75">{label}</div>
                </div>
              ))}
            </div>
            <Link
              to="/programas"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[12px] font-bold backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20"
            >
              Conoce más sobre nosotros
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            ¿Para quién es KotaMed?
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {AUDIENCE.map(({ icon: Icon, title, desc, image }) => (
              <Link
                key={title}
                to="/programas"
                className="group glass flex h-full flex-col overflow-hidden rounded-3xl bg-white/75 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-32 w-full overflow-hidden">
                  <img
                    src={image}
                    alt={title}
                    loading="lazy"
                    width={800}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 left-2 grid size-9 place-items-center rounded-xl bg-white/85 text-primary backdrop-blur-sm">
                    <Icon className="size-4.5" strokeWidth={2} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[13.5px] font-extrabold leading-snug tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[11.5px] font-bold text-primary">
                    Explorar ruta
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-1"
                      strokeWidth={2.5}
                    />
                  </span>
                </div>
              </Link>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Trust ----------------------------- */

function TrustBar() {
  const sources = ["AAP 2022", "Nelson 21ed", "UpToDate", "WHO", "Red Book", "ENAM · ESSALUD"];
  const seals = [
    { icon: Activity, label: "Actualización constante" },
    { icon: ClipboardList, label: "Basado en evidencia" },
    { icon: Award, label: "Certificación internacional" },
    { icon: Sparkles, label: "Tecnología de punta" },
  ];
  return (
    <section id="evidencia" className="mx-auto max-w-7xl px-6 lg:px-10 pb-20 lg:pb-28">
      <div className="glass rounded-3xl bg-white/60 px-6 py-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Con el respaldo de
            </span>
            {sources.map((s) => (
              <span key={s} className="font-mono text-xs font-semibold text-muted-foreground/85">
                {s}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:justify-items-end">
            {seals.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.25} />
                <span className="text-[11.5px] font-semibold leading-snug text-muted-foreground">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Programs ---------------------------- */

function Programs() {
  const { programs } = useProgramCatalog();
  // Los programas ocultos solo llegan al cliente si el usuario está matriculado
  // (o es admin), así que se muestran con una etiqueta en vez de filtrarse.
  const items = programs;
  const tint: Record<string, string> = {
    teal: "from-teal-400/20 to-teal-600/5 text-teal-700",
    indigo: "from-indigo-400/20 to-indigo-600/5 text-indigo-700",
    violet: "from-violet-400/20 to-violet-600/5 text-violet-700",
    rose: "from-rose-400/20 to-rose-600/5 text-rose-700",
    amber: "from-amber-400/20 to-amber-600/5 text-amber-700",
  };

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-20 lg:pb-28">
      <div className="max-w-2xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Programas
        </span>
        <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight text-balance md:text-4xl">
          Un camino continuo, desde el ENAM al especialista.
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.slug}
            to="/programas/$slug"
            params={{ slug: p.slug }}
            className="group glass rounded-3xl bg-white/70 p-7 transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className={`mb-6 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${
                tint[p.accent] ?? tint.teal
              }`}
            >
              <GraduationCap className="size-5" strokeWidth={2.25} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {p.subtitle}
              {!p.isPublished && (
                <span className="ml-2 rounded-md border border-border bg-foreground/5 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-muted-foreground">
                  Acceso privado
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-xl font-extrabold tracking-tight">{p.title}</h3>
            <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
              {p.tagline || p.description}
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">
              Ver programa
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          to="/programas"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-5 py-2.5 text-[12.5px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          {`Ver los ${items.length} programas`}
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------- Pillars ----------------------------- */

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
    <section id="metodologia" className="mx-auto max-w-7xl px-6 lg:px-10 pb-20 lg:pb-28">
      <div className="max-w-2xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Metodología
        </span>
        <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight text-balance md:text-4xl">
          Aprendizaje activo, respaldado por evidencia.
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="glass rounded-3xl bg-white/65 p-6 transition-all hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-lg"
          >
            <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={2} />
            </div>
            <h3 className="text-[13.5px] font-extrabold tracking-tight">{title}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Final CTA -------------------------- */

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-10 pb-20 lg:pb-28">
      <div className="glass relative overflow-hidden rounded-[2rem] bg-white/70 p-10 text-center lg:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent)",
          }}
        />
        <div className="relative">
          <img
            src={kotaroLogo}
            alt=""
            aria-hidden
            className="mx-auto size-12 object-contain opacity-90"
          />
          <h2 className="mt-6 text-3xl font-extrabold tracking-tighter text-balance md:text-4xl">
            Empieza tu camino hoy.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14.5px] text-muted-foreground text-pretty">
            Únete a la próxima generación de médicos que estudian de forma inteligente, con
            evidencia y sin ruido.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
            >
              Ingresar a la plataforma
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </Link>
            <Link
              to="/programas"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white/70 px-7 py-4 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Ver programas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Footer ---------------------------- */

function Footer() {
  return (
    <footer className="relative border-t border-border/60 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={kotaroLogo} alt="KotaMed" className="size-9 object-contain" />
              <span className="leading-none">
                <span className="block text-[15px] font-extrabold tracking-tight">
                  KOTAMED
                </span>
                <span className="block text-[8.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  KotaMed Core™ · Inteligencia médica
                </span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
              El sistema operativo de la educación médica: evidencia, inteligencia artificial y
              práctica clínica en una sola plataforma.
            </p>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Plataforma
            </div>
            <ul className="mt-4 space-y-2.5 text-[12.5px] font-semibold">
              <li>
                <Link to="/programas" className="text-muted-foreground hover:text-foreground">
                  Programas
                </Link>
              </li>
              <li>
                <Link
                  to="/programas/residentado/areas"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Áreas ENAM
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Mi panel
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Explorar
            </div>
            <ul className="mt-4 space-y-2.5 text-[12.5px] font-semibold">
              <li>
                <a href="#metodologia" className="text-muted-foreground hover:text-foreground">
                  Metodología
                </a>
              </li>
              <li>
                <a href="#evidencia" className="text-muted-foreground hover:text-foreground">
                  Evidencia
                </a>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-foreground">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-[11px] text-muted-foreground md:flex-row">
          <span className="font-mono">© 2026 KotaMed™ · KotaMed Core™</span>
          <span className="font-mono">Educación médica premium con IA</span>
        </div>
      </div>
    </footer>
  );
}
