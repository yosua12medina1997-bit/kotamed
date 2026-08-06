/**
 * Renderizadores de bloques del CMS KotaMed.
 * Solo usan tokens semánticos del sistema de diseño (sin colores fijos).
 */
import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";
import { embedVideoUrl, type CmsBlock, type CmsBlockStyle, type CmsItem } from "@/lib/cms";
import {
  collectionToItems,
  useCollectionItems,
  type CmsCollection,
} from "@/lib/cms-collections";

function pad(style?: CmsBlockStyle) {
  switch (style?.paddingY) {
    case "sm":
      return "py-8";
    case "md":
      return "py-14";
    case "xl":
      return "py-28";
    default:
      return "py-20";
  }
}

function tone(style?: CmsBlockStyle) {
  switch (style?.tone) {
    case "muted":
      return "bg-muted/30";
    case "accent":
      return "bg-primary/5";
    case "gradient":
      return "bg-gradient-to-br from-primary/10 via-background to-background";
    default:
      return "";
  }
}

function alignCls(style?: CmsBlockStyle) {
  return style?.align === "left" ? "text-left" : style?.align === "right" ? "text-right" : "text-center";
}

function cols(style?: CmsBlockStyle) {
  switch (style?.columns) {
    case 2:
      return "sm:grid-cols-2";
    case 4:
      return "sm:grid-cols-2 lg:grid-cols-4";
    default:
      return "sm:grid-cols-2 lg:grid-cols-3";
  }
}

function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && (Icons as unknown as Record<string, React.ElementType>)[name]) || Icons.Sparkles;
  return <Cmp className={className} />;
}

function CtaButtons({ block }: { block: CmsBlock }) {
  const { primaryLabel, primaryHref, secondaryLabel, secondaryHref } = block.props;
  if (!primaryLabel && !secondaryLabel) return null;
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      {primaryLabel && (
        <Anchor
          href={primaryHref || "#"}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-90"
        >
          {primaryLabel} <ArrowRight className="size-4" />
        </Anchor>
      )}
      {secondaryLabel && (
        <Anchor
          href={secondaryHref || "#"}
          className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:border-primary/50"
        >
          {secondaryLabel}
        </Anchor>
      )}
    </div>
  );
}

