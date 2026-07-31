import { createFileRoute, notFound } from "@tanstack/react-router";
import { getEnamArea, type EnamAreaMeta } from "@/lib/enam-modules";
import { ModuleGate } from "@/components/access/ModuleGate";
import { AreaModuleShell } from "@/components/academy/AreaModuleShell";
import { PediatriaNeoContenido } from "@/components/PediatriaNeoContenido";

export const Route = createFileRoute("/programas/residentado/areas/$area")({
  loader: ({ params }) => {
    const meta = getEnamArea(params.area);
    if (!meta) throw notFound();
    return { slug: params.area };
  },
  head: ({ loaderData }) => {
    const meta = loaderData ? getEnamArea(loaderData.slug) : null;
    if (!meta) {
      return {
        meta: [
          { title: "Módulo no encontrado · KotaMed" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${meta.title} · Residentado · KotaMed` },
        { name: "description", content: meta.description },
        { property: "og:title", content: `${meta.title} · KotaMed` },
        { property: "og:description", content: meta.tagline },
      ],
    };
  },
  component: AreaModule,
});

function AreaModule() {
  const { slug } = Route.useLoaderData() as { slug: string };
  const meta = getEnamArea(slug) as EnamAreaMeta;

  return (
    <ModuleGate programSlug="residentado" moduleName={meta.title}>
      <AreaModuleShell
        meta={meta}
        programSlug="residentado"
        areasPath="/programas/residentado/areas"
        areasLabel="Áreas"
        renderContenido={
          meta.slug === "pediatria-neonatologia"
            ? () => <PediatriaNeoContenido meta={meta} />
            : undefined
        }
      />
    </ModuleGate>
  );
}
