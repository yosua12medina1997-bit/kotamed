## Qué pasa

La calculadora sí está construida (`src/components/pharma/PharmaWorkspace.tsx`), pero **hoy es inalcanzable en la interfaz**.

En `src/components/PediatriaNeoContenido.tsx` (línea 269) la pestaña "Farmacología" solo aparece si el **tema abierto** cumple `/farmacolog/i.test(topic.title)` o `topic.key === "farmacologia"`. Sin embargo:

- `"farmacologia"` es la **clave de la categoría** ("26. Farmacología pediátrica"), no del tema; los temas (`BlueprintTopic`) no tienen `key`.
- Ningún tema dentro de esa categoría contiene la palabra "farmacología" en su título ("Calculadora de dosis por peso y superficie corporal", "Diluciones", "Antibióticos", etc.).

Resultado: la condición nunca se cumple y la pestaña nunca se dibuja.

## Qué haré (solo presentación, sin tocar arquitectura existente)

1. **Corregir la detección**: pasar la `category` al detalle del tema y activar el modo farmacología cuando `category.key === "farmacologia"` (o el título del tema mencione dosis/calculadora). Así la pestaña **Farmacología** aparece en los 15 temas del subtema 26.

2. **Acceso directo desde la categoría**: en la tarjeta "26. Farmacología pediátrica" añadir un botón visible **"Abrir calculadora"** que lleve directo al workspace, sin tener que entrar tema por tema.

3. **Atajo global del área**: en la cabecera de Pediatría & Neonatología, añadir un chip/botón **"Calculadora farmacológica"** que abra el mismo panel en un modal, para encontrarlo en un clic desde cualquier punto del módulo.

4. **Verificación en navegador**: abrir `/programas/residentado/areas/pediatria-neonatologia`, confirmar con capturas que el atajo y la pestaña se renderizan y que los cálculos (dosis, SC, Holliday-Segar, goteo) responden.

## Detalles técnicos

- Cambios acotados a `src/components/PediatriaNeoContenido.tsx` (props y condición `isPharma`, botón de atajo y modal).
- `PharmaWorkspace` se reutiliza sin modificar; sigue guardando el catálogo en `content_nodes.metadata.pharma` solo para admin.
- Sin migraciones, sin cambios de rutas ni de estilos globales.
