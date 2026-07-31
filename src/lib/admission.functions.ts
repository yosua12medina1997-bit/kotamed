/** Server functions de admisión: aprobación solo para administradores. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const approveAdmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        months: z.number().int().min(1).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verificar rol admin como el usuario autenticado (RLS aplicada).
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !role) {
      throw new Error("Solo el administrador puede aprobar matrículas");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("approve_admission", {
      _application_id: data.applicationId,
      _actor_id: context.userId,
      _months: data.months ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
