/**
 * Simuladores clínicos de alta fidelidad. El admin describe el escenario y la
 * IA construye historia, monitores, exámenes, imágenes, gasometría, eventos en
 * tiempo real, complicaciones y debrief. Modos: tutor, evaluación, libre y
 * cronometrado.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Activity, CheckCircle2, Play, Sparkles, Timer, Trash2, XCircle } from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { generateSimulator } from "@/lib/academy-ai.functions";
import { Btn, Chip, Empty, Field, Input, Panel, Select } from "./ui";
import { db, LEVELS, logStudy } from "./api";
import { Modal } from "./CasosSection";

const MODES = ["tutor", "evaluación", "libre", "cronometrado"] as const;

type SimRow = {
  id: string;
  title: string;
  level: string;
  mode: string;
  topic: string | null;
  scenario: any;
};

export function SimuladoresSection({ meta, isAdmin }: { meta: EnamAreaMeta; isAdmin: boolean }) {
  const accent = meta.accent;
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<SimRow | null>(null);
  const [mode, setMode] = useState<string>("tutor");

  const list = useQuery({
    queryKey: ["academy-simulators", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_simulators")
        .select("*")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SimRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("academy_simulators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-simulators", meta.slug] }),
  });

  return (
    <Panel
      accent={accent}
      icon={<Activity className="size-4" strokeWidth={2.25} />}
      title="KotaMed Labs"
      subtitle="Escenarios dinámicos con monitores, laboratorio, imágenes y eventos en tiempo real."
      actions={
        isAdmin && (
          <Btn variant="solid" accent={accent} onClick={() => setCreating(true)}>
            <Sparkles className="size-3" /> Crear simulador
          </Btn>
        )
      }
    >
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold capitalize transition ${
              mode === m
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(list.data ?? []).map((s) => (
          <div key={s.id} className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                  <Chip accent={accent}>{s.level}</Chip>
                  <Chip>{s.mode}</Chip>
                  <Chip>{s.scenario?.events?.length ?? 0} eventos</Chip>
                </div>
                <h3 className="mt-2 text-sm font-bold tracking-tight">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.scenario?.summary}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => del.mutate(s.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar simulador"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-3">
              <Btn variant="solid" accent={accent} onClick={() => setOpen(s)}>
                <Play className="size-3" /> Iniciar en modo {mode}
              </Btn>
            </div>
          </div>
        ))}
        {!list.isLoading && (list.data ?? []).length === 0 && (
          <div className="md:col-span-2">
            <Empty
              text={
                isAdmin
                  ? 'Escribe algo como "Lactante con shock séptico" y la IA construirá el simulador completo.'
                  : "Aún no hay simuladores publicados."
              }
            />
          </div>
        )}
      </div>

      {creating && (
        <SimCreator
          meta={meta}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["academy-simulators", meta.slug] });
          }}
        />
      )}

      {open && (
        <SimRunner
          row={open}
          mode={mode}
          accent={accent}
          areaSlug={meta.slug}
          onClose={() => setOpen(null)}
        />
      )}
    </Panel>
  );
}

function SimCreator({
  meta,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const gen = useServerFn(generateSimulator);
  const [prompt, setPrompt] = useState("");
  const [level, setLevel] = useState("residentado");
  const [mode, setMode] = useState<string>("tutor");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!prompt.trim()) return toast.error("Describe el escenario.");
    setBusy(true);
    try {
      const res: any = await gen({ data: { prompt, level, mode } });
      const { title, ...scenario } = res;
      const { error } = await db.from("academy_simulators").insert({
        area_slug: meta.slug,
        title,
        topic: prompt,
        level,
        mode,
        scenario,
      });
      if (error) throw new Error(error.message);
      toast.success("Simulador creado");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Nuevo simulador" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Escenario">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ej. "Lactante con shock séptico"'
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nivel">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Modo">
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Btn variant="solid" accent={meta.accent} loading={busy} onClick={run}>
          <Sparkles className="size-3" /> Construir simulador
        </Btn>
      </div>
    </Modal>
  );
}

function SimRunner({
  row,
  mode,
  accent,
  areaSlug,
  onClose,
}: {
  row: SimRow;
  mode: string;
  accent: string;
  areaSlug: string;
  onClose: () => void;
}) {
  const c = row.scenario ?? {};
  const events: any[] = c.events ?? [];
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [seconds, setSeconds] = useState(0);
  const timed = mode === "cronometrado";

  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timed]);

  const correct = useMemo(
    () => events.filter((e, i) => picked[i] === e.correctIndex).length,
    [events, picked],
  );
  const showFeedback = mode === "tutor" || mode === "libre";
  const ev = events[step];

  return (
    <Modal title={`${row.title} · modo ${mode}`} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Sec title="Escenario" accent={accent} text={c.scenario} />
          <Sec title="Historia" accent={accent} text={c.history} />

          {ev && (
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Chip accent={accent}>min {ev.minute}</Chip>
                <Chip>
                  Evento {step + 1}/{events.length}
                </Chip>
                {timed && (
                  <Chip>
                    <Timer className="size-3" /> {Math.floor(seconds / 60)}:
                    {String(seconds % 60).padStart(2, "0")}
                  </Chip>
                )}
              </div>
              <p className="text-sm font-semibold">{ev.event}</p>
              <div className="mt-2 space-y-1.5">
                {(ev.options ?? []).map((o: string, oi: number) => {
                  const chosen = picked[step];
                  const show = chosen !== undefined && showFeedback;
                  const right = oi === ev.correctIndex;
                  return (
                    <button
                      key={oi}
                      onClick={() =>
                        setPicked((p) => (p[step] !== undefined ? p : { ...p, [step]: oi }))
                      }
                      className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                        show && right
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : show && chosen === oi
                            ? "border-destructive/50 bg-destructive/10"
                            : "border-border/50 bg-background/50 hover:border-primary/40"
                      }`}
                    >
                      {show && right && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                      {show && chosen === oi && !right && (
                        <XCircle className="size-3.5 text-destructive" />
                      )}
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {picked[step] !== undefined && showFeedback && ev.feedback && (
                <p className="mt-2 rounded-lg bg-foreground/[0.04] p-3 text-xs leading-relaxed">
                  {ev.feedback}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Btn onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                  Anterior
                </Btn>
                {step + 1 < events.length ? (
                  <Btn variant="solid" accent={accent} onClick={() => setStep(step + 1)}>
                    Siguiente evento
                  </Btn>
                ) : (
                  <Btn
                    variant="solid"
                    accent={accent}
                    onClick={() => {
                      logStudy({
                        areaSlug,
                        activity: "simulador",
                        minutes: Math.max(3, Math.round(seconds / 60)),
                        topic: row.title,
                        score: events.length ? (correct / events.length) * 100 : null,
                      });
                      toast.success(`Simulación completada: ${correct}/${events.length}`);
                    }}
                  >
                    Finalizar simulación
                  </Btn>
                )}
              </div>
            </div>
          )}

          <Sec title="Debrief" accent={accent} text={c.debrief} />
          <ListSec title="Complicaciones" accent={accent} items={c.complications ?? []} />
          <ListSec title="Referencias" accent={accent} items={c.references ?? []} />
        </div>

        <div className="space-y-3">
          <KV title="Signos vitales" accent={accent} rows={c.vitals ?? []} />
          <KV title="Monitores" accent={accent} rows={c.monitors ?? []} />
          <KV title="Gasometría" accent={accent} rows={c.bloodGas ?? []} />
          <KV title="Laboratorio" accent={accent} rows={c.labs ?? []} />
          <KV
            title="Exámenes"
            accent={accent}
            rows={(c.exams ?? []).map((e: any) => ({ label: e.name, value: e.result }))}
          />
          <KV
            title="Imágenes"
            accent={accent}
            rows={(c.imaging ?? []).map((e: any) => ({ label: e.name, value: e.finding }))}
          />
        </div>
      </div>
    </Modal>
  );
}

function Sec({ title, text, accent }: { title: string; text?: string; accent: string }) {
  if (!text) return null;
  return (
    <div>
      <h4
        className="mb-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </h4>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function ListSec({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h4
        className="mb-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </h4>
      <ul className="space-y-1 text-xs">
        {items.map((i, k) => (
          <li key={k} className="flex gap-2">
            <span className="mt-1.5 size-1 rounded-full shrink-0" style={{ background: accent }} />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KV({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: { label: string; value: string }[];
  accent: string;
}) {
  if (!rows?.length) return null;
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
      <h4
        className="mb-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </h4>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-3 text-[11px]">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-bold text-right">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
