/**
 * KotaMed Anatomy Lab — interfaz premium del simulador anatómico.
 * Paneles flotantes (sistemas, herramientas, vistas, modos), visor 3D central
 * y ficha académica con IA contextual, imagenología y preguntas de examen.
 */
import { Suspense, lazy, useMemo, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Sparkles, Loader2, Eye, EyeOff, Focus, Layers, Camera,
  RotateCcw, Boxes, ScanLine, Activity, Wind, Waves, Volume2, Star, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { askAnatomyAi } from "@/lib/anatomy-ai.functions";
import {
  ATLAS_BY_ID, IMAGING_MODALITIES, REGIONS, SYSTEMS, VIEW_MODES,
  type RegionKey, type SystemKey, type ViewMode,
} from "@/lib/anatomy/atlas";
import type { ViewerState } from "./AnatomyScene";

const AnatomyScene = lazy(() => import("./AnatomyScene"));

const TABS = ["Información", "Clínica", "Imagenología", "Preguntas"] as const;

const QUICK_AI = [
  "Explícame esta estructura",
  "¿Cómo preguntan esto en ENAM?",
  "¿Dónde suele lesionarse?",
  "Hazme un caso clínico",
  "Hazme preguntas tipo residentado",
  "Explícalo como profesor universitario",
];

export default function AnatomyLab({ initialRegion = "cuerpo-completo" as RegionKey }) {
  const [layers, setLayers] = useState<Record<SystemKey, boolean>>(
    () => Object.fromEntries(SYSTEMS.map((s) => [s.key, s.defaultOn])) as Record<SystemKey, boolean>,
  );
  const [region, setRegion] = useState<RegionKey>(initialRegion);
  const [mode, setMode] = useState<ViewMode>("anatomia");
  const [transparent, setTransparent] = useState(false);
  const [xray, setXray] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [animate, setAnimate] = useState<ViewerState["animate"]>("none");
  const [isolated, setIsolated] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>("corazon");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Información");
  const [api, setApi] = useState<{ screenshot: () => void; resetView: () => void } | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [modality, setModality] = useState<string>(IMAGING_MODALITIES[0]);
  const [xp, setXp] = useState(0);
  const [studied, setStudied] = useState<string[]>([]);

  const structure = selected ? ATLAS_BY_ID[selected] : undefined;
  const examMode = mode === "examen";
  const ask = useServerFn(askAnatomyAi);
  const aiMutation = useMutation({
    mutationFn: (q: string) =>
      ask({
        data: {
          structure: structure?.name ?? "Estructura",
          latin: structure?.latin,
          system: structure?.system,
          mode,
          question: q,
        },
      }),
    onSuccess: (r: any) => setAnswer(r?.answer ?? ""),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo consultar a KotaMed AI"),
  });

  const state: ViewerState = useMemo(
    () => ({ layers, region, transparent, xray: xray || mode === "radiologia", exploded, animate, isolated, hidden, selected }),
    [layers, region, transparent, xray, mode, exploded, animate, isolated, hidden, selected],
  );

  function handleSelect(id: string | null) {
    setSelected(id);
    if (id && ATLAS_BY_ID[id] && !studied.includes(id)) {
      setStudied((s) => [...s, id]);
      setXp((v) => v + 25);
    }
    setAnswer(null);
  }

  function applyMode(m: ViewMode) {
    setMode(m);
    const cfg = VIEW_MODES.find((v) => v.key === m);
    if (cfg) {
      setLayers(
        Object.fromEntries(SYSTEMS.map((s) => [s.key, cfg.systems.includes(s.key)])) as Record<SystemKey, boolean>,
      );
    }
    setXray(m === "radiologia");
  }

  const progress = Math.round((studied.length / Object.keys(ATLAS_BY_ID).length) * 100);

  return (
    <div className="lab-root min-h-screen">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 lab-panel border-b px-4 py-3 flex items-center gap-3">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold lab-muted-text hover:opacity-80">
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <div className="ml-2">
          <div className="text-sm font-extrabold tracking-tight">KotaMed Anatomy Lab</div>
          <div className="text-[10px] uppercase tracking-widest lab-muted-text">Explora. Aprende. Comprende.</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl lab-panel text-[11px] font-bold">{xp} XP</span>
          <span className="px-3 py-1.5 rounded-xl lab-panel text-[11px] font-bold">Dominio {progress}%</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-4 p-4">
        {/* Columna izquierda */}
        <div className="space-y-4">
          <section className="lab-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-widest">Sistemas</h2>
              <button
                onClick={() => setLayers(Object.fromEntries(SYSTEMS.map((s) => [s.key, s.defaultOn])) as any)}
                className="text-[10px] font-bold lab-accent-text"
              >
                Restablecer
              </button>
            </div>
            <ul className="space-y-2">
              {SYSTEMS.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <button
                    role="switch"
                    aria-checked={layers[s.key]}
                    aria-label={s.label}
                    onClick={() => setLayers((l) => ({ ...l, [s.key]: !l[s.key] }))}
                    className={`w-9 h-5 rounded-full transition-colors ${layers[s.key] ? "bg-primary" : "bg-white/15"}`}
                  >
                    <span className={`block size-4 rounded-full bg-white transition-transform ${layers[s.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="lab-panel rounded-2xl p-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest mb-3">Herramientas</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Aislar", icon: Focus, active: !!isolated, onClick: () => setIsolated(isolated ? null : selected) },
                { label: "Ocultar", icon: EyeOff, active: !!selected && hidden.includes(selected), onClick: () => selected && setHidden((h) => (h.includes(selected) ? h.filter((x) => x !== selected) : [...h, selected])) },
                { label: "Transparente", icon: Eye, active: transparent, onClick: () => setTransparent((v) => !v) },
                { label: "Explosión", icon: Boxes, active: exploded, onClick: () => setExploded((v) => !v) },
                { label: "Rayos X", icon: ScanLine, active: xray, onClick: () => setXray((v) => !v) },
                { label: "Mostrar todo", icon: Layers, active: false, onClick: () => { setHidden([]); setIsolated(null); } },
                { label: "Latido", icon: Activity, active: animate === "latido", onClick: () => setAnimate(animate === "latido" ? "none" : "latido") },
                { label: "Respiración", icon: Wind, active: animate === "respiracion", onClick: () => setAnimate(animate === "respiracion" ? "none" : "respiracion") },
                { label: "Peristaltismo", icon: Waves, active: animate === "peristaltismo", onClick: () => setAnimate(animate === "peristaltismo" ? "none" : "peristaltismo") },
                { label: "Rotar", icon: RotateCcw, active: animate === "rotacion", onClick: () => setAnimate(animate === "rotacion" ? "none" : "rotacion") },
                { label: "Centrar", icon: Focus, active: false, onClick: () => api?.resetView() },
                { label: "Captura", icon: Camera, active: false, onClick: () => api?.screenshot() },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={t.onClick}
                  className={`rounded-xl p-2 text-[9px] font-bold flex flex-col items-center gap-1 border transition-colors ${
                    t.active ? "bg-primary text-primary-foreground border-transparent" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className="lab-panel rounded-2xl p-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest mb-3">Vistas rápidas</h2>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRegion(r.key)}
                  className={`rounded-xl px-2 py-2 text-[10px] font-bold border transition-colors ${
                    region === r.key ? "bg-primary text-primary-foreground border-transparent" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Visor central */}
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden lab-panel min-h-[460px] lg:min-h-[620px]">
            <ClientOnly fallback={<div className="absolute inset-0 grid place-items-center text-xs lab-muted-text">Cargando motor 3D…</div>}>
              <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-xs lab-muted-text">Cargando motor 3D…</div>}>
                <AnatomyScene state={state} onSelect={handleSelect} onReady={setApi} />
              </Suspense>
            </ClientOnly>
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl lab-panel text-[10px] font-bold uppercase tracking-widest">
              {REGIONS.find((r) => r.key === region)?.label}
            </div>
            {structure && (
              <div className="absolute bottom-3 left-3 px-3 py-2 rounded-xl lab-panel text-xs font-bold">
                {examMode ? "Estructura oculta — identifícala" : structure.name}
              </div>
            )}
            <div className="absolute bottom-3 right-3 text-[10px] lab-muted-text px-2 py-1 rounded-lg lab-panel">
              Arrastra para rotar · rueda para zoom · clic para seleccionar
            </div>
          </div>

          <section className="lab-panel rounded-2xl p-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest mb-3">Modo de visualización</h2>
            <div className="flex flex-wrap gap-2">
              {VIEW_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => applyMode(m.key)}
                  title={m.hint}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                    mode === m.key ? "bg-primary text-primary-foreground border-transparent" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          <div className="lab-panel rounded-2xl p-1 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                  tab === t ? "bg-primary text-primary-foreground" : "hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {!structure && (
            <div className="lab-panel rounded-2xl p-5 text-xs lab-muted-text">
              Selecciona una estructura en el modelo 3D para ver su ficha académica completa.
            </div>
          )}

          {structure && (
            <div className="lab-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold tracking-tight">
                    {examMode ? "¿Qué estructura es?" : structure.name}
                  </h3>
                  <p className="text-[11px] lab-muted-text">
                    {examMode ? "Modo examen activo" : `${structure.latin} · ${structure.terminologia}`}
                  </p>
                </div>
                <Star className="size-4 lab-accent-text" />
                <Volume2 className="size-4 lab-muted-text" />
              </div>

              {tab === "Información" && (
                <div className="space-y-3 text-xs">
                  {!examMode && <p className="lab-muted-text">{structure.description}</p>}
                  <dl className="divide-y divide-white/5">
                    {[
                      ["Sistema", SYSTEMS.find((s) => s.key === structure.system)?.label],
                      ["Región", REGIONS.find((r) => r.key === structure.region)?.label],
                      ["Origen", structure.origen],
                      ["Inserción", structure.insercion],
                      ["Inervación", structure.inervacion],
                      ["Irrigación", structure.irrigacion],
                      ["Función", structure.funcion],
                      ["Embriología", structure.embriologia],
                      ["Histología", structure.histologia],
                      ["Fisiología", structure.fisiologia],
                      ["Dificultad", `${structure.dificultad}/5`],
                      ["Tiempo de estudio", `${structure.minutos} min`],
                    ]
                      .filter(([, v]) => !!v && !examMode)
                      .map(([k, v]) => (
                        <div key={k as string} className="py-2 flex gap-3">
                          <dt className="w-28 shrink-0 lab-muted-text">{k}</dt>
                          <dd className="flex-1 font-semibold">{v as string}</dd>
                        </div>
                      ))}
                  </dl>
                  {!examMode && (
                    <div className="flex flex-wrap gap-1.5">
                      {structure.cursos.map((c) => (
                        <span key={c} className="px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "Clínica" && !examMode && (
                <div className="space-y-3 text-xs">
                  <p className="lab-muted-text">{structure.clinica}</p>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest lab-muted-text mb-1">Patologías frecuentes</div>
                    <ul className="space-y-1">
                      {structure.patologias.map((p) => (
                        <li key={p} className="flex items-center gap-2 font-semibold"><ChevronRight className="size-3 lab-accent-text" />{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest lab-muted-text mb-1">Procedimientos relacionados</div>
                    <ul className="space-y-1">
                      {structure.procedimientos.map((p) => (
                        <li key={p} className="flex items-center gap-2 font-semibold"><ChevronRight className="size-3 lab-accent-text" />{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[10px] lab-muted-text">{structure.bibliografia.join(" · ")}</div>
                </div>
              )}

              {tab === "Imagenología" && !examMode && (
                <div className="space-y-3 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGING_MODALITIES.map((m) => (
                      <button
                        key={m}
                        onClick={() => setModality(m)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                          modality === m ? "bg-primary text-primary-foreground border-transparent" : "border-white/10"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/10 p-4">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest lab-muted-text mb-2">
                      Correlación {modality}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      defaultValue={50}
                      onChange={(e) => setTransparent(Number(e.target.value) > 50)}
                      className="w-full accent-primary"
                      aria-label="Deslizador de correlación anatomía-imagen"
                    />
                    <p className="mt-2 lab-muted-text">
                      Desliza para fundir el modelo 3D con la vista diagnóstica seleccionada.
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {structure.imagenologia.map((i) => (
                      <li key={i} className="flex items-center gap-2 font-semibold"><ChevronRight className="size-3 lab-accent-text" />{i}</li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === "Preguntas" && (
                <div className="space-y-3 text-xs">
                  {(["enam", "residentado", "essalud"] as const).map((k) => (
                    <div key={k} className="rounded-xl border border-white/10 p-3">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest lab-accent-text mb-1">{k}</div>
                      <p className="font-semibold">{structure.preguntas[k]}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* IA contextual */}
          {structure && (
            <div className="lab-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold">
                <Sparkles className="size-4 lab-accent-text" /> IA KotaMed
              </div>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={600}
                placeholder={`Pregunta sobre ${structure.name}…`}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AI.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuestion(q); aiMutation.mutate(q); }}
                    className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold hover:bg-white/5"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={() => question.trim().length > 2 && aiMutation.mutate(question.trim())}
                disabled={aiMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
              >
                {aiMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Preguntar a KotaMed AI
              </button>
              {answer && (
                <div className="rounded-xl border border-white/10 p-3 text-xs whitespace-pre-wrap lab-muted-text">{answer}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
