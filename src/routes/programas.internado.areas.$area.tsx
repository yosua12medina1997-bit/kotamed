import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModuleGate } from "@/components/access/ModuleGate";
import { AreaModuleShell } from "@/components/academy/AreaModuleShell";
import { PediatriaNeoContenido } from "@/components/PediatriaNeoContenido";
import {
  INTERNADO_PROGRAM_SLUG,
  getInternadoArea,
  getInternadoBlueprint,
} from "@/lib/internado-modules";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { Baby } from "lucide-react";
import { NeonatalHospital } from "@/components/hospital/NeonatalHospital";

export const Route = createFileRoute("/programas/internado/areas/$area")({
  loader: ({ params }) => {
    const meta = getInternadoArea(params.area);
    if (!meta) throw notFound();
    return { slug: params.area };
  },
  head: ({ loaderData }) => {
    const meta = loaderData ? getInternadoArea(loaderData.slug) : null;
    if (!meta) {
      return {
        meta: [
          { title: "Rotación no encontrada · KotaMed" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${meta.title} · Internado · KotaMed` },
        { name: "description", content: meta.description },
        { property: "og:title", content: `${meta.title} · Internado · KotaMed` },
        { property: "og:description", content: meta.tagline },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: InternadoAreaModule,
});

function InternadoAreaModule() {
  const { slug } = Route.useLoaderData() as { slug: string };
  const meta = getInternadoArea(slug) as EnamAreaMeta;
  const blueprint = getInternadoBlueprint(slug);

  return (
    <ModuleGate programSlug={INTERNADO_PROGRAM_SLUG} moduleName={meta.title}>
      <AreaModuleShell
        meta={meta}
        programSlug={INTERNADO_PROGRAM_SLUG}
        areasPath="/programas/internado/areas"
        areasLabel="Rotaciones"
        extraSections={
          slug === "pediatria-neonatologia"
            ? [
                {
                  id: "hospitalizacion",
                  label: "🏥 Hospitalización Neonatal",
                  icon: Baby,
                  render: ({ isAdmin }) => (
                    <NeonatalHospital isAdmin={isAdmin} accent={meta.accent} />
                  ),
                },
              ]
            : []
        }
        renderContenido={() => (
          <PediatriaNeoContenido
            meta={meta}
            blueprint={blueprint}
            scope={{
              rootSlug: `biblioteca-internado-${slug}`,
              rootTitle: `Biblioteca · Internado · ${meta.title}`,
              overridesSlug: `internado-${slug}-blueprint-overrides`,
              namespace: `internado-${slug}`,
            }}
            heading={`Contenido de ${meta.title}`}
            intro="Bloque de práctica hospitalaria + bloque de alto rendimiento ENAM. Como admin puedes agregar o quitar temas, editar cada tema con IA, subir archivos e insertar videos."
            showPharma={slug === "pediatria-neonatologia"}
          />
        )}
      />
    </ModuleGate>
  );
}
