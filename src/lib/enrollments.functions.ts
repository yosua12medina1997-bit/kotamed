/**
 * Matriculación manual: escritura auditada de matrículas individuales.
 * Solo administradores. Registra IP y dispositivo de cada acción.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

export type SaveEnrollmentsResult = {
  ok: boolean;
  saved: number;
  duplicates: { node_id: string; title: string }[];
};

export const saveEnrollments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId: string;
    nodeIds: string[];
    enrollmentKind: string;
    assignmentType: string;
    reason?: string | null;
    observations?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    planId?: string | null;
    allowReplace?: boolean;
  }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userId = String(input?.userId ?? "");
    if (!uuid.test(userId)) throw new Error("Usuario inválido");
    const nodeIds = Array.from(new Set((input?.nodeIds ?? []).map(String)));
    if (nodeIds.length === 0) throw new Error("Selecciona al menos un programa");
    if (nodeIds.length > 200) throw new Error("Demasiados programas seleccionados");
    if (nodeIds.some((n) => !uuid.test(n))) throw new Error("Programa inválido");
    const planId = input?.planId ? String(input.planId) : null;
    if (planId && !uuid.test(planId)) throw new Error("Plan inválido");
    return {
      userId,
      nodeIds,
      enrollmentKind: String(input?.enrollmentKind ?? "programa").slice(0, 40),
      assignmentType: String(input?.assignmentType ?? "manual").slice(0, 40),
      reason: input?.reason ? String(input.reason).slice(0, 120) : null,
      observations: input?.observations ? String(input.observations).slice(0, 2000) : null,
      startsAt: input?.startsAt ? String(input.startsAt) : null,
      expiresAt: input?.expiresAt ? String(input.expiresAt) : null,
      planId,
      allowReplace: !!input?.allowReplace,
    };
  })
  .handler(async ({ data, context }): Promise<SaveEnrollmentsResult> => {
    const { supabase, userId: actorId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: actorId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo un administrador puede matricular usuarios");

    const { data: nodes, error: nodesErr } = await supabase
      .from("content_nodes")
      .select("id,title,kind,slug")
      .in("id", data.nodeIds);
    if (nodesErr) throw nodesErr;
    if (!nodes || nodes.length === 0) throw new Error("Los programas seleccionados no existen");

    const { data: existing } = await supabase
      .from("user_enrollments")
      .select("id,node_id")
      .eq("user_id", data.userId)
      .in("node_id", data.nodeIds);

    const existingSet = new Set((existing ?? []).map((r) => r.node_id));
    if (!data.allowReplace && existingSet.size > 0) {
      return {
        ok: false,
        saved: 0,
        duplicates: nodes
          .filter((n) => existingSet.has(n.id))
          .map((n) => ({ node_id: n.id, title: n.title })),
      };
    }

    const startsAt = data.startsAt ? new Date(data.startsAt).toISOString() : new Date().toISOString();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : null;

    const rows = nodes.map((n) => ({
      user_id: data.userId,
      node_id: n.id,
      plan_id: data.planId,
      enrollment_kind: data.enrollmentKind,
      assignment_type: data.assignmentType,
      reason: data.reason,
      status: "active",
      starts_at: startsAt,
      expires_at: expiresAt,
      observations: data.observations,
      assigned_by: actorId,
    }));

    const { error } = await supabase
      .from("user_enrollments")
      .upsert(rows, { onConflict: "user_id,node_id" });
    if (error) throw error;

    // El acceso efectivo vive en user_content_access: lo sincronizamos.
    const { error: accessErr } = await supabase.from("user_content_access").upsert(
      nodes.map((n) => ({
        user_id: data.userId,
        node_id: n.id,
        granted: true,
        expires_at: expiresAt,
        created_by: actorId,
      })),
      { onConflict: "user_id,node_id" },
    );
    if (accessErr) throw accessErr;

    const { data: target } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    const { data: actor } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", actorId)
      .maybeSingle();

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      ip = null;
    }

    await supabase.from("enrollment_audit_log").insert(
      nodes.map((n) => ({
        action: existingSet.has(n.id) ? "enrollment_renewed" : "enrollment_created",
        actor_id: actorId,
        actor_email: actor?.email ?? null,
        target_user_id: data.userId,
        target_email: target?.email ?? null,
        node_id: n.id,
        node_title: n.title,
        detail: {
          enrollment_kind: data.enrollmentKind,
          assignment_type: data.assignmentType,
          reason: data.reason,
          observations: data.observations,
          starts_at: startsAt,
          expires_at: expiresAt,
        },
        ip_address: ip,
        user_agent: ua,
      })),
    );

    return { ok: true, saved: nodes.length, duplicates: [] };
  });

export const updateEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    status?: string;
    expiresAt?: string | null;
    observations?: string | null;
    reason?: string | null;
  }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const id = String(input?.id ?? "");
    if (!uuid.test(id)) throw new Error("Matrícula inválida");
    const status = input?.status ? String(input.status) : undefined;
    if (status && !["active", "suspended", "expired", "revoked"].includes(status)) {
      throw new Error("Estado inválido");
    }
    return {
      id,
      status,
      expiresAt: input?.expiresAt === undefined ? undefined : input.expiresAt ? String(input.expiresAt) : null,
      observations: input?.observations === undefined ? undefined : String(input.observations ?? "").slice(0, 2000),
      reason: input?.reason === undefined ? undefined : String(input.reason ?? "").slice(0, 120),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId: actorId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: actorId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo un administrador puede modificar matrículas");

    const { data: row, error: rowErr } = await supabase
      .from("user_enrollments")
      .select("id,user_id,node_id")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) throw new Error("Matrícula no encontrada");

    const patch: {
      status?: string;
      expires_at?: string | null;
      observations?: string | null;
      reason?: string | null;
    } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.expiresAt !== undefined) {
      patch.expires_at = data.expiresAt ? new Date(data.expiresAt).toISOString() : null;
    }
    if (data.observations !== undefined) patch.observations = data.observations || null;
    if (data.reason !== undefined) patch.reason = data.reason || null;

    const { error } = await supabase.from("user_enrollments").update(patch).eq("id", data.id);
    if (error) throw error;

    const live = (data.status ?? "active") === "active";
    await supabase.from("user_content_access").upsert(
      {
        user_id: row.user_id,
        node_id: row.node_id,
        granted: live,
        expires_at: (patch.expires_at as string | null) ?? null,
        created_by: actorId,
      },
      { onConflict: "user_id,node_id" },
    );

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      ip = null;
    }

    await supabase.from("enrollment_audit_log").insert({
      action: "enrollment_updated",
      actor_id: actorId,
      target_user_id: row.user_id,
      node_id: row.node_id,
      enrollment_id: row.id,
      detail: patch,
      ip_address: ip,
      user_agent: ua,
    });

    return { ok: true };
  });

export const deleteEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const id = String(input?.id ?? "");
    if (!uuid.test(id)) throw new Error("Matrícula inválida");
    return { id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId: actorId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: actorId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo un administrador puede eliminar matrículas");

    const { data: row } = await supabase
      .from("user_enrollments")
      .select("id,user_id,node_id,enrollment_kind")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Matrícula no encontrada");

    const { error } = await supabase.from("user_enrollments").delete().eq("id", data.id);
    if (error) throw error;

    await supabase
      .from("user_content_access")
      .delete()
      .eq("user_id", row.user_id)
      .eq("node_id", row.node_id);

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      ip = null;
    }

    await supabase.from("enrollment_audit_log").insert({
      action: "enrollment_deleted",
      actor_id: actorId,
      target_user_id: row.user_id,
      node_id: row.node_id,
      enrollment_id: row.id,
      detail: { enrollment_kind: row.enrollment_kind },
      ip_address: ip,
      user_agent: ua,
    });

    return { ok: true };
  });

/** Aplica los programas incluidos de un plan a los usuarios que ya lo tienen. */
export const syncPlanEnrollments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const planId = String(input?.planId ?? "");
    if (!uuid.test(planId)) throw new Error("Plan inválido");
    return { planId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId: actorId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: actorId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo un administrador puede sincronizar membresías");

    const { data: planNodes } = await supabase
      .from("plan_content_access")
      .select("node_id")
      .eq("plan_id", data.planId);
    const nodeIds = (planNodes ?? []).map((r) => r.node_id);
    if (nodeIds.length === 0) return { ok: true, users: 0, enrollments: 0 };

    const { data: members } = await supabase
      .from("user_memberships")
      .select("user_id")
      .eq("plan_id", data.planId)
      .eq("status", "active");
    const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
    if (userIds.length === 0) return { ok: true, users: 0, enrollments: 0 };

    const { data: already } = await supabase
      .from("user_enrollments")
      .select("user_id,node_id")
      .in("user_id", userIds)
      .in("node_id", nodeIds);
    const have = new Set((already ?? []).map((r) => `${r.user_id}:${r.node_id}`));

    const rows: {
      user_id: string;
      node_id: string;
      plan_id: string;
      enrollment_kind: string;
      assignment_type: string;
      reason: string;
      status: string;
      expires_at: string | null;
      assigned_by: string;
    }[] = [];
    userIds.forEach((uid) => {
      nodeIds.forEach((nid) => {
        if (have.has(`${uid}:${nid}`)) return;
        rows.push({
          user_id: uid,
          node_id: nid,
          plan_id: data.planId,
          enrollment_kind: "programa",
          assignment_type: "membership",
          reason: "Sincronización de membresía",
          status: "active",
          expires_at: null,
          assigned_by: actorId,
        });
      });
    });

    if (rows.length === 0) return { ok: true, users: userIds.length, enrollments: 0 };

    const { error } = await supabase
      .from("user_enrollments")
      .upsert(rows, { onConflict: "user_id,node_id" });
    if (error) throw error;

    await supabase.from("user_content_access").upsert(
      rows.map((r) => ({
        user_id: r.user_id,
        node_id: r.node_id,
        granted: true,
        expires_at: null,
        created_by: actorId,
      })),
      { onConflict: "user_id,node_id" },
    );

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      ip = null;
    }

    await supabase.from("enrollment_audit_log").insert({
      action: "plan_synced",
      actor_id: actorId,
      detail: { plan_id: data.planId, users: userIds.length, enrollments: rows.length },
      ip_address: ip,
      user_agent: ua,
    });

    return { ok: true, users: userIds.length, enrollments: rows.length };
  });
