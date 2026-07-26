import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Layers,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";
import {
  ACCENT_CLASSES,
  CHAPTER_TEMPLATE,
  getProgram,
  PROGRAMS,
  type Program,
} from "@/lib/pediatria-programs";

export const Route = createFileRoute("/programas/$slug")({
  loader: ({ params }): { program: Program } => {
    const program = getProgram(params.slug);
    if (!program) throw notFound();
    return { program };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Programa no encontrado · Kotaro Academy" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { program } = loaderData;
    return {
      meta: [
        { title: `${program.title} · Kotaro Academy` },
        { name: "description", content: program.tagline },
        { property: "og:title", content: `${program.title} · Kotaro Academy` },
        { property: "og:description", content: program.description },
      ],
    };
  },
  component: ProgramDetail,
});

function ProgramDetail() {
  const { program } = Route.useLoaderData();
  const accent = ACCENT_CLASSES[program.accent];
  const others = PROGRAMS.filter((p) => p.id !== program.id);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] -right-[5%] w-[40%] h-[55%] rounded-full blur-[120px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.12 280) 16%, transparent)",
          animationDelay: "-5s",
        }}
      />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12 relative">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/programas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3.5" /> Programas
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${accent.chip}`}
          >
            {program.subtitle}
          </span>
        </div>

        <section className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden animate-slide-up">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${accent.chip}`}
            >
              <span className={`size-1.5 rounded-full ${accent.dot}`} />
              Programa académico
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">
              {program.title}
            </h1>
            <p className="mt-4 text-lg text-foreground/85 font-medium text-pretty">
              {program.tagline}
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed text-pretty">
              {program.description}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="size-3.5" />
              <span className="font-semibold">Dirigido a:</span>
              <span>{program.audience}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6 mt-8">
          <div className="col-span-12 xl:col-span-8 space-y-6">
            {program.objectives && (
              <section className="glass rounded-3xl p-7 animate-slide-up">
                <SectionHeader
                  icon={<ListChecks className="size-4" strokeWidth={2.25} />}
                  eyebrow="Objetivos"
                  title="El estudiante aprenderá a"
                />
                <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {program.objectives.map((o) => (
                    <li
                      key={o}
                      className="flex items-start gap-2 text-sm text-foreground/85"
                    >
                      <CheckCircle2
                        className={`size-4 mt-0.5 shrink-0 ${
                          accent.dot.replace("bg-", "text-")
                        }`}
                        strokeWidth={2}
                      />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section
              className="glass rounded-3xl p-7 animate-slide-up"
              style={{ animationDelay: "60ms" }}
            >
              <SectionHeader
                icon={<Layers className="size-4" strokeWidth={2.25} />}
                eyebrow={
                  program.id === "residentado" ? "Áreas académicas" : "Módulos y áreas"
                }
                title={
                  program.id === "residentado"
                    ? "Estructura del programa"
                    : "Contenido del programa"
                }
                hint={`${program.areas.length} ${
                  program.id === "residentado" ? "áreas" : "módulos"
                }`}
              />
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {program.areas.map((area, i) => (
                  <div
                    key={area}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-white/60 hover:bg-white/90 transition p-3"
                  >
                    <span
                      className={`size-7 rounded-lg flex items-center justify-center text-[10px] font-bold tabular-nums ${accent.chip} border`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-semibold text-foreground/85 leading-tight">
                      {area}
                    </span>
                  </div>
                ))}
              </div>
              {program.id === "residentado" && (
                <p className="mt-5 text-[11px] text-muted-foreground italic">
                  Cada área contendrá múltiples capítulos y subcapítulos. Estructura lista para
                  incorporar contenido académico.
                </p>
              )}
            </section>

            {program.chapterFeatures && (
              <section
                className="glass rounded-3xl p-7 animate-slide-up"
                style={{ animationDelay: "120ms" }}
              >
                <SectionHeader
                  icon={<BookOpen className="size-4" strokeWidth={2.25} />}
                  eyebrow="Cada tema incluirá"
                  title="Recursos por capítulo"
                />
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {program.chapterFeatures.map((f) => (
                    <span
                      key={f}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${accent.chip}`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section
              className="glass rounded-3xl p-7 animate-slide-up"
              style={{ animationDelay: "180ms" }}
            >
              <SectionHeader
                icon={<ClipboardList className="size-4" strokeWidth={2.25} />}
                eyebrow="Plantilla estándar"
                title="Estructura de cada capítulo"
                hint={`${CHAPTER_TEMPLATE.length} bloques`}
              />
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Independientemente del programa, todos los capítulos usan la misma plantilla
                para mantener una experiencia consistente.
              </p>
              <ol className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {CHAPTER_TEMPLATE.map((s, i) => (
                  <li
                    key={s.title}
                    className="flex items-center gap-2 text-[11px] text-foreground/80"
                  >
                    <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium">{s.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="col-span-12 xl:col-span-4 space-y-6">
            <div
              className="glass rounded-3xl p-6 animate-slide-up"
              style={{ animationDelay: "80ms" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-4 text-primary" strokeWidth={2.25} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Otros programas
                </span>
              </div>
              <div className="space-y-2">
                {others.map((p) => {
                  const a = ACCENT_CLASSES[p.accent];
                  return (
                    <Link
                      key={p.id}
                      to="/programas/$slug"
                      params={{ slug: p.slug }}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/70 transition"
                    >
                      <span
                        className={`size-2 mt-1.5 rounded-full shrink-0 ${a.dot}`}
                      />
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {p.subtitle}
                        </span>
                        <span className="block text-xs font-bold leading-tight truncate">
                          {p.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div
              className="glass rounded-3xl p-6 animate-slide-up"
              style={{ animationDelay: "140ms" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Recorrido académico
              </span>
              <ol className="mt-4 space-y-3 relative">
                <div className="absolute left-[11px] top-1 bottom-1 w-px bg-black/[0.06]" />
                {PROGRAMS.map((p) => {
                  const active = p.id === program.id;
                  const a = ACCENT_CLASSES[p.accent];
                  return (
                    <li key={p.id} className="relative pl-8">
                      {active ? (
                        <div
                          className={`absolute left-0 top-0.5 size-6 rounded-full ${a.dot} flex items-center justify-center ring-4 ring-background shadow-lg`}
                        >
                          <span className="size-2 rounded-full bg-white" />
                        </div>
                      ) : (
                        <div className="absolute left-[5px] top-1.5 size-3 rounded-full bg-background border-2 border-black/10" />
                      )}
                      <span
                        className={`block text-xs font-bold leading-tight ${
                          active ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {p.title.replace("Residencia de Pediatría — ", "")}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-tight">
                        {p.subtitle}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  hint,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-lg bg-black/[0.04] flex items-center justify-center text-foreground">
          {icon}
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </span>
          <span className="text-sm font-bold tracking-tight">{title}</span>
        </div>
      </div>
      {hint && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
          {hint}
        </span>
      )}
    </div>
  );
}
