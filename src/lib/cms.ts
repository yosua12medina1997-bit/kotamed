/**
 * CMS KotaMed — núcleo de datos.
 * Páginas construidas por bloques reutilizables, editables desde CMS Studio.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------- Tipos ---------------------------- */

export type CmsPageKind =
  | "page"
  | "program"
  | "course"
  | "specialty"
  | "landing"
  | "library"
  | "event"
  | "diploma"
  | "manual"
  | "simulator"
  | "research"
  | "news"
  | "blog";

export type CmsSeo = {
  title?: string;
  description?: string;
  ogImage?: string;
  keywords?: string;
  canonical?: string;
  index?: boolean;
};

export type CmsPage = {
  id: string;
  kind: CmsPageKind;
  slug: string;
  title: string;
  subtitle: string | null;
  status: "draft" | "published";
  seo: CmsSeo;
  theme: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sort_order: number;
  published_at: string | null;
  updated_at: string;
};

export type CmsItem = {
  title?: string;
  subtitle?: string;
  text?: string;
  value?: string;
  label?: string;
  image?: string;
  icon?: string;
  href?: string;
  badge?: string;
  price?: string;
  rating?: string;
  features?: string[];
};

export type CmsBlockStyle = {
  align?: "left" | "center" | "right";
  paddingY?: "sm" | "md" | "lg" | "xl";
  tone?: "plain" | "muted" | "gradient" | "accent";
  columns?: 2 | 3 | 4;
  animate?: boolean;
};

export type CmsBlockProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  video?: string;
  videoKind?: "youtube" | "vimeo" | "mp4" | "upload";
  poster?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  items?: CmsItem[];
  /** Colección reutilizable de la que se alimentan los elementos del bloque. */
  collection?: string;
  html?: string;
};

export type CmsBlock = {
  id: string;
  page_id: string;
  type: CmsBlockType;
  name: string | null;
  sort_order: number;
  visible: boolean;
  props: CmsBlockProps;
  style: CmsBlockStyle;
};

export type CmsBlockType =
  | "hero"
  | "banner"
  | "video"
  | "counters"
  | "benefits"
  | "features"
  | "cta"
  | "courses"
  | "teachers"
  | "testimonials"
  | "gallery"
  | "timeline"
  | "plans"
  | "cases"
  | "faq"
  | "accordion"
  | "table"
  | "infographic"
  | "carousel"
  | "richtext";

export type CmsVersion = {
  id: string;
  page_id: string;
  version: number;
  note: string | null;
  created_at: string;
  snapshot: { page: Partial<CmsPage>; blocks: Partial<CmsBlock>[] };
};

/* --------------------------- Catálogo de bloques ------------------- */

export const BLOCK_GROUPS: { group: string; types: CmsBlockType[] }[] = [
  { group: "Héroe y secciones", types: ["hero", "banner", "video", "counters", "benefits", "features", "cta"] },
  {
    group: "Contenido",
    types: [
      "courses",
      "teachers",
      "testimonials",
      "gallery",
      "timeline",
      "plans",
      "cases",
      "faq",
      "accordion",
      "table",
      "infographic",
      "carousel",
      "richtext",
    ],
  },
];

export const BLOCK_LABEL: Record<CmsBlockType, string> = {
  hero: "Hero",
  banner: "Banner",
  video: "Video",
  counters: "Contadores",
  benefits: "Beneficios",
  features: "Características",
  cta: "Llamada a la acción",
  courses: "Cursos",
  teachers: "Docentes",
  testimonials: "Testimonios",
  gallery: "Galería",
  timeline: "Cronograma",
  plans: "Planes",
  cases: "Casos clínicos",
  faq: "Preguntas frecuentes",
  accordion: "Acordeón",
  table: "Tabla",
  infographic: "Infografía",
  carousel: "Carrusel",
  richtext: "Texto enriquecido",
};

/** Bloques cuyo contenido principal es una lista de elementos. */
export const LIST_BLOCKS: CmsBlockType[] = [
  "counters",
  "benefits",
  "features",
  "courses",
  "teachers",
  "testimonials",
  "gallery",
  "timeline",
  "plans",
  "cases",
  "faq",
  "accordion",
  "table",
  "infographic",
  "carousel",
];

