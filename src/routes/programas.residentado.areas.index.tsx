import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ENAM_AREAS } from "@/lib/enam-modules";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/programas/residentado/areas/")({
  head: () => ({
    meta: [
      { title: "Áreas ENAM · Residentado · KotaMed" },
      {
        name: "description",
        content:
          "Los cinco módulos académicos del Residentado Médico: Medicina Interna, Ciencias Quirúrgicas, Gineco-Obstetricia, Pediatría & Neonatología y Salud Pública.",
      },
      { property: "og:title", content: "Áreas ENAM · Residentado" },
      {
        property: "og:description",
        content: "Ecosistema de aprendizaje independiente por especialidad.",
      },
    ],
  }),
  loader: () => {
    if (ENAM_AREAS.length === 0) throw notFound();
  },
  component: AreasHub,
});

function AreasHub() {
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
            to="/programas/$slug"
            params={{ slug: "residentado" }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3.5" /> Residentado
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-semibold text-foreground">Áreas académicas</span>
        </div>

        <section className="glass rounded-3xl p-8 md:p-10 animate-slide-up">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="size-3" />
            Cinco ecosistemas de aprendizaje
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Módulos académicos del Residentado
          </h1>
          <p className="mt-4 text-base md:text-lg text-foreground/80 max-w-3xl">
            Cada área funciona como una plataforma independiente: landing propia, ruta académica,
            contenido, casos clínicos, banco de preguntas, flashcards, simuladores, biblioteca y
            tutor IA con evidencia citada.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {ENAM_AREAS.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.slug}
                to="/programas/residentado/areas/$area"
                params={{ area: a.slug }}
                className="group glass rounded-3xl p-6 relative overflow-hidden animate-slide-up hover:-translate-y-0.5 transition"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 opacity-60 bg-gradient-to-br ${a.gradient}`}
                />
                <div className="relative">
                  <div
                    className="inline-flex size-11 items-center justify-center rounded-2xl border border-border/50 bg-background/60 backdrop-blur"
                    style={{ color: a.accent }}
                  >
                    <Icon className="size-5" strokeWidth={2.25} />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: a.accent }}
                    >
                      Módulo · {a.short}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight">{a.title}</h2>
                  <p className="mt-2 text-sm text-foreground/80 leading-relaxed">{a.tagline}</p>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {a.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-primary transition">
                    Ingresar al módulo <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
