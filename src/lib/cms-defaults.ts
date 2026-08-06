/**
 * CMS KotaMed — contenido por defecto (Fase 2).
 * Siembra páginas base para cada categoría del Studio (inicio, programas,
 * cursos, especialidades, landings, biblioteca…) con sus bloques listos
 * para editar. Es idempotente: nunca duplica páginas ya existentes.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultBlock,
  type CmsBlockProps,
  type CmsBlockStyle,
  type CmsBlockType,
  type CmsPageKind,
} from "@/lib/cms";

type SeedBlock = { type: CmsBlockType; props?: CmsBlockProps; style?: Partial<CmsBlockStyle> };

export type SeedPage = {
  kind: CmsPageKind;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: "draft" | "published";
  blocks: SeedBlock[];
};

const CORE_BLOCKS: CmsBlockType[] = ["hero", "counters", "benefits", "courses", "teachers", "faq", "cta"];

function base(types: CmsBlockType[]): SeedBlock[] {
  return types.map((type) => ({ type }));
}

/** Páginas institucionales y una plantilla inicial por cada categoría. */
export const DEFAULT_PAGES: SeedPage[] = [
  {
    kind: "page",
    slug: "home",
    title: "Inicio KotaMed",
    subtitle: "Ecosistema académico médico impulsado por IA",
    status: "draft",
    blocks: [
      {
        type: "hero",
        props: {
          eyebrow: "KotaMed Academy™",
          title: "Formación médica de élite, guiada por inteligencia artificial",
          subtitle:
            "Ciencias básicas, ciencias clínicas, ENAM, ESSALUD, internado y residentado en una sola plataforma.",
          primaryLabel: "Comenzar ahora",
          primaryHref: "/auth",
          secondaryLabel: "Ver programas",
          secondaryHref: "#programas",
          items: [
            { title: "Ruta académica cinematográfica", icon: "Route" },
            { title: "Simuladores y banco de preguntas", icon: "Target" },
            { title: "Casos clínicos reales", icon: "Stethoscope" },
            { title: "KotaMed AI 24/7", icon: "Sparkles" },
          ],
        },
      },
      { type: "counters" },
      {
        type: "benefits",
        props: {
          title: "¿Por qué KotaMed?",
          subtitle: "Una metodología construida por médicos para médicos.",
          items: [
            { title: "Aprendizaje adaptativo", text: "La IA ajusta tu ruta según tu rendimiento real." },
            { title: "Docentes especialistas", text: "Formadores activos en hospitales de nivel III." },
            { title: "Práctica clínica simulada", text: "Historias clínicas, evoluciones y cálculos reales." },
          ],
        },
      },
      {
        type: "courses",
        props: {
          title: "Programas académicos",
          subtitle: "Elige la etapa exacta de tu carrera médica.",
          items: [
            { title: "Ciencias básicas", text: "Fundamentos con enfoque de examen." },
            { title: "Ciencias clínicas", text: "Razonamiento clínico integrado." },
            { title: "ENAM / ESSALUD", text: "Alto rendimiento con simulacros." },
            { title: "Internado médico", text: "Rotaciones y práctica hospitalaria." },
            { title: "Residentado médico", text: "Especialidades con banco intensivo." },
          ],
        },
        style: { columns: 3 },
      },
      { type: "teachers" },
      { type: "testimonials" },
      { type: "plans" },
      { type: "faq" },
      { type: "cta" },
    ],
  },
  {
    kind: "page",
    slug: "nosotros",
    title: "Nosotros",
    subtitle: "La escuela médica digital de KotaMed",
    blocks: [
      { type: "hero", props: { eyebrow: "Nosotros", title: "Nuestra misión", subtitle: "Elevar el estándar de la educación médica en Latinoamérica." } },
      { type: "timeline" },
      { type: "counters" },
      { type: "teachers" },
      { type: "cta" },
    ],
  },
  {
    kind: "page",
    slug: "contacto",
    title: "Contacto",
    subtitle: "Habla con el equipo académico",
    blocks: [
      { type: "hero", props: { eyebrow: "Contacto", title: "Estamos para acompañarte", subtitle: "Escríbenos y recibe orientación académica personalizada." } },
      { type: "richtext", props: { title: "Canales de atención", description: "WhatsApp, correo y atención administrativa." } },
      { type: "faq" },
      { type: "cta" },
    ],
  },
  {
    kind: "page",
    slug: "preguntas-frecuentes",
    title: "Preguntas frecuentes",
    blocks: base(["hero", "faq", "accordion", "cta"]),
  },
  {
    kind: "landing",
    slug: "admision",
    title: "Admisión KotaMed",
    subtitle: "Matrícula abierta",
    blocks: [
      { type: "hero", props: { eyebrow: "Admisión", title: "Matrícula abierta", subtitle: "Reserva tu vacante y accede al ecosistema completo.", primaryLabel: "Inscribirme", primaryHref: "/auth" } },
      { type: "plans" },
      { type: "benefits" },
      { type: "testimonials" },
      { type: "faq" },
      { type: "cta" },
    ],
  },
  { kind: "course", slug: "curso-modelo", title: "Curso modelo", blocks: base(CORE_BLOCKS) },
  { kind: "specialty", slug: "especialidad-modelo", title: "Especialidad modelo", blocks: base(CORE_BLOCKS) },
  { kind: "diploma", slug: "diplomado-modelo", title: "Diplomado modelo", blocks: base(["hero", "benefits", "timeline", "plans", "faq", "cta"]) },
  { kind: "library", slug: "biblioteca", title: "Biblioteca KotaMed", blocks: base(["hero", "gallery", "table", "cta"]) },
  { kind: "event", slug: "eventos", title: "Eventos y congresos", blocks: base(["hero", "timeline", "gallery", "cta"]) },
  { kind: "manual", slug: "manuales", title: "Manuales clínicos", blocks: base(["hero", "features", "table", "cta"]) },
  { kind: "simulator", slug: "simuladores", title: "Simuladores", blocks: base(["hero", "features", "counters", "cta"]) },
  { kind: "research", slug: "investigacion", title: "Investigación", blocks: base(["hero", "richtext", "table", "cta"]) },
  { kind: "news", slug: "noticias", title: "Noticias KotaMed", blocks: base(["hero", "carousel", "cta"]) },
  { kind: "blog", slug: "blog", title: "Blog médico", blocks: base(["hero", "carousel", "richtext", "cta"]) },
];

