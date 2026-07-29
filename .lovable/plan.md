
# Sistema dinámico de temas — Pediatría & Neonatología

Nada del diseño, colores, layout, sidebar, dashboard, tipografía o rutas existentes se modifica. Todo lo nuevo se **añade** encima de la estructura actual (`content_nodes` + `content_resources` + blueprint), reutilizando los mismos tokens visuales que ya tienes.

Dado el tamaño del prompt, propongo entregarlo en **fases**. Esta primera fase cubre el núcleo: plantilla universal + presentación secuencial + generador IA de contenido. Las demás fases quedan listadas al final para confirmarlas después.

---

## Fase 1 — Núcleo dinámico (esta entrega)

### 1. Modelo de datos: plantilla universal
Un solo esquema JSON reutilizable para **cualquier** tema (Pediatría, Neonatología y a futuro otras especialidades). Se guarda en `content_nodes.metadata.topic` cuando el nodo es un tema/subtema.

```text
topic = {
  version: 1,
  title, subtitle,
  slides: [
    { id, kind, title, data, notes }
  ],
  meta: { level, tags, sources, updatedAt, generatedBy }
}
```

`kind` cubre los bloques del prompt: `title | objectives | intro | image | diagram | animation | table | comparison | flowchart | cards | timeline | steps | drugs | epidemiology-chart | summary | case | pearls | takehome | mistakes | tips | qbank-preview | references`.

No se crean rutas nuevas por tema. Todo se lee de este JSON.

### 2. Detección automática de componente
Función pura `inferSlideKind(rawText)` que decide qué bloque usar a partir del contenido (comparación → tabla, "algoritmo" → flowchart, "epidemiología" → chart, etc.). La IA la usa al generar y el editor la sugiere en vivo.

### 3. Renderer secuencial (una sola pantalla por slide)
Nuevo componente `TopicPresenter` (drawer/overlay full-screen, no cambia la página):
- Un slide a la vez, transiciones suaves (framer-motion ya presente).
- Navegación: flechas ←/→, teclado, barra inferior con progreso, "salir" (Esc).
- Modo lectura y modo presentación (fullscreen).
- Se abre desde cada tema/subtema de `PediatriaNeoContenido` con un botón **Abrir tema** (visible para todos) — no toca el diseño de la lista, solo añade el botón.

Componentes por `kind`: `SlideTitle`, `SlideObjectives`, `SlideTable`, `SlideFlowchart` (nodos + edges básicos), `SlideCards`, `SlideTimeline`, `SlideSteps`, `SlideCase`, `SlideTakeHome`, `SlidePearls`, `SlideMistakes`, `SlideSummary`, `SlideImage`, `SlideReferences`. Todos reutilizan tokens/glass ya existentes.

### 4. Editor IA del tema (solo admin)
Nuevo drawer `TopicEditor` (solo visible con rol admin, como el resto de controles admin). Tabs:
- **Estructura**: lista ordenable de slides (drag & drop, duplicar, eliminar, cambiar `kind`).
- **Slide**: editor del slide activo (título, texto, tabla, pasos, etc. según `kind`).
- **IA**: acciones por slide y por tema completo:
  - Generar tema completo desde el título del nodo.
  - Expandir / Resumir / Mejorar redacción / Actualizar guías / Agregar referencias.
  - Convertir texto libre en tabla / flowchart / cards / timeline (usa `inferSlideKind`).
- **Fuente**: pegado libre de texto → la IA lo parte en slides.

Persistencia: `content_nodes.metadata.topic` vía la misma mutación que ya usas.

### 5. Server function IA
`src/lib/topic-ai.functions.ts` con `createServerFn` + `requireSupabaseAuth`, verifica rol admin en el handler antes de llamar al gateway.
- Modelo: `google/gemini-3.6-flash` vía Lovable AI Gateway (`ai.gateway.lovable.dev/v1`), `LOVABLE_API_KEY` server-only.
- Structured output con Zod para devolver directamente el shape `topic.slides[]`.
- Acciones: `generateTopic`, `transformSlide`, `expandSlide`, `summarizeSlide`, `slidesFromText`.

Errores 402/429 se propagan al UI como toast con mensaje claro.

### 6. Integración mínima en la UI existente
Único cambio en archivos existentes: en `src/components/PediatriaNeoContenido.tsx` añadir dos botones por tema (`Abrir` para todos, `Editar tema` solo admin) que abren los nuevos componentes. Nada más se toca.

---

## Fase 2 y siguientes (confirmar después, NO en esta entrega)

Para que quede en el plan pero sin ejecutarse ahora:
- Importación inteligente (Word/PDF/PPTX/Excel/MD) → slides.
- Gestor de casos clínicos interactivos.
- QBank + generador IA de 100/500/1000 preguntas.
- Simuladores IA (escenario + monitores + eventos).
- Generador de storyboards de video.
- Flashcards SRS.
- Tutor IA por tema (chat con citas).
- Progreso avanzado + heatmap + recomendador IA.
- Biblioteca multimedia indexada.
- CMS drag-and-drop, versionado, papelera, publicación programada.
- Modo Docente, generador de diapositivas exportables, modo Congreso, dashboard de calidad, motor de referencias.

Cada bloque se abordará como fase independiente para poder validar diseño y comportamiento antes de escalarlo al resto de especialidades.

---

## Detalles técnicos

- Nuevos archivos:
  - `src/lib/topic-schema.ts` (tipos + `inferSlideKind`).
  - `src/lib/topic-ai.functions.ts` (server fn IA, admin-gated).
  - `src/components/topic/TopicPresenter.tsx` + `slides/*` (renderers por kind).
  - `src/components/topic/TopicEditor.tsx` (drawer admin).
- Sin migraciones: se usa `content_nodes.metadata` (jsonb) ya existente.
- Sin cambios de RLS: la lectura ya está gateada por enrollment; la escritura ya es admin-only.
- Sin nuevas rutas ni cambios en `routeTree.gen.ts`.
- Sin librerías nuevas obligatorias; si hace falta drag&drop se usa `@dnd-kit` (ya común, se instala solo si se aprueba).

## Criterio de aceptación Fase 1
1. Desde cualquier tema de Pediatría o Neonatología, un usuario matriculado puede abrir el tema y navegar slide por slide con animaciones.
2. Un admin puede: generar el tema completo con un clic, editar slide por slide, cambiar el tipo de bloque, reordenar y guardar — todo persiste en `content_nodes.metadata.topic`.
3. Nada del diseño, layout, colores, sidebar, dashboard ni rutas existentes cambia visualmente para el usuario final.
