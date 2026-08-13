/**
 * Renderizado público de cualquier página creada en CMS Studio.
 * URL: /p/<slug>            → snapshot PUBLICADO (producción)
 * URL: /p/<slug>?preview=draft → borrador (solo con permisos de administración)
 */
import {
  EnvironmentSwitcher,
  GlobalEnvironment,
} from "@/components/hero/DynamicEnvironment";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { CmsBlockView } from "@/components/cms/CmsBlocks";
import { SiteFooterNav, SiteNavActions, SiteNavLinks } from "@/components/cms/SiteNav";
import { useCmsBlocks, useCmsPage, usePublicCmsPage } from "@/lib/cms";
import kotaMedLogo from "@/assets/kotaro-logo.png";

export const Route = createFileRoute("/p/$slug")({
  validateSearch: (search: Record<string, unknown>): { preview?: "draft" } => ({
    preview: search.preview === "draft" ? ("draft" as const) : undefined,
  }),
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
  const { preview } = Route.useSearch();
  const isDraft = preview === "draft";

  const published = usePublicCmsPage(slug);
  const draftPage = useCmsPage(isDraft ? slug : null);
  const draftBlocks = useCmsBlocks(isDraft ? (draftPage.data?.id ?? null) : null);

  const isLoading = isDraft ? draftPage.isLoading || draftBlocks.isLoading : published.isLoading;
  const data = isDraft
    ? draftPage.data
      ? { page: draftPage.data, blocks: (draftBlocks.data ?? []).filter((b) => b.visible) }
      : null
    : published.data;


  return (
    <div className="min-h-screen text-foreground">
      <GlobalEnvironment />
      <div className="pointer-events-auto fixed bottom-4 right-4 z-40">
        <EnvironmentSwitcher />
      </div>
      {isDraft && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-[11px] font-bold text-amber-900">
          <Eye className="size-3.5" /> Vista previa de cambios (borrador) — no visible para el público
          <Link to="/admin/cms" className="underline">
            ← Volver al CMS
          </Link>
        </div>
      )}

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

      <main className="relative z-10 bg-background/10">
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

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <SiteFooterNav />
          <div className="mt-8 border-t border-border/60 pt-5 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} KotaMed · Formamos hoy, cuidamos el mañana.
          </div>
        </div>
      </footer>
    </div>
  );
}
