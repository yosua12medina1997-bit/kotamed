# CMS KotaMed — Constructor visual por bloques con IA

Convertir la página de entrada (y luego cualquier landing de programa) en contenido 100% editable por bloques desde un nuevo módulo de administración: **CMS Studio**, con la misma identidad visual actual (colores, tipografía, iconografía, estilo minimalista). No se copia ningún diseño ajeno: la referencia solo guía jerarquía y organización.

Esto es un sistema grande. Se construye por fases; cada fase queda funcional y usable.

## Fase 1 — Núcleo del CMS + Página principal editable (esta entrega)

Lo que quedará funcionando:

1. **Nuevo módulo "CMS Studio"** en Administración, con la estructura de 3 columnas de la referencia:
   - Izquierda: navegación del CMS (Páginas, Programas, Cursos, Especialidades, Biblioteca, Eventos, Blog, Testimonios, Docentes, Media) — en Fase 1 activas Páginas y Programas; el resto quedan visibles como secciones del CMS que se llenan en fases siguientes.
   - Centro-izquierda: **Biblioteca de bloques** (Hero, Banner, Video, Contadores, Beneficios, Características, CTA, Cursos, Docentes, Testimonios, Galería, Cronograma, Planes, Casos clínicos, FAQ, Acordeón, Tabla, Infografía, Carrusel).
   - Centro: **lienzo de vista previa en vivo** con selección de bloque al hacer clic, y conmutador Escritorio / Tablet / Móvil.
   - Derecha: **inspector** del bloque seleccionado con pestañas Contenido / Diseño / Avanzado (título, subtítulo, descripción, imagen/video, botones, colores, alineación, espaciado, animación).
   - Barra superior: ruta de la página, estado (Borrador/Publicado), deshacer/rehacer, Vista previa, **Guardar cambios**.

2. **Bloques con control total**: editar, ocultar, duplicar, eliminar y **reordenar por arrastrar y soltar**.

3. **La página principal se renderiza desde el CMS**: los bloques publicados sustituyen el contenido fijo del inicio. Si aún no hay bloques, se siembra automáticamente la página actual como bloques editables, de modo que nada se pierde ni cambia de aspecto.

4. **IA en cada bloque — "✨ Generar con IA"**: genera título, subtítulo, descripción, beneficios, contadores, FAQ, cronograma, testimonios y CTA en español clínico, sobre el contexto real de KotaMed. Además **KotaMed Studio AI**: describir una página ("Landing para Internado Médico") y obtener una estructura completa de bloques editable.

5. **Imágenes**: por bloque, subir imagen o **generar imagen con IA**, guardadas en almacenamiento del proyecto.

6. **Videos**: subida, YouTube, Vimeo o MP4 con miniatura editable.

7. **SEO por página**: meta título, meta descripción, imagen OG, palabras clave, canónica e indexación, aplicados de verdad en la página pública.

8. **Publicación y versiones**: Borrador vs Publicado y historial de versiones con restaurar.

## Fase 2 — Landings de programa

- Cada programa (Internado, Residentado, SERUMS, Preinternado, Neonatología, Pediatría, Cardiología…) obtiene su propia landing por bloques, independiente.
- Panel por programa: nombre, descripción, slug, SEO, color principal/secundario, imagen, video, banner, icono, estado, visible, destacado, fechas, CTA, precio, descuentos, becas, modalidades, certificación.
- El menú Academia → Internado abre la landing del CMS, no una página fija.

## Fase 3 — Contenido reutilizable y navegación

- Administradores de Docentes, Testimonios, Planes, Cronogramas, FAQ y Contadores dinámicos, reutilizables entre landings.
- Header y Footer editables (agregar, editar, ocultar, mover, duplicar, mega menú, submenús, iconos, insignias).
- Biblioteca de plantillas de sección (Hero 1/2/3, variantes de cards, timeline, comparativas…) para armar landings en minutos.
- Publicación programada.

## Detalles técnicos (Fase 1)

- Tablas nuevas: `cms_pages` (tipo, slug, título, estado, SEO, publicado_en), `cms_blocks` (página, tipo, orden, visible, `props` JSON, estilo JSON) y `cms_page_versions` (instantánea JSON para restaurar). Lectura pública solo de páginas y bloques publicados; escritura solo para administradores, con permisos explícitos por tabla.
- Renderizado: registro de componentes por tipo de bloque en `src/components/cms/blocks/*`, alimentado por los tokens de diseño existentes de `src/styles.css`. Cero colores fijos nuevos.
- La página `/` carga sus bloques en el cargador de la ruta y aplica el SEO guardado; el inicio actual se convierte en la semilla inicial de bloques.
- IA mediante la pasarela de IA de Lovable ya usada en el proyecto (`ai-gateway.server`), en funciones de servidor nuevas: texto por bloque, estructura de página completa e imágenes.
- Reordenamiento con `@dnd-kit` (arrastrar y soltar) dentro del panel de bloques.
- No se toca la arquitectura académica existente (rutas de programas, hospitalización, matrículas, accesos).
