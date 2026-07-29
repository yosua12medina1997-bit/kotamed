/**
 * Tutor IA por tema: responde citando evidencia oficial y adapta la
 * profundidad al nivel del estudiante (internado / residentado / especialista).
 */
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BrainCircuit, Send } from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { tutorAsk } from "@/lib/academy-ai.functions";
import { Btn, Input, Panel, Select } from "./ui";
import { logStudy } from "./api";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explícame el algoritmo de bronquiolitis en menores de 2 años",
  "Interpreta una gasometría con pH 7.21, pCO2 60, HCO3 22",
  "Dame una analogía para entender el shunt intrapulmonar",
  "¿Qué hallazgos radiográficos apoyan neumonía bacteriana?",
];

export function TutorSection({ meta }: { meta: EnamAreaMeta; isAdmin?: boolean }) {
  const accent = meta.accent;
  const ask = useServerFn(tutorAsk);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState("residentado");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    const history = messages;
    setMessages([...history, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const res: any = await ask({
        data: { question, topic: meta.title, level, history },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
      logStudy({ areaSlug: meta.slug, activity: "tutor", minutes: 2, topic: meta.title });
    } catch (e: any) {
      toast.error(e?.message ?? "El tutor no pudo responder");
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <Panel
      accent={accent}
      icon={<BrainCircuit className="size-4" strokeWidth={2.25} />}
      title="Tutor IA"
      subtitle="Responde con fuentes oficiales (AAP, WHO, MINSA, Nelson) y se adapta a tu nivel."
      actions={
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="max-w-40">
          <option value="internado">Internado</option>
          <option value="residentado">Residentado</option>
          <option value="especialista">Especialista</option>
        </Select>
      }
    >
      <div className="rounded-2xl border border-border/50 bg-background/40 p-4 min-h-64 max-h-[28rem] overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pregunta lo que quieras sobre {meta.title}. Puedes describir una radiografía, un
              laboratorio o un algoritmo.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] text-left hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-foreground text-background ml-auto max-w-[85%]"
                : "bg-foreground/[0.04] max-w-[92%]"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">El tutor está pensando…</p>}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
        />
        <Btn type="submit" variant="solid" accent={accent} loading={busy}>
          <Send className="size-3" /> Enviar
        </Btn>
      </form>
    </Panel>
  );
}
