/**
 * Página pública "Ciencias Básicas" (/p/ciencias-basicas).
 *
 * Narrativa visual: HERO inmersivo (universo KotaMed, ambiente dinámico por
 * hora local, solo en esta zona) → transición a luz → contenido educativo
 * blanco y premium → CTA final que vuelve al universo del Hero.
 * Todo el contenido es editable desde CMS Studio (scope page-ciencias-basicas).
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Atom,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Dna,
  GraduationCap,
  HeartPulse,
  Layers,
  Microscope,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Users,
} from "lucide-react";
import labScene from "@/assets/kotamed-lab-hero.png.asset.json";
import kotaMedLogo from "@/assets/kotaro-logo.png";
import { EnvironmentSwitcher, useEnvironment } from "@/components/hero/DynamicEnvironment";
import { SiteFooterNav, SiteNavActions, SiteNavLinks } from "@/components/cms/SiteNav";
import { useCbConfig, type CbConfig, type CbSectionId } from "@/lib/ciencias-basicas-cms";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";

const STEP_ICONS = [Dna, Layers, HeartPulse, Atom, Microscope, Stethoscope];
const METHOD_ICONS = [Target, Brain, Atom, Stethoscope];
const AUDIENCE_ICONS = [GraduationCap, Layers, Target, Users];
const HOLO_ICONS = [Layers, Microscope, HeartPulse, Dna, Atom, ShieldCheck];


export function CienciasBasicasPage() {
  const { data } = useCbConfig();
  return <SciencePage cfg={data ?? null} />;
}

/**
 * Renderizador compartido (Ciencias Básicas / Ciencias Clínicas):
 * hero inmersivo + cuerpo académico blanco, todo dirigido por configuración.
 */
export function SciencePage({ cfg }: { cfg: CbConfig | null }) {
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);

  // SEO editable desde CMS Studio (título / descripción / imagen social).
  const seo = cfg?.seo;
  useEffect(() => {
    if (!seo) return;
    if (seo.title) document.title = seo.title;
    const set = (sel: string, attr: string, key: string, content: string) => {
      if (!content) return;
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    set('meta[name="description"]', "name", "description", seo.description);
    set('meta[property="og:title"]', "property", "og:title", seo.title);
    set('meta[property="og:description"]', "property", "og:description", seo.description);
    set('meta[property="og:image"]', "property", "og:image", seo.ogImage);
  }, [seo]);


  if (!cfg) {
    return <div className="min-h-screen bg-white" />;
  }

  const sections: Record<CbSectionId, React.ReactNode> = {
    stats: <StatsBar cfg={cfg} key="stats" />,
    intro: <Intro cfg={cfg} key="intro" />,
    areas: <Areas cfg={cfg} key="areas" />,
    path: <PathSection cfg={cfg} key="path" />,
    learn: <Learn cfg={cfg} key="learn" />,
    method: <Method cfg={cfg} key="method" />,
    ai: <AiSection cfg={cfg} key="ai" />,
    three: <ThreeSection cfg={cfg} key="three" />,
    audience: <Audience cfg={cfg} key="audience" />,
    cta: <FinalCta cfg={cfg} key="cta" />,
  };

  return (
    <div className="min-h-screen bg-white text-[oklch(0.24_0.04_258)]">
      <Hero cfg={cfg} isAdmin={!!isAdmin} />

      <main className="relative bg-white">
        {cfg.order.map((id) => (cfg.visible[id] ? sections[id] : null))}
      </main>

      <footer className="dark border-t border-white/10 bg-[oklch(0.14_0.04_262)] py-12 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <SiteFooterNav />
          <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-white/55">
            © {new Date().getFullYear()} KotaMed · Formamos hoy, cuidamos el mañana.
          </div>
        </div>
      </footer>
    </div>
  );
}


/* ------------------------------- HERO ------------------------------- */

