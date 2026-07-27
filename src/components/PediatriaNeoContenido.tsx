/**
 * Vista de contenido exclusiva para el módulo Pediatría & Neonatología.
 * Muestra dos bloques (Neonatología / Pediatría) con categorías y temas
 * en formato biblioteca clínica premium. No altera otros módulos.
 */

import { useMemo, useState } from "react";
import {
  Baby,
  BookMarked,
  ChevronRight,
  FileText,
  GraduationCap,
  ListChecks,
  Search,
  Stethoscope,
} from "lucide-react";
import {
  PEDIATRIA_NEONATOLOGIA_BLUEPRINT,
  TOPIC_STANDARD_FORMAT,
  type BlueprintBlock,
  type BlueprintCategory,
  type BlueprintTopic,
} from "@/lib/pediatria-neonatologia-blueprint";
import type { EnamAreaMeta } from "@/lib/enam-modules";

type BlockKey = BlueprintBlock["key"];

export function PediatriaNeoContenido({ meta }: { meta: EnamAreaMeta }) {
  const [active, setActive] = useState<BlockKey>("neonatologia");
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  const block = useMemo(
    () => PEDIATRIA_NEONATOLOGIA_BLUEPRINT.find((b) => b.key === active)!,
    [active],
  );

  const filtered = useMemo(() => filterBlock(block, query), [block, query]);

  const totalTopics = useMemo(
    () =>
      PEDIATRIA_NEONATOLOGIA_BLUEPRINT.reduce(
        (acc, b) =>
          acc + b.categories.reduce((a, c) => a + c.topics.length, 0),
        0,
      ),
    [],
  );

  return (
    <section className="glass rounded-3xl p-6 md:p-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked
              className="size-4"
              strokeWidth={2.25}
              style={{ color: meta.accent }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Biblioteca clínica · plan maestro
            </span>
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
            Contenido de {meta.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Dividido en dos bloques independientes. Cada tema se despliega con
            la misma estructura estándar (resumen, guías, casos, flashcards,
            banco de preguntas).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label="Bloques" value="2" accent={meta.accent} />
          <Stat label="Categorías" value={
            PEDIATRIA_NEONATOLOGIA_BLUEPRINT.reduce((a, b) => a + b.categories.length, 0)
          } accent={meta.accent} />
          <Stat label="Temas" value={totalTopics} accent={meta.accent} />
        </div>
      </div>

      {/* Tabs de bloque */}
      <div className="mt-6 flex flex-wrap gap-2">
        {PEDIATRIA_NEONATOLOGIA_BLUEPRINT.map((b) => {
          const isActive = active === b.key;
          const Icon = b.key === "neonatologia" ? Baby : Stethoscope;
          return (
            <button
              key={b.key}
              onClick={() => {
                setActive(b.key);
                setOpenCat(null);
                setOpenTopic(null);
              }}
              className={`group inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/50 bg-background/40 hover:border-border text-foreground"
              }`}
              style={isActive ? { background: b.accent } : undefined}
            >
              <Icon className="size-4" strokeWidth={2.25} />
              <span>{b.title}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-foreground/5 text-muted-foreground"
                }`}
              >
                {b.categories.reduce((a, c) => a + c.topics.length, 0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar en ${block.title}… (ej. sepsis, TORCH, RCP)`}
          className="w-full rounded-xl border border-border/60 bg-background/60 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{block.tagline}</p>

      {/* Categorías */}
      <div className="mt-6 space-y-3">
        {filtered.categories.map((cat) => {
          const isOpen = openCat === cat.key || query.trim().length > 0;
          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-border/50 bg-background/40 backdrop-blur overflow-hidden"
            >
              <button
                onClick={() =>
                  setOpenCat((prev) => (prev === cat.key ? null : cat.key))
                }
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-background/60 transition"
              >
                <span
                  className="inline-flex size-8 items-center justify-center rounded-lg text-[11px] font-extrabold text-white shrink-0"
                  style={{ background: block.accent }}
                >
                  <ListChecks className="size-4" strokeWidth={2.5} />
                </span>
                <span className="flex-1 text-sm md:text-base font-bold tracking-tight">
                  {cat.title}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {cat.topics.length} temas
                </span>
                <ChevronRight
                  className={`size-4 text-muted-foreground transition ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <ul className="divide-y divide-border/40 border-t border-border/40">
                  {cat.topics.map((topic) => {
                    const topicKey = `${cat.key}::${topic.title}`;
                    const topicOpen = openTopic === topicKey;
                    return (
                      <li key={topicKey} className="bg-background/20">
                        <button
                          onClick={() =>
                            setOpenTopic((prev) =>
                              prev === topicKey ? null : topicKey,
                            )
                          }
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-background/40 transition"
                        >
                          <span
                            className="size-1.5 rounded-full shrink-0"
                            style={{ background: block.accent }}
                          />
                          <span className="flex-1 text-sm font-semibold">
                            {topic.title}
                          </span>
                          {topic.items && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {topic.items.length} subtemas
                            </span>
                          )}
                          <ChevronRight
                            className={`size-3.5 text-muted-foreground transition ${
                              topicOpen ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        {topicOpen && (
                          <TopicDetail topic={topic} accent={block.accent} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {filtered.categories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-center text-sm text-muted-foreground">
            Sin coincidencias para “{query}”.
          </div>
        )}
      </div>

      {/* Nota final */}
      <div className="mt-8 rounded-2xl border border-border/50 bg-background/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap
            className="size-4"
            strokeWidth={2.25}
            style={{ color: meta.accent }}
          />
          <span className="font-bold text-foreground">Formato estándar</span>
        </div>
        Cada tema seguirá siempre la misma secuencia — resumen ejecutivo,
        fisiopatología, algoritmo, tratamiento basado en guías (MINSA / AAP /
        ESPGHAN / WHO), caso clínico interactivo, flashcards y banco de
        preguntas.
      </div>
    </section>
  );
}

function TopicDetail({
  topic,
  accent,
}: {
  topic: BlueprintTopic;
  accent: string;
}) {
  return (
    <div className="px-4 pb-4 pt-1 grid gap-4 md:grid-cols-2">
      {topic.items && topic.items.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-background/50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="size-1.5 rounded-full"
              style={{ background: accent }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Subtemas
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-1.5">
            {topic.items.map((it) => (
              <li
                key={it}
                className="text-xs font-medium text-foreground/80 flex items-center gap-1.5"
              >
                <ChevronRight
                  className="size-3 shrink-0"
                  style={{ color: accent }}
                />
                {it}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-border/50 bg-background/50 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText
            className="size-3.5"
            strokeWidth={2.5}
            style={{ color: accent }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Plantilla del tema
          </span>
        </div>
        <ol className="space-y-1 text-xs text-foreground/80 leading-relaxed">
          {TOPIC_STANDARD_FORMAT.map((s, i) => (
            <li key={s} className="flex items-start gap-1.5">
              <span
                className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                style={{ background: accent }}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2 min-w-[72px] text-center">
      <div
        className="text-lg font-extrabold tracking-tight leading-none"
        style={{ color: accent }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function filterBlock(block: BlueprintBlock, q: string): BlueprintBlock {
  const query = q.trim().toLowerCase();
  if (!query) return block;
  const categories: BlueprintCategory[] = [];
  for (const cat of block.categories) {
    const catMatch = cat.title.toLowerCase().includes(query);
    const topics = cat.topics.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.items?.some((i) => i.toLowerCase().includes(query)),
    );
    if (catMatch || topics.length > 0) {
      categories.push({ ...cat, topics: catMatch ? cat.topics : topics });
    }
  }
  return { ...block, categories };
}
