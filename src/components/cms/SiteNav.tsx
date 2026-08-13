/**
 * Navegación pública editable desde CMS Studio (cabecera con submenús y pie).
 * Si aún no hay elementos en el CMS, usa la navegación por defecto de KotaMed.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { DEFAULT_HEADER, DEFAULT_FOOTER, useSiteNav, type CmsNavNode } from "@/lib/cms-nav";
import { useRouteMap } from "@/lib/cms-routes";

function Icon({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return null;
  const Cmp = (Icons as unknown as Record<string, React.ElementType>)[name];
  return Cmp ? <Cmp className={className} /> : null;
}

function Anchor({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const { resolve } = useRouteMap();
  const target = resolve(href);
  if (target.startsWith("/")) {
    return (
      <Link to={target} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  if (/^https?:\/\//i.test(target)) {
    return (
      <a href={target} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <a href={target} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** Navegación por defecto en el mismo formato de árbol. */
function fallback(location: "header" | "footer"): CmsNavNode[] {
  const src = location === "header" ? DEFAULT_HEADER : DEFAULT_FOOTER;
  return src.map((it, i) => ({
    id: `d-${location}-${i}`,
    location,
    parent_id: null,
    label: it.label,
    href: it.href,
    icon: it.icon ?? null,
    badge: it.badge ?? null,
    description: null,
    group_label: null,
    is_cta: it.is_cta ?? false,
    sort_order: i,
    visible: true,
    children: (it.children ?? []).map((c, j) => ({
      id: `d-${location}-${i}-${j}`,
      location,
      parent_id: `d-${location}-${i}`,
      label: c.label,
      href: c.href,
      icon: c.icon ?? null,
      badge: null,
      description: c.description ?? null,
      group_label: null,
      is_cta: false,
      sort_order: j,
      visible: true,
    })),
  }));
}

export function useNavTree(location: "header" | "footer") {
  const { data } = useSiteNav(location);
  return data && data.length > 0 ? data : fallback(location);
}

/* ------------------------------ Cabecera ---------------------------- */

export function SiteNavLinks({ className }: { className?: string }) {
  const items = useNavTree("header").filter((i) => !i.is_cta && !/^\/auth$/.test(i.href));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className={className ?? "hidden lg:flex items-center justify-center gap-6 text-[13px] font-semibold text-muted-foreground"}>
      {items.map((it) =>
        it.children.length === 0 ? (
          <Anchor
            key={it.id}
            href={it.href}
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-x-100"
          >
            {it.label}
          </Anchor>
        ) : (
          <div
            key={it.id}
            className="relative"
            onMouseEnter={() => setOpen(it.id)}
            onMouseLeave={() => setOpen(null)}
          >
            <button
              type="button"
              onClick={() => setOpen((o) => (o === it.id ? null : it.id))}
              className="inline-flex items-center gap-1 py-1 transition-colors hover:text-foreground"
              aria-expanded={open === it.id}
            >
              {it.label}
              <ChevronDown className={`size-3.5 transition-transform ${open === it.id ? "rotate-180" : ""}`} />
            </button>
            {open === it.id && (
              <div className="absolute left-1/2 top-full z-50 w-[320px] -translate-x-1/2 pt-3">
                <div className="glass rounded-2xl border border-border/60 bg-background/95 p-2 shadow-[0_24px_60px_-30px_oklch(0.24_0.04_258_/_0.45)]">
                  {it.children.map((c) => (
                    <Anchor
                      key={c.id}
                      href={c.href}
                      onClick={() => setOpen(null)}
                      className="flex items-start gap-2.5 rounded-xl px-3 py-2 transition hover:bg-muted/60"
                    >
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon name={c.icon ?? "Circle"} className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-foreground">{c.label}</span>
                        {c.description && (
                          <span className="block text-[11px] leading-snug text-muted-foreground">
                            {c.description}
                          </span>
                        )}
                      </span>
                    </Anchor>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      )}
    </nav>
  );
}

/** Menú desplegable móvil con la misma navegación del CMS. */
export function SiteNavMobile() {
  const items = useNavTree("header");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-background/70 lg:hidden"
      >
        <Menu className="size-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[86%] max-w-sm overflow-y-auto bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-tight">Menú</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="grid size-8 place-items-center rounded-lg border border-border"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 space-y-1">
              {items.map((it) => (
                <div key={it.id}>
                  <Anchor
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${
                      it.is_cta ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                    }`}
                  >
                    <Icon name={it.icon} className="size-4" />
                    {it.label}
                    {it.badge && (
                      <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {it.badge}
                      </span>
                    )}
                  </Anchor>
                  {it.children.length > 0 && (
                    <div className="ml-4 border-l border-border/60 pl-3">
                      {it.children.map((c) => (
                        <Anchor
                          key={c.id}
                          href={c.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
                        >
                          {c.label}
                        </Anchor>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Botones destacados de la cabecera (sesión + CTA). */
export function SiteNavActions() {
  const items = useNavTree("header");
  const cta = items.find((i) => i.is_cta);
  const login = items.find((i) => i.href === "/auth" && !i.is_cta);

  return (
    <div className="flex items-center justify-end gap-2">
      {login && (
        <Anchor
          href={login.href}
          className="hidden sm:inline-flex items-center rounded-xl border border-border bg-background/60 px-4 py-2 text-[13px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          {login.label}
        </Anchor>
      )}
      {cta && (
        <Anchor
          href={cta.href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
        >
          {cta.label}
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </Anchor>
      )}
      <SiteNavMobile />
    </div>
  );
}

/* -------------------------------- Pie ------------------------------- */

export function SiteFooterNav() {
  const groups = useNavTree("footer");
  if (!groups.length) return null;
  return (
    <div className="grid gap-8 sm:grid-cols-3">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {g.label}
          </div>
          <div className="mt-3 space-y-1.5">
            {(g.children.length ? g.children : [g]).map((c) => (
              <Anchor
                key={c.id}
                href={c.href}
                className="block text-[13px] text-muted-foreground transition hover:text-foreground"
              >
                {c.label}
              </Anchor>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
