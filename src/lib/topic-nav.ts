/**
 * Navegación de retorno para las páginas de tema (`/tema/$topicId`).
 *
 * Al abrir un tema se guarda en el search param `from` la ruta del módulo
 * desde el que se abrió, para que el botón "Volver a …" regrese siempre al
 * módulo principal (con todos los temas) y no al tema visitado antes.
 */
import { useRouterState } from "@tanstack/react-router";

/** Search params para un enlace a `/tema/$topicId` desde un módulo. */
export function useTopicLinkSearch(): { from: string } {
  const href = useRouterState({ select: (s) => s.location.href });
  return { from: href };
}
