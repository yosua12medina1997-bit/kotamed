/**
 * CMS Studio → módulo "Ciencias Clínicas".
 * Edita todo el contenido de /academia/ciencias-clinicas (hero, cifras,
 * especialidades, ruta, IA, simulación 3D, CTA y SEO) reutilizando el editor
 * de páginas académicas. Solo administradores pueden guardar (RLS).
 */
import { CienciasBasicasEditor } from "@/components/cms/CienciasBasicasEditor";
import { CC_SECTION_LABEL, DEFAULT_CC_CONFIG, useCcConfig, useSaveCcConfig } from "@/lib/ciencias-clinicas-cms";

export function CienciasClinicasEditor() {
  return (
    <CienciasBasicasEditor
      heading="Ciencias Clínicas · /academia/ciencias-clinicas"
      path="/academia/ciencias-clinicas"
      labels={CC_SECTION_LABEL}
      defaults={DEFAULT_CC_CONFIG}
      useConfig={useCcConfig}
      useSave={useSaveCcConfig}
      successMessage="Ciencias Clínicas actualizada"
    />
  );
}