function Hero({ cfg, isAdmin }: { cfg: CbConfig; isAdmin: boolean }) {
  const { cfg: env, active, auto, clock, reduced, transition } = useEnvironment();
  const image = cfg.hero.image || env.image || labScene.url;
  const accent = env.accent;
  const bright = 0.75 + active.ambient * 0.45 * env.lightIntensity;

  return (
    <section className="dark relative isolate overflow-hidden bg-[oklch(0.14_0.04_262)] text-white">
      {/* Escena ambiental — exclusiva del hero */}
      <div aria-hidden className="absolute inset-0">
        <img
          src={image}
          alt=""
          className="size-full object-cover"
          style={{ filter: `${active.filter} brightness(${bright})`, transition: `filter ${transition}` }}
        />
        <div className="absolute inset-0" style={{ background: active.sky, transition: `background ${transition}` }} />
        <div className="absolute inset-0" style={{ background: active.veil, transition: `background ${transition}` }} />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 70% 42%, color-mix(in oklab, ${accent} ${Math.round(
              active.glow * env.glowIntensity * 24,
            )}%, transparent), transparent 70%)`,
            transition: `background ${transition}`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, oklch(0.13 0.04 262 / 0.94) 0%, oklch(0.13 0.04 262 / 0.78) 40%, oklch(0.13 0.04 262 / 0.24) 66%, transparent 84%)",
          }}
        />
        {/* Línea de escaneo — limitada al hero */}
        {!reduced && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-1/2 overflow-hidden lg:block">
            <span
              className="absolute inset-x-0 h-24 kotaro-spark"
              style={{
                background: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 20%, transparent), transparent)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Header coherente con el Home */}
      <header className="relative z-20 border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 lg:grid-cols-[auto_1fr_auto]">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={kotaMedLogo} alt="KotaMed" className="size-8 shrink-0 rounded-lg object-contain" />
            <span className="truncate text-sm font-black tracking-tight text-white">KotaMed</span>
          </Link>
          <SiteNavLinks />
          <SiteNavActions />
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 pb-24 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:px-10 lg:pb-32 lg:pt-14">
        <div className="flex flex-col justify-center">
          <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
            {cfg.hero.breadcrumb.split("›").map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1.5">
                {part.trim()}
                {i < arr.length - 1 && <ChevronRight className="size-3" />}
              </span>
            ))}
          </nav>

          <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
            <Microscope className="size-3.5" strokeWidth={2.5} style={{ color: accent }} />
            {cfg.hero.badge}
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tighter text-balance text-white sm:text-5xl lg:text-[3.6rem]">
            {cfg.hero.title} <span style={{ color: accent }}>{cfg.hero.highlight}.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-white/72 text-pretty">
            {cfg.hero.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[11.5px] font-semibold text-white/72">
            {cfg.hero.chips.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" strokeWidth={2.5} style={{ color: accent }} />
                {c}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={cfg.hero.primaryHref}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold text-[oklch(0.16_0.04_262)] transition-all hover:-translate-y-0.5"
              style={{
                background: accent,
                boxShadow: `0 22px 60px -26px color-mix(in oklab, ${accent} 75%, transparent)`,
              }}
            >
              {cfg.hero.primaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
            </Link>
            <Link
              to={cfg.hero.secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/16"
            >
              {cfg.hero.secondaryLabel}
              <span className="grid size-6 place-items-center rounded-full border border-white/30">
                <Play className="size-3 fill-current" strokeWidth={0} />
              </span>
            </Link>
          </div>
        </div>

        {/* Composición holográfica (paneles derivados del contenido) */}
        <div className="relative hidden min-h-[380px] items-center justify-center lg:flex">
          <div className="grid w-full grid-cols-2 gap-3">
            {(cfg.hero.holoCards?.length
              ? cfg.hero.holoCards
              : ["Anatomía", "Histología", "Fisiología", "Genética", "Bioquímica", "Inmunología"]
            )
              .slice(0, 6)
              .map((label, i) => ({ label, icon: HOLO_ICONS[i % HOLO_ICONS.length]! }))
              .map((h, i) => (

              <div
                key={h.label}
                className="rounded-2xl border border-white/15 bg-white/8 p-3.5 backdrop-blur-md animate-float-slow"
                style={{ animationDelay: `-${i * 1.3}s` }}
              >
                <h.icon className="size-4" strokeWidth={2.25} style={{ color: accent }} />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">{h.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reloj + ambiente (solo administración) */}
      {cfg.hero.showEnvControls && isAdmin && (
        <div className="relative z-20 mx-auto -mt-14 flex max-w-7xl flex-wrap items-center gap-2 px-6 pb-6 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.16_0.04_262_/_0.6)] px-3.5 py-2 text-[11px] font-semibold text-white/78 backdrop-blur-md">
            <span className="size-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
            <Clock className="size-3.5" strokeWidth={2.25} />
            {clock.time}
            {clock.city ? ` · ${clock.city}` : ""}
            <span className="hidden sm:inline text-white/45">
              · {auto ? "Ambiente automático" : `Ambiente ${active.label.toLowerCase()}`}
            </span>
          </span>
          <EnvironmentSwitcher />
        </div>
      )}

      {/* Transición laboratorio → luz → blanco */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 z-10">
        <div
          className="size-full"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, oklch(1 0 0 / 0.35) 45%, oklch(1 0 0 / 0.85) 75%, #fff 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-10 h-24 blur-2xl"
          style={{ background: `radial-gradient(60% 100% at 50% 100%, color-mix(in oklab, ${accent} 16%, transparent), transparent)` }}
        />
      </div>
    </section>
  );
}

/* --------------------------- Contenido claro ------------------------ */

function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-6 lg:px-10 ${className}`}>{children}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[oklch(0.62_0.11_185)]">{children}</p>
  );
}

