import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_enrollments",
  title: "Mis matrículas",
  description:
    "Lista las matrículas del usuario autenticado con el programa o módulo asociado, estado y vigencia.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_enrollments")
      .select(
        "id, status, enrollment_kind, assignment_type, starts_at, expires_at, observations, node_id, content_nodes(title, slug, kind)",
      )
      .eq("user_id", ctx.getUserId() ?? "")
      .order("created_at", { ascending: false });
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : {
          content: [{ type: "text", text: JSON.stringify(data ?? []) }],
          structuredContent: { enrollments: data ?? [] },
        };
  },
});
