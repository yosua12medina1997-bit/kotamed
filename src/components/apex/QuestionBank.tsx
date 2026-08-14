/**
 * Banco de preguntas (solo administradores). Métricas, filtros avanzados,
 * tabla paginada, acciones masivas, editor de pregunta e importación masiva.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Database,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  Filter,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  ENABLED_QUESTION_TYPES,
  OPTION_KEYS,
  QUESTION_STATUSES,
  QUESTION_TYPE_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  type Difficulty,
  type QuestionStatus,
  type QuestionType,
} from "@/lib/apex-types";
import { importTemplateCsv, parseDelimitedQuestions, parseJsonQuestions } from "@/lib/apex-core";
import { useBankMutations, useBankQuestions, useBankStats, useTaxonomy, type BankFilters } from "@/lib/apex";
import { Btn, Chip, Empty, Field, inputClass, Modal, Pager, Panel, Stat } from "./ui";

type Row = Record<string, any>;

const EMPTY: BankFilters = {
  page: 1,
  pageSize: 10,
  search: "",
  status: "",
  difficulty: "",
  subjectId: "",
  topicId: "",
  chapterId: "",
  questionType: "",
  program: "",
  tag: "",
};

export default function QuestionBank() {
  const [filters, setFilters] = useState<BankFilters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);

  const stats = useBankStats(true);
  const list = useBankQuestions(filters, true);
  const tax = useTaxonomy();
  const { bulk } = useBankMutations();

  const subjects = (tax.data ?? []).filter((t) => t.level === "subject");
  const topics = (tax.data ?? []).filter(
    (t) => t.level === "topic" && (!filters.subjectId || t.parent_id === filters.subjectId),
  );

  const rows: Row[] = (list.data as any)?.rows ?? [];
  const total = (list.data as any)?.total ?? 0;
  const set = (patch: Partial<BankFilters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  const runBulk = async (action: string) => {
    if (selected.length === 0) return toast.error("Selecciona al menos una pregunta.");
    try {
      await bulk.mutateAsync({ ids: selected, action });
      setSelected([]);
      toast.success("Acción aplicada.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo aplicar la acción.");
    }
  };

  const s: any = stats.data ?? {};

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total de preguntas" value={(s.total ?? 0).toLocaleString("es-PE")} icon={<Database className="size-4" />} tone="info" />
        <Stat label="Publicadas" value={(s.published ?? 0).toLocaleString("es-PE")} tone="good" icon={<Eye className="size-4" />} />
        <Stat label="Revisadas" value={(s.reviewed ?? 0).toLocaleString("es-PE")} tone="info" icon={<Sparkles className="size-4" />} />
        <Stat label="Borradores" value={(s.draft ?? 0).toLocaleString("es-PE")} tone="warn" icon={<Pencil className="size-4" />} />
        <Stat label="Descartadas" value={(s.discarded ?? 0).toLocaleString("es-PE")} tone="bad" icon={<Trash2 className="size-4" />} />
      </div>

      <Panel
        title="Banco de preguntas"
        subtitle="Privado: solo administradores. Los estudiantes nunca acceden a este listado."
        right={
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setShowFilters((v) => !v)}>
              <Filter className="size-3.5" /> Filtros avanzados
            </Btn>
            <Btn onClick={() => setImporting(true)}>
              <FileUp className="size-3.5" /> Importar
            </Btn>
            <Btn
              onClick={() => {
                const blob = new Blob([importTemplateCsv()], { type: "text/csv;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "kotamed-apex-plantilla.csv";
                a.click();
              }}
            >
              <FileDown className="size-3.5" /> Plantilla
            </Btn>
            <Btn variant="primary" onClick={() => setEditing({})}>
              <Plus className="size-3.5" /> Nueva pregunta
            </Btn>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} max-w-md flex-1`}
            placeholder="Buscar por enunciado…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          <select className={`${inputClass} max-w-44`} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Todos los estados</option>
            {QUESTION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
          <select
            className={`${inputClass} max-w-44`}
            value={filters.difficulty}
            onChange={(e) => set({ difficulty: e.target.value })}
          >
            <option value="">Toda dificultad</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Materia">
              <select className={inputClass} value={filters.subjectId} onChange={(e) => set({ subjectId: e.target.value, topicId: "" })}>
                <option value="">Todas</option>
                {subjects.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tema">
              <select className={inputClass} value={filters.topicId} onChange={(e) => set({ topicId: e.target.value })}>
                <option value="">Todos</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de pregunta">
              <select className={inputClass} value={filters.questionType} onChange={(e) => set({ questionType: e.target.value })}>
                <option value="">Todos</option>
                {ENABLED_QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Programa / etiqueta">
              <div className="flex gap-2">
                <input className={inputClass} placeholder="Programa" value={filters.program} onChange={(e) => set({ program: e.target.value })} />
                <input className={inputClass} placeholder="Etiqueta" value={filters.tag} onChange={(e) => set({ tag: e.target.value })} />
              </div>
            </Field>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
            <span className="text-xs font-bold">{selected.length} seleccionadas</span>
            <div className="flex-1" />
            <Btn onClick={() => runBulk("publish")}>
              <Eye className="size-3.5" /> Publicar
            </Btn>
            <Btn onClick={() => runBulk("review")}>Marcar revisada</Btn>
            <Btn onClick={() => runBulk("hide")}>
              <EyeOff className="size-3.5" /> Ocultar
            </Btn>
            <Btn onClick={() => runBulk("duplicate")}>
              <Copy className="size-3.5" /> Duplicar
            </Btn>
            <Btn variant="danger" onClick={() => runBulk("discard")}>
              <Trash2 className="size-3.5" /> Descartar
            </Btn>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-8 py-2">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  />
                </th>
                <th className="py-2">ID</th>
                <th className="py-2">Enunciado</th>
                <th className="py-2">Taxonomía</th>
                <th className="py-2">Dificultad</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Uso</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)))
                      }
                    />
                  </td>
                  <td className="py-3 font-mono text-[11px] text-muted-foreground">{r.question_code ?? "—"}</td>
                  <td className="max-w-sm py-3">
                    <p className="line-clamp-2 font-medium">{r.stem}</p>
                  </td>
                  <td className="py-3 text-[11px] text-muted-foreground">
                    {[r.subject_label, r.topic_label, r.chapter_label].filter(Boolean).join(" › ") || "Sin clasificar"}
                  </td>
                  <td className="py-3">
                    <Chip>{DIFFICULTY_LABEL[(r.difficulty ?? "intermedia") as Difficulty] ?? r.difficulty}</Chip>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        STATUS_TONE[(r.status ?? "draft") as QuestionStatus]
                      }`}
                    >
                      {STATUS_LABEL[(r.status ?? "draft") as QuestionStatus]}
                    </span>
                  </td>
                  <td className="py-3 tabular-nums text-muted-foreground">
                    {r.times_used ?? 0}× · {r.times_used ? Math.round(((r.times_correct ?? 0) / r.times_used) * 100) : 0}%
                  </td>
                  <td className="py-3 text-right">
                    <Btn onClick={() => setEditing(r)}>
                      <Pencil className="size-3.5" /> Editar
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!list.isLoading && rows.length === 0 && (
          <Empty
            title="Sin preguntas con estos filtros"
            hint="Importa el banco masivo con la plantilla oficial o crea una pregunta manualmente."
          />
        )}

        <div className="mt-4">
          <Pager
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      </Panel>

      {editing && <QuestionEditor row={editing} onClose={() => setEditing(null)} />}
      {importing && <ImportWizard onClose={() => setImporting(false)} />}
    </div>
  );
}

/* ------------------------------- Editor ------------------------------- */

