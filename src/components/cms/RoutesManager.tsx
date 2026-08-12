/**
 * Gestor central de rutas del sitio: rutas de páginas del CMS, página
 * principal, redirecciones 301/302 y validador de enlaces (bloques y menús).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Home,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Btn, Chip, Field, Input, Panel, Select } from "@/components/academy/ui";
import { supabase } from "@/integrations/supabase/client";
import { useCmsPages } from "@/lib/cms";
import { useSiteNav } from "@/lib/cms-nav";
import {
  auditRoutes,
  useDeleteRedirect,
  useHomePageId,
  useRedirects,
  useSaveRedirect,
  useSetHomePage,
  useSiteRoutes,
  type CmsRedirect,
} from "@/lib/cms-routes";

/** Todos los enlaces configurados en bloques del CMS. */
function useBlockLinks() {
  return useQuery({
    queryKey: ["cms-block-links"],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_blocks")
        .select("id,type,props,page_id,cms_pages(title)");
      if (error) throw error;
      const out: { scope: string; label: string; href: string | null | undefined }[] = [];
      for (const b of (data ?? []) as {
        id: string;
        type: string;
        props: Record<string, unknown> | null;
        cms_pages?: { title?: string } | null;
      }[]) {
        const pageTitle = b.cms_pages?.title ?? "Página";
        const props = (b.props ?? {}) as Record<string, unknown>;
        const push = (label: string, href: unknown) => {
          if (typeof href === "string" && href.length > 0) {
            out.push({ scope: `Bloques · ${pageTitle}`, label, href });
          }
        };
        push(`${b.type} · botón principal`, props.primaryHref);
        push(`${b.type} · botón secundario`, props.secondaryHref);
        for (const [i, it] of ((props.items as { title?: string; href?: string }[]) ?? []).entries()) {
          if (it?.href) push(`${b.type} · elemento ${it.title ?? i + 1}`, it.href);
        }
      }
      return out;
    },
  });
}

