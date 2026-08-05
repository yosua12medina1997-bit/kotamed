/**
 * KotaMed · Academic CMS.
 * Motor de contenido académico jerárquico ILIMITADO para los módulos
 * "Casos clínicos" y "Docencia". Todo (niveles, campos, secciones, recursos,
 * relaciones, versiones y permisos) se administra desde la interfaz y persiste
 * en `academy_cms_nodes`, `academy_cms_fields` y `academy_cms_versions`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const cdb = supabase as any;

export type CmsModule = "casos" | "docencia";

export const DEFAULT_CMS_SCOPE = "internado-medico-hospitalizacion:neonatologia";

export interface CmsResource {
  kind: string;
  title: string;
  url?: string;
  note?: string;
}

export interface CmsNodeData {
  /** Contenido por sección (clave de sección → markdown). */
  sections?: Record<string, string>;
  /** Campos personalizados creados por el administrador. */
  custom?: Record<string, any>;
  /** Recursos adjuntos (PDF, video, guía, protocolo, calculadora…). */
  resources?: CmsResource[];
  /** Relaciones inteligentes con otros nodos del CMS. */
  relations?: string[];
  /** Prerrequisitos (ids de nodos). */
  prereqs?: string[];
  /** Metadatos libres (docente, duración, nivel, competencias…). */
  meta?: Record<string, string>;
}

export interface CmsNode {
  id: string;
  module: CmsModule;
  scope: string;
  parent_id: string | null;
  level_kind: string;
  case_type: string | null;
  title: string;
  subtitle: string | null;
  body: string | null;
  data: CmsNodeData;
  tags: string[];
  sort_order: number;
  is_published: boolean;
  hidden: boolean;
  publish_at: string | null;
  close_at: string | null;
  version: number;
  roles: string[];
  created_at: string;
  updated_at: string;
}

export type CmsFieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "url"
  | "file"
  | "video"
  | "code"
  | "html"
  | "embed"
  | "table"
  | "relation";

export interface CmsField {
  id: string;
  module: CmsModule;
  scope: string;
  key: string;
  label: string;
  type: CmsFieldType;
  options: string[];
  applies_to: string[];
  sort_order: number;
}

export const CMS_FIELD_TYPES: { value: CmsFieldType; label: string }[] = [
  { value: "text", label: "Texto corto" },
  { value: "textarea", label: "Texto largo" },
  { value: "markdown", label: "Markdown" },
  { value: "number", label: "Número" },
  { value: "date", label: "Calendario" },
  { value: "select", label: "Lista (select)" },
  { value: "multiselect", label: "Selección múltiple" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "Enlace" },
  { value: "file", label: "Archivo" },
  { value: "video", label: "Video" },
  { value: "code", label: "Código" },
  { value: "html", label: "Editor HTML" },
  { value: "embed", label: "Embed (Canva, YouTube…)" },
  { value: "table", label: "Tabla" },
  { value: "relation", label: "Relación" },
];

/* ================================================================== */
/*  NIVELES JERÁRQUICOS (ilimitados y editables)                        */
/* ================================================================== */

export const CASOS_LEVELS = [
  "especialidad",
  "servicio",
  "area",
  "subarea",
  "patologia",
  "complejidad",
  "caso",
  "discusion",
  "bibliografia",
  "recurso",
  "evaluacion",
];

export const DOCENCIA_LEVELS = [
  "especialidad",
  "programa",
  "curso",
  "modulo",
  "unidad",
  "tema",
  "subtema",
  "capitulo",
  "clase",
  "leccion",
  "actividad",
  "evaluacion",
  "material",
  "bibliografia",
];

export function levelsFor(module: CmsModule) {
  return module === "casos" ? CASOS_LEVELS : DOCENCIA_LEVELS;
}

/** Nivel sugerido para el hijo de un nodo (el siguiente de la lista). */
export function nextLevel(module: CmsModule, parentLevel?: string | null) {
  const levels = levelsFor(module);
  if (!parentLevel) return levels[0]!;
  const i = levels.indexOf(parentLevel);
  return i < 0 || i === levels.length - 1 ? levels[Math.min(i + 1, levels.length - 1)] ?? parentLevel : levels[i + 1]!;
}

