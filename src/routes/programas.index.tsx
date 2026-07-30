import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, GraduationCap, Stethoscope } from "lucide-react";
import { ACCENT_CLASSES } from "@/lib/pediatria-programs";
import { useProgramCatalog } from "@/lib/content-catalog";


export const Route = createFileRoute("/programas/")({
  head: () => ({
    meta: [
      { title: "Programas académicos · Pediatría · Kotaro Academy" },
      {
        name: "description",
        content:
          "Cinco programas académicos independientes que acompañan al médico desde la preparación para el Residentado hasta el tercer año de residencia en Pediatría.",
      },
      {
        property: "og:title",
        content: "Programas de Pediatría · Kotaro Academy",
      },
      {
        property: "og:description",
        content:
          "Residentado, Internado Médico, R1, R2 y R3: un ecosistema académico premium que acompaña toda la evolución profesional del médico.",
      },
    ],
  }),
  component: ProgramsIndex,
});

function ProgramsIndex() {
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

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-14 relative">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/"
            className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/15 transition"
            aria-label="Volver al inicio"
          >
            <Stethoscope className="size-4" strokeWidth={2.25} />
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Módulo · Pediatría
          </span>
        </div>

        <header className="max-w-3xl mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance leading-[1.05]">
            Un recorrido académico completo, desde el examen hasta la especialidad.
          </h1>
          <p className="mt-5 text-muted-foreground text-pretty leading-relaxed">
            Cinco programas independientes con dashboard, progreso, módulos, casos y evaluaciones
            propios. Todos comparten el mismo Design System y experiencia premium de Kotaro
            Academy.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PROGRAMS.map((p, i) => {
            const accent = ACCENT_CLASSES[p.accent];
            return (
              <Link
                key={p.id}
                to="/programas/$slug"
                params={{ slug: p.slug }}
                className="glass rounded-3xl p-7 group relative hover:-translate-y-0.5 transition-all hover:shadow-xl animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-10 rounded-xl flex items-center justify-center ${accent.chip} border`}
                    >
                      <GraduationCap className="size-5" strokeWidth={2} />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {p.subtitle}
                      </span>
                      <h2 className="font-bold text-base tracking-tight leading-tight">
                        {p.title}
                      </h2>
                    </div>
                  </div>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground group-hover:text-foreground transition-colors"
                    strokeWidth={2}
                  />
                </div>

                <p className="mt-4 text-sm font-medium text-foreground/80 leading-relaxed">
                  {p.tagline}
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {p.audience}
                </p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {p.areas.slice(0, 4).map((a) => (
                    <span
                      key={a}
                      className="px-2 py-0.5 bg-white/70 border border-border rounded text-[10px] font-semibold text-muted-foreground"
                    >
                      {a}
                    </span>
                  ))}
                  {p.areas.length > 4 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground">
                      +{p.areas.length - 4} áreas
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
