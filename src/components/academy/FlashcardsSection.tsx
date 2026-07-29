/**
 * Flashcards Anki-style con repetición espaciada (SM-2 simplificado).
 * El admin genera mazos con IA por tema o desde material; el estudiante
 * repasa y el sistema programa la siguiente revisión.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Layers3, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { generateFlashcards } from "@/lib/academy-ai.functions";
import { Btn, Chip, Empty, Field, Input, Metric, Panel, Select, Textarea } from "./ui";
import { db, LEVELS, logStudy, readFilesAsText } from "./api";
import { Modal } from "./CasosSection";

type Card = {
  id: string;
  front: string;
  back: string;
  topic: string | null;
  tags: string[];
  difficulty: number;
};

const GRADES = [
  { g: 0, label: "Otra vez", days: 0 },
  { g: 3, label: "Difícil", days: 1 },
  { g: 4, label: "Bien", days: 3 },
  { g: 5, label: "Fácil", days: 7 },
];

export function FlashcardsSection({ meta, isAdmin }: { meta: EnamAreaMeta; isAdmin: boolean }) {
  const accent = meta.accent;
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [topic, setTopic] = useState("");
  const [review, setReview] = useState(false);

  const list = useQuery({
    queryKey: ["academy-flashcards", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_flashcards")
        .select("*")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Card[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("academy_flashcards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-flashcards", meta.slug] }),
  });

  const topics = useMemo(
    () => Array.from(new Set((list.data ?? []).map((c) => c.topic).filter(Boolean))) as string[],
    [list.data],
  );
  const cards = useMemo(
    () => (list.data ?? []).filter((c) => !topic || c.topic === topic),
    [list.data, topic],
  );

  return (
    <Panel
      accent={accent}
      icon={<Layers3 className="size-4" strokeWidth={2.25} />}
      title="Flashcards"
      subtitle="Active recall con repetición espaciada, organizadas por tema, módulo y bloque."
      actions={
        <>
          <Btn variant="solid" accent={accent} onClick={() => setReview(true)}>
            <RotateCcw className="size-3" /> Repasar
          </Btn>
          {isAdmin && (
            <Btn onClick={() => setCreating(true)}>
              <Sparkles className="size-3" /> Generar mazo IA
            </Btn>
          )}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Tarjetas" value={list.data?.length ?? 0} accent={accent} />
        <Metric label="Temas" value={topics.length} accent={accent} />
        <Metric label="En este filtro" value={cards.length} accent={accent} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Select value={topic} onChange={(e) => setTopic(e.target.value)} className="max-w-64">
          <option value="">Todos los temas</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {cards.slice(0, 40).map((c) => (
          <div key={c.id} className="rounded-2xl border border-border/50 bg-background/40 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-xs font-bold">{c.front}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.back}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.topic && <Chip accent={accent}>{c.topic}</Chip>}
                  <Chip>Dif. {c.difficulty}</Chip>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => del.mutate(c.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar tarjeta"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!list.isLoading && cards.length === 0 && (
          <div className="md:col-span-2">
            <Empty
              text={
                isAdmin
                  ? "Genera un mazo con IA por tema o a partir de tu material."
                  : "Aún no hay flashcards en esta área."
              }
            />
          </div>
        )}
      </div>

      {creating && (
        <DeckCreator
          meta={meta}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["academy-flashcards", meta.slug] });
          }}
        />
      )}

      {review && (
        <ReviewRunner
          cards={cards}
          accent={accent}
          areaSlug={meta.slug}
          onClose={() => setReview(false)}
        />
      )}
    </Panel>
  );
}

function DeckCreator({
  meta,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const gen = useServerFn(generateFlashcards);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(20);
  const [level, setLevel] = useState("residentado");
  const [sourceText, setSourceText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!topic.trim()) return toast.error("Indica el tema del mazo.");
    setBusy(true);
    try {
      const cards: any[] = (await gen({
        data: { topic, count, level, sourceText: sourceText || undefined },
      })) as any[];
      const { error } = await db.from("academy_flashcards").insert(
        cards.map((c) => ({
          area_slug: meta.slug,
          front: c.front,
          back: c.back,
          topic: c.topic ?? topic,
          tags: c.tags ?? [],
          difficulty: Number(c.difficulty) || 2,
        })),
      );
      if (error) throw new Error(error.message);
      toast.success(`${cards.length} flashcards creadas`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Generar mazo de flashcards" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tema">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <Field label="Cantidad">
            <Input
              type="number"
              min={5}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
          <Field label="Nivel">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Material opcional (archivo o texto)">
          <input
            type="file"
            multiple
            accept=".doc,.docx,.pdf,.xlsx,.xls,.csv,.txt,.md"
            className="mb-2 block text-[11px]"
            onChange={async (e) => setSourceText(await readFilesAsText(e.target.files))}
          />
          <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
        </Field>
        <Btn variant="solid" accent={meta.accent} loading={busy} onClick={run}>
          <Sparkles className="size-3" /> Generar
        </Btn>
      </div>
    </Modal>
  );
}

function ReviewRunner({
  cards,
  accent,
  areaSlug,
  onClose,
}: {
  cards: Card[];
  accent: string;
  areaSlug: string;
  onClose: () => void;
}) {
  const deck = useMemo(() => cards.slice(0, 30), [cards]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [start] = useState(Date.now());
  const card = deck[i];

  if (!card) {
    return (
      <Modal title="Repaso" onClose={onClose}>
        <Empty text="No hay tarjetas para repasar." />
      </Modal>
    );
  }

  const grade = async (g: number, days: number) => {
    const due = new Date(Date.now() + days * 86400000).toISOString();
    try {
      await db.from("academy_flashcard_reviews").upsert(
        {
          card_id: card.id,
          last_grade: g,
          interval_days: days,
          ease: g >= 4 ? 2.6 : 2.2,
          due_at: due,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,card_id" },
      );
    } catch {
      /* noop */
    }
    if (i + 1 < deck.length) {
      setI(i + 1);
      setFlipped(false);
    } else {
      logStudy({
        areaSlug,
        activity: "flashcards",
        minutes: Math.max(1, Math.round((Date.now() - start) / 60000)),
      });
      toast.success("Repaso completado");
      onClose();
    }
  };

  return (
    <Modal title={`Repaso · ${i + 1} de ${deck.length}`} onClose={onClose}>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-40 rounded-2xl border border-border/60 bg-background/50 p-6 text-center transition hover:border-primary/40"
      >
        <p className="text-sm font-bold">{card.front}</p>
        {flipped && (
          <p className="mt-4 border-t border-border/50 pt-4 text-sm leading-relaxed text-muted-foreground">
            {card.back}
          </p>
        )}
        {!flipped && (
          <p className="mt-4 text-[11px] text-muted-foreground">Toca para revelar</p>
        )}
      </button>
      {flipped && (
        <div className="mt-4 flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <Btn key={g.g} accent={accent} onClick={() => grade(g.g, g.days)}>
              {g.label}
            </Btn>
          ))}
        </div>
      )}
    </Modal>
  );
}
