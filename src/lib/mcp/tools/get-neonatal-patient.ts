import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_neonatal_patient",
  title: "Expediente neonatal",
  description:
    "Devuelve el expediente clínico de un paciente neonatal: datos generales, evoluciones, laboratorios, medicación y procedimientos recientes.",
  inputSchema: {
    patient_id: z.string().describe("ID del paciente neonatal."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: patient, error } = await supabase
      .from("neo_patients")
      .select("*")
      .eq("id", patient_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!patient) {
      return { content: [{ type: "text", text: "Paciente no encontrado o sin acceso." }], isError: true };
    }

    const related = await Promise.all(
      (
        [
          ["evolutions", "neo_evolutions", "recorded_at"],
          ["labs", "neo_labs", "taken_at"],
          ["medications", "neo_medications", "started_at"],
          ["procedures", "neo_procedures", "performed_at"],
        ] as const
      ).map(async ([key, table, order]) => {
        const { data } = await supabase
          .from(table)
          .select("*")
          .eq("patient_id", patient_id)
          .order(order, { ascending: false })
          .limit(20);
        return [key, data ?? []] as const;
      }),
    );

    const dossier = { patient, ...Object.fromEntries(related) };
    return {
      content: [{ type: "text", text: JSON.stringify(dossier) }],
      structuredContent: dossier,
    };
  },
});
