/**
 * Página pública "Ciencias Clínicas" (/academia/ciencias-clinicas y /p/ciencias-clinicas).
 * Reutiliza el renderizador premium de Ciencias Básicas con su propio contenido
 * editable desde CMS Studio (scope page-ciencias-clinicas).
 */
import { SciencePage } from "@/components/pages/CienciasBasicasPage";
import { useCcConfig } from "@/lib/ciencias-clinicas-cms";

export function CienciasClinicasPage() {
  const { data } = useCcConfig();
  return <SciencePage cfg={data ?? null} />;
}