function QuestionEditor({ row, onClose }: { row: Row; onClose: () => void }) {
  const { save, suggest } = useBankMutations();
  const initialOptions = useMemo(() => {
    const opts = row.options;
    const base: Record<string, string> = { a: "", b: "", c: "", d: "", e: "" };
    if (Array.isArray(opts)) opts.forEach((o: any, i: number) => (base[OPTION_KEYS[i] ?? "e"] = o?.text ?? String(o)));
    else if (opts && typeof opts === "object") Object.assign(base, opts);
    return base;
  }, [row.options]);

  const [stem, setStem] = useState(row.stem ?? "");
  const [options, setOptions] = useState(initialOptions);
  const [correct, setCorrect] = useState<string[]>(row.correct_answers ?? []);
  const [explanation, setExplanation] = useState(row.explanation ?? "");
  const [reference, setReference] = useState(row.reference ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>((row.difficulty ?? "intermedia") as Difficulty);
  const [status, setStatus] = useState<QuestionStatus>((row.status ?? "draft") as QuestionStatus);
  const [type, setType] = useState<QuestionType>((row.question_type ?? "single") as QuestionType);
  const [subject, setSubject] = useState(row.subject_label ?? "");
  const [topic, setTopic] = useState(row.topic_label ?? "");
  const [chapter, setChapter] = useState(row.chapter_label ?? "");
  const [tags, setTags] = useState((row.tags ?? []).join(", "));

  const submit = async () => {
    if (stem.trim().length < 10) return toast.error("El enunciado es demasiado corto.");
    const opts = OPTION_KEYS.filter((k) => options[k]?.trim()).map((k) => ({ key: k, text: options[k].trim() }));
    if (opts.length < 2) return toast.error("Agrega al menos 2 alternativas.");
    if (correct.length === 0) return toast.error("Marca la respuesta correcta.");
    try {
      await save.mutateAsync({
        id: row.id ?? null,
        patch: {
          stem: stem.trim(),
          options: opts,
          correct_answers: correct,
          explanation: explanation.trim() || null,
          reference: reference.trim() || null,
          difficulty,
          status,
          question_type: type,
          subject_label: subject.trim() || null,
          topic_label: topic.trim() || null,
          chapter_label: chapter.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      toast.success("Pregunta guardada.");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar.");
    }
  };

  return (
    <Modal open wide title={row.id ? "Editar pregunta" : "Nueva pregunta"} subtitle={row.question_code ?? undefined} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Enunciado / caso clínico">
          <textarea className={`${inputClass} min-h-28`} value={stem} onChange={(e) => setStem(e.target.value)} />
        </Field>

        <div className="grid gap-2">
          {OPTION_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCorrect((prev) =>
                    type === "multiple"
                      ? prev.includes(k)
                        ? prev.filter((x) => x !== k)
                        : [...prev, k]
                      : prev.includes(k)
                        ? []
                        : [k],
                  )
                }
                className={`grid size-8 shrink-0 place-items-center rounded-xl border text-xs font-bold uppercase ${
                  correct.includes(k) ? "border-emerald-300 bg-emerald-50 text-emerald-600" : "border-border"
                }`}
                title="Marcar como correcta"
              >
                {k}
              </button>
              <input
                className={inputClass}
                placeholder={`Alternativa ${k.toUpperCase()}`}
                value={options[k] ?? ""}
                onChange={(e) => setOptions((o) => ({ ...o, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tipo">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
              {ENABLED_QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dificultad">
            <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)}>
              {QUESTION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Materia">
            <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Tema">
            <input className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <Field label="Capítulo">
            <input className={inputClass} value={chapter} onChange={(e) => setChapter(e.target.value)} />
          </Field>
        </div>

        <Field label="Explicación oficial">
          <textarea className={`${inputClass} min-h-24`} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Referencia bibliográfica">
            <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Btn
            disabled={suggest.isPending || stem.trim().length < 20}
            onClick={async () => {
              try {
                const res: any = await suggest.mutateAsync([{ stem, explanation }]);
                const first = Array.isArray(res) ? res[0] : res?.[0] ?? res;
                if (first) {
                  setSubject(first.subject ?? subject);
                  setTopic(first.topic ?? topic);
                  setChapter(first.chapter ?? chapter);
                  if (first.difficulty) setDifficulty(first.difficulty);
                  toast.success("Clasificación sugerida por IA.");
                }
              } catch (e: any) {
                toast.error(e?.message ?? "La IA no pudo clasificar.");
              }
            }}
          >
            <Sparkles className="size-3.5" /> Clasificar con IA
          </Btn>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" disabled={save.isPending} onClick={submit}>
            <Save className="size-3.5" /> Guardar
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------- Importación --------------------------- */

function ImportWizard({ onClose }: { onClose: () => void }) {
  const { import: importer } = useBankMutations();
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [report, setReport] = useState<any>(null);
  const [defaultStatus, setDefaultStatus] = useState<QuestionStatus>("draft");

  const parse = (text: string) => {
    const trimmed = text.trim();
    const parsed = trimmed.startsWith("[") || trimmed.startsWith("{") ? parseJsonQuestions(trimmed) : parseDelimitedQuestions(trimmed);
    setRows(parsed as Record<string, string>[]);
    return parsed.length;
  };

  return (
    <Modal open wide title="Importación masiva de preguntas" subtitle="CSV, TSV o JSON · hasta 5000 filas por lote" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold hover:border-primary/60">
            <FileUp className="size-3.5" /> Subir archivo CSV / TSV / JSON
            <input
              type="file"
              accept=".csv,.tsv,.txt,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setRaw(text);
                const n = parse(text);
                setReport(null);
                toast.success(`${n} filas detectadas.`);
              }}
            />
          </label>
          <select className={`${inputClass} max-w-44`} value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as QuestionStatus)}>
            {QUESTION_STATUSES.map((st) => (
              <option key={st} value={st}>
                Importar como: {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>

        <Field label="O pega el contenido" hint="Debe incluir la fila de encabezados de la plantilla oficial.">
          <textarea
            className={`${inputClass} min-h-40 font-mono text-[11px]`}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setReport(null);
            }}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Btn
            onClick={async () => {
              const n = parse(raw);
              if (n === 0) return toast.error("No se detectaron filas válidas.");
              try {
                const res = await importer.mutateAsync({ rows: rows.length ? rows : [], commit: false });
                setReport(res);
              } catch (e: any) {
                toast.error(e?.message ?? "Error al validar.");
              }
            }}
          >
            Validar
          </Btn>
          <Btn
            variant="primary"
            disabled={importer.isPending || rows.length === 0}
            onClick={async () => {
              try {
                const res: any = await importer.mutateAsync({ rows, commit: true, defaultStatus });
                setReport(res);
                toast.success(`${res.inserted?.toLocaleString("es-PE") ?? 0} preguntas importadas.`);
              } catch (e: any) {
                toast.error(e?.message ?? "Error al importar.");
              }
            }}
          >
            <Sparkles className="size-3.5" /> Importar {rows.length ? `${rows.length} filas` : ""}
          </Btn>
        </div>

        {report && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs">
            <p className="font-bold">
              {report.valid} válidas · {report.invalid} con errores · {report.inserted ?? 0} importadas
            </p>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-muted-foreground">
              {(report.issues ?? []).slice(0, 60).map((i: any, idx: number) => (
                <li key={idx}>
                  Fila {i.row}: {i.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
