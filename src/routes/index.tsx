import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Apple,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  BookOpen,
  Brain,
  ClipboardList,
  Crown,
  FlaskConical,
  Globe,
  GraduationCap,
  Clock,
  Mail,
  MonitorPlay,
  QrCode,
  Route as RouteIcon,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useProgramCatalog } from "@/lib/content-catalog";
import { usePublicCmsPage, usePublicCmsPages } from "@/lib/cms";
import { CmsBlockView } from "@/components/cms/CmsBlocks";
import { DynamicLabHero } from "@/components/hero/DynamicLabHero";
import {
  DynamicEnvironmentProvider,
  EnvironmentSwitcher,
  GlobalEnvironment,
} from "@/components/hero/DynamicEnvironment";
import { SiteFooterNav, SiteNavActions, SiteNavLinks } from "@/components/cms/SiteNav";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import { QrBadge } from "@/components/home/QrBadge";
import kotaroLogo from "@/assets/kotaro-logo.png";
import modCampus from "@/assets/mod-campus.jpg";
import modClinical from "@/assets/mod-clinical.jpg";
import modLabs from "@/assets/mod-labs.jpg";
import modLibrary from "@/assets/mod-library.jpg";
import modExams from "@/assets/mod-exams.jpg";
import modAi from "@/assets/mod-ai.jpg";
import testimonialDoctor from "@/assets/testimonial-doctor.jpg";
import appMockup from "@/assets/app-mockup.jpg";

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

/** El control del ambiente dinámico es una herramienta interna: solo admin. */
function useEnvAdmin() {
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  return !!isAdmin;
}

function Landing() {
  const { data: cms } = usePublicCmsPage("home");
  const cmsBlocks = cms?.blocks ?? [];
  const envAdmin = useEnvAdmin();

  return (
    <DynamicEnvironmentProvider>
      <div
        id="top"
        className="dark min-h-screen bg-background text-foreground relative overflow-x-hidden"
      >
        <GlobalEnvironment />
        <Nav />
        <main className="relative z-10">
          {cmsBlocks.length > 0 ? (
            <>
              {cmsBlocks.map((b) => (
                <CmsBlockView key={b.id} block={b} />
              ))}
              <CmsPagesRail />
            </>
          ) : (
            <>
              <DynamicLabHero showEnvControls={envAdmin} />
              <HeroStats />
              <EverythingGrid />
              <IntelligencePanel />
              <TrustNumbers />
              <AudienceAndTestimonial />
              <Programs />
              <CmsPagesRail />
              <AppDownload />
              <Newsletter />
            </>
          )}
        </main>
        <Footer />
        {envAdmin && (
          <div className="pointer-events-auto fixed bottom-4 right-4 z-40">
            <EnvironmentSwitcher />
          </div>
        )}
      </div>
    </DynamicEnvironmentProvider>
  );
}

/* ------------------------------ Utilidades ------------------------ */

const CARD =
  "rounded-3xl border border-white/10 bg-[oklch(0.17_0.042_262_/_0.88)] backdrop-blur-xl";

