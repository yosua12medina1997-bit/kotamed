/**
 * CMS Studio → módulo "Preparación ENAM".
 * Edita todo el contenido de /p/enam (hero, métricas, temarios, recursos,
 * simulacros, metodología, IA, progreso, audiencia, CTA y SEO) reutilizando el
 * editor de páginas académicas. Solo administradores pueden guardar (RLS).
 */
import { CienciasBasicasEditor } from "@/components/cms/CienciasBasicasEditor";
import { DEFAULT_ENAM_CONFIG, ENAM_SECTION_LABEL, useEnamConfig, useSaveEnamConfig } from "@/lib/enam-cms";

export function EnamEditor() {
  return (
    <CienciasBasicasEditor
      heading="Preparación ENAM · /p/enam"
      path="/p/enam"
      labels={ENAM_SECTION_LABEL}
      defaults={DEFAULT_ENAM_CONFIG}
      useConfig={useEnamConfig}
      useSave={useSaveEnamConfig}
      successMessage="Preparación ENAM actualizada"
    />
  );
}