/** Bloques por defecto para la landing de un programa académico. */
function programBlocks(title: string): SeedBlock[] {
  return [
    {
      type: "hero",
      props: {
        eyebrow: "Programa",
        title,
        subtitle: `Todo lo que necesitas para dominar ${title} con la metodología KotaMed.`,
        primaryLabel: "Ver planes e inscribirme",
        primaryHref: "/auth",
        secondaryLabel: "Contenido del programa",
        secondaryHref: "#contenido",
        items: [
          { title: "Ruta guiada por IA", icon: "Sparkles" },
          { title: "Banco de preguntas", icon: "Target" },
          { title: "Casos clínicos", icon: "Stethoscope" },
          { title: "Tutoría permanente", icon: "Users" },
        ],
      },
      style: { align: "left", paddingY: "xl" },
    },
    { type: "benefits", props: { title: "Beneficios del programa" } },
    { type: "timeline", props: { title: "Ruta académica" } },
    { type: "features", props: { title: "Qué incluye" } },
    { type: "teachers" },
    { type: "plans" },
    { type: "faq" },
    { type: "cta" },
  ];
}

/** Construye la lista de páginas de programa a partir del árbol de contenido. */
export async function programSeedPages(): Promise<SeedPage[]> {
  const { data } = await supabase
    .from("content_nodes")
    .select("slug, title, kind, sort_order")
    .eq("kind", "program")
    .order("sort_order");
  const rows = (data ?? []) as { slug: string; title: string; sort_order: number }[];
  const seen = new Set<string>();
  const pages: SeedPage[] = [];
  for (const r of rows) {
    const slug = `programa-${r.slug}`;
    if (seen.has(slug)) continue;
    seen.add(slug);
    pages.push({
      kind: "program",
      slug,
      title: r.title,
      subtitle: "Landing del programa",
      blocks: programBlocks(r.title),
    });
  }
  return pages;
}

/**
 * Crea todas las páginas por defecto que aún no existan, con sus bloques.
 * Devuelve cuántas páginas se crearon.
 */
export function useSeedCmsDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: existing, error } = await supabase.from("cms_pages").select("slug");
      if (error) throw error;
      const have = new Set(((existing ?? []) as { slug: string }[]).map((p) => p.slug));

      const all = [...DEFAULT_PAGES, ...(await programSeedPages())].filter((p) => !have.has(p.slug));
      let created = 0;

      for (let i = 0; i < all.length; i++) {
        const seed = all[i]!;
        const { data: inserted, error: e1 } = await supabase
          .from("cms_pages")
          .insert({
            kind: seed.kind,
            slug: seed.slug,
            title: seed.title,
            subtitle: seed.subtitle ?? null,
            status: seed.status ?? "draft",
            sort_order: i,
            seo: {
              title: `${seed.title} · KotaMed`,
              description: seed.description ?? seed.subtitle ?? `${seed.title} en KotaMed Academy.`,
              index: true,
            },
          } as never)
          .select("id")
          .single();
        if (e1) throw e1;
        const pageId = (inserted as { id: string }).id;
        created++;

        const rows = seed.blocks.map((b, idx) => {
          const d = defaultBlock(b.type);
          return {
            page_id: pageId,
            type: b.type,
            name: null,
            sort_order: idx,
            visible: true,
            props: { ...d.props, ...(b.props ?? {}) },
            style: { ...d.style, ...(b.style ?? {}) },
          };
        });
        if (rows.length) {
          const { error: e2 } = await supabase.from("cms_blocks").insert(rows as never);
          if (e2) throw e2;
        }
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      qc.invalidateQueries({ queryKey: ["cms-public"] });
    },
  });
}
