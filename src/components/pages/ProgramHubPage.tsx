/**
 * KotaMed Program Hub — página pública e informativa /programas.
 *
 * HERO inmersivo (ambiente dinámico por hora local, solo en esta zona) →
 * transición a luz → recorrido académico por etapas → cifras → CTA → ventajas.
 * Todo editable desde CMS Studio (scope `page-programas`).
 * No expone contenido académico privado: solo landings informativas.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ArrowRight, ChevronRight, Clock, Map, Play, Sparkles } from "lucide-react";
import labScene from "@/assets/kotamed-lab-hero.png.asset.json";
import kotaMedLogo from "@/assets/kotamed-logo-light.png";
import { EnvironmentSwitcher, useEnvironment } from "@/components/hero/DynamicEnvironment";
import { SiteFooterNav, SiteNavActions, SiteNavLinks } from "@/components/cms/SiteNav";
import { useHubConfig, type HubConfig, type HubProgram, type HubSectionId } from "@/lib/programas-cms";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";

function Icon({ name, className, style }: { name?: string; className?: string; style?: React.CSSProperties }) {
  const Cmp = name ? (Icons as unknown as Record<string, React.ElementType>)[name] : undefined;
  const Fallback = Icons.Circle;
  const C = Cmp ?? Fallback;
  return <C className={className} strokeWidth={2.25} style={style} />;
}

/** Enlace tolerante: rutas internas, anclas y URLs externas. */
function Go({
  href,
  className,
  children,
  style,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  if (!href.startsWith("/")) {
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} style={style}>
      {children}
    </Link>
  );
}