export function RoutesManager() {
  const { data: pages = [] } = useCmsPages();
  const routes = useSiteRoutes(pages);
  const { data: homeId } = useHomePageId();
  const setHome = useSetHomePage();
  const { data: redirects = [], isLoading, refetch } = useRedirects();
  const saveRedirect = useSaveRedirect();
  const deleteRedirect = useDeleteRedirect();
  const header = useSiteNav("header");
  const footer = useSiteNav("footer");
  const blockLinks = useBlockLinks();

  const [form, setForm] = useState<Partial<CmsRedirect>>({ code: 301, is_active: true });

  const links = useMemo(() => {
    const navLinks = [
      ...(header.data ?? []).flatMap((i) => [i, ...i.children]).map((i) => ({
        scope: "Menú superior",
        label: i.label,
        href: i.href,
      })),
      ...(footer.data ?? []).flatMap((i) => [i, ...i.children]).map((i) => ({
        scope: "Pie de página",
        label: i.label,
        href: i.href,
      })),
    ];
    return [...navLinks, ...(blockLinks.data ?? [])];
  }, [header.data, footer.data, blockLinks.data]);

  const audit = useMemo(
    () => auditRoutes({ routes, redirects, links, homeId: homeId ?? null }),
    [routes, redirects, links, homeId],
  );

  const submit = () => {
    if (!form.from_path || !form.to_path) return toast.error("Indica el origen y el destino.");
    saveRedirect.mutate(
      { ...form, from_path: form.from_path, to_path: form.to_path },
      {
        onSuccess: () => {
          toast.success("Redirección guardada");
          setForm({ code: 301, is_active: true });
        },
        onError: (e) => toast.error(String((e as Error).message)),
      },
    );
  };

  const errors = audit.issues.filter((i) => i.level === "error");
  const warnings = audit.issues.filter((i) => i.level === "warning");

  return (
    <div className="space-y-3">
      <Panel
        title="Rutas del sitio"
        accent="hsl(var(--primary))"
        subtitle="Cada página del CMS tiene una ruta pública. La página marcada como Home se sirve en /."
        actions={
          <Btn
            variant="outline"
            onClick={() => {
              refetch();
              blockLinks.refetch();
              toast.success("Rutas revalidadas");
            }}
          >
            <RefreshCw className="size-3.5" /> Revalidar
          </Btn>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Página</th>
                <th className="px-2 py-2">Ruta</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2 text-right">Home</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.pageId} className="border-t border-border/50">
                  <td className="px-2 py-2 font-bold">{r.title}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{r.path}</td>
                  <td className="px-2 py-2">
                    <Chip accent={r.status === "published" ? "#10b981" : "#64748b"}>
                      {r.status === "published" ? "Producción" : "Borrador"}
                    </Chip>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Btn
                      variant={r.isHome ? "outline" : "ghost"}
                      loading={setHome.isPending}
                      onClick={() => setHome.mutate(r.isHome ? null : r.pageId)}
                    >
                      <Home className="size-3.5" /> {r.isHome ? "Principal" : "Marcar"}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Redirecciones"
        accent="#f59e0b"
        subtitle="Evita enlaces roto tras renombrar rutas: el visitante se envía a la nueva dirección."
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
          <Field label="Origen">
            <Input
              value={form.from_path ?? ""}
              onChange={(e) => setForm({ ...form, from_path: e.target.value })}
              placeholder="/p/antigua-ruta"
            />
          </Field>
          <Field label="Destino">
            <Input
              value={form.to_path ?? ""}
              onChange={(e) => setForm({ ...form, to_path: e.target.value })}
              placeholder="/p/nueva-ruta"
            />
          </Field>
          <Field label="Código">
            <Select
              value={String(form.code ?? 301)}
              onChange={(e) => setForm({ ...form, code: Number(e.target.value) })}
            >
              <option value="301">301 permanente</option>
              <option value="302">302 temporal</option>
            </Select>
          </Field>
          <Field label="Activa">
            <Select
              value={form.is_active === false ? "0" : "1"}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === "1" })}
            >
              <option value="1">Sí</option>
              <option value="0">No</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Btn variant="solid" loading={saveRedirect.isPending} onClick={submit}>
              <Plus className="size-3.5" /> Añadir
            </Btn>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {isLoading ? (
            <div className="text-xs text-muted-foreground">Cargando redirecciones…</div>
          ) : redirects.length === 0 ? (
            <div className="text-xs text-muted-foreground">Todavía no hay redirecciones configuradas.</div>
          ) : (
            redirects.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs"
              >
                <Link2 className="size-3.5 text-muted-foreground" />
                <span className="font-mono">{r.from_path}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono">{r.to_path}</span>
                <Chip accent={r.code === 301 ? "#10b981" : "#f59e0b"}>{r.code}</Chip>
                {!r.is_active && <Chip accent="#64748b">Inactiva</Chip>}
                <div className="ml-auto flex items-center gap-1">
                  <Btn
                    variant="ghost"
                    onClick={() =>
                      saveRedirect.mutate({
                        ...r,
                        is_active: !r.is_active,
                        from_path: r.from_path,
                        to_path: r.to_path,
                      })
                    }
                  >
                    {r.is_active ? "Desactivar" : "Activar"}
                  </Btn>
                  <Btn
                    variant="ghost"
                    title="Eliminar redirección"
                    onClick={() => {
                      if (!window.confirm("¿Eliminar esta redirección?")) return;
                      deleteRedirect.mutate(r.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Btn>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel
        title="Validador de rutas y enlaces"
        accent={errors.length ? "#ef4444" : "#10b981"}
        subtitle={`${audit.ok} comprobaciones correctas · ${errors.length} errores · ${warnings.length} avisos`}
      >
        {audit.issues.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-3 text-xs font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Todas las rutas, menús y botones apuntan a
            destinos válidos.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {[...errors, ...warnings].map((i, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-xl border border-border/50 px-3 py-2 text-xs"
              >
                {i.level === "error" ? (
                  <AlertTriangle className="mt-0.5 size-3.5 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-3.5 text-amber-500" />
                )}
                <div className="min-w-0">
                  <div className="font-bold">
                    {i.scope} · {i.label}
                  </div>
                  <div className="text-muted-foreground">{i.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
