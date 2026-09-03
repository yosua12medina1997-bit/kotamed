/**
 * Centro de Admisión — capa de datos (extensión del flujo de AUTH).
 * No modifica la lógica existente de matrículas: crea solicitudes que el
 * administrador aprueba desde el Command Center.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type AdmissionStatus =
  | "draft"
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "refunded";

export type AdmissionApplication = {
  id: string;
  user_id: string;
  status: AdmissionStatus;
  step: number;
  full_name: string | null;
  document_id: string | null;
  email: string | null;
  phone: string | null;
  university: string | null;
  study_year: string | null;
  hospital: string | null;
  specialty: string | null;
  program_slug: string | null;
  program_title: string | null;
  plan_id: string | null;
  plan_slug: string | null;
  plan_name: string | null;
  duration_months: number;
  amount: number;
  currency: string;
  payment_method: string | null;
  receipt_path: string | null;
  receipt_uploaded_at: string | null;
  submitted_at: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  approved_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentSetting = {
  id: string;
  method: string;
  holder_name: string;
  phone_number: string;
  qr_url: string | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
};

export const STATUS_LABELS: Record<AdmissionStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente de validación",
  reviewing: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  refunded: "Reembolsada",
};

export const STATUS_TONE: Record<AdmissionStatus, "ok" | "warn" | "bad" | "muted"> = {
  draft: "muted",
  pending: "warn",
  reviewing: "warn",
  approved: "ok",
  rejected: "bad",
  refunded: "muted",
};

/** Planes de referencia cuando el administrador aún no creó membresías. */
export const FALLBACK_PLANS = [
  {
    id: null as string | null,
    slug: "free",
    name: "Free",
    description: "Acceso a contenido gratuito y demos.",
    price_amount: 0,
    currency: "PEN",
    period: "mensual",
    features: ["Biblioteca gratuita", "Casos demo", "Comunidad"],
    months: 12,
    culqi_url: null as string | null,
  },
  {
    id: null as string | null,
    slug: "premium",
    name: "Premium",
    description: "Un programa completo con biblioteca premium.",
    price_amount: 149,
    currency: "PEN",
    period: "mensual",
    features: ["1 programa completo", "Biblioteca premium", "Flashcards", "QBank"],
    months: 6,
    culqi_url: null as string | null,
  },
  {
    id: null as string | null,
    slug: "pro",
    name: "Pro",
    description: "Todo Premium + simuladores y tutor IA.",
    price_amount: 249,
    currency: "PEN",
    period: "mensual",
    features: ["Todo Premium", "Simuladores clínicos", "KotaMed AI", "Progreso avanzado"],
    months: 12,
    culqi_url: null as string | null,
  },
  {
    id: null as string | null,
    slug: "elite",
    name: "Elite",
    description: "Acceso total al ecosistema KotaMed.",
    price_amount: 399,
    currency: "PEN",
    period: "anual",
    features: ["Acceso total", "Mentoría", "Certificados", "Soporte prioritario"],
    months: 12,
    culqi_url: null as string | null,
  },
];

export type WizardPlan = (typeof FALLBACK_PLANS)[number];

/** Planes reales (membership_plans) normalizados para el asistente. */
export function useAdmissionPlans() {
  return useQuery({
    queryKey: ["admission-plans"],
    queryFn: async (): Promise<WizardPlan[]> => {
      const { data, error } = await db
        .from("membership_plans")
        .select("id,slug,name,description,price_amount,currency,period,features,is_active,sort_order,culqi_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      if (rows.length === 0) return FALLBACK_PLANS;
      return rows.map((p) => ({
        id: p.id as string,
        slug: p.slug,
        name: p.name,
        description: p.description,
        price_amount: Number(p.price_amount ?? 0),
        currency: p.currency ?? "PEN",
        period: p.period ?? "mensual",
        features: Array.isArray(p.features) ? p.features : [],
        months: /anual|year/i.test(String(p.period)) ? 12 : 6,
        culqi_url: (p.culqi_url ?? null) as string | null,
      }));
    },
  });
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_settings")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentSetting[];
    },
  });
}

/** Solicitud activa del usuario (la más reciente). */
export function useMyAdmission(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-admission", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("admission_applications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AdmissionApplication | null;
    },
  });
}

/** Guardado automático del borrador (crea o actualiza). */
export function useSaveAdmission(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AdmissionApplication> & { id?: string }) => {
      if (!userId) throw new Error("Sesión no disponible");
      const { id, ...rest } = payload;
      if (id) {
        const { data, error } = await db
          .from("admission_applications")
          .update(rest)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data as AdmissionApplication;
      }
      const { data, error } = await db
        .from("admission_applications")
        .insert({ ...rest, user_id: userId, status: rest.status ?? "draft" })
        .select("*")
        .single();
      if (error) throw error;
      return data as AdmissionApplication;
    },
    onSuccess: (row) => {
      qc.setQueryData(["my-admission", userId], row);
    },
  });
}

/** Todas las solicitudes (solo administrador por RLS). */
export function useAllAdmissions() {
  return useQuery({
    queryKey: ["admin-admissions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("admission_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdmissionApplication[];
    },
  });
}

export async function receiptSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("comprobantes")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
