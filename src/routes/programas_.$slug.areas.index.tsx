/**
 * Hub de módulos para CUALQUIER programa de KotaMed.
 * Lee los módulos (nodos `area`) del programa desde el editor de contenido y,
 * si aún no existen, muestra la plantilla por defecto del programa.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleGate } from "@/components/access/ModuleGate";
import { buildModuleMeta, defaultProgramModules } from "@/lib/program-modules";
import { getProgram } from "@/lib/pediatria-programs";

export const Route = createFileRoute("/programas_/$slug/areas/")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: ({ loaderData }) => {
    const slug = loaderData?.slug ?? "";
    const title = getProgram(slug)?.title ?? "Programa";
    return {
      meta: [
        { title: `Módulos de ${title} · KotaMed` },
        {
          name: "description",
          content: `Módulos académicos del programa ${title}: ruta académica, contenido editable, casos clínicos, banco de preguntas, flashcards, simuladores, biblioteca y tutor IA.`,
        },
        { property: "og:title", content: `Módulos de ${title} · KotaMed` },
        {
          property: "og:description",
          content: "Cada módulo es un ecosistema de aprendizaje independiente y editable.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: () => {
    const { slug } = Route.useLoaderData();
    return (
      <ModuleGate programSlug={slug} moduleName={getProgram(slug)?.title}>
        <ProgramModulesHub />
      </ModuleGate>
    );
  },
});

function useProgramModules(programSlug: string) {
  return useQuery({
    queryKey: ["program-modules-hub", programSlug],
    queryFn: async () => {
      const { data: parent, error: pe } = await supabase
        .from("content_nodes")
        .select("id,title,description")
        .eq("kind", "program")
        .eq("slug", programSlug)
        .maybeSingle();
      if (pe) throw pe;
      if (!parent) return { program: null, areas: [] as { slug: string; title: string; description: string | null }[] };
      const { data, error } = await supabase
        .from("content_nodes")
        .select("slug,title,description,sort_order")
        .eq("parent_id", parent.id)
        .eq("kind", "area")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return { program: parent, areas: data ?? [] };
    },
  });
}

function ProgramModulesHub() {
  const { slug } = Route.useLoaderData();
  const q = useProgramModules(slug);
  const staticProgram = getProgram(slug);

  const programTitle = q.data?.program?.title ?? staticProgram?.title ?? "Programa";
  const programDescription =
    q.data?.program?.description ??
    staticProgram?.description ??
    "Cada módulo funciona como una plataforma independiente: ruta académica, contenido, casos, banco de preguntas, flashcards, simuladores, biblioteca y tutor IA.";

  const modules =
    q.data && q.data.areas.length > 0
      ? q.data.areas.map((a, i) => buildModuleMeta(a, i))
      : defaultProgramModules(slug);

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
            params={{ slug }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3.5" /> {programTitle}
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-semibold text-foreground">Módulos académicos</span>
        </div>

        <section className="glass rounded-3xl p-8 md:p-10 animate-slide-up">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="size-3" />
            {modules.length} ecosistemas de aprendizaje
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Módulos de {programTitle}
          </h1>
          <p className="mt-4 text-base md:text-lg text-foreground/80 max-w-3xl">{programDescription}</p>
        </section>

        {q.isPending && (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando módulos…
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {modules.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.slug}
                to="/programas_/$slug/areas/$area"
                params={{ slug, area: a.slug }}
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