export function defaultBlock(type: CmsBlockType): { props: CmsBlockProps; style: CmsBlockStyle } {
  const style: CmsBlockStyle = { align: "center", paddingY: "lg", tone: "plain", columns: 3, animate: true };
  const item = (n: number): CmsItem => ({ title: `Elemento ${n}`, text: "Describe este elemento." });
  switch (type) {
    case "hero":
      return {
        props: {
          eyebrow: "Programa",
          title: "Título principal del programa",
          subtitle: "Subtítulo con la promesa académica de KotaMed.",
          primaryLabel: "Ver planes e inscribirme",
          primaryHref: "/programas",
          secondaryLabel: "Programa completo",
          secondaryHref: "#contenido",
          items: [
            { title: "Metodología propia", icon: "Layers" },
            { title: "Docentes especialistas", icon: "Users" },
            { title: "IA KotaMed", icon: "Sparkles" },
            { title: "Acompañamiento 24/7", icon: "ShieldCheck" },
          ],
        },
        style: { ...style, align: "left", paddingY: "xl" },
      };
    case "counters":
      return {
        props: {
          title: "KotaMed en números",
          items: [
            { value: "+26 000", label: "Médicos formados" },
            { value: "40/46", label: "Especialidades" },
            { value: "+20", label: "Docentes expertos" },
            { value: "90%", label: "Logró su especialidad" },
          ],
        },
        style: { ...style, columns: 4 },
      };
    case "video":
      return {
        props: { title: "Video institucional", videoKind: "youtube", video: "" },
        style,
      };
    case "faq":
      return {
        props: {
          title: "Preguntas frecuentes",
          items: [{ title: "¿Cómo me inscribo?", text: "Explica el proceso de inscripción." }],
        },
        style: { ...style, align: "left", columns: 2 },
      };
    case "cta":
      return {
        props: {
          title: "Da el siguiente paso en tu formación médica",
          subtitle: "Únete a la comunidad KotaMed.",
          primaryLabel: "Comenzar ahora",
          primaryHref: "/auth",
        },
        style: { ...style, tone: "gradient" },
      };
    case "richtext":
      return { props: { title: "Sección", description: "Escribe el contenido de esta sección." }, style };
    default:
      return {
        props: {
          title: BLOCK_LABEL[type],
          subtitle: "Describe brevemente esta sección.",
          items: [item(1), item(2), item(3)],
        },
        style,
      };
  }
}

/* ------------------------------ Consultas -------------------------- */

const PAGE_COLS =
  "id, kind, slug, title, subtitle, status, seo, theme, metadata, sort_order, published_at, updated_at";
const BLOCK_COLS = "id, page_id, type, name, sort_order, visible, props, style";

export function useCmsPages() {
  return useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select(PAGE_COLS)
        .order("kind")
        .order("sort_order")
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as CmsPage[];
    },
  });
}

export function useCmsPage(slug: string | null) {
  return useQuery({
    queryKey: ["cms-page", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select(PAGE_COLS)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as CmsPage | null;
    },
  });
}

export function useCmsBlocks(pageId: string | null) {
  return useQuery({
    queryKey: ["cms-blocks", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_blocks")
        .select(BLOCK_COLS)
        .eq("page_id", pageId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as CmsBlock[];
    },
  });
}

/** Página pública + bloques visibles, en una sola consulta. */
/** Páginas informativas publicadas (para enlazarlas desde la web pública). */
export function usePublicCmsPages() {
  return useQuery({
    queryKey: ["cms-public-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select(PAGE_COLS)
        .eq("status", "published")
        .neq("slug", "home")
        .order("kind")
        .order("sort_order")
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as CmsPage[];
    },
  });
}

export function usePublicCmsPage(slug: string) {
  return useQuery({
    queryKey: ["cms-public", slug],
    queryFn: async () => {
      const { data: page, error } = await supabase
        .from("cms_pages")
        .select(PAGE_COLS)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!page) return null;
      const { data: blocks, error: e2 } = await supabase
        .from("cms_blocks")
        .select(BLOCK_COLS)
        .eq("page_id", (page as { id: string }).id)
        .eq("visible", true)
        .order("sort_order");
      if (e2) throw e2;
      return {
        page: page as unknown as CmsPage,
        blocks: (blocks ?? []) as unknown as CmsBlock[],
      };
    },
  });
}

