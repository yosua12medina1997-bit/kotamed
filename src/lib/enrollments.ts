/**
 * Hooks de lectura del sistema de matriculación manual.
 * Las escrituras pasan por src/lib/enrollments.functions.ts (auditadas).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isEnrollmentLive, type UserEnrollment, type EnrollmentAuditRow } from "./enrollments-shared";

const db = supabase as any;

export type EnrollableNode = {
  id: string;
  parent_id: string | null;
  kind: string;
  title: string;
  slug: string;
  sort_order: number;
};

/** Todos los nodos del árbol académico disponibles para matricular. */
export function useEnrollableNodes() {
  return useQuery({
    queryKey: ["enrollable-nodes", "all"],
    staleTime: 15_000,
    queryFn: async () => {
      const all: EnrollableNode[] = [];
      const pageSize = 1000;

      for (let page = 0; page < 60; page++) {
        const { data, error } = await supabase
          .from("content_nodes")
          .select("id,parent_id,kind,title,slug,sort_order")
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error) throw error;

        const rows = (data ?? []) as EnrollableNode[];
        all.push(...rows);
        if (rows.length < pageSize) break;
      }

      return all;
    },
  });
}

/** Matrículas de un usuario concreto (vista administrativa). */
export function useUserEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-enrollments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("user_enrollments")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserEnrollment[];
    },
  });
}

/** Todas las matrículas (para métricas del módulo). */
export function useAllEnrollments() {
  return useQuery({
    queryKey: ["all-user-enrollments"],
    queryFn: async () => {
      const { data, error } = await db
        .from("user_enrollments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as UserEnrollment[];
    },
  });
}

/** Historial auditado de matrículas. */
export function useEnrollmentAudit(limit = 120) {
  return useQuery({
    queryKey: ["enrollment-audit", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("enrollment_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as EnrollmentAuditRow[];
    },
  });
}

export type MyEnrollmentProgram = UserEnrollment & {
  node: { id: string; title: string; slug: string; kind: string } | null;
};

/** Matrículas vigentes del usuario autenticado, con su nodo académico. */
export function useMyProgramEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-program-enrollments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("user_enrollments")
        .select("*, node:content_nodes(id,title,slug,kind)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as MyEnrollmentProgram[]).filter(isEnrollmentLive);
    },
  });
}

/** Claves de caché a invalidar tras cualquier cambio de matrícula. */
export const ENROLLMENT_QUERY_KEYS = [
  ["user-enrollments"],
  ["all-user-enrollments"],
  ["enrollment-audit"],
  ["my-program-enrollments"],
  ["user-content-access"],
] as const;