function StatsBar({ cfg }: { cfg: CbConfig }) {
  if (!cfg.stats.length) return null;
  return (
    <Shell className="-mt-10 relative z-20 pb-4">
      <div className="grid grid-cols-2 divide-[oklch(0.24_0.04_258_/_0.08)] rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white p-2 shadow-[0_30px_70px_-50px_oklch(0.24_0.06_258_/_0.55)] sm:grid-cols-4 sm:divide-x">
        {cfg.stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[oklch(0.97_0.03_180)] text-[oklch(0.5_0.1_185)]">
              <Sparkles className="size-4.5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black tracking-tight">{s.value}</span>
              <span className="block truncate text-[11.5px] font-medium text-[oklch(0.55_0.02_258)]">{s.label}</span>
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Intro({ cfg }: { cfg: CbConfig }) {
  return (
    <Shell className="py-14 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-balance sm:text-[1.9rem]">
            {cfg.intro.title.replace(/\?$/, "")}
            <span className="text-[oklch(0.62_0.11_185)]">?</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[oklch(0.5_0.02_258)]">{cfg.intro.subtitle}</p>
          <Link
            to={cfg.intro.moreHref}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-[oklch(0.62_0.11_185_/_0.35)] px-4 py-2 text-xs font-bold text-[oklch(0.5_0.1_185)] transition hover:bg-[oklch(0.97_0.03_180)]"
          >
            {cfg.intro.moreLabel} <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-y-6 border-l-0 lg:border-l lg:border-[oklch(0.24_0.04_258_/_0.07)] lg:pl-10">
          {cfg.intro.steps.map((s, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full border border-[oklch(0.62_0.11_185_/_0.25)] bg-[oklch(0.98_0.015_185)] text-[oklch(0.5_0.1_185)]">
                    <Icon className="size-6" strokeWidth={1.75} />
                  </span>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em]">{s.label}</p>
                  <p className="max-w-[7.5rem] text-[10.5px] text-[oklch(0.58_0.02_258)]">{s.text}</p>
                </div>
                {i < cfg.intro.steps.length - 1 && (
                  <ArrowRight className="hidden size-4 shrink-0 text-[oklch(0.75_0.05_185)] lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function Areas({ cfg }: { cfg: CbConfig }) {
  const items = cfg.areas.items.filter((a) => a.visible !== false);
  return (
    <Shell className="py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight sm:text-[1.9rem]">
            {cfg.areas.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[oklch(0.5_0.02_258)]">{cfg.areas.subtitle}</p>
        </div>
        <Link
          to={cfg.areas.allHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[oklch(0.5_0.1_185)] hover:underline"
        >
          {cfg.areas.allLabel} <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((a) => (
          <Link
            key={a.n + a.title}
            to={a.href}
            className="group relative overflow-hidden rounded-2xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(0.62_0.11_185_/_0.45)] hover:shadow-[0_28px_60px_-40px_oklch(0.62_0.11_185_/_0.55)]"
          >
            <div className="overflow-hidden rounded-xl bg-[oklch(0.985_0.005_240)]">
              <img
                src={a.image}
                alt={a.title}
                loading="lazy"
                width={768}
                height={768}
                className="aspect-4/3 w-full object-contain transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <span className="mt-3 block text-[10px] font-black tracking-[0.18em] text-[oklch(0.72_0.02_258)]">
              {a.n}
            </span>
            <h3 className="mt-0.5 text-sm font-black tracking-tight">{a.title}</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[oklch(0.55_0.02_258)]">{a.text}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[oklch(0.5_0.1_185)] transition-all group-hover:gap-2">
              Explorar <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

function PathSection({ cfg }: { cfg: CbConfig }) {
  return (
    <Shell className="py-12 lg:py-16">
      <div className="rounded-3xl border border-[oklch(0.24_0.04_258_/_0.06)] bg-[oklch(0.985_0.008_200)] p-7 lg:p-10">
        <h2 className="text-xl font-black tracking-tight sm:text-2xl">
          De los fundamentos a la <span className="text-[oklch(0.62_0.11_185)]">práctica clínica</span>
        </h2>
        <div className="relative mt-8 grid gap-6 md:grid-cols-4">
          <span
            aria-hidden
            className="absolute left-6 right-6 top-6 hidden h-px md:block"
            style={{ background: "linear-gradient(90deg, oklch(0.62 0.11 185 / 0.5), oklch(0.62 0.11 185 / 0.1))" }}
          />
          {cfg.path.stages.map((s) => (
            <div key={s.n} className="relative">
              <span className="grid size-12 place-items-center rounded-full border border-[oklch(0.62_0.11_185_/_0.3)] bg-white text-xs font-black text-[oklch(0.5_0.1_185)]">
                {s.n}
              </span>
              <h3 className="mt-3 text-[11px] font-black uppercase tracking-[0.14em]">{s.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[oklch(0.55_0.02_258)]">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Learn({ cfg }: { cfg: CbConfig }) {
  return (
    <Shell className="py-10 lg:py-14">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white p-7 lg:p-9">
          <Eyebrow>Resultados de aprendizaje</Eyebrow>
          <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{cfg.learn.title}</h2>
          <ul className="mt-5 space-y-3">
            {cfg.learn.items.map((it) => (
              <li key={it} className="flex items-start gap-2.5 text-[13px] text-[oklch(0.4_0.02_258)]">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[oklch(0.95_0.04_180)] text-[oklch(0.45_0.1_185)]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {it}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid place-items-center rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-[oklch(0.99_0.005_200)] p-6">
          <img
            src={cfg.learn.image}
            alt="Composición 3D de cerebro, célula, molécula y corazón"
            loading="lazy"
            width={1024}
            height={1024}
            className="max-h-[320px] w-auto object-contain"
          />
        </div>
      </div>
    </Shell>
  );
}

function Method({ cfg }: { cfg: CbConfig }) {
  return (
    <Shell className="py-10 lg:py-14">
      <div className="rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white p-7 lg:p-10">
        <Eyebrow>{cfg.method.title}</Eyebrow>
        <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{cfg.method.subtitle}</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cfg.method.steps.map((s, i) => {
            const Icon = METHOD_ICONS[i % METHOD_ICONS.length];
            return (
              <div key={s.title} className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[oklch(0.97_0.03_180)] text-[oklch(0.5_0.1_185)]">
                  <Icon className="size-6" strokeWidth={1.9} />
                </span>
                <h3 className="mt-3 text-[12px] font-black uppercase tracking-[0.14em] text-[oklch(0.5_0.1_185)]">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[12px] text-[oklch(0.55_0.02_258)]">{s.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function AiSection({ cfg }: { cfg: CbConfig }) {
  return (
    <Shell className="py-10 lg:py-14">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[oklch(0.62_0.11_185_/_0.18)] bg-[oklch(0.98_0.012_200)] p-7 lg:p-9">
          <Eyebrow>KotaMed AI</Eyebrow>
          <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
            Aprende con <span className="text-[oklch(0.62_0.11_185)]">inteligencia artificial</span>.
          </h2>
          <p className="mt-2 text-sm text-[oklch(0.5_0.02_258)]">{cfg.ai.subtitle}</p>
          <ul className="mt-5 space-y-2.5">
            {cfg.ai.benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[13px] text-[oklch(0.4_0.02_258)]">
                <Sparkles className="size-3.5 shrink-0 text-[oklch(0.55_0.11_185)]" strokeWidth={2.4} />
                {b}
              </li>
            ))}
          </ul>
          <Link
            to={cfg.ai.ctaHref}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[oklch(0.55_0.11_185)] px-5 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5"
          >
            {cfg.ai.ctaLabel} <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid place-items-center overflow-hidden rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white">
          <img
            src={cfg.ai.image}
            alt="Cerebro 3D con red neuronal representando KotaMed AI"
            loading="lazy"
            width={1280}
            height={960}
            className="size-full object-cover"
          />
        </div>
      </div>
    </Shell>
  );
}

function ThreeSection({ cfg }: { cfg: CbConfig }) {
  const [active, setActive] = useState(0);
  return (
    <Shell className="py-10 lg:py-16">
      <div className="grid gap-6 rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-[oklch(0.99_0.005_200)] p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:p-10">
        <div className="flex flex-col justify-center">
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">
            Explora el cuerpo <span className="text-[oklch(0.62_0.11_185)]">humano</span> de una nueva manera.
          </h2>
          <p className="mt-2 text-sm text-[oklch(0.5_0.02_258)]">{cfg.three.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {cfg.three.systems.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition ${
                  active === i
                    ? "border-[oklch(0.62_0.11_185_/_0.5)] bg-[oklch(0.96_0.04_180)] text-[oklch(0.45_0.1_185)]"
                    : "border-[oklch(0.24_0.04_258_/_0.1)] bg-white text-[oklch(0.5_0.02_258)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Link
            to={cfg.three.ctaHref}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-[oklch(0.55_0.11_185)] px-5 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5"
          >
            {cfg.three.ctaLabel} <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="relative grid place-items-center">
          <div
            aria-hidden
            className="absolute inset-8 rounded-full blur-3xl transition-opacity"
            style={{ background: "radial-gradient(circle, oklch(0.62 0.11 185 / 0.16), transparent 70%)" }}
          />
          <img
            src={cfg.three.image}
            alt="Modelo anatómico 3D educativo"
            loading="lazy"
            width={1080}
            height={1280}
            className="relative max-h-[420px] w-auto object-contain"
          />
        </div>
      </div>
    </Shell>
  );
}

function Audience({ cfg }: { cfg: CbConfig }) {
  return (
    <Shell className="py-10 lg:py-14">
      <h2 className="text-xl font-black tracking-tight sm:text-2xl">{cfg.audience.title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cfg.audience.items.map((it, i) => {
          const Icon = AUDIENCE_ICONS[i % AUDIENCE_ICONS.length];
          return (
            <div
              key={it.title}
              className="rounded-2xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[oklch(0.62_0.11_185_/_0.35)]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[oklch(0.97_0.03_180)] text-[oklch(0.5_0.1_185)]">
                <Icon className="size-4.5" strokeWidth={2} />
              </span>
              <h3 className="mt-3 text-[13px] font-black tracking-tight text-[oklch(0.45_0.09_190)]">{it.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[oklch(0.55_0.02_258)]">{it.text}</p>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function FinalCta({ cfg }: { cfg: CbConfig }) {
  const { active, transition, cfg: env } = useEnvironment();
  return (
    <Shell className="py-12 lg:py-16">
      <div className="dark relative overflow-hidden rounded-3xl border border-white/10">
        <img
          src={env.image || labScene.url}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          style={{ filter: active.filter, transition: `filter ${transition}` }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, oklch(0.15 0.04 262 / 0.9) 0%, oklch(0.15 0.04 262 / 0.7) 55%, oklch(0.15 0.04 262 / 0.4) 100%)",
          }}
        />
        <div className="relative z-10 px-7 py-14 text-white lg:px-14 lg:py-20">
          <h2 className="max-w-2xl text-2xl font-black leading-tight tracking-tight text-balance sm:text-[2.1rem]">
            {cfg.cta.title}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/70">{cfg.cta.subtitle}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to={cfg.cta.primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[oklch(0.78_0.13_185)] px-7 py-3.5 text-sm font-bold text-[oklch(0.16_0.04_262)] transition hover:-translate-y-0.5"
            >
              {cfg.cta.primaryLabel} <ArrowRight className="size-4" strokeWidth={2.5} />
            </Link>
            <Link
              to={cfg.cta.secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/16"
            >
              {cfg.cta.secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