export const CASE_TYPES = [
  "Caso básico",
  "Caso intermedio",
  "Caso avanzado",
  "Caso crítico",
  "Caso interactivo",
  "Caso cronometrado",
  "Caso OSCE",
  "Caso ENAM",
  "Caso Residentado",
  "Caso con IA",
  "Caso con imágenes",
  "Caso con videos",
  "Caso con ECG",
  "Caso con ecografía",
  "Caso radiológico",
  "Caso gamificado",
];

/* ================================================================== */
/*  SECCIONES DE CONTENIDO                                             */
/* ================================================================== */

export const CASE_SECTIONS: { key: string; label: string }[] = [
  { key: "historia", label: "Historia clínica" },
  { key: "anamnesis", label: "Anamnesis" },
  { key: "antecedentes", label: "Antecedentes" },
  { key: "examen", label: "Examen físico" },
  { key: "laboratorios", label: "Laboratorios" },
  { key: "imagenes", label: "Imágenes" },
  { key: "diagnosticos", label: "Diagnósticos" },
  { key: "diferencial", label: "Diagnóstico diferencial" },
  { key: "tratamiento", label: "Tratamiento" },
  { key: "evolucion", label: "Evolución" },
  { key: "complicaciones", label: "Complicaciones" },
  { key: "discusion", label: "Discusión" },
  { key: "bibliografia", label: "Bibliografía" },
  { key: "referencias", label: "Referencias" },
  { key: "perlas", label: "Perlas clínicas" },
  { key: "errores", label: "Errores frecuentes" },
  { key: "enam", label: "Preguntas ENAM" },
  { key: "residentado", label: "Preguntas Residentado" },
  { key: "flashcards", label: "Flashcards" },
  { key: "resumen", label: "Resumen" },
  { key: "conclusiones", label: "Conclusiones" },
  { key: "protocolos", label: "Protocolos y guías" },
  { key: "calculadoras", label: "Calculadoras relacionadas" },
  { key: "notas", label: "Notas del docente" },
];

export const CLASS_SECTIONS: { key: string; label: string }[] = [
  { key: "descripcion", label: "Descripción" },
  { key: "objetivos", label: "Objetivos" },
  { key: "competencias", label: "Competencias" },
  { key: "resultados", label: "Resultados de aprendizaje" },
  { key: "contenido", label: "Contenido de la clase" },
  { key: "diagramas", label: "Diagramas y algoritmos" },
  { key: "mapas", label: "Mapas conceptuales" },
  { key: "actividades", label: "Actividades y simulaciones" },
  { key: "evaluacion", label: "Evaluación" },
  { key: "flashcards", label: "Flashcards" },
  { key: "banco", label: "Banco de preguntas" },
  { key: "feedback", label: "Retroalimentación" },
  { key: "bibliografia", label: "Bibliografía" },
  { key: "recursos", label: "Recursos y biblioteca" },
  { key: "notas", label: "Notas del docente" },
];

export function sectionsFor(module: CmsModule) {
  return module === "casos" ? CASE_SECTIONS : CLASS_SECTIONS;
}

export const RESOURCE_KINDS = [
  "PDF",
  "Video",
  "YouTube",
  "PowerPoint",
  "Word",
  "Excel",
  "Canva",
  "Audio / Podcast",
  "Modelo 3D",
  "Infografía",
  "Guía clínica",
  "Protocolo",
  "Artículo / PubMed",
  "Norma MINSA",
  "OMS",
  "AAP",
  "Calculadora",
  "Enlace",
];

export const CMS_ROLES = [
  "admin",
  "docente",
  "editor",
  "residente",
  "interno",
  "alumno",
  "invitado",
];

/* ================================================================== */
/*  HOOKS                                                              */
/* ================================================================== */

const key = (module: string, scope: string) => ["academy-cms", module, scope];

