/**
 * Capa de autorización por matrícula/membresía.
 * El login solo identifica; el acceso real se valida aquí, en el servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccessResult = {
  allowed: boolean;
  reason: "admin" | "enrollment" | "membership" | "grant" | "none";
};

export const checkProgramAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => {
    const slug = String(input?.slug ?? "").trim();
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) throw new Error("Slug inválido");
    return { slug };
  })
  .handler(async ({ data, context }): Promise<AccessResult> => {
    const { supabase, userId } = context;
    const { slug } = data;
    const nowIso = new Date().toISOString();

    // 1) Administrador: acceso total.
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRow) return { allowed: true, reason: "admin" };

    // 2) Matrícula vigente en el programa.
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("program,expires_at")
      .eq("user_id", userId)
      .gt("expires_at", nowIso);
    if ((enrollments ?? []).some((e) => String(e.program) === slug)) {
      return { allowed: true, reason: "enrollment" };
    }

    // 3) Nodo de contenido del programa (para membresías y permisos directos).
    const { data: node } = await supabase
      .from("content_nodes")
      .select("id")
      .eq("kind", "program")
      .eq("slug", slug)
      .maybeSingle();

    if (node?.id) {
      // 3.1) Matrícula manual vigente sobre el nodo del programa.
      const { data: manual } = await supabase
        .from("user_enrollments")
        .select("status,expires_at")
        .eq("user_id", userId)
        .eq("node_id", node.id)
        .maybeSingle();
      if (manual?.status === "active" && (!manual.expires_at || manual.expires_at > nowIso)) {
        return { allowed: true, reason: "enrollment" };
      }

      const { data: grant } = await supabase
        .from("user_content_access")
        .select("granted,expires_at")
        .eq("user_id", userId)
        .eq("node_id", node.id)
        .maybeSingle();
      if (grant?.granted && (!grant.expires_at || grant.expires_at > nowIso)) {
        return { allowed: true, reason: "grant" };
      }

      const { data: memberships } = await supabase
        .from("user_memberships")
        .select("plan_id,status")
        .eq("user_id", userId)
        .eq("status", "active");
      const planIds = (memberships ?? []).map((m) => m.plan_id);
      if (planIds.length > 0) {
        const { data: planAccess } = await supabase
          .from("plan_content_access")
          .select("plan_id")
          .eq("node_id", node.id)
          .in("plan_id", planIds);
        if ((planAccess ?? []).length > 0) return { allowed: true, reason: "membership" };
      }
    }

    return { allowed: false, reason: "none" };
  });
