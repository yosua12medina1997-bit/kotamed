/**
 * Página pública "Preparación ENAM" (/p/enam).
 * Reutiliza el renderizador premium de Ciencias Básicas / Internado con su
 * propio contenido editable desde CMS Studio (scope page-enam).
 */
import { SciencePage } from "@/components/pages/CienciasBasicasPage";
import { useEnamConfig } from "@/lib/enam-cms";

export function EnamPage() {
  const { data } = useEnamConfig();
  return <SciencePage cfg={data ?? null} />;
}
