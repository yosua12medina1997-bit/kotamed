/**
 * Página pública "Internado Médico" (/p/internado).
 * Reutiliza el renderizador premium de Ciencias Básicas con su propio contenido
 * editable desde CMS Studio (scope page-internado).
 */
import { SciencePage } from "@/components/pages/CienciasBasicasPage";
import { useIntConfig } from "@/lib/internado-cms";

export function InternadoPage() {
  const { data } = useIntConfig();
  return <SciencePage cfg={data ?? null} />;
}
