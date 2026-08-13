import { createFileRoute } from "@tanstack/react-router";
import { ProgramHubPage } from "@/components/pages/ProgramHubPage";

export const Route = createFileRoute("/programas/")({
  head: () => ({
    meta: [
      { title: "Programas académicos · KotaMed" },
      {
        name: "description",
        content:
          "Tu recorrido académico completo: Ciencias Básicas, Ciencias Clínicas, Internado, SERUMS, ENAM, EsSalud, Residentado, Especialidades y Subespecialidades.",
      },
      { property: "og:title", content: "KotaMed Program Hub · Programas académicos" },
      {
        property: "og:description",
        content:
          "Explora la trayectoria médica por etapas: fundamentos, práctica, evaluación y especialización. Programas informativos y planes de acceso claros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramHubPage,
});
