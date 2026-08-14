/**
 * MOTOR UNIVERSAL DE CONTENIDO (Content Builder).
 *
 * Un único motor para toda la plataforma: Academy, Biblioteca Clínica,
 * Pediatría, Neonatología, Ginecología, Cardiología, etc.
 *
 * Reutiliza exactamente las mismas entidades que ya usa
 * "Biblioteca Clínica → Contenido de Pediatría & Neonatología":
 *   `content_nodes`      → jerarquía (root → bloque → categoría → subcategoría → tema → sección)
 *   `content_resources`  → recursos de cada nodo (PDF, video, enlace, nota…)
 *
 * Nada se duplica: los hooks CRUD viven en `@/lib/pednn-cms` y aquí solo se
 * añade lo que faltaba para que el CMS sea un constructor universal:
 *   · gestión de "programas de contenido" (nodos raíz)
 *   · nomenclatura configurable por programa (Bloque/Módulo/Unidad…)
 *   · estados de publicación (borrador, revisión, publicado, oculto, archivado)
 *   · tipos de sección y plantillas de tema
 *   · estadísticas dinámicas
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/lib/session";
import { slugify, type CmsNode, type NodeKind } from "@/lib/pednn-cms";

export type { CmsNode, NodeKind };

/* ------------------------------------------------------------------ niveles */

/** Orden fijo de niveles del motor (los kinds permitidos en base de datos). */
export const LEVEL_ORDER: NodeKind[] = [
  "course",
  "program",
  "area",
  "subarea",
  "chapter",
  "lesson",
];

/** Etiquetas por defecto (nomenclatura clínica). */
export const DEFAULT_LEVEL_LABELS: Record<NodeKind, string> = {
  course: "Programa",
  program: "Bloque",
  area: "Categoría",
  subarea: "Subcategoría",
  chapter: "Tema",
  lesson: "Sección",
};

/** Presets de nomenclatura para distintos tipos de programa. */
export const LEVEL_PRESETS: { id: string; label: string; labels: Partial<Record<NodeKind, string>> }[] = [
  { id: "clinico", label: "Biblioteca clínica", labels: DEFAULT_LEVEL_LABELS },
  {
    id: "academy",
    label: "Academy (curso)",
    labels: { course: "Curso", program: "Módulo", area: "Unidad", subarea: "Capítulo", chapter: "Clase", lesson: "Sección" },
  },
  {
    id: "manual",
    label: "Manual / Guía",
    labels: { course: "Manual", program: "Parte", area: "Capítulo", subarea: "Apartado", chapter: "Tema", lesson: "Sección" },
  },
];

export type LevelLabels = Record<NodeKind, string>;

export function levelLabels(root: ProgramRoot | null | undefined): LevelLabels {
  const custom = (root?.metadata?.levels ?? {}) as Partial<Record<NodeKind, string>>;
  return { ...DEFAULT_LEVEL_LABELS, ...custom };
}

/** ¿El programa usa el nivel de subcategoría? (opcional por programa). */
export function usesSubareas(root: ProgramRoot | null | undefined) {
  return (root?.metadata?.useSubareas ?? true) !== false;
}

