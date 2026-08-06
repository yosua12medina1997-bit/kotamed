/**
 * Renderizado público de cualquier página creada en CMS Studio.
 * URL: /p/<slug>
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CmsBlockView } from "@/components/cms/CmsBlocks";
import { SiteFooterNav, SiteNavActions, SiteNavLinks } from "@/components/cms/SiteNav";
import { usePublicCmsPage } from "@/lib/cms";
import kotaMedLogo from "@/assets/kotaro-logo.png";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} · KotaMed` },
      {
        name: "description",
        content: "Contenido académico de KotaMed: programas, cursos y especialidades médicas con IA.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} · KotaMed` },
      {
        property: "og:description",
        content: "Formación médica premium con inteligencia artificial, casos reales y simulación clínica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CmsPublicPage,
});

function CmsPublicPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = usePublicCmsPage(slug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 lg:grid-cols-[auto_1fr_auto]">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={kotaMedLogo} alt="KotaMed" className="size-8 shrink-0 rounded-lg object-contain" />
            <span className="truncate text-sm font-black tracking-tight">KotaMed</span>
          </Link>
          <SiteNavLinks />
          <SiteNavActions />
        </div>
      </header>

      <main>
        {isLoading ? (
          <div className="grid h-[60vh] place-items-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="grid h-[60vh] place-items-center px-6 text-center">
            <div>
              <h1 className="text-xl font-black">Página no disponible</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Este contenido aún no ha sido publicado.
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                <ArrowLeft className="size-3.5" /> Volver al inicio
              </Link>
            </div>
          </div>
        ) : (
          data.blocks.map((b) => <CmsBlockView key={b.id} block={b} />)
        )}
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KotaMed · Formamos hoy, cuidamos el mañana.
      </footer>
    </div>
  );
}
