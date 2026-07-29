/**
 * Overlay full-screen que muestra un `Topic` como presentación secuencial.
 * Un slide por pantalla. Navegación por teclado, botones y barra inferior.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import type { Topic } from "@/lib/topic-schema";
import { SLIDE_KIND_LABEL } from "@/lib/topic-schema";
import { SlideRenderer } from "./slides";

interface Props {
  topic: Topic;
  accent: string;
  onClose: () => void;
  initialIndex?: number;
}

export function TopicPresenter({ topic, accent, onClose, initialIndex = 0 }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const [fullscreen, setFullscreen] = useState(false);
  const total = topic.slides.length;
  const slide = topic.slides[idx];

  const next = () => setIdx((i) => Math.min(total - 1, i + 1));
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setIdx((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "f") {
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  const progress = useMemo(() => ((idx + 1) / total) * 100, [idx, total]);

  if (!slide) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Este tema aún no tiene diapositivas.</p>
          <button
            onClick={onClose}
            className="mt-3 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col animate-in fade-in">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/40">
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-bold uppercase tracking-widest truncate"
            style={{ color: accent }}
          >
            {topic.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {SLIDE_KIND_LABEL[slide.kind]} · {idx + 1} / {total}
          </div>
        </div>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/[0.06]"
          title="Presentación (F)"
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/[0.06]"
          title="Cerrar (Esc)"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Slide */}
      <div className="flex-1 overflow-y-auto">
        <div
          key={slide.id}
          className={`mx-auto w-full px-4 md:px-10 py-8 md:py-12 animate-in fade-in slide-in-from-right-3 duration-300 ${
            fullscreen ? "max-w-5xl" : "max-w-4xl"
          }`}
        >
          <SlideRenderer slide={slide} accent={accent} />
        </div>
      </div>

      {/* Bottom bar */}
      <footer className="border-t border-border/40 bg-background/60">
        <div className="h-1 w-full bg-foreground/[0.06]">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: accent }}
          />
        </div>
        <div className="flex items-center gap-2 px-4 md:px-6 py-3">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-bold disabled:opacity-40 hover:bg-background/80"
          >
            <ChevronLeft className="size-3.5" /> Atrás
          </button>
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-1 justify-center">
              {topic.slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setIdx(i)}
                  className="size-2 rounded-full transition"
                  style={{
                    background: i === idx ? accent : "hsl(var(--muted-foreground) / 0.25)",
                    transform: i === idx ? "scale(1.5)" : undefined,
                  }}
                  title={`${i + 1}. ${s.title}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={next}
            disabled={idx === total - 1}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            style={{ background: accent }}
          >
            Siguiente <ChevronRight className="size-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