function SectionShell({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-7xl px-6 lg:px-10 pb-14 lg:pb-20 ${className}`}>
      {children}
    </section>
  );
}

/* ------------------------------- Header --------------------------- */

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
        className={`mx-auto max-w-7xl rounded-2xl border transition-all duration-500 backdrop-blur-xl ${
          scrolled
            ? "border-white/10 bg-[oklch(0.15_0.04_262_/_0.92)] shadow-[0_18px_50px_-24px_oklch(0.05_0.02_262_/_0.9)]"
            : "border-white/8 bg-[oklch(0.15_0.04_262_/_0.55)]"
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
                KOTA<span className="text-primary">MED</span>
              </span>
              <span className="hidden sm:block text-[8.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Educación médica premium con IA
              </span>
            </span>
          </Link>

          <SiteNavLinks />

          <SiteNavActions />
        </div>
      </header>
    </div>
  );
}

/* --------------------------- Barra de cifras ---------------------- */

const HERO_STATS = [
  { icon: Users, value: "+50,000", label: "Estudiantes confían en KotaMed" },
  { icon: Star, value: "4.9/5", label: "Calificación promedio" },
  { icon: Globe, value: "15+", label: "Países" },
  { icon: Clock, value: "24/7", label: "Acceso ilimitado" },
];

function HeroStats() {
  return (
    <SectionShell>
      <div className={`${CARD} grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x`}>
        {HERO_STATS.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-4 px-7 py-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-extrabold tracking-tight">{value}</span>
              <span className="block text-[11.5px] leading-snug text-muted-foreground">
                {label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* --------------------- Todo lo que necesitas ---------------------- */

const MODULES = [
  {
    icon: GraduationCap,
    image: modCampus,
    title: "Campus",
    desc: "Cursos, clases y evaluaciones",
    to: "/dashboard" as const,
  },
  {
    icon: Stethoscope,
    image: modClinical,
    title: "Clinical",
    desc: "Ciencias clínicas por especialidad",
    to: "/programas/residentado/areas" as const,
  },
  {
    icon: FlaskConical,
    image: modLabs,
    title: "Labs",
    desc: "Simuladores y algoritmos",
    to: "/programas/residentado/areas" as const,
  },
  {
    icon: BookOpen,
    image: modLibrary,
    title: "Library",
    desc: "Libros, guías y protocolos",
    to: "/programas" as const,
  },
  {
    icon: ClipboardList,
    image: modExams,
    title: "Exams",
    desc: "ENAM, EsSalud y Residentado",
    to: "/dashboard" as const,
  },
  {
    icon: Brain,
    image: modAi,
    title: "KotaMed AI",
    desc: "Tu tutor inteligente",
    to: "/dashboard" as const,
  },
];

function EverythingGrid() {
  return (
    <SectionShell id="recursos">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight md:text-4xl">
          Todo lo que necesitas
          <span className="block text-primary">en un solo lugar</span>
        </h2>
        <Link
          to="/programas"
          className="inline-flex w-fit items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-[13px] font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
        >
          Explorar plataforma
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {MODULES.map(({ icon: Icon, image, title, desc, to }) => (
          <Link
            key={title}
            to={to}
            className={`group ${CARD} flex flex-col overflow-hidden p-4 transition-all hover:-translate-y-1 hover:border-primary/40`}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4.5 text-primary" strokeWidth={2} />
              <span className="text-[14px] font-extrabold tracking-tight">{title}</span>
            </span>
            <span className="mt-3.5 block overflow-hidden rounded-2xl border border-white/10">
              <img
                src={image}
                alt={`KotaMed ${title}`}
                loading="lazy"
                width={800}
                height={600}
                className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </span>
            <span className="mt-3.5 block text-[11.5px] leading-snug text-muted-foreground">
              {desc}
            </span>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------- Inteligencia que impulsa --------------------- */

const INTELLIGENCE = [
  { icon: Bot, title: "Tutor IA 24/7", desc: "Resuelve tus dudas al instante." },
  { icon: RouteIcon, title: "Rutas personalizadas", desc: "Contenido adaptado a tus objetivos." },
  { icon: Activity, title: "Casos y simulaciones", desc: "Practica con casos reales e interactivos." },
  { icon: BarChart3, title: "Análisis de progreso", desc: "Seguimiento detallado de tu aprendizaje." },
];

function IntelligencePanel() {
  return (
    <SectionShell>
      <div className={`${CARD} grid gap-8 p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:p-10`}>
        <h2 className="text-2xl font-extrabold leading-[1.15] tracking-tight md:text-[1.7rem]">
          Inteligencia que impulsa
          <span className="block">tu aprendizaje</span>
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          {INTELLIGENCE.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="lg:px-5 lg:first:pl-0">
              <Icon className="size-7 text-primary" strokeWidth={1.75} />
              <div className="mt-4 text-[13px] font-extrabold tracking-tight">{title}</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------- Cifras (claro) ------------------------- */

const TRUST = [
  { value: "+50,000", label: "Estudiantes activos" },
  { value: "+1,500", label: "Clases y cursos" },
  { value: "+2,000", label: "Casos clínicos" },
  { value: "98%", label: "Satisfacción" },
  { value: "24/7", label: "Acceso ilimitado" },
];

function TrustNumbers() {
  return (
    <SectionShell id="evidencia">
      <div className="grid gap-8 rounded-3xl bg-white px-8 py-9 text-[oklch(0.24_0.04_258)] shadow-[0_30px_80px_-45px_oklch(0.05_0.02_262_/_0.8)] lg:grid-cols-[0.85fr_2.15fr] lg:items-center lg:px-10">
        <div className="flex items-center gap-4">
          <Trophy className="size-10 shrink-0 text-amber-500" strokeWidth={1.75} />
          <p className="text-[13px] font-semibold leading-snug">
            Miles de médicos y estudiantes ya confían en KotaMed
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5 lg:justify-items-center">
          {TRUST.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold tracking-tight text-[oklch(0.52_0.1_185)]">
                {value}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[oklch(0.45_0.02_258)]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------- Audiencia + testimonio ------------------------- */

const STAGES = [
  { icon: GraduationCap, title: "Estudiante", sub: "Pregrado" },
  { icon: Stethoscope, title: "Interno", sub: "Hospital" },
  { icon: BadgeCheck, title: "ENAM / EsSalud / SERUMS", sub: "Preparación" },
  { icon: UserRound, title: "Residente", sub: "Especialización" },
  { icon: Crown, title: "Especialista", sub: "Subespecialización" },
];

function AudienceAndTestimonial() {
  return (
    <SectionShell id="impacto">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className={`${CARD} p-8 lg:p-10`}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            ¿Para quién es KotaMed?
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight md:text-4xl">
            Una plataforma para cada etapa de tu carrera médica
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STAGES.map(({ icon: Icon, title, sub }) => (
              <Link
                key={title}
                to="/programas"
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <Icon className="mx-auto size-5 text-primary" strokeWidth={1.75} />
                <div className="mt-2 text-[11px] font-extrabold leading-tight">{title}</div>
                <div className="mt-0.5 text-[9.5px] font-semibold text-muted-foreground">{sub}</div>
              </Link>
            ))}
          </div>
          <Link
            to="/programas"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 text-[12.5px] font-bold transition-all hover:-translate-y-0.5 hover:bg-white/12"
          >
            Ver planes
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>

        <div className={`${CARD} grid gap-6 overflow-hidden p-8 sm:grid-cols-[1.1fr_0.9fr] sm:items-center lg:p-10`}>
          <div>
            <span className="text-4xl font-black leading-none text-primary">“</span>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed">
              KotaMed ha cambiado por completo la forma en que estudio. Los casos y simulaciones
              son increíbles.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" strokeWidth={0} />
                ))}
              </span>
              <span className="text-[12px] font-bold">4.9/5</span>
            </div>
            <div className="mt-5 text-[12.5px] font-extrabold">María Fernanda Q.</div>
            <div className="text-[11px] text-muted-foreground">Residente de Pediatría</div>
          </div>
          <img
            src={testimonialDoctor}
            alt="María Fernanda Q., residente de Pediatría"
            loading="lazy"
            width={800}
            height={900}
            className="h-64 w-full rounded-2xl object-cover object-top sm:h-72"
          />
        </div>
      </div>
    </SectionShell>
  );
}

/* --------------------------- Programas ---------------------------- */

function Programs() {
  const { programs } = useProgramCatalog();
  const items = programs;

  if (items.length === 0) return null;

  return (
    <SectionShell>
      <div className="max-w-2xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Programas
        </span>
        <h2 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-balance md:text-4xl">
          Un camino continuo, desde el ENAM al especialista.
        </h2>
      </div>

      <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.slug}
            to="/programas/$slug"
            params={{ slug: p.slug }}
            className={`group ${CARD} p-7 transition-all hover:-translate-y-1 hover:border-primary/40`}
          >
            <div className="mb-6 flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <GraduationCap className="size-5" strokeWidth={2.25} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {p.subtitle}
              {!p.isPublished && (
                <span className="ml-2 rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold tracking-normal">
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
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-[12.5px] font-bold transition-all hover:-translate-y-0.5"
        >
          {`Ver los ${items.length} programas`}
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </SectionShell>
  );
}

/* -------------------- Páginas publicadas (CMS) -------------------- */

function CmsPagesRail() {
  const { data: pages } = usePublicCmsPages();
  const items = pages ?? [];
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <div className="max-w-2xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Información
        </span>
        <h2 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-balance md:text-4xl">
          Páginas publicadas de KotaMed.
        </h2>
      </div>
      <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.id}
            to="/p/$slug"
            params={{ slug: p.slug }}
            className={`group ${CARD} p-7 transition-all hover:-translate-y-1 hover:border-primary/40`}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {p.kind}
            </div>
            <h3 className="mt-1.5 text-xl font-extrabold tracking-tight">{p.title}</h3>
            {(p.subtitle || p.seo?.description) && (
              <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                {p.subtitle || p.seo?.description}
              </p>
            )}
            <span className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">
              Ver página
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </span>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------ Descarga de la app ---------------------- */

const PLATFORMS = [
  { icon: Globe, top: "Disponible en", name: "Web" },
  { icon: Apple, top: "Disponible en", name: "iOS" },
  { icon: Smartphone, top: "Disponible en", name: "Android" },
];

function AppDownload() {
  return (
    <SectionShell>
      <div className={`${CARD} grid items-center gap-10 overflow-hidden p-8 lg:grid-cols-[1fr_0.85fr_auto] lg:p-12`}>
        <div>
          <h2 className="text-3xl font-extrabold leading-[1.12] tracking-tight md:text-4xl">
            Lleva tu aprendizaje
            <span className="block">a donde vayas</span>
          </h2>
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Accede desde cualquier dispositivo y continúa tu formación sin límites.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {PLATFORMS.map(({ icon: Icon, top, name }) => (
              <Link
                key={name}
                to="/dashboard"
                className="inline-flex items-center gap-2.5 rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <Icon className="size-5 text-primary" strokeWidth={1.75} />
                <span className="leading-tight">
                  <span className="block text-[9px] font-semibold text-muted-foreground">
                    {top}
                  </span>
                  <span className="block text-[13px] font-extrabold">{name}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <img
          src={appMockup}
          alt="Aplicación móvil de KotaMed mostrando el progreso del estudiante"
          loading="lazy"
          width={900}
          height={900}
          className="mx-auto w-full max-w-xs rounded-3xl object-contain"
        />

        <div className="flex items-center gap-4 lg:flex-col lg:items-center">
          <QrBadge />
          <span className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground lg:text-center">
            <QrCode className="size-4 shrink-0 text-primary" strokeWidth={2} />
            Escanea y descarga nuestra app
          </span>
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Newsletter ------------------------- */

function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <SectionShell className="pb-20 lg:pb-28">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          setSent(true);
          setEmail("");
        }}
        className="grid items-center gap-6 rounded-3xl bg-white px-8 py-7 text-[oklch(0.24_0.04_258)] shadow-[0_30px_80px_-45px_oklch(0.05_0.02_262_/_0.8)] lg:grid-cols-[1fr_auto] lg:px-10"
      >
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[oklch(0.95_0.03_185)] text-[oklch(0.5_0.1_185)]">
            <Mail className="size-5" strokeWidth={2} />
          </span>
          <span>
            <span className="block text-[14px] font-extrabold tracking-tight">
              Mantente actualizado
            </span>
            <span className="block text-[11.5px] text-[oklch(0.45_0.02_258)]">
              Recibe novedades, clases gratuitas y contenido exclusivo.
            </span>
          </span>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ingresa tu correo electrónico"
            aria-label="Correo electrónico"
            className="w-full rounded-xl border border-[oklch(0.24_0.04_258_/_0.12)] bg-[oklch(0.98_0.005_260)] px-4 py-3 text-[13px] outline-none transition focus:border-[oklch(0.62_0.11_185)] sm:w-72"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[oklch(0.62_0.11_185)] px-6 py-3 text-[13px] font-bold text-white transition-all hover:-translate-y-0.5"
          >
            {sent ? "¡Suscrito!" : "Suscribirme"}
            <Sparkles className="size-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </SectionShell>
  );
}

/* ------------------------------ Footer ---------------------------- */

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[oklch(0.12_0.035_262_/_0.92)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={kotaroLogo} alt="KotaMed" className="size-9 object-contain" />
              <span className="leading-none">
                <span className="block text-[15px] font-extrabold tracking-tight">
                  KOTA<span className="text-primary">MED</span>
                </span>
                <span className="block text-[8.5px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Educación médica premium con IA
                </span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
              Plataforma integral de educación médica impulsada por inteligencia artificial.
              Aprende, practica y evoluciona.
            </p>
          </div>

          <div>
            <SiteFooterNav />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[11px] text-muted-foreground md:flex-row">
          <span className="font-mono">© 2026 KotaMed. Todos los derechos reservados.</span>
          <span className="flex items-center gap-5">
            <Link to="/p/$slug" params={{ slug: "terminos" }} className="hover:text-foreground">
              Términos y condiciones
            </Link>
            <Link to="/p/$slug" params={{ slug: "privacidad" }} className="hover:text-foreground">
              Política de privacidad
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
