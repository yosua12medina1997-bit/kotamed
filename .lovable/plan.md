# Vincular/desvincular patologías: solo administrador

## Objetivo
En KOTA CLINICAL MAP (Hospitalización y Emergencia), únicamente los administradores podrán vincular o desvincular patologías a un paciente. El resto del personal seguirá viendo la biblioteca, las sugerencias y las patologías ya vinculadas, pero sin poder modificarlas.

## Cambios de interfaz
- Los botones "Vincular al paciente", "Desvincular del paciente" y "Elegir paciente" solo se muestran si el usuario es administrador.
- Para usuarios no administradores se muestra en su lugar una etiqueta discreta: "Vinculada al paciente" cuando corresponda, o nada si no lo está.
- Las sugerencias "Basado en tu paciente" siguen visibles para todos (solo navegan a la patología, no vinculan).

## Cambios de permisos en la base de datos
Ajustar las reglas de la tabla de vínculos paciente-patología para que:
- Crear, modificar y eliminar vínculos quede reservado a administradores.
- La lectura se mantenga igual para el personal clínico de la rotación.

## Detalles técnicos
- `src/components/learning/ClinicalMap.tsx`: condicionar el bloque de acciones de paciente (líneas ~303-329) a `isAdmin`.
- Migración: reemplazar las políticas `kcm_pl_insert`, `kcm_pl_update` y `kcm_pl_delete` de `public.kcm_patient_links` para exigir `private.is_kcm_admin(auth.uid())` (quitando la vía `is_ward_staff` y `created_by = auth.uid()`); `kcm_pl_read` sin cambios.