function Anchor({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function Heading({ block }: { block: CmsBlock }) {
  const { eyebrow, title, subtitle, description } = block.props;
  return (
    <div className={`${alignCls(block.style)} ${block.style?.align === "center" ? "mx-auto max-w-3xl" : ""}`}>
      {eyebrow && (
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </span>
      )}
      {title && (
        <h2 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      )}
      {subtitle && <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>}
      {description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function Section({ block, children }: { block: CmsBlock; children: React.ReactNode }) {
  return (
    <section className={`${pad(block.style)} ${tone(block.style)} relative`}>
      <div className="mx-auto w-full max-w-6xl px-5">{children}</div>
    </section>
  );
}

const cardCls =
  "rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur transition hover:border-primary/40";

/* ------------------------------ Bloques ---------------------------- */

function Hero({ block }: { block: CmsBlock }) {
  const p = block.props;
  return (
    <section className={`${pad(block.style)} ${tone(block.style)} relative overflow-hidden`}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 lg:grid-cols-2">
        <div>
          <Heading block={block} />
          {(p.items ?? []).length > 0 && (
            <div className="mt-8 flex flex-wrap gap-5">
              {(p.items ?? []).map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon name={it.icon} className="size-4" />
                  </span>
                  {it.title}
                </div>
              ))}
            </div>
          )}
          <CtaButtons block={block} />
        </div>
        {p.image && (
          <div className="relative">
            <img
              src={p.image}
              alt={p.title ?? "KotaMed"}
              className="w-full rounded-3xl border border-border/60 object-cover shadow-2xl"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Banner({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-primary/5 p-8 sm:p-12">
        <Heading block={block} />
        <div className={block.style?.align === "center" ? "flex justify-center" : ""}>
          <CtaButtons block={block} />
        </div>
      </div>
    </Section>
  );
}

function Video({ block }: { block: CmsBlock }) {
  const src = embedVideoUrl(block.props.video ?? "", block.props.videoKind);
  const isFile = block.props.videoKind === "mp4" || block.props.videoKind === "upload";
  return (
    <Section block={block}>
      <Heading block={block} />
      {src && (
        <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl">
          {isFile ? (
            <video src={src} poster={block.props.poster} controls className="aspect-video w-full" />
          ) : (
            <iframe
              src={src}
              title={block.props.title ?? "Video"}
              allowFullScreen
              className="aspect-video w-full"
            />
          )}
        </div>
      )}
    </Section>
  );
}

function Counters({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      <div className={`mt-8 grid gap-4 ${cols(block.style)}`}>
        {(block.props.items ?? []).map((it, i) => (
          <div key={i} className={`${cardCls} text-center`}>
            <div className="text-3xl font-black tracking-tight text-primary">{it.value ?? it.title}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {it.label ?? it.text}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Cards({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      <div className={`mt-8 grid gap-4 ${cols(block.style)}`}>
        {(block.props.items ?? []).map((it, i) => (
          <ItemCard key={i} it={it} />
        ))}
      </div>
    </Section>
  );
}

function ItemCard({ it }: { it: CmsItem }) {
  const inner = (
    <>
      {it.image ? (
        <img src={it.image} alt={it.title ?? ""} className="mb-4 h-40 w-full rounded-xl object-cover" loading="lazy" />
      ) : (
        <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon name={it.icon} className="size-5" />
        </span>
      )}
      {it.badge && (
        <span className="mb-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
          {it.badge}
        </span>
      )}
      <div className="text-base font-bold">{it.title}</div>
      {it.subtitle && <div className="text-xs font-semibold text-primary">{it.subtitle}</div>}
      {it.price && <div className="mt-1 text-2xl font-black">{it.price}</div>}
      {it.text && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{it.text}</p>}
      {(it.features ?? []).length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {(it.features ?? []).map((f, j) => (
            <li key={j} className="flex gap-2">
              <Icons.Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> {f}
            </li>
          ))}
        </ul>
      )}
      {it.rating && (
        <div className="mt-2 text-xs font-bold text-primary">
          {"★".repeat(Math.max(1, Math.min(5, Number(it.rating) || 5)))}
        </div>
      )}
    </>
  );
  return it.href ? (
    <Anchor href={it.href} className={`${cardCls} block text-left`}>
      {inner}
    </Anchor>
  ) : (
    <div className={`${cardCls} text-left`}>{inner}</div>
  );
}

function Timeline({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      <ol className="relative mt-8 space-y-4 border-l border-border/60 pl-6">
        {(block.props.items ?? []).map((it, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
              {i + 1}
            </span>
            <div className={`${cardCls} text-left`}>
              {it.label && (
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{it.label}</div>
              )}
              <div className="text-sm font-bold">{it.title}</div>
              {it.text && <p className="mt-1 text-sm text-muted-foreground">{it.text}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Faq({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      <div className="mx-auto mt-8 max-w-3xl space-y-3">
        {(block.props.items ?? []).map((it, i) => (
          <details key={i} className="group rounded-2xl border border-border/60 bg-card/70 p-4">
            <summary className="cursor-pointer list-none text-sm font-bold">
              <span className="mr-2 text-primary">›</span>
              {it.title}
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{it.text}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function TableBlock({ block }: { block: CmsBlock }) {
  const items = block.props.items ?? [];
  return (
    <Section block={block}>
      <Heading block={block} />
      <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Detalle</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-4 py-3 font-semibold">{it.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{it.text}</td>
                <td className="px-4 py-3 font-bold text-primary">{it.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Gallery({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      <div className={`mt-8 grid gap-3 ${cols(block.style)}`}>
        {(block.props.items ?? []).map((it, i) => (
          <figure key={i} className="overflow-hidden rounded-2xl border border-border/60">
            {it.image && (
              <img src={it.image} alt={it.title ?? ""} className="h-56 w-full object-cover" loading="lazy" />
            )}
            {(it.title || it.text) && (
              <figcaption className="bg-card/70 p-3 text-left">
                <div className="text-sm font-bold">{it.title}</div>
                {it.text && <div className="text-xs text-muted-foreground">{it.text}</div>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </Section>
  );
}

function Carousel({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-3">
        {(block.props.items ?? []).map((it, i) => (
          <div key={i} className="min-w-[260px] max-w-[300px] shrink-0 snap-start">
            <ItemCard it={it} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function RichText({ block }: { block: CmsBlock }) {
  return (
    <Section block={block}>
      <Heading block={block} />
      {block.props.html && (
        <div className="prose prose-sm mx-auto mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {block.props.html}
        </div>
      )}
    </Section>
  );
}

/* ------------------------------ Registro --------------------------- */

export function CmsBlockView({ block }: { block: CmsBlock }) {
  const { data: rows } = useCollectionItems((block.props.collection as CmsCollection) || null);
  const resolved =
    block.props.collection && rows && rows.length
      ? { ...block, props: { ...block.props, items: collectionToItems(rows) } }
      : block;
  return <BlockSwitch block={resolved} />;
}

function BlockSwitch({ block }: { block: CmsBlock }) {
  switch (block.type) {
    case "hero":
      return <Hero block={block} />;
    case "banner":
    case "cta":
      return <Banner block={block} />;
    case "video":
      return <Video block={block} />;
    case "counters":
      return <Counters block={block} />;
    case "timeline":
      return <Timeline block={block} />;
    case "faq":
    case "accordion":
      return <Faq block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "gallery":
      return <Gallery block={block} />;
    case "carousel":
      return <Carousel block={block} />;
    case "richtext":
    case "infographic":
      return <RichText block={block} />;
    default:
      return <Cards block={block} />;
  }
}

export function CmsBlockList({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((b) => (
        <CmsBlockView key={b.id} block={b} />
      ))}
    </>
  );
}
