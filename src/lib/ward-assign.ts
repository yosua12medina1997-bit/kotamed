/**
 * Asignación clínica de responsabilidad: PABELLÓN → SALA → CAMA → INTERNO.
 * La asignación es individual por cama (varias camas pueden pertenecer al mismo
 * interno y una sala puede repartirse entre varios internos).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { wdb, wardError, type WardPatient } from "@/lib/ward-os";

export interface WardBedAssignment {
  id: string;
  bed_id: string;
  user_id: string;
  role: string;
  active: boolean;
  note: string | null;
  assigned_by: string | null;
  created_at: string;
}

export interface WardRosterEntry {
  user_id: string;
  full_name: string;
  initials: string;
  is_admin: boolean;
}

export interface WardAssignmentLogEntry {
  id: string;
  bed_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export const ASSIGN_KEYS = {
  beds: ["ward", "bed-assignments"] as const,
  roster: ["ward", "roster"] as const,
  log: (bedId: string | null) => ["ward", "assign-log", bedId] as const,
};

/** Paleta pastel poco saturada para identificar internos sin saturar el croquis. */
const PASTEL = [
  "#93c5fd",
  "#7dd3fc",
  "#a7f3d0",
  "#c4b5fd",
  "#fbcfe8",
  "#fde68a",
  "#bae6fd",
  "#d9f99d",
  "#fecaca",
  "#ddd6fe",
];

export function internColor(userId: string | null | undefined): string {
  if (!userId) return "#cbd5e1";
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) h = (h * 31 + userId.charCodeAt(i)) % 100_000;
  return PASTEL[h % PASTEL.length]!;
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

/* ─────────────────────────────── Hooks ─────────────────────────────── */

export function useBedAssignments() {
  return useQuery({
    queryKey: ASSIGN_KEYS.beds,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_bed_assignments")
        .select("id,bed_id,user_id,role,active,note,assigned_by,created_at")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as WardBedAssignment[];
    },
  });
}

export function useWardRoster() {
  return useQuery({
    queryKey: ASSIGN_KEYS.roster,
    queryFn: async () => {
      const { data, error } = await wdb.rpc("ward_roster");
      if (error) throw error;
      return (data ?? []) as WardRosterEntry[];
    },
  });
}

export function useAssignmentLog(bedId: string | null) {
  return useQuery({
    queryKey: ASSIGN_KEYS.log(bedId),
    enabled: !!bedId,
    queryFn: async () => {
      const { data, error } = await wdb
        .from("ward_bed_assignment_log")
        .select("id,bed_id,from_user_id,to_user_id,actor_id,created_at")
        .eq("bed_id", bedId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as WardAssignmentLogEntry[];
    },
  });
}

/** Asigna (o libera con `userId: null`) una o varias camas, dejando historial. */
export function useAssignBeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bedIds, userId }: { bedIds: string[]; userId: string | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const actor = auth.user?.id ?? null;

      const { data: current } = await wdb
        .from("ward_bed_assignments")
        .select("id,bed_id,user_id")
        .eq("active", true)
        .in("bed_id", bedIds);
      const currentByBed = new Map<string, { id: string; user_id: string }>(
        ((current ?? []) as { id: string; bed_id: string; user_id: string }[]).map((r) => [
          r.bed_id,
          { id: r.id, user_id: r.user_id },
        ]),
      );

      for (const bedId of bedIds) {
        const prev = currentByBed.get(bedId) ?? null;
        if (prev?.user_id === userId) continue;

        if (prev) {
          const { error } = await wdb
            .from("ward_bed_assignments")
            .update({ active: false })
            .eq("id", prev.id);
          if (error) throw error;
        }
        if (userId) {
          const { error } = await wdb.from("ward_bed_assignments").insert({
            bed_id: bedId,
            user_id: userId,
            role: "interno",
            active: true,
            assigned_by: actor,
          });
          if (error) throw error;
        }
        await wdb.from("ward_bed_assignment_log").insert({
          bed_id: bedId,
          from_user_id: prev?.user_id ?? null,
          to_user_id: userId,
          actor_id: actor,
        });
      }
      return bedIds.length;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ASSIGN_KEYS.beds });
      void qc.invalidateQueries({ queryKey: ["ward", "assign-log"] });
    },
    onError: (e) => wardError(e),
  });
}


/* ───────────────────────────── Derivados ───────────────────────────── */

export function ownerByBed(assignments: WardBedAssignment[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of assignments) if (a.active) map.set(a.bed_id, a.user_id);
  return map;
}

export function rosterMap(roster: WardRosterEntry[]): Map<string, WardRosterEntry> {
  return new Map(roster.map((r) => [r.user_id, r]));
}

/** IDs de pacientes editables por el usuario (camas asignadas o creados por él). */
export function editablePatientIds(
  patients: WardPatient[],
  assignments: WardBedAssignment[],
  userId: string | undefined,
): Set<string> {
  const ids = new Set<string>();
  if (!userId) return ids;
  const mine = new Set(assignments.filter((a) => a.user_id === userId).map((a) => a.bed_id));
  for (const p of patients) {
    if (p.created_by === userId) ids.add(p.id);
    if (p.bed_id && mine.has(p.bed_id)) ids.add(p.id);
  }
  return ids;
}
