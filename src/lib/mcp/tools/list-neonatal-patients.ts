import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_neonatal_patients",
  title: "Listar pacientes neonatales",
  description:
    "Lista el censo de pacientes del módulo de Hospitalización Neonatal accesibles para el usuario autenticado.",
  inputSchema: {
    status: z.string().optional().describe("Filtrar por estado, p. ej. 'hospitalizado' o 'alta'."),
    unit: z.string().optional().describe("Filtrar por unidad (UCIN, intermedios, etc.)."),
    search: z.string().optional().describe("Texto a buscar en apellidos o número de historia clínica."),
    limit: z.number().int().optional().describe("Máximo de resultados (por defecto 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, unit, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("neo_patients")
      .select(
        "id, apellidos, nombres, hc, sexo, unit, status, fecha_ingreso, fecha_nacimiento, edad_gestacional, peso_nacimiento, diagnostico_ingreso",
      )
      .order("fecha_ingreso", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (status) query = query.eq("status", status);
    if (unit) query = query.eq("unit", unit);
    if (search) query = query.or(`apellidos.ilike.%${search}%,hc.ilike.%${search}%`);
    const { data, error } = await query;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { patients: data ?? [] },
        };
  },
});