export function useCmsNodes(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  return useQuery({
    queryKey: key(module, scope),
    queryFn: async (): Promise<CmsNode[]> => {
      const { data, error } = await cdb
        .from("academy_cms_nodes")
        .select("*")
        .eq("module", module)
        .eq("scope", scope)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((n) => ({
        ...n,
        data: (n.data ?? {}) as CmsNodeData,
        tags: n.tags ?? [],
        roles: n.roles ?? [],
      })) as CmsNode[];
    },
  });
}

export function useSaveCmsNode(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (node: Partial<CmsNode> & { id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (node.id) {
        const { data: prev } = await cdb
          .from("academy_cms_nodes")
          .select("*")
          .eq("id", node.id)
          .maybeSingle();
        const version = (prev?.version ?? 1) + 1;
        const { error } = await cdb
          .from("academy_cms_nodes")
          .update({ ...node, module, scope, version })
          .eq("id", node.id);
        if (error) throw error;
        // Versionado: guarda una instantánea del estado anterior.
        if (prev) {
          await cdb.from("academy_cms_versions").insert({
            node_id: node.id,
            version: prev.version ?? 1,
            snapshot: prev,
            created_by: uid,
          });
        }
        return node.id;
      }
      const { data, error } = await cdb
        .from("academy_cms_nodes")
        .insert({ ...node, module, scope, created_by: uid })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(module, scope) }),
  });
}

export function useDeleteCmsNode(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await cdb.from("academy_cms_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(module, scope) }),
  });
}

/** Duplica un nodo con toda su descendencia. */
export function useDuplicateCmsNode(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ node, all }: { node: CmsNode; all: CmsNode[] }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      const clone = async (src: CmsNode, parent: string | null, suffix: string) => {
        const { data, error } = await cdb
          .from("academy_cms_nodes")
          .insert({
            module,
            scope,
            parent_id: parent,
            level_kind: src.level_kind,
            case_type: src.case_type,
            title: `${src.title}${suffix}`,
            subtitle: src.subtitle,
            body: src.body,
            data: src.data,
            tags: src.tags,
            sort_order: src.sort_order + 1,
            is_published: src.is_published,
            hidden: src.hidden,
            roles: src.roles,
            created_by: uid,
          })
          .select("id")
          .maybeSingle();
        if (error) throw error;
        const newId = data?.id as string;
        const children = all.filter((n) => n.parent_id === src.id);
        for (const child of children) await clone(child, newId, "");
        return newId;
      };
      return clone(node, node.parent_id, " (copia)");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(module, scope) }),
  });
}

export function useCmsFields(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  return useQuery({
    queryKey: ["academy-cms-fields", module, scope],
    queryFn: async (): Promise<CmsField[]> => {
      const { data, error } = await cdb
        .from("academy_cms_fields")
        .select("*")
        .eq("module", module)
        .eq("scope", scope)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((f) => ({
        ...f,
        options: Array.isArray(f.options) ? f.options : [],
        applies_to: f.applies_to ?? [],
      })) as CmsField[];
    },
  });
}

export function useSaveCmsField(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (field: Partial<CmsField> & { id?: string }) => {
      const payload = { ...field, module, scope };
      const { error } = field.id
        ? await cdb.from("academy_cms_fields").update(payload).eq("id", field.id)
        : await cdb.from("academy_cms_fields").insert(payload);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-cms-fields", module, scope] }),
  });
}

export function useDeleteCmsField(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await cdb.from("academy_cms_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["academy-cms-fields", module, scope] }),
  });
}

export function useCmsVersions(nodeId: string | null) {
  return useQuery({
    queryKey: ["academy-cms-versions", nodeId],
    enabled: !!nodeId,
    queryFn: async () => {
      const { data, error } = await cdb
        .from("academy_cms_versions")
        .select("id,version,created_at,note")
        .eq("node_id", nodeId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; version: number; created_at: string; note: string | null }[];
    },
  });
}

/* ================================================================== */
/*  UTILIDADES                                                         */
/* ================================================================== */

