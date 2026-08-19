/**
 * CMS Studio → módulo "Internado Médico".
 * Edita todo el contenido de /p/internado (hero, métricas, rotaciones, recursos,
 * beneficios, metodología, IA, progreso, audiencia, CTA y SEO) reutilizando el
 * editor de páginas académicas. Solo administradores pueden guardar (RLS).
 */
import { CienciasBasicasEditor } from "@/components/cms/CienciasBasicasEditor";
import { DEFAULT_INT_CONFIG, INT_SECTION_LABEL, useIntConfig, useSaveIntConfig } from "@/lib/internado-cms";

export function InternadoEditor() {
  return (
    <CienciasBasicasEditor
      heading="Internado Médico · /p/internado"
      path="/p/internado"
      labels={INT_SECTION_LABEL}
      defaults={DEFAULT_INT_CONFIG}
      useConfig={useIntConfig}
      useSave={useSaveIntConfig}
      successMessage="Internado Médico actualizado"
    />
  );
}
