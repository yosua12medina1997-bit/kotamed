/**
 * Generación de imágenes para bloques del CMS (uso administrativo).
 * Devuelve la imagen final en base64 para subirla al almacén del CMS.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cms-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt } = (await request.json()) as { prompt?: string };
        if (!prompt || prompt.trim().length < 3) {
          return new Response("Prompt requerido", { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Falta LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt: `${prompt}. Fotografía o ilustración médica profesional, iluminación limpia, estética minimalista y moderna, tonos sobrios, apta para una plataforma de educación médica. Sin texto ni logotipos.`,
            quality: "low",
            size: "1024x1024",
            n: 1,
          }),
        });

        const body = await upstream.text();
        if (!upstream.ok) {
          return new Response(body, { status: upstream.status });
        }
        return new Response(body, { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
