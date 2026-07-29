/**
 * Renderers por tipo de slide. Reutilizan tokens (glass, accent) del proyecto.
 */
import { useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Sparkles,
  Stethoscope,
  Target,
  AlertTriangle,
  Lightbulb,
  Library,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { Slide } from "@/lib/topic-schema";
import { SLIDE_KIND_LABEL } from "@/lib/topic-schema";

interface SlideProps {
  slide: Slide;
  accent: string;
}

function KindBadge({ kind, accent }: { kind: Slide["kind"]; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"
      style={{ background: accent }}
    >
      {SLIDE_KIND_LABEL[kind]}
    </span>
  );
}

function Header({ slide, accent, icon: Icon }: SlideProps & { icon?: React.ElementType }) {
  return (
    <header className="flex items-start gap-4 mb-6">
      {Icon && (
        <div
          className="shrink-0 size-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
          style={{ background: accent }}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <KindBadge kind={slide.kind} accent={accent} />
        <h2 className="mt-2 text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
          {slide.title}
        </h2>
      </div>
    </header>
  );
}

export function SlideRenderer({ slide, accent }: SlideProps) {
  switch (slide.kind) {
    case "title":
      return <TitleSlide slide={slide} accent={accent} />;
    case "objectives":
      return <BulletSlide slide={slide} accent={accent} icon={Target} />;
    case "concepts":
      return <BulletSlide slide={slide} accent={accent} icon={Sparkles} />;
    case "pearls":
      return <BulletSlide slide={slide} accent={accent} icon={Sparkles} />;
    case "mistakes":
      return <BulletSlide slide={slide} accent={accent} icon={AlertTriangle} />;
    case "tips":
      return <BulletSlide slide={slide} accent={accent} icon={Lightbulb} />;
    case "table":
    case "comparison":
    case "drugs":
    case "epidemiology":
      return <TableSlide slide={slide} accent={accent} />;
    case "cards":
      return <CardsSlide slide={slide} accent={accent} />;
    case "timeline":
      return <TimelineSlide slide={slide} accent={accent} />;
    case "steps":
      return <StepsSlide slide={slide} accent={accent} />;
    case "flowchart":
    case "diagram":
      return <FlowchartSlide slide={slide} accent={accent} />;
    case "case":
      return <CaseSlide slide={slide} accent={accent} />;
    case "references":
      return <ReferencesSlide slide={slide} accent={accent} />;
    case "image":
      return <ImageSlide slide={slide} accent={accent} />;
    case "summary":
    case "takehome":
    case "intro":
    default:
      return <ProseSlide slide={slide} accent={accent} />;
  }
}

function TitleSlide({ slide, accent }: SlideProps) {
  return (
    <div className="h-full flex flex-col justify-center text-center px-4">
      <div
        className="mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-3xl text-white shadow-lg"
        style={{ background: accent }}
      >
        <BookOpen className="size-8" strokeWidth={2} />
      </div>
      <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
        {slide.title}
      </h1>
      {slide.body && (
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {slide.body}
        </p>
      )}
    </div>
  );
}

function ProseSlide({ slide, accent }: SlideProps) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={BookOpen} />
      {slide.body && (
        <p className="text-base md:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {slide.body}
        </p>
      )}
      {slide.bullets && slide.bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-base">
              <span
                className="mt-1.5 size-1.5 rounded-full shrink-0"
                style={{ background: accent }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BulletSlide({
  slide,
  accent,
  icon,
}: SlideProps & { icon: React.ElementType }) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={icon} />
      <ul className="space-y-3">
        {(slide.bullets ?? []).map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/50 p-4"
          >
            <span
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
              style={{ background: accent }}
            >
              {i + 1}
            </span>
            <span className="text-base leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TableSlide({ slide, accent }: SlideProps) {
  const t = slide.table;
  return (
    <div>
      <Header slide={slide} accent={accent} icon={ListChecks} />
      {slide.body && <p className="mb-4 text-sm text-muted-foreground">{slide.body}</p>}
      {t ? (
        <div className="overflow-x-auto rounded-2xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: accent }} className="text-white">
                {t.headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2.5 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, i) => (
                <tr key={i} className="odd:bg-background/40 even:bg-background/20">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 align-top border-t border-border/40">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin tabla definida.</p>
      )}
    </div>
  );
}

function CardsSlide({ slide, accent }: SlideProps) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={ListChecks} />
      <div className="grid gap-3 sm:grid-cols-2">
        {(slide.cards ?? []).map((c, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-background/50 p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-flex size-6 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ background: accent }}
              >
                {i + 1}
              </span>
              <h3 className="font-bold text-base">{c.title}</h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineSlide({ slide, accent }: SlideProps) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={Clock} />
      <ol className="relative border-l-2 pl-6 space-y-4" style={{ borderColor: accent }}>
        {(slide.timeline ?? []).map((t, i) => (
          <li key={i} className="relative">
            <span
              className="absolute -left-[33px] top-1 inline-flex size-4 rounded-full ring-4 ring-background"
              style={{ background: accent }}
            />
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t.time}
            </div>
            <div className="font-bold">{t.label}</div>
            {t.body && <p className="mt-1 text-sm text-foreground/80">{t.body}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepsSlide({ slide, accent }: SlideProps) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={ListChecks} />
      <ol className="space-y-3">
        {(slide.steps ?? []).map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/50 p-4"
          >
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
              style={{ background: accent }}
            >
              {i + 1}
            </span>
            <div>
              <div className="font-bold">{s.title}</div>
              {s.body && <p className="mt-1 text-sm text-foreground/80">{s.body}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FlowchartSlide({ slide, accent }: SlideProps) {
  const nodes = slide.flowchart?.nodes ?? [];
  const edges = slide.flowchart?.edges ?? [];
  return (
    <div>
      <Header slide={slide} accent={accent} icon={ArrowRight} />
      {slide.body && <p className="mb-4 text-sm text-muted-foreground">{slide.body}</p>}
      <div className="grid gap-2">
        {nodes.map((n) => {
          const outgoing = edges.filter((e) => e.from === n.id);
          return (
            <div key={n.id} className="space-y-1">
              <div
                className="rounded-xl border-2 bg-background/60 px-4 py-2.5 font-semibold text-sm"
                style={{ borderColor: accent }}
              >
                {n.label}
              </div>
              {outgoing.map((e, i) => {
                const target = nodes.find((x) => x.id === e.to);
                return (
                  <div
                    key={i}
                    className="ml-6 flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <ArrowRight className="size-3.5" style={{ color: accent }} />
                    {e.label && (
                      <span
                        className="rounded-full bg-foreground/[0.06] px-2 py-0.5 font-bold uppercase tracking-widest text-[9px]"
                      >
                        {e.label}
                      </span>
                    )}
                    <span className="font-medium">→ {target?.label ?? e.to}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        {nodes.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin nodos definidos.</p>
        )}
      </div>
    </div>
  );
}

function CaseSlide({ slide, accent }: SlideProps) {
  const c = slide.clinicalCase;
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <Header slide={slide} accent={accent} icon={Stethoscope} />
      <div
        className="rounded-2xl border-l-4 bg-background/50 p-4 text-base leading-relaxed"
        style={{ borderColor: accent }}
      >
        {c?.presentation ?? "Sin caso definido."}
      </div>
      {c?.questions && c.questions.length > 0 && (
        <div className="mt-4 space-y-2">
          {c.questions.map((q, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-background/40"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left flex items-start gap-2 px-4 py-3"
                >
                  {isOpen ? (
                    <ChevronDown className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                  ) : (
                    <ChevronRight className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                  )}
                  <span className="font-bold text-sm">{q.q}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pl-10 text-sm text-foreground/85 leading-relaxed">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                      <Check className="size-3" /> Respuesta
                    </div>
                    {q.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReferencesSlide({ slide, accent }: SlideProps) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={Library} />
      <ul className="space-y-2">
        {(slide.references ?? []).map((r, i) => (
          <li
            key={i}
            className="rounded-xl border border-border/50 bg-background/50 p-3 text-sm"
          >
            <div className="font-semibold">{r.label}</div>
            {r.source && <div className="text-xs text-muted-foreground mt-0.5">{r.source}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageSlide({ slide, accent }: SlideProps) {
  return (
    <div>
      <Header slide={slide} accent={accent} icon={BookOpen} />
      {slide.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className="rounded-2xl border border-border/50 max-h-[60vh] mx-auto"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          Sin imagen.
        </div>
      )}
      {slide.body && (
        <p className="mt-3 text-sm text-muted-foreground text-center">{slide.body}</p>
      )}
    </div>
  );
}
