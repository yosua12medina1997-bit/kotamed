/**
 * Preferencias de menú compartidas (servidor).
 * Lo que el administrador oculta o elimina en el menú de un área se guarda en
 * `ui_menu_prefs` y aplica a todos los usuarios, no solo a su navegador.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MenuPrefs = { hidden: string[]; removed: string[] };

export const EMPTY_MENU_PREFS: MenuPrefs = { hidden: [], removed: [] };

const db = supabase as any;

function normalize(config: any): MenuPrefs {
  return {
    hidden: Array.isArray(config?.hidden) ? config.hidden.map(String) : [],
    removed: Array.isArray(config?.removed) ? config.removed.map(String) : [],
  };
}

/** Lee las preferencias de menú del ámbito indicado. */
export function useMenuPrefs(scope: string) {
  return useQuery({
    queryKey: ["ui-menu-prefs", scope],
    staleTime: 10_000,
    queryFn: async (): Promise<MenuPrefs> => {
      const { data, error } = await db
        .from("ui_menu_prefs")
        .select("config")
        .eq("scope", scope)
        .maybeSingle();
      if (error) throw error;
      return normalize(data?.config ?? null);
    },
  });
}

/** Guarda las preferencias (solo administradores por RLS). */
export function useSaveMenuPrefs(scope: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: MenuPrefs) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db
        .from("ui_menu_prefs")
        .upsert(
          { scope, config, updated_by: auth.user?.id ?? null },
          { onConflict: "scope" },
        );
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      qc.setQueryData(["ui-menu-prefs", scope], config);
      qc.invalidateQueries({ queryKey: ["ui-menu-prefs", scope] });
    },
  });
}
