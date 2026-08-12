/**
 * Selector de destino de enlaces del CMS.
 * Permite elegir una página interna (guardada como `page:<uuid>`, de modo que
 * el enlace sigue automáticamente los cambios de ruta), una ruta manual de la
 * aplicación o una URL externa validada.
 */
import { useMemo } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Input, Select } from "@/components/academy/ui";
import { useCmsPages } from "@/lib/cms";
import { PAGE_LINK_PREFIX, isPageLink, pagePath, useHomePageId } from "@/lib/cms-routes";

type Mode = "page" | "internal" | "external";

function modeOf(value: string): Mode {
  if (isPageLink(value)) return "page";
  if (/^https?:\/\//i.test(value)) return "external";
  return "internal";
}

export function LinkPicker({
  value,
  onChange,
  label = "Destino",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const { data: pages = [] } = useCmsPages();
  const { data: homeId } = useHomePageId();
  const mode = modeOf(value ?? "");
  const options = useMemo(
    () =>
      pages
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((p) => ({
          id: p.id,
          label: `${p.title} — ${pagePath(p.slug, homeId === p.id)}`,
        })),
    [pages, homeId],
  );
  const externalInvalid =
    mode === "external" &&
    (() => {
      try {
        new URL(value);
        return false;
      } catch {
        return true;
      }
    })();

  return (
    <div className="space-y-1.5 rounded-xl border border-border/50 p-2">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Link2 className="size-3" /> {label}
      </div>
      <Select
        value={mode}
        onChange={(e) => {
          const m = e.target.value as Mode;
          if (m === "page") onChange(pages[0] ? `${PAGE_LINK_PREFIX}${pages[0].id}` : "");
          else if (m === "external") onChange("https://");
          else onChange("/");
        }}
      >
        <option value="page">Página del CMS (ruta automática)</option>
        <option value="internal">Ruta interna de la app</option>
        <option value="external">URL externa</option>
      </Select>

      {mode === "page" ? (
        <Select
          value={value.slice(PAGE_LINK_PREFIX.length)}
          onChange={(e) => onChange(`${PAGE_LINK_PREFIX}${e.target.value}`)}
        >
          <option value="">— Selecciona una página —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === "external" ? "https://ejemplo.com" : "/programas"}
        />
      )}

      {mode === "external" && (
        <p className={`flex items-center gap-1 text-[10px] ${externalInvalid ? "text-destructive" : "text-muted-foreground"}`}>
          <ExternalLink className="size-3" />
          {externalInvalid ? "URL no válida" : "Se abrirá en una pestaña nueva con rel=noopener noreferrer"}
        </p>
      )}
    </div>
  );
}
