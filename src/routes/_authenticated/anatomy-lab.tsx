import { createFileRoute } from "@tanstack/react-router";
import AnatomyLab from "@/components/anatomy/AnatomyLab";
import { regionForLesson } from "@/lib/anatomy/atlas";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/anatomy-lab")({
  validateSearch: z.object({ leccion: z.string().max(120).optional() }),
  head: () => ({
    meta: [
      { title: "KotaMed Anatomy Lab — Simulador anatómico 3D" },
      { name: "description", content: "Explora el cuerpo humano en 3D con capas por sistemas, correlación clínica, imagenología, preguntas de examen e IA médica." },
      { property: "og:title", content: "KotaMed Anatomy Lab" },
      { property: "og:description", content: "Simulador anatómico 3D interactivo para Ciencias Básicas en KotaMed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnatomyLabPage,
});

function AnatomyLabPage() {
  const { leccion } = Route.useSearch();
  const { region } = regionForLesson(leccion ?? "");
  return <AnatomyLab initialRegion={region} />;
}
