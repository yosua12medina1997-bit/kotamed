/**
 * Colecciones reutilizables del CMS (Fase 3): docentes, testimonios, planes,
 * cronogramas, preguntas frecuentes y contadores. Se editan una vez y se
 * reutilizan en cualquier landing mediante bloques conectados.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CmsItem } from "@/lib/cms";

export type CmsCollection =
  | "teachers"
  | "testimonials"
  | "plans"
  | "timeline"
  | "faq"
  | "counters"
  | "courses";

export const COLLECTIONS: { value: CmsCollection; label: string; hint: string }[] = [
  { value: "teachers", label: "Docentes", hint: "Nombre, especialidad, foto, hospital" },
  { value: "testimonials", label: "Testimonios", hint: "Autor, cargo, testimonio, foto" },
  { value: "plans", label: "Planes", hint: "Nombre, precio, beneficios, CTA" },
  { value: "timeline", label: "Cronogramas", hint: "Etapa, fecha, descripción" },
  { value: "faq", label: "Preguntas frecuentes", hint: "Pregunta y respuesta" },
  { value: "counters", label: "Contadores", hint: "Cifra y etiqueta" },
  { value: "courses", label: "Cursos destacados", hint: "Curso, descripción, enlace" },
];

export type CmsCollectionItem = {
  id: string;
  collection: CmsCollection;
  title: string;
  subtitle: string | null;
  text: string | null;
  image: string | null;
  icon: string | null;
  href: string | null;
  badge: string | null;
  value: string | null;
  label: string | null;
  price: string | null;
  rating: string | null;
  features: string[];
  sort_order: number;
  visible: boolean;
};

const COLS =
  "id, collection, title, subtitle, text, image, icon, href, badge, value, label, price, rating, features, sort_order, visible";

export function useCollectionItems(collection: CmsCollection | null, onlyVisible = true) {
  return useQuery({
    queryKey: ["cms-collection", collection, onlyVisible],
    enabled: !!collection,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from("cms_collection_items").select(COLS).eq("collection", collection!);
      if (onlyVisible) q = q.eq("visible", true);
      const { data, error } = await q.order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as CmsCollectionItem[];
    },
  });
}

/** Convierte elementos de colección en elementos de bloque. */
export function collectionToItems(rows: CmsCollectionItem[]): CmsItem[] {
  return rows.map((r) => ({
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    text: r.text ?? undefined,
    image: r.image ?? undefined,
    icon: r.icon ?? undefined,
    href: r.href ?? undefined,
    badge: r.badge ?? undefined,
    value: r.value ?? undefined,
    label: r.label ?? undefined,
    price: r.price ?? undefined,
    rating: r.rating ?? undefined,
    features: r.features ?? undefined,
  }));
}

export function useSaveCollectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CmsCollectionItem> & { id?: string }) => {
      if (patch.id) {
        const { id, ...rest } = patch;
        const { error } = await supabase
          .from("cms_collection_items")
          .update(rest as never)
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("cms_collection_items")
        .insert(patch as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-collection"] }),
  });
}

export function useDeleteCollectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cms_collection_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-collection"] }),
  });
}

/* --------------------------- Datos por defecto ---------------------- */

const SEED: Record<CmsCollection, Partial<CmsCollectionItem>[]> = {
  teachers: [
    { title: "Dra. Ana Quispe", subtitle: "Neonatología · HNERM", text: "15 años en UCI neonatal nivel III.", icon: "Stethoscope" },
    { title: "Dr. Luis Ramírez", subtitle: "Pediatría · INSN", text: "Docente universitario y autor de guías clínicas.", icon: "Baby" },
    { title: "Dra. Carla Mendoza", subtitle: "Medicina interna · HNDM", text: "Especialista en preparación ENAM y ESSALUD.", icon: "HeartPulse" },
  ],
  testimonials: [
    { title: "Rocío A.", subtitle: "Interna de medicina", text: "Con KotaMed pasé del miedo a la seguridad clínica en guardias.", rating: "5" },
    { title: "Jorge M.", subtitle: "Residente R1 Pediatría", text: "Los casos y simulaciones fueron decisivos en mi residentado.", rating: "5" },
    { title: "Diana P.", subtitle: "Médico general", text: "La IA clínica me ayuda a razonar, no solo a memorizar.", rating: "5" },
  ],
  plans: [
    { title: "Esencial", price: "S/ 99 / mes", text: "Acceso al programa elegido y banco de preguntas.", features: ["1 programa", "Banco de preguntas", "Certificado digital"] },
    { title: "Premium", price: "S/ 179 / mes", badge: "Recomendado", text: "Todo Esencial + simuladores e IA clínica.", features: ["Todos los programas", "Simuladores", "IA clínica 24/7"] },
    { title: "Institucional", price: "A medida", text: "Licencias para hospitales y universidades.", features: ["Usuarios ilimitados", "Reportes de avance", "Docente asignado"] },
  ],
  timeline: [
    { title: "Semana 1 · Fundamentos", text: "Diagnóstico inicial y ruta personalizada." },
    { title: "Semana 4 · Práctica clínica", text: "Casos reales y simulaciones guiadas." },
    { title: "Semana 12 · Evaluación final", text: "Simulacro integral y certificación." },
  ],
  faq: [
    { title: "¿Cómo me matriculo?", text: "Regístrate, elige tu programa y sube tu comprobante; validamos en minutos." },
    { title: "¿Los certificados son válidos?", text: "Sí, cada programa entrega certificado digital verificable." },
    { title: "¿Puedo pagar con Yape?", text: "Sí, aceptamos Yape, Plin y transferencia bancaria." },
  ],
  counters: [
    { value: "+26 000", label: "Médicos formados" },
    { value: "40/46", label: "Especialidades" },
    { value: "+20", label: "Docentes expertos" },
    { value: "90%", label: "Logró su especialidad" },
  ],
  courses: [
    { title: "Internado médico", text: "Rotaciones, hospitalización y guardias.", href: "/programas/internado" },
    { title: "ENAM intensivo", text: "Plan de 12 semanas con simulacros.", href: "/programas/enam" },
    { title: "Residentado médico", text: "Especialidades con casos clínicos reales.", href: "/programas/residentado" },
  ],
};

/** Siembra las colecciones que estén vacías. */
export function useSeedCollections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      let created = 0;
      for (const c of COLLECTIONS) {
        const { count } = await supabase
          .from("cms_collection_items")
          .select("id", { count: "exact", head: true })
          .eq("collection", c.value);
        if ((count ?? 0) > 0) continue;
        const rows = (SEED[c.value] ?? []).map((r, i) => ({
          ...r,
          collection: c.value,
          title: r.title ?? r.label ?? "Elemento",
          sort_order: i,
        }));
        if (!rows.length) continue;
        const { error } = await supabase.from("cms_collection_items").insert(rows as never);
        if (error) throw error;
        created += rows.length;
      }
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-collection"] }),
  });
}
