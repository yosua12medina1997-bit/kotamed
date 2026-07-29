/**
 * Gestor completo de Casos Clínicos: creación manual, importación desde
 * Word/PDF/Excel, pegado de texto y generación con IA. Reproductor
 * interactivo con preguntas, retroalimentación, discusión, diferencial,
 * tratamiento, complicaciones, take-home, perlas y errores frecuentes.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  FileUp,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type { EnamAreaMeta } from "@/lib/enam-modules";
import { generateCase } from "@/lib/academy-ai.functions";
import { Btn, Chip, Empty, Field, Input, Panel, Select, Textarea } from "./ui";
import { db, LEVELS, logStudy, readFilesAsText } from "./api";

type CaseRow = {
  id: string;
  title: string;
  level: string;
  topic: string | null;
  specialty: string | null;
  subspecialty: string | null;
  difficulty: number;
  tags: string[];
  content: any;
  is_published: boolean;
};

const emptyContent = () => ({
  presentation: "",
  history: "",
  exam: "",
  labs: [],
  questions: [],
  discussion: "",
  differential: [],
  treatment: [],
  complications: [],
  takeHome: [],
  pearls: [],
  mistakes: [],
  references: [],
});

export function CasosSection({ meta, isAdmin }: { meta: EnamAreaMeta; isAdmin: boolean }) {
  const accent = meta.accent;
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [creator, setCreator] = useState<null | "ia" | "manual">(null);
  const [openCase, setOpenCase] = useState<CaseRow | null>(null);

  const list = useQuery({
    queryKey: ["academy-cases", meta.slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_cases")
        .select("*")
        .eq("area_slug", meta.slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaseRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("academy_cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academy-cases", meta.slug] });
      toast.success("Caso eliminado");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
  });

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!level || r.level === level) &&
        (!q ||
          r.title.toLowerCase().includes(q) ||
          (r.topic ?? "").toLowerCase().includes(q) ||
          r.tags.join(" ").toLowerCase().includes(q)),
    );
  }, [list.data, query, level]);

  return (
    <Panel
      accent={accent}
      icon={<Stethoscope className="size-4" strokeWidth={2.25} />}
      title="Casos clínicos"
      subtitle="Casos interactivos con preguntas, retroalimentación, discusión, diferencial, tratamiento, complicaciones, perlas y errores frecuentes."
      actions={
        isAdmin && (
          <>
            <Btn variant="solid" accent={accent} onClick={() => setCreator("ia")}>
              <Sparkles className="size-3" /> Crear con IA / importar
            </Btn>
            <Btn onClick={() => setCreator("manual")}>
              <Plus className="size-3" /> Manual
            </Btn>
          </>
        )
      }
    >
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar caso, tema o etiqueta…"
            className="pl-9"
          />
        </div>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="max-w-44">
          <option value="">Todos los niveles</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-border/50 bg-background/40 p-4 hover:border-primary/30 transition"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip accent={accent}>{c.level}</Chip>
                  {c.topic && <Chip>{c.topic}</Chip>}
                  <Chip>Dif. {c.difficulty}</Chip>
                  {!c.is_published && <Chip>Borrador</Chip>}
                </div>
                <h3 className="mt-2 text-sm font-bold tracking-tight">{c.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {c.content?.presentation}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => del.mutate(c.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar caso"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-3">
              <Btn variant="solid" accent={accent} onClick={() => setOpenCase(c)}>
                <BookOpen className="size-3" /> Resolver caso
              </Btn>
            </div>
          </div>
        ))}
        {!list.isLoading && filtered.length === 0 && (
          <div className="md:col-span-2">
            <Empty
              text={
                isAdmin
                  ? "Aún no hay casos. Créalos con IA, súbelos desde Word/PDF/Excel o pega el texto."
                  : "Aún no hay casos publicados en esta área."
              }
            />
          </div>
        )}
      </div>

      {creator && (
        <CaseCreator
          meta={meta}
          mode={creator}
          onClose={() => setCreator(null)}
          onSaved={() => {
            setCreator(null);
            qc.invalidateQueries({ queryKey: ["academy-cases", meta.slug] });
          }}
        />
      )}

      {openCase && (
        <CasePlayer
          areaSlug={meta.slug}
          accent={accent}
          row={openCase}
          onClose={() => setOpenCase(null)}
        />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function CaseCreator({
  meta,
  mode,
  onClose,
  onSaved,
}: {
  meta: EnamAreaMeta;
  mode: "ia" | "manual";
  onClose: () => void;
  onSaved: () => void;
}) {
  const accent = meta.accent;
  const gen = useServerFn(generateCase);
  const [prompt, setPrompt] = useState("");
  const [level, setLevel] = useState<string>("residentado");
  const [sourceText, setSourceText] = useState("");
  const [draft, setDraft] = useState<any>(
    mode === "manual" ? { title: "", topic: "", difficulty: 2, tags: [], ...emptyContent() } : null,
  );
  const [busy, setBusy] = useState(false);

  const runIA = async () => {
    if (!prompt.trim() && !sourceText.trim()) {
      toast.error("Escribe un tema o carga material.");
      return;
    }
    setBusy(true);
    try {
      const res = await gen({
        data: {
          prompt: prompt.trim() || "Construye el caso a partir del material adjunto",
          level,
          sourceText: sourceText || undefined,
        },
      });
      setDraft(res);
      toast.success("Caso generado. Revísalo y guárdalo.");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft?.title?.trim()) {
      toast.error("El caso necesita un título.");
      return;
    }
    setBusy(true);
    const { title, level: lvl, specialty, subspecialty, topic, difficulty, tags, ...content } = draft;
    const { error } = await db.from("academy_cases").insert({
      area_slug: meta.slug,
      title,
      level: lvl ?? level,
      specialty: specialty ?? meta.title,
      subspecialty: subspecialty ?? null,
      topic: topic ?? null,
      difficulty: Number(difficulty) || 2,
      tags: tags ?? [],
      content,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Caso guardado");
      onSaved();
    }
  };

  return (
    <Modal title={mode === "ia" ? "Nuevo caso con IA" : "Nuevo caso manual"} onClose={onClose}>
      {mode === "ia" && (
        <div className="space-y-3">
          <Field label="Tema o instrucción">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Ej. "Lactante de 8 meses con bronquiolitis grave"'
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
            <Field label="Subir Word / PDF / Excel">
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-2 text-[11px] font-bold cursor-pointer hover:border-primary/40">
                <FileUp className="size-3.5" />
                {sourceText ? "Material cargado ✓" : "Elegir archivos"}
                <input
                  type="file"
                  multiple
                  accept=".doc,.docx,.pdf,.xlsx,.xls,.csv,.txt,.md"
                  className="hidden"
                  onChange={async (e) => {
                    const txt = await readFilesAsText(e.target.files);
                    setSourceText(txt);
                    toast.success(`${txt.length.toLocaleString()} caracteres leídos`);
                  }}
                />
              </label>
            </Field>
          </div>
          <Field label="O pega el texto del caso">
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Pega aquí el caso, la historia clínica o el material base…"
            />
          </Field>
          <Btn variant="solid" accent={accent} loading={busy} onClick={runIA}>
            <Sparkles className="size-3" /> Generar caso
          </Btn>
        </div>
      )}

      {draft && (
        <div className="mt-5 space-y-3 border-t border-border/50 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título">
              <Input
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="Tema">
              <Input
                value={draft.topic ?? ""}
                onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nivel">
              <Select
                value={draft.level ?? level}
                onChange={(e) => setDraft({ ...draft, level: e.target.value })}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dificultad (1-5)">
              <Input
                type="number"
                min={1}
                max={5}
                value={draft.difficulty ?? 2}
                onChange={(e) => setDraft({ ...draft, difficulty: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Presentación">
            <Textarea
              value={draft.presentation ?? ""}
              onChange={(e) => setDraft({ ...draft, presentation: e.target.value })}
            />
          </Field>
          <Field label="Historia">
            <Textarea
              value={draft.history ?? ""}
              onChange={(e) => setDraft({ ...draft, history: e.target.value })}
            />
          </Field>
          <Field label="Discusión">
            <Textarea
              value={draft.discussion ?? ""}
              onChange={(e) => setDraft({ ...draft, discussion: e.target.value })}
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            {(draft.questions?.length ?? 0)} preguntas ·{" "}
            {(draft.differential?.length ?? 0)} diagnósticos diferenciales ·{" "}
            {(draft.references?.length ?? 0)} referencias generadas.
          </p>
          <Btn variant="solid" accent={accent} loading={busy} onClick={save}>
            Guardar caso
          </Btn>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function CasePlayer({
  row,
  accent,
  areaSlug,
  onClose,
}: {
  row: CaseRow;
  accent: string;
  areaSlug: string;
  onClose: () => void;
}) {
  const c = row.content ?? {};
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<"caso" | "preguntas" | "analisis">("caso");
  const questions: any[] = c.questions ?? [];
  const correct = questions.filter((q, i) => answers[i] === q.answerIndex).length;

  return (
    <Modal title={row.title} onClose={onClose} wide>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["caso", "preguntas", "analisis"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold capitalize transition ${
              tab === t
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "analisis" ? "Análisis" : t}
          </button>
        ))}
      </div>

      {tab === "caso" && (
        <div className="space-y-4 text-sm leading-relaxed">
          <Block title="Presentación" text={c.presentation} accent={accent} />
          <Block title="Historia" text={c.history} accent={accent} />
          <Block title="Examen físico" text={c.exam} accent={accent} />
          {!!c.labs?.length && (
            <div>
              <H accent={accent}>Laboratorio</H>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {c.labs.map((l: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{l.label}</span>
                    <span className="font-bold">{l.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "preguntas" && (
        <div className="space-y-4">
          {questions.map((q, i) => {
            const chosen = answers[i];
            return (
              <div key={i} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-sm font-semibold">
                  {i + 1}. {q.q}
                </p>
                <div className="mt-2 space-y-1.5">
                  {(q.options ?? []).map((o: string, oi: number) => {
                    const picked = chosen === oi;
                    const isRight = oi === q.answerIndex;
                    const show = chosen !== undefined;
                    return (
                      <button
                        key={oi}
                        onClick={() =>
                          setAnswers((prev) =>
                            prev[i] !== undefined ? prev : { ...prev, [i]: oi },
                          )
                        }
                        className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                          show && isRight
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : show && picked
                              ? "border-destructive/50 bg-destructive/10"
                              : "border-border/50 bg-background/50 hover:border-primary/40"
                        }`}
                      >
                        {show && isRight && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                        {show && picked && !isRight && (
                          <XCircle className="size-3.5 text-destructive" />
                        )}
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
                {chosen !== undefined && q.feedback && (
                  <p className="mt-2 rounded-lg bg-foreground/[0.04] p-3 text-xs leading-relaxed">
                    {q.feedback}
                  </p>
                )}
              </div>
            );
          })}
          {questions.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold">
                {correct}/{questions.length} correctas
              </span>
              <Btn
                variant="solid"
                accent={accent}
                onClick={() => {
                  logStudy({
                    areaSlug,
                    activity: "caso",
                    minutes: 8,
                    topic: row.topic,
                    score: questions.length ? (correct / questions.length) * 100 : null,
                    metadata: { caseId: row.id },
                  });
                  toast.success("Progreso registrado");
                  setTab("analisis");
                }}
              >
                Registrar y ver análisis
              </Btn>
            </div>
          )}
        </div>
      )}

      {tab === "analisis" && (
        <div className="space-y-4 text-sm leading-relaxed">
          <Block title="Discusión" text={c.discussion} accent={accent} />
          <ListBlock
            title="Diagnóstico diferencial"
            accent={accent}
            items={(c.differential ?? []).map((d: any) => `${d.dx} — ${d.why}`)}
          />
          <ListBlock title="Tratamiento" accent={accent} items={c.treatment ?? []} />
          <ListBlock title="Complicaciones" accent={accent} items={c.complications ?? []} />
          <ListBlock title="Take home" accent={accent} items={c.takeHome ?? []} />
          <ListBlock title="Perlas clínicas" accent={accent} items={c.pearls ?? []} />
          <ListBlock title="Errores frecuentes" accent={accent} items={c.mistakes ?? []} />
          <ListBlock title="Referencias" accent={accent} items={c.references ?? []} />
        </div>
      )}
    </Modal>
  );
}

function H({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <h4
      className="mb-1.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: accent }}
    >
      {children}
    </h4>
  );
}

function Block({ title, text, accent }: { title: string; text?: string; accent: string }) {
  if (!text) return null;
  return (
    <div>
      <H accent={accent}>{title}</H>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function ListBlock({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <H accent={accent}>{title}</H>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs">
            <span className="mt-1.5 size-1 rounded-full shrink-0" style={{ background: accent }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"} my-8 rounded-3xl border border-border/60 bg-card p-5 md:p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/[0.05]"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
