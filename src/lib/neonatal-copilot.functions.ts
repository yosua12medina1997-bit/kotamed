/**
 * KOTAMED AI · Server functions del copiloto clínico neonatal.
 * El prompt del sistema y las instrucciones de cada función se leen desde la
 * configuración administrada en la base de datos, nunca desde el cliente.
 */
import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  AI_DISCLAIMER,
  DEFAULT_COPILOT_CONFIG,
  type CopilotConfig,
} from "./neonatal-copilot";

const AI_SCOPE = "internado:pediatria-neonatologia:hospitalizacion:ai";

export const neoCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mode: string; context: string; extra?: string }) => input)
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Falta LOVABLE_API_KEY.");

    const { data: row } = await context.supabase
      .from("neo_form_config")
      .select("config")
      .eq("scope", AI_SCOPE)
      .maybeSingle();

    const saved = (row?.config ?? null) as Partial<CopilotConfig> | null;
    const cfg: CopilotConfig = { ...DEFAULT_COPILOT_CONFIG, ...(saved ?? {}) };
    const fn =
      (cfg.functions ?? DEFAULT_COPILOT_CONFIG.functions).find((f) => f.id === data.mode) ??
      DEFAULT_COPILOT_CONFIG.functions.find((f) => f.id === data.mode);
    if (!fn) throw new Error("Función de IA no disponible.");
    if (fn.enabled === false) throw new Error("Esta función está desactivada por el administrador.");

    const protocols = (cfg.protocols ?? [])
      .map((p) => `- ${p.title}: ${p.body}`)
      .join("\n");
    const references = (cfg.references ?? []).join(" · ");

    const prompt = [
      data.context,
      protocols ? `\n## PROTOCOLOS DEL SERVICIO (respétalos)\n${protocols}` : "",
      references ? `\n## BIBLIOGRAFÍA PREFERENTE DEL SERVICIO\n${references}` : "",
      `\n## TAREA\n${fn.prompt}`,
      data.extra?.trim() ? `\n## DATO ADICIONAL DEL USUARIO\n${data.extra.trim().slice(0, 6000)}` : "",
      `\nFormato: secciones con títulos cortos en MAYÚSCULA y viñetas con "- ". Sin markdown pesado.
Al final añade una línea que comience con "NOTA:" con la advertencia de apoyo a la decisión clínica.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = streamText({
        model: createLovableAiGatewayProvider(key).chatModel(
          cfg.model || DEFAULT_COPILOT_CONFIG.model,
        ),
        system: cfg.system || DEFAULT_COPILOT_CONFIG.system,
        prompt,
      });
      const text = await result.text;
      return { text, disclaimer: cfg.disclaimer || AI_DISCLAIMER };
    } catch (error: any) {
      const msg = String(error?.message ?? error);
      const status =
        Number(error?.statusCode ?? error?.status ?? error?.response?.status ?? 0) || 0;
      const is = (code: number, ...words: string[]) =>
        status === code || words.some((w) => msg.toLowerCase().includes(w));

      if (is(429, "429", "rate limit", "too many requests")) {
        throw new Error("Límite de solicitudes de IA alcanzado. Intenta nuevamente en unos minutos.");
      }
      if (is(402, "402", "payment required", "insufficient", "credit")) {
        throw new Error(
          "Créditos de IA agotados en el espacio de trabajo. Recarga créditos en Ajustes → Planes y créditos para volver a usar KotaMed AI.",
        );
      }
      throw new Error(`KotaMed AI no pudo responder: ${msg}`);
    }

  });