/** Siguiente nivel válido según la configuración del programa. */
export function childKindFor(kind: NodeKind, root: ProgramRoot | null | undefined): NodeKind | null {
  const skipSub = !usesSubareas(root);
  switch (kind) {
    case "course":
      return "program";
    case "program":
      return "area";
    case "area":
      return skipSub ? "chapter" : "subarea";
    case "subarea":
      return "chapter";
    case "chapter":
      return "lesson";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ estados */

export type ContentStatus = "draft" | "review" | "published" | "hidden" | "archived";

export const STATUS_META: Record<ContentStatus, { label: string; tone: string }> = {
  draft: { label: "Borrador", tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  review: { label: "En revisión", tone: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  published: { label: "Publicado", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  hidden: { label: "Oculto", tone: "bg-muted text-muted-foreground border-border/60" },
  archived: { label: "Archivado", tone: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
};

/** Estado efectivo de un nodo (compatible con contenido antiguo sin metadata). */
export function nodeStatus(node: { is_published: boolean; metadata?: Record<string, any> }): ContentStatus {
  const raw = node.metadata?.status as ContentStatus | undefined;
  if (raw && raw in STATUS_META) return raw;
  return node.is_published ? "published" : "draft";
}

/** Patch coherente para cambiar de estado (mantiene `is_published` sincronizado). */
export function statusPatch(node: CmsNode, status: ContentStatus) {
  return {
    is_published: status === "published",
    metadata: { ...(node.metadata ?? {}), status },
  };
}

export type VisibilityLevel = "public" | "registered" | "premium" | "admin";

export const VISIBILITY_META: Record<VisibilityLevel, string> = {
  public: "Todos (público)",
  registered: "Usuarios registrados",
  premium: "Premium / matriculados",
  admin: "Solo administradores",
};

/* -------------------------------------------------- tipos de sección y plantillas */

export type SectionType =
  | "text"
  | "summary"
  | "definition"
  | "list"
  | "table"
  | "algorithm"
  | "image"
  | "gallery"
  | "video"
  | "audio"
  | "pdf"
  | "link"
  | "case"
  | "flashcards"
  | "questions"
  | "quiz"
  | "pearl"
  | "alert"
  | "note"
  | "reference"
  | "calculator"
  | "interactive";

export const SECTION_TYPES: { id: SectionType; label: string; group: string }[] = [
  { id: "text", label: "Texto enriquecido", group: "Contenido" },
  { id: "summary", label: "Resumen", group: "Contenido" },
  { id: "definition", label: "Definición", group: "Contenido" },
  { id: "list", label: "Lista", group: "Contenido" },
  { id: "table", label: "Tabla", group: "Estructura" },
  { id: "algorithm", label: "Algoritmo / flujograma", group: "Estructura" },
  { id: "image", label: "Imagen", group: "Multimedia" },
  { id: "gallery", label: "Galería", group: "Multimedia" },
  { id: "video", label: "Video", group: "Multimedia" },
  { id: "audio", label: "Audio", group: "Multimedia" },
  { id: "pdf", label: "PDF", group: "Multimedia" },
  { id: "link", label: "Enlace", group: "Multimedia" },
  { id: "case", label: "Caso clínico", group: "Clínico" },
  { id: "flashcards", label: "Flashcards", group: "Clínico" },
  { id: "questions", label: "Banco de preguntas", group: "Clínico" },
  { id: "quiz", label: "Quiz", group: "Clínico" },
  { id: "pearl", label: "Perla clínica", group: "Clínico" },
  { id: "alert", label: "Alerta", group: "Avisos" },
  { id: "note", label: "Nota", group: "Avisos" },
  { id: "reference", label: "Referencia bibliográfica", group: "Avisos" },
  { id: "calculator", label: "Calculadora", group: "Herramientas" },
  { id: "interactive", label: "Recurso interactivo", group: "Herramientas" },
];

export function sectionTypeLabel(id: string | undefined) {
  return SECTION_TYPES.find((s) => s.id === id)?.label ?? "Texto enriquecido";
}

/** Tipos de sección habilitados para un programa (si no se configura: todos). */
export function allowedSectionTypes(root: ProgramRoot | null | undefined): SectionType[] {
  const list = root?.metadata?.sectionTypes as SectionType[] | undefined;
  if (!Array.isArray(list) || list.length === 0) return SECTION_TYPES.map((s) => s.id);
  return list;
}

export type ContentTemplate = { id: string; label: string; sections: { title: string; type: SectionType }[] };

export const TEMPLATES: ContentTemplate[] = [
  {
    id: "tema-medico",
    label: "Tema médico completo",
    sections: [
      { title: "Resumen", type: "summary" },
      { title: "Objetivos", type: "list" },
      { title: "Definición", type: "definition" },
      { title: "Epidemiología", type: "text" },
      { title: "Etiología", type: "text" },
      { title: "Fisiopatología", type: "text" },
      { title: "Clínica", type: "list" },
      { title: "Diagnóstico", type: "text" },
      { title: "Diagnóstico diferencial", type: "table" },
      { title: "Tratamiento", type: "table" },
      { title: "Algoritmo", type: "algorithm" },
      { title: "Caso clínico", type: "case" },
      { title: "Perlas clínicas", type: "pearl" },
      { title: "Errores frecuentes", type: "alert" },
      { title: "Flashcards", type: "flashcards" },
      { title: "Preguntas", type: "questions" },
      { title: "Referencias", type: "reference" },
    ],
  },
  {
    id: "caso-clinico",
    label: "Caso clínico",
    sections: [
      { title: "Presentación", type: "case" },
      { title: "Antecedentes", type: "text" },
      { title: "Examen físico", type: "list" },
      { title: "Laboratorio", type: "table" },
      { title: "Imágenes", type: "gallery" },
      { title: "Preguntas", type: "questions" },
      { title: "Discusión", type: "text" },
      { title: "Perlas", type: "pearl" },
    ],
  },
  {
    id: "clase",
    label: "Clase / sesión",
    sections: [
      { title: "Objetivos", type: "list" },
      { title: "Introducción", type: "text" },
      { title: "Contenido", type: "text" },
      { title: "Video", type: "video" },
      { title: "Resumen", type: "summary" },
      { title: "Preguntas", type: "quiz" },
      { title: "Recursos", type: "pdf" },
    ],
  },
];

/* ------------------------------------------------------- programas (nodos raíz) */

export type ProgramRoot = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  metadata: Record<string, any>;
};

const ROOT_SELECT = "id,title,slug,description,sort_order,is_published,metadata";

/** Todos los programas de contenido (nodos raíz de `content_nodes`). */
export function useProgramRoots() {
  return useQuery({
    queryKey: ["content-builder", "roots"],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select(ROOT_SELECT)
        .is("parent_id", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as ProgramRoot[]).map((r) => ({
        ...r,
        metadata: (r.metadata ?? {}) as Record<string, any>,
      }));
    },
  });
}

export type ProgramForm = {
  title: string;
  description?: string;
  slug?: string;
  icon?: string;
  image?: string;
  color?: string;
  route?: string;
  kindLabelPreset?: string;
  levels?: Partial<Record<NodeKind, string>>;
  useSubareas?: boolean;
  sectionTypes?: SectionType[];
  visibility?: VisibilityLevel;
  status?: ContentStatus;
  sort_order?: number;
};

/** CRUD de programas de contenido: crear, editar, duplicar y eliminar. */
export function useProgramRootMutations() {
  const user = useSupabaseUser();
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["content-builder"] });
    qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
  }, [qc]);

  const create = useMutation({
    mutationFn: async (form: ProgramForm) => {
      const slug = slugify(form.slug || form.title);
      const status = form.status ?? "published";
      const { data, error } = await supabase
        .from("content_nodes")
        .insert({
          parent_id: null,
          kind: "course",
          title: form.title,
          slug,
          description: form.description ?? null,
          sort_order: form.sort_order ?? 0,
          is_published: status === "published",
          metadata: {
            status,
            icon: form.icon ?? null,
            image: form.image ?? null,
            color: form.color ?? null,
            route: form.route ?? null,
            levels: form.levels ?? {},
            useSubareas: form.useSubareas ?? true,
            sectionTypes: form.sectionTypes ?? [],
            visibility: form.visibility ?? "premium",
            builder: true,
          } as never,
          created_by: user?.id ?? null,
        })
        .select(ROOT_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as ProgramRoot;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("content_nodes")
        .update(input.patch as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Copia profunda del programa completo (nuevos IDs, sin referencias cruzadas). */
  const duplicate = useMutation({
    mutationFn: async (root: ProgramRoot) => {
      const { data: created, error } = await supabase
        .from("content_nodes")
        .insert({
          parent_id: null,
          kind: "course",
          title: `${root.title} (copia)`,
          slug: `${slugify(root.slug)}-${Math.random().toString(36).slice(2, 6)}`,
          description: root.description,
          sort_order: root.sort_order + 1,
          is_published: false,
          metadata: { ...root.metadata, status: "draft" } as never,
          created_by: user?.id ?? null,
        })
        .select(ROOT_SELECT)
        .single();
      if (error) throw error;

      // Copia recursiva de descendientes por niveles.
      const cloneChildren = async (sourceId: string, targetId: string, depth: number) => {
        if (depth > 5) return;
        const { data: kids, error: kidsErr } = await supabase
          .from("content_nodes")
          .select("id,kind,title,slug,description,sort_order,is_published,metadata")
          .eq("parent_id", sourceId)
          .order("sort_order", { ascending: true });
        if (kidsErr) throw kidsErr;
        for (const kid of (kids ?? []) as any[]) {
          const { data: copy, error: copyErr } = await supabase
            .from("content_nodes")
            .insert({
              parent_id: targetId,
              kind: kid.kind,
              title: kid.title,
              slug: `${slugify(kid.slug)}-${Math.random().toString(36).slice(2, 6)}`,
              description: kid.description,
              sort_order: kid.sort_order,
              is_published: kid.is_published,
              metadata: kid.metadata ?? {},
              created_by: user?.id ?? null,
            })
            .select("id")
            .single();
          if (copyErr) throw copyErr;
          await cloneChildren(kid.id, (copy as any).id, depth + 1);
        }
      };
      await cloneChildren(root.id, (created as any).id, 0);
      return created as unknown as ProgramRoot;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, duplicate, invalidate };
}

/* --------------------------------------------------------------- estadísticas */

export type BuilderStats = {
  blocks: number;
  categories: number;
  subcategories: number;
  topics: number;
  sections: number;
};

export function computeStats(nodes: CmsNode[]): BuilderStats {
  const stats: BuilderStats = { blocks: 0, categories: 0, subcategories: 0, topics: 0, sections: 0 };
  const walk = (list: CmsNode[]) => {
    for (const n of list) {
      if (n.kind === "program") stats.blocks++;
      if (n.kind === "area") stats.categories++;
      if (n.kind === "subarea") stats.subcategories++;
      if (n.kind === "chapter") stats.topics++;
      if (n.kind === "lesson") stats.sections++;
      walk(n.children);
    }
  };
  walk(nodes);
  return stats;
}

/** Nº total de recursos de un conjunto de nodos (consulta agregada y barata). */
export function useResourceCount(nodeIds: string[]) {
  return useQuery({
    queryKey: ["content-builder", "resource-count", nodeIds.length, nodeIds.slice(0, 40).join(",")],
    enabled: nodeIds.length > 0,
    staleTime: 20_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("content_resources")
        .select("id", { count: "exact", head: true })
        .in("node_id", nodeIds.slice(0, 500));
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Ruta pública sugerida (slugs reales, sin hardcode). */
export function nodePath(root: ProgramRoot | null, chain: CmsNode[]) {
  const base = (root?.metadata?.route as string) || `/${root?.slug ?? ""}`;
  return [base.replace(/\/+$/, ""), ...chain.map((n) => n.slug)].join("/");
}

/** Aplana el árbol con su cadena de ancestros (para búsqueda universal). */
export function flattenTree(nodes: CmsNode[], chain: CmsNode[] = []): { node: CmsNode; chain: CmsNode[] }[] {
  const out: { node: CmsNode; chain: CmsNode[] }[] = [];
  for (const n of nodes) {
    out.push({ node: n, chain });
    out.push(...flattenTree(n.children, [...chain, n]));
  }
  return out;
}
