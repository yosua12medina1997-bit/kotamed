import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_programs",
  title: "Listar programas académicos",
  description:
    "Lista los nodos del catálogo académico de KOTAMED (programas, áreas y módulos) visibles para el usuario autenticado.",
  inputSchema: {
    kind: z.string().optional().describe("Filtrar por tipo de nodo, p. ej. 'program', 'area', 'module'."),
    parent_id: z.string().optional().describe("Listar solo los hijos de este nodo."),
    search: z.string().optional().describe("Texto a buscar en el título."),
    limit: z.number().int().optional().describe("Máximo de resultados (por defecto 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, parent_id, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("content_nodes")
      .select("id, title, slug, kind, parent_id, is_published, sort_order, description")
      .order("sort_order", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (kind) query = query.eq("kind", kind);
    if (parent_id) query = query.eq("parent_id", parent_id);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { nodes: data ?? [] },
        };
  },
});
