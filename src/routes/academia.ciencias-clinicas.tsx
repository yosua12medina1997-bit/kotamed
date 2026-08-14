/** Ruta pública de Ciencias Clínicas. */
import { createFileRoute } from "@tanstack/react-router";
import { CienciasClinicasPage } from "@/components/pages/CienciasClinicasPage";

const TITLE = "Ciencias Clínicas · KotaMed";
const DESCRIPTION =
  "Domina el razonamiento clínico: semiología, 12 especialidades, casos reales, simulación 3D y KotaMed AI como copiloto diagnóstico.";

export const Route = createFileRoute("/academia/ciencias-clinicas")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://kotamed.app/academia/ciencias-clinicas" },
      { property: "og:image", content: "https://kotamed.app/cc/hero-clinicas.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://kotamed.app/cc/hero-clinicas.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://kotamed.app/academia/ciencias-clinicas" }],
  }),
  component: CienciasClinicasPage,
});