export function childrenOf(nodes: CmsNode[], parent: string | null) {
  return nodes
    .filter((n) => n.parent_id === parent)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

export function pathOf(nodes: CmsNode[], id: string | null): CmsNode[] {
  const out: CmsNode[] = [];
  let cur = nodes.find((n) => n.id === id);
  let guard = 0;
  while (cur && guard++ < 50) {
    out.unshift(cur);
    cur = cur.parent_id ? nodes.find((n) => n.id === cur!.parent_id) : undefined;
  }
  return out;
}

export function countDescendants(nodes: CmsNode[], id: string): number {
  const kids = nodes.filter((n) => n.parent_id === id);
  return kids.reduce((acc, k) => acc + 1 + countDescendants(nodes, k.id), 0);
}

/** Búsqueda global: título, subtítulo, etiquetas, secciones y recursos. */
export function searchNodes(nodes: CmsNode[], term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  return nodes.filter((n) => {
    const hay = [
      n.title,
      n.subtitle ?? "",
      n.level_kind,
      n.case_type ?? "",
      n.tags.join(" "),
      n.body ?? "",
      Object.values(n.data.sections ?? {}).join(" "),
      Object.values(n.data.custom ?? {}).map(String).join(" "),
      (n.data.resources ?? []).map((r) => `${r.kind} ${r.title} ${r.url ?? ""}`).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export const LEVEL_LABEL: Record<string, string> = {
  especialidad: "Especialidad",
  servicio: "Servicio",
  area: "Área",
  subarea: "Subárea",
  patologia: "Patología",
  complejidad: "Complejidad",
  caso: "Caso clínico",
  discusion: "Discusión",
  bibliografia: "Bibliografía",
  recurso: "Recurso",
  programa: "Programa",
  curso: "Curso",
  modulo: "Módulo",
  unidad: "Unidad",
  tema: "Tema",
  subtema: "Subtema",
  capitulo: "Capítulo",
  clase: "Clase",
  leccion: "Lección",
  actividad: "Actividad",
  evaluacion: "Evaluación",
  material: "Material",
};

export function levelLabel(kind: string) {
  return LEVEL_LABEL[kind] ?? kind;
}

/* ================================================================== */
/*  ESTRUCTURA INICIAL SUGERIDA                                        */
/* ================================================================== */

type SeedNode = { title: string; level: string; children?: SeedNode[]; caseType?: string };

const CASOS_SEED: SeedNode[] = [
  {
    title: "Neonatología",
    level: "especialidad",
    children: [
      {
        title: "Hospitalización",
        level: "servicio",
        children: [
          {
            title: "Prematuridad",
            level: "area",
            children: [
              {
                title: "Síndrome de distrés respiratorio (SDR)",
                level: "patologia",
                children: [
                  {
                    title: "Prematuro extremo",
                    level: "complejidad",
                    children: [
                      { title: "Caso Clínico 001", level: "caso", caseType: "Caso avanzado" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const DOCENCIA_SEED: SeedNode[] = [
  {
    title: "Pediatría",
    level: "especialidad",
    children: [
      {
        title: "Neonatología",
        level: "programa",
        children: [
          {
            title: "Hospitalización Neonatal",
            level: "curso",
            children: [
              {
                title: "Prematuridad",
                level: "modulo",
                children: [
                  {
                    title: "Adaptación neonatal",
                    level: "unidad",
                    children: [
                      {
                        title: "Fisiología",
                        level: "tema",
                        children: [{ title: "Clase 01", level: "clase" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function useSeedCms(module: CmsModule, scope = DEFAULT_CMS_SCOPE) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      const seed = module === "casos" ? CASOS_SEED : DOCENCIA_SEED;
      const insert = async (list: SeedNode[], parent: string | null) => {
        let i = 0;
        for (const item of list) {
          const { data, error } = await cdb
            .from("academy_cms_nodes")
            .insert({
              module,
              scope,
              parent_id: parent,
              level_kind: item.level,
              case_type: item.caseType ?? null,
              title: item.title,
              sort_order: i++,
              created_by: uid,
            })
            .select("id")
            .maybeSingle();
          if (error) throw error;
          if (item.children?.length) await insert(item.children, data?.id as string);
        }
      };
      await insert(seed, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(module, scope) }),
  });
}
