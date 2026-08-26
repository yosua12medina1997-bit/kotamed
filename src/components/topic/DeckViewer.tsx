/**
 * Visor de presentación de diapositivas visuales (imágenes) de un tema.
 * Teclado, swipe móvil, miniaturas, contador y pantalla completa.
 * Las imágenes se muestran completas (object-contain), nunca recortadas.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import type { TopicDeck } from "@/lib/topic-deck";

interface Props {
  deck: TopicDeck;
  title: string;
  accent: string;
  onClose: () => void;
  badge?: string;
}

export function DeckViewer({ deck, title, accent, onClose, badge }: Props) {
  const [idx, setIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchX = useRef<number | null>(null);
  const total = deck.slides.length;
  const slide = deck.slides[Math.min(idx, total - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setIdx((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key.toLowerCase() === "f") setFullscreen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-background/97 backdrop-blur">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white"
              style={{ background: accent }}
            >
              Presentación
            </span>
            {badge && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600">
                {badge}
              </span>
            )}
          </div>
          <h3 className="truncate text-sm font-extrabold tracking-tight">{title}</h3>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span>
            {idx + 1} / {total}
          </span>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="rounded-lg p-1.5 hover:bg-muted/60"
            aria-label="Pantalla completa"
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/60" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/90 p-2 md:p-6"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchX.current = null;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) < 40) return;
          setIdx((i) => (dx < 0 ? Math.min(total - 1, i + 1) : Math.max(0, i - 1)));
        }}
      >
        <img
          src={slide.url}
          alt={slide.caption || `${title} — diapositiva ${idx + 1}`}
          className="max-h-full max-w-full object-contain"
        />
        {idx > 0 && (
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {idx < total - 1 && (
          <button
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20"
            aria-label="Siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
        {slide.caption && (
          <div className="absolute bottom-2 left-1/2 max-w-[90%] -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1.5 text-center text-xs text-white">
            {slide.caption}
          </div>
        )}
      </div>

      {!fullscreen && (
        <footer className="flex gap-2 overflow-x-auto border-t border-border/60 px-3 py-2">
          {deck.slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === idx ? "border-primary" : "border-border/50 opacity-70 hover:opacity-100"
              }`}
              title={`Diapositiva ${i + 1}`}
            >
              <img src={s.url} alt="" className="size-full object-contain bg-black/80" />
              <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[9px] font-bold text-white">
                {i + 1}
              </span>
            </button>
          ))}
        </footer>
      )}
    </div>
  );
}
