/**
 * Registro y actividad del sitio público en CMS Studio (solo lectura).
 * Escribe únicamente en las tablas nuevas website_projects / website_scan_events.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inspectSite, type SiteInspection } from "@/lib/website-inspect";

export const WEBSITE_SLUG = "kotamed-app";
export const WEBSITE_URL = "https://www.kotamed.app/";

export type WebsiteProject = {
  id: string;
  name: string;
  slug: string;
  url: string;
  status: string;
  framework: string | null;
  repository: string | null;
  environment: string;
  integration_mode: string;
  last_scan_at: string | null;
  last_scan_summary: {
    pages?: number;
    components?: number;
    assets?: number;
    editable?: number;
    modules?: number;
    framework?: string;
  };
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteScanEvent = {
  id: string;
  action: string;
  status: string;
  duration_ms: number | null;
  detail: Record<string, unknown>;
  error_message: string | null;
  actor_email: string | null;
  created_at: string;
};

export function useWebsiteProject() {
  return useQuery({
    queryKey: ["website-project", WEBSITE_SLUG],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_projects")
        .select("*")
        .eq("slug", WEBSITE_SLUG)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as WebsiteProject | null;
    },
  });
}

export function useWebsiteActivity(projectId: string | undefined) {
  return useQuery({
    queryKey: ["website-activity", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_scan_events")
        .select("id,action,status,duration_ms,detail,error_message,actor_email,created_at")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WebsiteScanEvent[];
    },
  });
}

/** Ejecuta la inspección local (solo lectura) y registra la auditoría. */
export function useScanWebsite(project: WebsiteProject | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SiteInspection> => {
      if (!project) throw new Error("El sitio no está registrado todavía.");
      const started = performance.now();
      const { data: auth } = await supabase.auth.getUser();
      const actorId = auth.user?.id ?? null;
      const actorEmail = auth.user?.email ?? null;

      await supabase.from("website_scan_events").insert({
        project_id: project.id,
        action: "Análisis de estructura iniciado",
        status: "running",
        actor_id: actorId,
        actor_email: actorEmail,
      });

      try {
        const result = inspectSite();
        const duration = Math.round(performance.now() - started);
        const summary = {
          pages: result.pages.length,
          components: result.components.length,
          assets: result.assets.length,
          editable: result.editableCandidates.reduce((n, g) => n + g.items.length, 0),
          modules: result.modulesScanned,
          framework: result.framework,
        };

        await supabase
          .from("website_projects")
          .update({ last_scan_at: new Date().toISOString(), last_scan_summary: summary, framework: result.framework })
          .eq("id", project.id);

        await supabase.from("website_scan_events").insert({
          project_id: project.id,
          action: "Análisis completado",
          status: "ok",
          duration_ms: duration,
          detail: summary,
          actor_id: actorId,
          actor_email: actorEmail,
        });

        return result;
      } catch (e) {
        await supabase.from("website_scan_events").insert({
          project_id: project.id,
          action: "Análisis fallido",
          status: "error",
          error_message: e instanceof Error ? e.message : String(e),
          actor_id: actorId,
          actor_email: actorEmail,
        });
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website-project", WEBSITE_SLUG] });
      qc.invalidateQueries({ queryKey: ["website-activity"] });
    },
  });
}