export function ProgramHubPage() {
  const { data: cfg } = useHubConfig();
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);

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

  if (!cfg) return <div className="min-h-screen bg-white" />;

  const sections: Record<HubSectionId, React.ReactNode> = {
    timeline: <Timeline cfg={cfg} key="timeline" />,
    stages: <Stages cfg={cfg} key="stages" />,
    stats: <StatsBar cfg={cfg} key="stats" />,
    cta: <CtaBanner cfg={cfg} key="cta" />,
    features: <Features cfg={cfg} key="features" />,
  };

  return (
    <div className="min-h-screen bg-white text-[oklch(0.24_0.04_258)]">
      <Hero cfg={cfg} isAdmin={!!isAdmin} />
      <main className="relative bg-white pb-16">
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

/* --------------------------------- HERO --------------------------------- */

function Hero({ cfg, isAdmin }: { cfg: HubConfig; isAdmin: boolean }) {
  const { cfg: env, active, auto, clock, reduced, transition } = useEnvironment();
  const image = cfg.hero.image || env.image || labScene.url;
  const accent = env.accent;
  const bright = 0.75 + active.ambient * 0.45 * env.lightIntensity;

  return (
    <section className="dark relative isolate overflow-hidden bg-[oklch(0.14_0.04_262)] text-white">
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
            background:
              "linear-gradient(100deg, oklch(0.13 0.04 262 / 0.94) 0%, oklch(0.13 0.04 262 / 0.76) 38%, oklch(0.13 0.04 262 / 0.22) 64%, transparent 84%)",
          }}
        />
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

      <header className="relative z-20 border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 lg:grid-cols-[auto_1fr_auto]">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={kotaMedLogo} alt="KotaMed" className="size-8 shrink-0 object-contain" />
            <span className="truncate text-sm font-black tracking-tight text-white">KotaMed</span>
          </Link>
          <SiteNavLinks />
          <SiteNavActions />
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-28 pt-12 lg:px-10 lg:pb-36 lg:pt-16">
        <div className="max-w-2xl">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
            {cfg.hero.breadcrumb}
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.04] tracking-tighter text-balance text-white sm:text-5xl lg:text-[3.5rem]">
            {cfg.hero.title} <span style={{ color: accent }}>{cfg.hero.highlight}.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[14.5px] leading-relaxed text-white/72 text-pretty">
            {cfg.hero.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Go
              href={cfg.hero.primaryHref}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold text-[oklch(0.16_0.04_262)] transition-all hover:-translate-y-0.5"
              style={{
                background: accent,
                boxShadow: `0 22px 60px -26px color-mix(in oklab, ${accent} 75%, transparent)`,
              }}
            >
              {cfg.hero.primaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
            </Go>
            <Go
              href={cfg.hero.secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/16"
            >
              {cfg.hero.secondaryLabel}
              <span className="grid size-6 place-items-center rounded-full border border-white/30">
                <Play className="size-3 fill-current" strokeWidth={0} />
              </span>
            </Go>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-[11.5px] font-semibold text-white/72">
            {cfg.hero.chips.map((c) => (
              <span key={c.label} className="flex items-center gap-2">
                <Icon name={c.icon} className="size-4" style={{ color: accent }} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {cfg.hero.showEnvControls && isAdmin && (
        <div className="relative z-20 mx-auto -mt-16 flex max-w-7xl flex-wrap items-center gap-2 px-6 pb-8 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.16_0.04_262_/_0.6)] px-3.5 py-2 text-[11px] font-semibold text-white/78 backdrop-blur-md">
            <span className="size-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
            <Clock className="size-3.5" strokeWidth={2.25} />
            {clock.time}
            {clock.city ? ` · ${clock.city}` : ""}
            <span className="hidden text-white/45 sm:inline">
              · {auto ? "Ambiente automático" : `Ambiente ${active.label.toLowerCase()}`}
            </span>
          </span>
          <EnvironmentSwitcher />
        </div>
      )}

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40">
        <div
          className="size-full"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, oklch(1 0 0 / 0.35) 45%, oklch(1 0 0 / 0.85) 75%, #fff 100%)",
          }}
        />
      </div>
    </section>
  );
}

/* ------------------------------ Contenido ------------------------------ */

function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-6 lg:px-10 ${className}`}>{children}</div>;
}

const TEAL = "oklch(0.62 0.11 185)";

function Timeline({ cfg }: { cfg: HubConfig }) {
  return (
    <Shell className="pt-14">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-[2rem]">
            {cfg.intro.title} <span style={{ color: TEAL }}>{cfg.intro.highlight}</span>
          </h2>
          <p className="mt-2 text-sm text-[oklch(0.24_0.04_258_/_0.6)]">{cfg.intro.subtitle}</p>
        </div>
        <Go
          href={cfg.intro.mapHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-[oklch(0.24_0.04_258_/_0.12)] bg-white px-5 py-3 text-xs font-bold shadow-[0_18px_40px_-32px_oklch(0.24_0.06_258_/_0.7)] transition hover:-translate-y-0.5"
        >
          <Map className="size-4" strokeWidth={2.25} style={{ color: TEAL }} />
          {cfg.intro.mapLabel}
        </Go>
      </div>

      <ol className="mt-10 flex flex-wrap items-center justify-center gap-y-4">
        {cfg.timeline.map((t, i) => (
          <li key={`${t}-${i}`} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-11 place-items-center rounded-full border border-[oklch(0.62_0.11_185_/_0.25)] bg-[oklch(0.62_0.11_185_/_0.08)] text-xs font-bold" style={{ color: TEAL }}>
                {i + 1}
              </span>
              <span className="max-w-[110px] text-center text-[11px] font-semibold leading-tight text-[oklch(0.24_0.04_258_/_0.75)]">
                {t}
              </span>
            </div>
            {i < cfg.timeline.length - 1 && (
              <span
                aria-hidden
                className="mx-2 mb-6 hidden h-px w-10 sm:block lg:w-16"
                style={{ backgroundImage: `repeating-linear-gradient(90deg, ${TEAL} 0 5px, transparent 5px 10px)` }}
              />
            )}
          </li>
        ))}
      </ol>
    </Shell>
  );
}

function Stages({ cfg }: { cfg: HubConfig }) {
  const stages = cfg.stages.filter((s) => s.visible !== false);
  return (
    <Shell className="pt-14" >
      <div id="etapas" className="grid gap-5 lg:grid-cols-4">
        {stages.map((s) => {
          const programs = cfg.programs.filter((p) => p.stage === s.id && p.visible !== false);
          return (
            <section key={s.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl border border-[oklch(0.24_0.04_258_/_0.08)] bg-white shadow-[0_18px_40px_-34px_oklch(0.24_0.06_258_/_0.8)]">
                  <Icon name={s.icon} className="size-5" style={{ color: TEAL }} />
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold tracking-tight text-[oklch(0.24_0.04_258_/_0.35)]">{s.n}</span>
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: TEAL }}>
                    {s.label}
                  </span>
                </div>
              </div>
              <p className="min-h-[42px] text-[12.5px] leading-relaxed text-[oklch(0.24_0.04_258_/_0.62)]">{s.text}</p>
              <div className="flex flex-col gap-3">
                {programs.map((p) => (
                  <ProgramCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}

function ProgramCard({ p }: { p: HubProgram }) {
  const [hover, setHover] = useState(false);
  return (
    <Go
      href={p.href}
      className="group relative flex gap-3 overflow-hidden rounded-2xl border border-[oklch(0.24_0.04_258_/_0.08)] bg-white p-3 transition-all duration-300 hover:-translate-y-1"
      style={{
        boxShadow: hover
          ? `0 26px 60px -34px color-mix(in oklab, ${TEAL} 55%, transparent), 0 0 0 1px color-mix(in oklab, ${TEAL} 35%, transparent)`
          : "0 18px 44px -38px oklch(0.24 0.06 258 / 0.8)",
      }}
    >
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="absolute inset-0"
        aria-hidden
      />
      <div className="relative size-[62px] shrink-0 overflow-hidden rounded-xl bg-[oklch(0.96_0.01_240)]">
        {p.image ? (
          <img
            src={p.image}
            alt={p.title}
            loading="lazy"
            width={768}
            height={512}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <Icon name={p.icon} className="size-6" style={{ color: TEAL }} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon name={p.icon} className="size-3.5 shrink-0" style={{ color: TEAL }} />
          <h3 className="truncate text-[13px] font-bold tracking-tight">{p.title}</h3>
          {p.featured && (
            <span
              className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: `color-mix(in oklab, ${TEAL} 14%, transparent)`, color: TEAL }}
            >
              Destacado
            </span>
          )}
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-[oklch(0.24_0.04_258_/_0.6)]">{p.text}</p>

        {/* Preview al hacer hover: planes en los que está disponible */}
        {p.plans.length > 0 && (
          <div className="mt-1.5 flex max-h-0 flex-wrap gap-1 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-16 group-hover:opacity-100">
            {p.plans.map((pl) => (
              <span
                key={pl}
                className="rounded-md border border-[oklch(0.24_0.04_258_/_0.1)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[oklch(0.24_0.04_258_/_0.55)]"
              >
                {pl}
              </span>
            ))}
          </div>
        )}

        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: TEAL }}>
          {p.ctaLabel}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
        </span>
      </div>
    </Go>
  );
}

function StatsBar({ cfg }: { cfg: HubConfig }) {
  if (!cfg.stats.length) return null;
  return (
    <Shell className="pt-14">
      <div className="grid grid-cols-2 rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)] bg-white p-2 shadow-[0_30px_70px_-52px_oklch(0.24_0.06_258_/_0.6)] sm:grid-cols-4 sm:divide-x sm:divide-[oklch(0.24_0.04_258_/_0.08)]">
        {cfg.stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[oklch(0.62_0.11_185_/_0.09)]">
              <Icon name={s.icon} className="size-5" style={{ color: TEAL }} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold tracking-tight" style={{ color: TEAL }}>
                {s.value}
              </p>
              <p className="truncate text-[11px] font-semibold text-[oklch(0.24_0.04_258_/_0.6)]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function CtaBanner({ cfg }: { cfg: HubConfig }) {
  return (
    <Shell className="pt-6">
      <div className="relative overflow-hidden rounded-3xl border border-[oklch(0.24_0.04_258_/_0.07)]">
        {cfg.cta.image && (
          <img
            src={cfg.cta.image}
            alt=""
            loading="lazy"
            width={1536}
            height={768}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, oklch(1 0 0 / 0.97) 0%, oklch(1 0 0 / 0.9) 34%, oklch(1 0 0 / 0.45) 56%, transparent 78%)",
          }}
        />
        <div className="relative max-w-xl px-8 py-12 lg:px-12 lg:py-16">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-[2.1rem]">
            {cfg.cta.title} <span style={{ color: TEAL }}>{cfg.cta.highlight}</span> {cfg.cta.tail}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[oklch(0.24_0.04_258_/_0.66)]">{cfg.cta.subtitle}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Go
              href={cfg.cta.primaryHref}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ background: "oklch(0.42 0.09 245)" }}
            >
              {cfg.cta.primaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
            </Go>
            <Go
              href={cfg.cta.secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[oklch(0.24_0.04_258_/_0.14)] bg-white px-6 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5"
            >
              {cfg.cta.secondaryLabel}
              <Sparkles className="size-4" strokeWidth={2.25} style={{ color: TEAL }} />
            </Go>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Features({ cfg }: { cfg: HubConfig }) {
  if (!cfg.features.length) return null;
  return (
    <Shell className="pt-14">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {cfg.features.map((f) => (
          <div key={f.title} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[oklch(0.24_0.04_258_/_0.08)] bg-white">
              <Icon name={f.icon} className="size-4" style={{ color: TEAL }} />
            </span>
            <div>
              <p className="text-[12.5px] font-bold tracking-tight">{f.title}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-[oklch(0.24_0.04_258_/_0.6)]">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[oklch(0.24_0.04_258_/_0.45)]">
        Los planes definen cómo accedes a cada programa
        <ChevronRight className="size-3" />
        <Link
          to="/p/$slug"
          params={{ slug: "planes" }}
          className="underline decoration-dotted"
          style={{ color: TEAL }}
        >
          Ver planes
        </Link>
      </p>
    </Shell>
  );
}
