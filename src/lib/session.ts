import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProgramSlug = "residentado" | "internado" | "r1" | "r2" | "r3";

export interface Enrollment {
  id: string;
  program: ProgramSlug;
  expires_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useMyEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: ["enrollments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,program,expires_at,created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Enrollment[];
    },
  });
}

export function isActive(enrollment: Enrollment): boolean {
  return new Date(enrollment.expires_at).getTime() > Date.now();
}

export const PROGRAM_LABELS: Record<ProgramSlug, string> = {
  residentado: "Preparación Residentado (ENAM · ESSALUD)",
  internado: "Internado Médico · Pediatría",
  r1: "Residencia Pediatría · R1",
  r2: "Residencia Pediatría · R2",
  r3: "Residencia Pediatría · R3",
};
