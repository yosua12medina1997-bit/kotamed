/**
 * Visor universal del Constructor de contenido.
 *
 * Cualquier programa creado desde CMS Studio → "Constructor de contenido"
 * queda disponible aquí sin escribir código: /contenido/<slug-del-programa>.
 * La estructura completa (bloques, categorías, subcategorías, temas, secciones
 * y recursos) se lee de `content_nodes` / `content_resources`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PediatriaNeoContenido } from "@/components/PediatriaNeoContenido";
import { Loader2 } from "lucide-react";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export const Route = createFileRoute("/contenido/$program")({
  loader: ({ params }) => ({ program: params.program }),
  head: ({ loaderData }) => {
    const title = titleFromSlug(loaderData?.program ?? "Contenido");
    return {
      meta: [
        { title: `${title} · Contenido · KotaMed` },
        {
          name: "description",
          content: `Contenido académico de ${title}: bloques, categorías, temas, secciones y recursos publicados en KotaMed.`,
        },
        { property: "og:title", content: `${title} · Contenido · KotaMed` },
        {
          property: "og:description",
          content: `Estructura académica completa de ${title} en KotaMed.`,
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: UniversalContentViewer,
});

function UniversalContentViewer() {
  const { program } = Route.useParams();

  const root = useQuery({
    queryKey: ["content-builder", "root", program],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,title,slug,description,metadata")
        .eq("slug", program)
        .is("parent_id", null)
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as
        | { id: string; title: string; slug: string; description: string | null; metadata: any }
        | null;
    },
  });

  if (root.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="glass flex items-center gap-2 rounded-3xl p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando contenido…
        </div>
      </main>
    );
  }

  if (!root.data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Contenido no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este programa de contenido aún no existe o no está publicado.
        </p>
      </main>
    );
  }

  const node = root.data;
  const accent = (node.metadata?.color as string) || "hsl(var(--primary))";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PediatriaNeoContenido
        meta={{ slug: node.slug, title: node.title, accent } as never}
        blueprint={[]}
        scope={{ rootSlug: node.slug, rootTitle: node.title, namespace: `builder-view-${node.slug}` }}
        heading={`Contenido de ${node.title}`}
        intro={node.description ?? undefined}
        showPharma={false}
      />
    </main>
  );
}