/* ------------------------------ Mutaciones ------------------------- */

export function useSaveCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsPage> & { id?: string }) => {
      const payload: Record<string, unknown> = { ...patch };
      if (patch.id) {
        const { error } = await supabase.from("cms_pages").update(payload as never).eq("id", patch.id);
        if (error) throw error;
        return patch.id;
      }
      const { data, error } = await supabase
        .from("cms_pages")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

export function useDeleteCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

export function useSaveCmsBlock(pageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsBlock> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase.from("cms_blocks").update(rest as never).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("cms_blocks")
        .insert({ ...patch, page_id: pageId } as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

export function useDeleteCmsBlock(pageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

/** Guarda el orden completo de los bloques (drag & drop). */
export function useReorderCmsBlocks(pageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase.from("cms_blocks").update({ sort_order: i }).eq("id", ids[i]!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

/** Inserta varios bloques de golpe (Studio AI / plantillas). */
export function useBulkInsertBlocks(pageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: { type: CmsBlockType; props: CmsBlockProps; style: CmsBlockStyle }[]) => {
      if (!pageId) throw new Error("Selecciona una página primero.");
      const { count } = await supabase
        .from("cms_blocks")
        .select("id", { count: "exact", head: true })
        .eq("page_id", pageId);
      const base = count ?? 0;
      const rows = blocks.map((b, i) => ({ ...b, page_id: pageId, sort_order: base + i }));
      const { error } = await supabase.from("cms_blocks").insert(rows as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

/* ------------------------------ Versiones -------------------------- */

export function useCmsVersions(pageId: string | null) {
  return useQuery({
    queryKey: ["cms-versions", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_page_versions")
        .select("id, page_id, version, note, created_at, snapshot")
        .eq("page_id", pageId!)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as unknown as CmsVersion[];
    },
  });
}

export function useSnapshotPage(pageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string) => {
      if (!pageId) throw new Error("Sin página.");
      const [{ data: page }, { data: blocks }, { count }] = await Promise.all([
        supabase.from("cms_pages").select(PAGE_COLS).eq("id", pageId).single(),
        supabase.from("cms_blocks").select(BLOCK_COLS).eq("page_id", pageId).order("sort_order"),
        supabase.from("cms_page_versions").select("id", { count: "exact", head: true }).eq("page_id", pageId),
      ]);
      const { error } = await supabase.from("cms_page_versions").insert({
        page_id: pageId,
        version: (count ?? 0) + 1,
        note: note ?? null,
        snapshot: { page, blocks: blocks ?? [] },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-versions", pageId] }),
  });
}

export function useRestoreVersion(pageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (version: CmsVersion) => {
      if (!pageId) throw new Error("Sin página.");
      const snap = version.snapshot;
      if (snap.page) {
        const { id: _id, updated_at: _u, ...rest } = snap.page as Record<string, unknown> & { id?: string };
        const { error } = await supabase.from("cms_pages").update(rest as never).eq("id", pageId);
        if (error) throw error;
      }
      await supabase.from("cms_blocks").delete().eq("page_id", pageId);
      const rows = (snap.blocks ?? []).map((b, i) => ({
        page_id: pageId,
        type: b.type,
        name: b.name ?? null,
        sort_order: b.sort_order ?? i,
        visible: b.visible ?? true,
        props: b.props ?? {},
        style: b.style ?? {},
      }));
      if (rows.length) {
        const { error } = await supabase.from("cms_blocks").insert(rows as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-blocks", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}

/* ------------------------------- Medios ---------------------------- */

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Sube un archivo al almacén del CMS y devuelve un enlace firmado de larga duración. */
export async function uploadCmsMedia(file: File | Blob, filename: string) {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${clean}`;
  const { error } = await supabase.storage.from("cms").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("cms").createSignedUrl(path, TEN_YEARS);
  if (e2) throw e2;
  return data.signedUrl;
}

export function embedVideoUrl(url: string, kind?: string) {
  if (!url) return "";
  if (kind === "youtube" || /youtu/.test(url)) {
    const id = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (kind === "vimeo" || /vimeo/.test(url)) {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  return url;
}
