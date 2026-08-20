/**
 * Módulo académico genérico: aplica la arquitectura completa de
 * "Residentado · Pediatría & Neonatología" a cualquier módulo de cualquier
 * programa (Ciencias Básicas, ECB, Ciencias Clínicas, EsSalud, ENAM, R1-R3
 * y cualquier programa nuevo creado por el admin).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModuleGate } from "@/components/access/ModuleGate";
import { AreaModuleShell } from "@/components/academy/AreaModuleShell";
import { PediatriaNeoContenido } from "@/components/PediatriaNeoContenido";
import { buildModuleMeta, defaultProgramModules, genericBlueprint } from "@/lib/program-modules";
import { getProgram } from "@/lib/pediatria-programs";
import { NeonatalHospital } from "@/components/hospital/NeonatalHospital";
import { WardOS } from "@/components/ward/WardOS";
import { Baby, Hospital } from "lucide-react";

/** Programa personalizado con módulo de Hospitalización Neonatal. */
const HOSPITAL_PROGRAM = "internado-medico-hospitalizacion";


function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export const Route = createFileRoute("/programas/$slug_/areas/$area")({
  loader: ({ params }) => ({ slug: params.slug, area: params.area }),
  head: ({ loaderData }) => {
    const slug = loaderData?.slug ?? "";
    const area = loaderData?.area ?? "";
    const programTitle = getProgram(slug)?.title ?? titleFromSlug(slug);
    const moduleTitle =
      defaultProgramModules(slug).find((m) => m.slug === area)?.title ?? titleFromSlug(area);
    return {
      meta: [
        { title: `${moduleTitle} · ${programTitle} · KotaMed` },
        {
          name: "description",
          content: `Módulo de ${moduleTitle} en ${programTitle}: ruta académica, contenido, casos clínicos, banco de preguntas, flashcards, simuladores, biblioteca y tutor IA.`,
        },
        { property: "og:title", content: `${moduleTitle} · ${programTitle} · KotaMed` },
        {
          property: "og:description",
          content: `Ecosistema de aprendizaje completo para ${moduleTitle}.`,
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: GenericAreaModule,
});

function useAreaMeta(programSlug: string, areaSlug: string) {
  return useQuery({
    queryKey: ["generic-area-meta", programSlug, areaSlug],
    queryFn: async () => {
      const { data: parent, error: pe } = await supabase
        .from("content_nodes")
        .select("id")
        .eq("kind", "program")
        .eq("slug", programSlug)
        .maybeSingle();
      if (pe) throw pe;
      if (!parent) return null;
      const { data, error } = await supabase
        .from("content_nodes")
        .select("slug,title,description,sort_order")
        .eq("parent_id", parent.id)
        .eq("kind", "area")
        .eq("slug", areaSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function GenericAreaModule() {
  const { slug, area } = Route.useLoaderData();
  const { data: node } = useAreaMeta(slug, area);
  const defaults = defaultProgramModules(slug);
  const index = Math.max(
    0,
    defaults.findIndex((m) => m.slug === area),
  );

  const meta =
    node
      ? buildModuleMeta({ slug: node.slug, title: node.title, description: node.description }, index)
      : (defaults.find((m) => m.slug === area) ??
        buildModuleMeta({ slug: area, title: titleFromSlug(area) }, index));

  const programTitle = getProgram(slug)?.title ?? titleFromSlug(slug);

  return (
    <ModuleGate programSlug={slug} moduleName={`${meta.title} · ${programTitle}`}>
      <AreaModuleShell
        meta={meta}
        programSlug={slug}
        areasPath="/programas/$slug"
        areasParams={{ slug }}
        areasLabel="Programa"
        extraSections={
          /hospitaliza/i.test(area) && /pediatr/i.test(`${slug} ${area}`) && !/neonatolog/i.test(area)
            ? [
                {
                  id: "ward-os",
                  label: "🏥 Kota Ward",
                  icon: Hospital,
                  render: ({ isAdmin }: { isAdmin: boolean }) => (
                    <WardOS isAdmin={isAdmin} accent={meta.accent} />
                  ),
                },
              ]
            : (slug === HOSPITAL_PROGRAM || /hospitaliza/i.test(slug)) && /neonatolog/i.test(area)
              ? [
                  {
                    id: "hospitalizacion",
                    label: "🏥 Hospitalización Neonatal",
                    icon: Baby,
                    render: ({ isAdmin }: { isAdmin: boolean }) => (
                      <NeonatalHospital isAdmin={isAdmin} accent={meta.accent} />
                    ),
                  },
                ]
              : []
        }
        renderContenido={() => (
          <PediatriaNeoContenido
            meta={meta}
            blueprint={genericBlueprint(meta.title)}
            scope={{
              rootSlug: `biblioteca-${slug}-${area}`,
              rootTitle: `Biblioteca · ${programTitle} · ${meta.title}`,
              overridesSlug: `${slug}-${area}-blueprint-overrides`,
              namespace: `${slug}-${area}`,
            }}
            heading={`Contenido de ${meta.title}`}
            intro="Temario editable del módulo. Como admin puedes agregar o quitar temas, editar cada tema con IA, subir archivos e insertar videos."
            showPharma={/pediatr|neonat|farmac/i.test(`${meta.title} ${area}`)}
          />
        )}
      />
    </ModuleGate>
  );
}
