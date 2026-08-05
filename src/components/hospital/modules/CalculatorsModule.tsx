/**
 * KotaMed · Centro de Herramientas Clínicas (Neonatología).
 * Categorías → herramienta → pantalla propia (nunca modales ni desplegables).
 */
import { useState } from "react";
import { ArrowLeft, Calculator } from "lucide-react";
import { Btn, Field, Input, Metric, Panel, Select } from "@/components/academy/ui";
import {
  CALC_CATEGORIES,
  type CalcCategory,
  type CalcTool,
} from "@/lib/neonatal-nav";
import {
  DOWNES_ITEMS,
  SILVERMAN_ITEMS,
  calcBalance,
  calcDose,
  calcFeeding,
  calcNpt,
  downesReading,
  fluidRequirement,
  silvermanReading,
} from "@/lib/neonatal-hospital";

const DOSE_PRESETS: Record<string, { label: string; mgKg: number; doses: number; conc: number }> = {
  ampicilina: { label: "Ampicilina", mgKg: 50, doses: 2, conc: 100 },
  gentamicina: { label: "Gentamicina", mgKg: 4, doses: 1, conc: 10 },
  amikacina: { label: "Amikacina", mgKg: 15, doses: 1, conc: 50 },
  cafeina: { label: "Cafeína (carga)", mgKg: 20, doses: 1, conc: 20 },
  vitaminak: { label: "Vitamina K", mgKg: 0.5, doses: 1, conc: 2 },
  adrenalina: { label: "Adrenalina 1:10 000", mgKg: 0.02, doses: 1, conc: 0.1 },
  surfactante: { label: "Surfactante", mgKg: 200, doses: 1, conc: 80 },
  dose: { label: "Dosis por peso", mgKg: 10, doses: 2, conc: 100 },
};

export function CalculatorsModule({ accent }: { accent: string }) {
  const [cat, setCat] = useState<CalcCategory | null>(null);
  const [tool, setTool] = useState<CalcTool | null>(null);

  if (tool && cat) {
    return (
      <Panel
        title={tool.label}
        subtitle={tool.hint}
        icon={<Calculator className="size-4" />}
        accent={accent}
        actions={
          <Btn variant="outline" onClick={() => setTool(null)}>
            <ArrowLeft className="size-3" /> {cat.label}
          </Btn>
        }
      >
        {(tool.formula || tool.normal || tool.refs) && (
          <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-3">
            {tool.formula && <Meta label="Fórmula / método" text={tool.formula} />}
            {tool.normal && <Meta label="Valores de referencia" text={tool.normal} />}
            {tool.refs && <Meta label="Bibliografía" text={tool.refs} />}
          </div>
        )}
        <ToolView id={tool.id} accent={accent} />
        <p className="mt-5 text-[11px] leading-snug text-muted-foreground">
          Herramienta de apoyo a la decisión clínica. Verifica siempre el resultado con el protocolo
          del servicio y el criterio del médico tratante.
        </p>
      </Panel>
    );
  }

  function Meta({ label, text }: { label: string; text: string }) {
    return (
      <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-[11px] leading-snug">{text}</div>
      </div>
    );
  }


  if (cat) {
    return (
      <Panel
        title={`${cat.emoji} ${cat.label}`}
        subtitle="Cada herramienta abre su propia pantalla de trabajo."
        accent={accent}
        actions={
          <Btn variant="outline" onClick={() => setCat(null)}>
            <ArrowLeft className="size-3" /> Calculadoras
          </Btn>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {cat.tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t)}
              className="rounded-2xl border border-border/50 bg-background/40 p-4 text-left transition hover:border-primary/40 hover:bg-background/60"
            >
              <div className="text-[12px] font-extrabold tracking-tight">{t.label}</div>
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.hint}</div>
            </button>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Centro de Herramientas Clínicas"
      subtitle="Selecciona una categoría; cada calculadora abre su propia pantalla."
      icon={<Calculator className="size-4" />}
      accent={accent}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {CALC_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c)}
            className="rounded-2xl border border-border/50 bg-background/40 p-4 text-left transition hover:border-primary/40 hover:bg-background/60"
          >
            <div className="text-lg">{c.emoji}</div>
            <div className="mt-1 text-[12px] font-extrabold tracking-tight">{c.label}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {c.tools.length} herramientas
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>;
}

function Results({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>;
}

function num(v: string, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ToolView({ id, accent }: { id: string; accent: string }) {
  if (id === "hidrico") return <FluidTool accent={accent} />;
  if (id === "npt") return <NptTool accent={accent} />;
  if (id === "gir") return <GirTool accent={accent} />;
  if (id === "enteral") return <FeedTool accent={accent} />;
  if (id === "balance") return <BalanceTool accent={accent} />;
  if (id === "tet") return <TetTool accent={accent} />;
  if (id === "corregida") return <AgeTool accent={accent} />;
  if (id === "peso") return <WeightTool accent={accent} />;
  if (id === "clasificacion") return <SgaTool accent={accent} />;
  if (id === "superficie") return <BsaTool accent={accent} />;
  if (id === "deficit") return <BicarbTool accent={accent} />;
  if (id === "osmolaridad") return <NptOsmTool accent={accent} />;
  if (id === "vis") return <VisTool accent={accent} />;
  if (id === "io") return <OiTool accent={accent} />;
  if (id === "aa") return <AaTool accent={accent} />;
  if (id === "sf") return <SfTool accent={accent} />;
  if (id === "fena") return <FenaTool accent={accent} />;
  if (id === "osm") return <OsmTool accent={accent} />;
  if (id === "aniongap") return <AnionTool accent={accent} />;
  if (id === "nacorr") return <NaCorrTool accent={accent} />;
  if (id === "cacorr") return <CaCorrTool accent={accent} />;
  if (id === "gaso") return <GasoTool accent={accent} />;
  if (id === "bili") return <BiliTool accent={accent} />;
  if (id === "exanguino") return <ExchangeTool accent={accent} />;
  if (id === "eos") return <EosTool accent={accent} />;
  if (id === "crib") return <CribTool accent={accent} />;
  if (id === "sarnat")
    return (
      <ScoreTool
        accent={accent}
        items={[
          { key: "conciencia", label: "Nivel de conciencia" },
          { key: "tono", label: "Tono muscular" },
          { key: "postura", label: "Postura" },
          { key: "reflejos", label: "Reflejos primitivos" },
          { key: "autonomo", label: "Función autonómica" },
          { key: "convulsiones", label: "Convulsiones" },
        ]}
        max={2}
        reading={(t) =>
          t === 0
            ? "Sin datos de encefalopatía"
            : t <= 4
              ? "Estadio I (leve): vigilancia clínica"
              : t <= 8
                ? "Estadio II (moderada): valorar hipotermia terapéutica en las primeras 6 h"
                : "Estadio III (severa): manejo intensivo, hipotermia y neuromonitorización"
        }
      />
    );
  if (id === "thompson")
    return (
      <ScoreTool
        accent={accent}
        items={[
          { key: "tono", label: "Tono" },
          { key: "conciencia", label: "Nivel de conciencia" },
          { key: "convulsiones", label: "Convulsiones" },
          { key: "postura", label: "Postura" },
          { key: "moro", label: "Reflejo de Moro" },
          { key: "prension", label: "Prensión" },
          { key: "succion", label: "Succión" },
          { key: "respiracion", label: "Respiración" },
          { key: "fontanela", label: "Fontanela" },
        ]}
        max={3}
        reading={(t) =>
          t <= 6
            ? `Puntaje ${t}: encefalopatía leve`
            : t <= 10
              ? `Puntaje ${t}: encefalopatía moderada`
              : `Puntaje ${t}: encefalopatía severa, pronóstico reservado`
        }
      />
    );
  if (id === "snappe")
    return (
      <ScoreTool
        accent={accent}
        items={[
          { key: "pam", label: "Presión arterial media (0–9)" },
          { key: "temp", label: "Temperatura (0–8)" },
          { key: "pao2", label: "PaO₂/FiO₂ (0–9)" },
          { key: "ph", label: "pH sérico (0–9)" },
          { key: "convulsiones", label: "Convulsiones múltiples (0–9)" },
          { key: "diuresis", label: "Diuresis (0–9)" },
          { key: "peso", label: "Peso al nacer (0–9)" },
          { key: "peg", label: "Pequeño para EG (0–9)" },
          { key: "apgar", label: "APGAR a los 5 min (0–9)" },
        ]}
        max={9}
        reading={(t) =>
          t < 20
            ? `SNAPPE-II ${t}: severidad baja`
            : t < 40
              ? `SNAPPE-II ${t}: severidad intermedia`
              : `SNAPPE-II ${t}: severidad alta, mayor riesgo de mortalidad`
        }
      />
    );
  if (id === "apgar")
    return (
      <ScoreTool
        accent={accent}
        items={[
          { key: "fc", label: "Frecuencia cardiaca" },
          { key: "resp", label: "Esfuerzo respiratorio" },

          { key: "tono", label: "Tono muscular" },
          { key: "reflejo", label: "Irritabilidad refleja" },
          { key: "color", label: "Color" },
        ]}
        max={2}
        reading={(t) =>
          t >= 7 ? "Buena adaptación (7–10)" : t >= 4 ? "Depresión moderada (4–6)" : "Depresión severa (0–3)"
        }
      />
    );
  if (id === "silverman")
    return <ScoreTool accent={accent} items={SILVERMAN_ITEMS} max={2} reading={silvermanReading} />;
  if (id === "downes")
    return <ScoreTool accent={accent} items={DOWNES_ITEMS} max={2} reading={downesReading} />;
  if (id === "ballard")
    return (
      <ScoreTool
        accent={accent}
        items={[
          { key: "postura", label: "Postura" },
          { key: "ventana", label: "Ventana cuadrada" },
          { key: "rebote", label: "Rebote del brazo" },
          { key: "poplíteo", label: "Ángulo poplíteo" },
          { key: "bufanda", label: "Signo de la bufanda" },
          { key: "talon", label: "Talón-oreja" },
          { key: "piel", label: "Piel" },
          { key: "lanugo", label: "Lanugo" },
          { key: "plantar", label: "Superficie plantar" },
          { key: "mama", label: "Mama" },
          { key: "ojo", label: "Ojo / oreja" },
          { key: "genitales", label: "Genitales" },
        ]}
        max={5}
        reading={(t) => `Edad gestacional estimada ≈ ${((2 * t + 120) / 5).toFixed(1)} semanas`}
      />
    );
  if (id === "capurro")
    return (
      <ScoreTool
        accent={accent}
        items={[
          { key: "textura", label: "Textura de la piel (0–20)" },
          { key: "pliegues", label: "Pliegues plantares (0–20)" },
          { key: "mama", label: "Formación del pezón (0–15)" },
          { key: "areola", label: "Tamaño de la glándula (0–15)" },
          { key: "oreja", label: "Forma de la oreja (0–24)" },
        ]}
        max={24}
        reading={(t) => `Edad gestacional ≈ ${((204 + t) / 7).toFixed(1)} semanas`}
      />
    );
  return <DoseTool accent={accent} preset={id} />;
}

function FluidTool({ accent }: { accent: string }) {
  const [w, setW] = useState("1.5");
  const [d, setD] = useState("1");
  const r = fluidRequirement(num(w, 1), num(d, 1));
  return (
    <>
      <Grid>
        <Field label="Peso (kg)">
          <Input type="number" step="any" value={w} onChange={(e) => setW(e.target.value)} />
        </Field>
        <Field label="Día de vida">
          <Input type="number" value={d} onChange={(e) => setD(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="mL/kg/día" value={r.mlKgDay} accent={accent} />
        <Metric label="Total por día" value={`${r.totalMlDay.toFixed(0)} mL`} accent={accent} />
        <Metric label="Velocidad" value={`${r.mlHour.toFixed(1)} mL/h`} accent={accent} />
      </Results>
    </>
  );
}

function NptTool({ accent }: { accent: string }) {
  const [f, setF] = useState({
    weightKg: "1.5",
    totalMlKgDay: "120",
    glucosePercent: "10",
    aminoAcidsGKg: "3",
    lipidsGKg: "2",
    naMeqKg: "3",
    kMeqKg: "2",
    caMgKg: "60",
    enteralMlKgDay: "20",
  });
  const r = calcNpt({
    weightKg: num(f.weightKg, 1),
    totalMlKgDay: num(f.totalMlKgDay),
    glucosePercent: num(f.glucosePercent),
    aminoAcidsGKg: num(f.aminoAcidsGKg),
    lipidsGKg: num(f.lipidsGKg),
    naMeqKg: num(f.naMeqKg),
    kMeqKg: num(f.kMeqKg),
    caMgKg: num(f.caMgKg),
    enteralMlKgDay: num(f.enteralMlKgDay),
  });
  const fields: [keyof typeof f, string][] = [
    ["weightKg", "Peso (kg)"],
    ["totalMlKgDay", "Volumen total (mL/kg/día)"],
    ["glucosePercent", "Dextrosa (%)"],
    ["aminoAcidsGKg", "Aminoácidos (g/kg)"],
    ["lipidsGKg", "Lípidos (g/kg)"],
    ["naMeqKg", "Sodio (mEq/kg)"],
    ["kMeqKg", "Potasio (mEq/kg)"],
    ["caMgKg", "Calcio (mg/kg)"],
    ["enteralMlKgDay", "Enteral (mL/kg/día)"],
  ];
  return (
    <>
      <Grid>
        {fields.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input
              type="number"
              step="any"
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </Field>
        ))}
      </Grid>
      <Results>
        <Metric label="Volumen parenteral" value={`${r.parenteralMl.toFixed(0)} mL`} accent={accent} />
        <Metric label="Velocidad" value={`${r.mlHour.toFixed(1)} mL/h`} accent={accent} />
        <Metric label="GIR" value={`${r.gir.toFixed(1)} mg/kg/min`} accent={accent} />
        <Metric label="Kcal/kg/día" value={r.kcalKg.toFixed(0)} accent={accent} />
        <Metric label="Glucosa" value={`${r.glucoseG.toFixed(1)} g`} accent={accent} />
        <Metric label="Aminoácidos" value={`${r.aaG.toFixed(1)} g`} accent={accent} />
        <Metric label="Lípidos 20%" value={`${r.lipidMl20.toFixed(1)} mL`} accent={accent} />
        <Metric label="Na / K / Ca" value={`${r.naMeq.toFixed(1)} / ${r.kMeq.toFixed(1)} / ${r.caMg.toFixed(0)}`} accent={accent} />
      </Results>
    </>
  );
}

function GirTool({ accent }: { accent: string }) {
  const [w, setW] = useState("1.5");
  const [ml, setMl] = useState("180");
  const [pct, setPct] = useState("10");
  const weight = Math.max(0.3, num(w, 1));
  const gir = (num(ml) * (num(pct) / 100) * 1000) / (weight * 1440);
  return (
    <>
      <Grid>
        <Field label="Peso (kg)">
          <Input type="number" step="any" value={w} onChange={(e) => setW(e.target.value)} />
        </Field>
        <Field label="Volumen en 24 h (mL)">
          <Input type="number" value={ml} onChange={(e) => setMl(e.target.value)} />
        </Field>
        <Field label="Dextrosa (%)">
          <Input type="number" step="any" value={pct} onChange={(e) => setPct(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="GIR" value={`${gir.toFixed(2)} mg/kg/min`} accent={accent} />
        <Metric
          label="Interpretación"
          value={gir < 4 ? "Bajo" : gir > 12 ? "Alto" : "Adecuado"}
          accent={accent}
          hint="Rango habitual 4–12 mg/kg/min"
        />
      </Results>
    </>
  );
}

function FeedTool({ accent }: { accent: string }) {
  const [w, setW] = useState("1.5");
  const [mlkg, setMlkg] = useState("150");
  const [feeds, setFeeds] = useState("8");
  const r = calcFeeding(num(w, 1), num(mlkg), num(feeds, 8));
  return (
    <>
      <Grid>
        <Field label="Peso (kg)">
          <Input type="number" step="any" value={w} onChange={(e) => setW(e.target.value)} />
        </Field>
        <Field label="mL/kg/día">
          <Input type="number" value={mlkg} onChange={(e) => setMlkg(e.target.value)} />
        </Field>
        <Field label="Tomas por día">
          <Input type="number" value={feeds} onChange={(e) => setFeeds(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="Total por día" value={`${r.totalMlDay.toFixed(0)} mL`} accent={accent} />
        <Metric label="Por toma" value={`${r.perFeed.toFixed(1)} mL`} accent={accent} />
        <Metric label="Intervalo" value={`c/${r.intervalHours.toFixed(0)} h`} accent={accent} />
        <Metric label="Kcal/kg/día" value={r.kcalKg.toFixed(0)} accent={accent} />
      </Results>
    </>
  );
}

function BalanceTool({ accent }: { accent: string }) {
  const [f, setF] = useState({ weightKg: "1.5", inputsMl: "180", urineMl: "90", urineHours: "24", otherLossesMl: "20" });
  const r = calcBalance({
    weightKg: num(f.weightKg, 1),
    inputsMl: num(f.inputsMl),
    urineMl: num(f.urineMl),
    urineHours: num(f.urineHours, 24),
    otherLossesMl: num(f.otherLossesMl),
  });
  const fields: [keyof typeof f, string][] = [
    ["weightKg", "Peso (kg)"],
    ["inputsMl", "Ingresos (mL)"],
    ["urineMl", "Diuresis (mL)"],
    ["urineHours", "Horas de recolección"],
    ["otherLossesMl", "Otras pérdidas (mL)"],
  ];
  return (
    <>
      <Grid>
        {fields.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input type="number" step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </Field>
        ))}
      </Grid>
      <Results>
        <Metric label="Diuresis" value={`${r.diuresis.toFixed(2)} mL/kg/h`} accent={accent} />
        <Metric label="Balance" value={`${r.balance.toFixed(0)} mL`} accent={accent} />
        <Metric label="Balance/kg" value={`${r.balanceMlKg.toFixed(1)} mL/kg`} accent={accent} />
      </Results>
      <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">
        {r.reading}
      </div>
    </>
  );
}

function DoseTool({ accent, preset }: { accent: string; preset: string }) {
  const p = DOSE_PRESETS[preset] ?? DOSE_PRESETS["dose"]!;
  const [w, setW] = useState("1.5");
  const [mgkg, setMgkg] = useState(String(p.mgKg));
  const [doses, setDoses] = useState(String(p.doses));
  const [conc, setConc] = useState(String(p.conc));
  const r = calcDose(num(w, 1), num(mgkg), num(doses, 1), num(conc, 1));
  return (
    <>
      <Grid>
        <Field label="Peso (kg)">
          <Input type="number" step="any" value={w} onChange={(e) => setW(e.target.value)} />
        </Field>
        <Field label="mg/kg/dosis">
          <Input type="number" step="any" value={mgkg} onChange={(e) => setMgkg(e.target.value)} />
        </Field>
        <Field label="Dosis por día">
          <Input type="number" value={doses} onChange={(e) => setDoses(e.target.value)} />
        </Field>
        <Field label="Concentración (mg/mL)">
          <Input type="number" step="any" value={conc} onChange={(e) => setConc(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="Por dosis" value={`${r.perDoseMg.toFixed(2)} mg`} accent={accent} />
        <Metric label="Por día" value={`${r.perDayMg.toFixed(2)} mg`} accent={accent} />
        <Metric label="Volumen por dosis" value={`${r.perDoseMl.toFixed(2)} mL`} accent={accent} />
      </Results>
      <div className="mt-3 text-[11px] text-muted-foreground">
        Preajuste: {p.label}. Verifica siempre la dosis con el protocolo del servicio.
      </div>
    </>
  );
}

function TetTool({ accent }: { accent: string }) {
  const [w, setW] = useState("1.5");
  const weight = Math.max(0.4, num(w, 1));
  const size = weight < 1 ? 2.5 : weight < 2 ? 3.0 : weight < 3 ? 3.5 : 3.5;
  const depth = weight + 6;
  return (
    <>
      <Grid>
        <Field label="Peso (kg)">
          <Input type="number" step="any" value={w} onChange={(e) => setW(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="Diámetro TET" value={`${size.toFixed(1)} mm`} accent={accent} />
        <Metric label="Profundidad labial" value={`${depth.toFixed(1)} cm`} accent={accent} hint="Peso (kg) + 6" />
      </Results>
    </>
  );
}

function AgeTool({ accent }: { accent: string }) {
  const [eg, setEg] = useState("30");
  const [dias, setDias] = useState("21");
  const pm = num(eg, 30) + num(dias) / 7;
  const corregida = pm - 40;
  return (
    <>
      <Grid>
        <Field label="Edad gestacional al nacer (sem)">
          <Input type="number" step="any" value={eg} onChange={(e) => setEg(e.target.value)} />
        </Field>
        <Field label="Días de vida">
          <Input type="number" value={dias} onChange={(e) => setDias(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="Edad postmenstrual" value={`${pm.toFixed(1)} sem`} accent={accent} />
        <Metric
          label="Edad corregida"
          value={corregida >= 0 ? `${corregida.toFixed(1)} sem` : `${corregida.toFixed(1)} sem`}
          accent={accent}
          hint="Respecto a 40 semanas"
        />
      </Results>
    </>
  );
}

function WeightTool({ accent }: { accent: string }) {
  const [nac, setNac] = useState("1500");
  const [act, setAct] = useState("1420");
  const [dias, setDias] = useState("7");
  const birth = Math.max(1, num(nac, 1));
  const change = ((num(act) - birth) / birth) * 100;
  const gKgDay = (num(act) - birth) / (birth / 1000) / Math.max(1, num(dias, 1));
  return (
    <>
      <Grid>
        <Field label="Peso al nacer (g)">
          <Input type="number" value={nac} onChange={(e) => setNac(e.target.value)} />
        </Field>
        <Field label="Peso actual (g)">
          <Input type="number" value={act} onChange={(e) => setAct(e.target.value)} />
        </Field>
        <Field label="Días de vida">
          <Input type="number" value={dias} onChange={(e) => setDias(e.target.value)} />
        </Field>
      </Grid>
      <Results>
        <Metric label="Variación" value={`${change.toFixed(1)} %`} accent={accent} />
        <Metric label="Ganancia" value={`${gKgDay.toFixed(1)} g/kg/día`} accent={accent} hint="Meta 15–20 g/kg/día" />
      </Results>
    </>
  );
}

function ScoreTool({
  accent,
  items,
  max,
  reading,
}: {
  accent: string;
  items: { key: string; label: string }[];
  max: number;
  reading: (total: number) => string;
}) {
  const [values, setValues] = useState<Record<string, number>>({});
  const total = items.reduce((a, i) => a + (values[i.key] ?? 0), 0);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((i) => (
          <Field key={i.key} label={i.label}>
            <Select
              value={String(values[i.key] ?? 0)}
              onChange={(e) => setValues({ ...values, [i.key]: Number(e.target.value) })}
            >
              {Array.from({ length: max + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
      <Results>
        <Metric label="Puntaje total" value={total} accent={accent} />
      </Results>
      <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">
        {reading(total)}
      </div>
    </>
  );
}

/* ================================================================== */
/*  CALCULADORAS AMPLIADAS                                             */
/* ================================================================== */

/** Formulario numérico genérico con resultados derivados. */
function CalcForm({
  accent,
  fields,
  compute,
  note,
}: {
  accent: string;
  fields: [string, string, string][];
  compute: (v: Record<string, number>) => { label: string; value: string; hint?: string }[];
  note?: string;
}) {
  const initial = Object.fromEntries(fields.map(([k, , d]) => [k, d]));
  const [f, setF] = useState<Record<string, string>>(initial);
  const values = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, num(v)]));
  const out = compute(values);
  return (
    <>
      <Grid>
        {fields.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input
              type="number"
              step="any"
              value={f[k] ?? ""}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </Field>
        ))}
      </Grid>
      <Results>
        {out.map((o) => (
          <Metric key={o.label} label={o.label} value={o.value} accent={accent} hint={o.hint} />
        ))}
      </Results>
      {note && (
        <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">
          {note}
        </div>
      )}
    </>
  );
}

/** Media de peso de referencia (g) por edad gestacional — Fenton aproximado. */
const REF_WEIGHT: Record<number, [number, number, number]> = {
  24: [530, 660, 800],
  26: [680, 880, 1080],
  28: [900, 1150, 1400],
  30: [1150, 1450, 1800],
  32: [1500, 1850, 2250],
  34: [1900, 2300, 2800],
  36: [2300, 2750, 3300],
  38: [2650, 3150, 3700],
  40: [2850, 3450, 4000],
  42: [2950, 3550, 4100],
};

function refWeight(eg: number): [number, number, number] {
  const keys = Object.keys(REF_WEIGHT).map(Number);
  const nearest = keys.reduce((a, b) => (Math.abs(b - eg) < Math.abs(a - eg) ? b : a), keys[0]!);
  return REF_WEIGHT[nearest]!;
}

function SgaTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["eg", "Edad gestacional (semanas)", "34"],
        ["peso", "Peso al nacer (g)", "1900"],
      ]}
      compute={(v) => {
        const [p10, p50, p90] = refWeight(v.eg ?? 40);
        const cls = (v.peso ?? 0) < p10 ? "PEG" : (v.peso ?? 0) > p90 ? "GEG" : "AEG";
        return [
          { label: "Clasificación", value: cls, hint: cls === "AEG" ? "Adecuado para la EG" : cls === "PEG" ? "Pequeño para la EG" : "Grande para la EG" },
          { label: "Percentil 10 ref.", value: `${p10} g` },
          { label: "Percentil 50 ref.", value: `${p50} g` },
          { label: "Percentil 90 ref.", value: `${p90} g` },
        ];
      }}
      note="Referencia aproximada de Fenton 2013. Confirmar con la curva impresa del servicio cuando la clasificación esté en el límite."
    />
  );
}

function BsaTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["peso", "Peso (kg)", "1.5"],
        ["talla", "Talla (cm)", "42"],
      ]}
      compute={(v) => {
        const bsa = Math.sqrt(((v.talla ?? 0) * (v.peso ?? 0)) / 3600);
        return [{ label: "Superficie corporal", value: `${bsa.toFixed(3)} m²`, hint: "Fórmula de Mosteller" }];
      }}
    />
  );
}

function BicarbTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["peso", "Peso (kg)", "1.5"],
        ["eb", "Exceso de base (negativo)", "-10"],
      ]}
      compute={(v) => {
        const deficit = 0.3 * (v.peso ?? 0) * Math.abs(v.eb ?? 0);
        return [
          { label: "Déficit total", value: `${deficit.toFixed(1)} mEq` },
          { label: "Corregir la mitad", value: `${(deficit / 2).toFixed(1)} mEq`, hint: "Diluir 1:1 y pasar lento" },
          { label: "Bicarbonato 8.4 %", value: `${(deficit / 2).toFixed(1)} mL`, hint: "1 mL = 1 mEq" },
        ];
      }}
      note="Corregir solo si el pH < 7.20 con acidosis metabólica y ventilación adecuada."
    />
  );
}

function NptOsmTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["glucosa", "Glucosa en la mezcla (g)", "18"],
        ["aa", "Aminoácidos (g)", "4.5"],
        ["cationes", "Cationes totales (mEq)", "8"],
        ["volumen", "Volumen total (mL)", "180"],
      ]}
      compute={(v) => {
        const mosm =
          ((v.glucosa ?? 0) * 5 + (v.aa ?? 0) * 10 + (v.cationes ?? 0) * 2) * (1000 / Math.max(1, v.volumen ?? 1));
        return [
          { label: "Osmolaridad", value: `${mosm.toFixed(0)} mOsm/L` },
          {
            label: "Vía recomendada",
            value: mosm > 900 ? "Central" : "Periférica",
            hint: "Límite periférico 900 mOsm/L",
          },
        ];
      }}
    />
  );
}

function VisTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["dopa", "Dopamina (mcg/kg/min)", "5"],
        ["dobu", "Dobutamina (mcg/kg/min)", "0"],
        ["adr", "Adrenalina (mcg/kg/min)", "0.05"],
        ["nor", "Noradrenalina (mcg/kg/min)", "0"],
        ["mil", "Milrinona (mcg/kg/min)", "0"],
        ["vaso", "Vasopresina (U/kg/min)", "0"],
      ]}
      compute={(v) => {
        const vis =
          (v.dopa ?? 0) +
          (v.dobu ?? 0) +
          100 * (v.adr ?? 0) +
          100 * (v.nor ?? 0) +
          10 * (v.mil ?? 0) +
          10000 * (v.vaso ?? 0);
        return [
          { label: "VIS", value: vis.toFixed(1) },
          {
            label: "Interpretación",
            value: vis >= 20 ? "Soporte elevado" : vis >= 10 ? "Soporte moderado" : "Soporte bajo",
            hint: "VIS ≥ 20 se asocia a peor evolución",
          },
        ];
      }}
    />
  );
}

function OiTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["map", "Presión media de vía aérea (cmH₂O)", "10"],
        ["fio2", "FiO₂ (fracción 0–1)", "0.6"],
        ["pao2", "PaO₂ (mmHg)", "55"],
      ]}
      compute={(v) => {
        const io = ((v.map ?? 0) * (v.fio2 ?? 0) * 100) / Math.max(1, v.pao2 ?? 1);
        return [
          { label: "Índice de oxigenación", value: io.toFixed(1) },
          {
            label: "Severidad",
            value: io >= 25 ? "Crítica" : io >= 15 ? "Grave" : io >= 10 ? "Moderada" : "Leve",
            hint: "IO ≥ 25 considerar óxido nítrico / ECMO",
          },
        ];
      }}
    />
  );
}

function AaTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["fio2", "FiO₂ (fracción 0–1)", "0.21"],
        ["paco2", "PaCO₂ (mmHg)", "40"],
        ["pao2", "PaO₂ (mmHg)", "70"],
      ]}
      compute={(v) => {
        const pAo2 = (v.fio2 ?? 0) * 713 - (v.paco2 ?? 0) / 0.8;
        const grad = pAo2 - (v.pao2 ?? 0);
        return [
          { label: "PAO₂ alveolar", value: `${pAo2.toFixed(0)} mmHg` },
          { label: "Gradiente A-a", value: `${grad.toFixed(0)} mmHg`, hint: "< 20 mmHg en aire ambiente" },
        ];
      }}
    />
  );
}

function SfTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["spo2", "SpO₂ (%)", "92"],
        ["fio2", "FiO₂ (fracción 0–1)", "0.4"],
      ]}
      compute={(v) => {
        const sf = (v.spo2 ?? 0) / Math.max(0.21, v.fio2 ?? 0.21);
        return [
          { label: "Relación S/F", value: sf.toFixed(0) },
          {
            label: "Interpretación",
            value: sf < 200 ? "Compromiso severo" : sf < 250 ? "Compromiso moderado" : "Aceptable",
          },
        ];
      }}
    />
  );
}

function FenaTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["nau", "Na en orina (mEq/L)", "40"],
        ["nap", "Na plasmático (mEq/L)", "138"],
        ["cru", "Creatinina en orina (mg/dL)", "30"],
        ["crp", "Creatinina plasmática (mg/dL)", "1"],
      ]}
      compute={(v) => {
        const fena =
          (((v.nau ?? 0) * (v.crp ?? 0)) / Math.max(0.0001, (v.nap ?? 1) * (v.cru ?? 1))) * 100;
        return [
          { label: "FENa", value: `${fena.toFixed(2)} %` },
          {
            label: "Interpretación",
            value: fena < 1 ? "Patrón prerrenal" : fena > 2.5 ? "Patrón renal" : "Indeterminado",
            hint: "En el pretérmino el umbral renal se eleva a 3 %",
          },
        ];
      }}
    />
  );
}

function OsmTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["na", "Sodio (mEq/L)", "138"],
        ["glu", "Glucosa (mg/dL)", "70"],
        ["urea", "Urea (mg/dL)", "20"],
        ["medida", "Osmolaridad medida (opcional)", "0"],
      ]}
      compute={(v) => {
        const osm = 2 * (v.na ?? 0) + (v.glu ?? 0) / 18 + (v.urea ?? 0) / 6;
        const gap = (v.medida ?? 0) > 0 ? (v.medida ?? 0) - osm : null;
        return [
          { label: "Osmolaridad calculada", value: `${osm.toFixed(0)} mOsm/kg`, hint: "275–295" },
          ...(gap !== null
            ? [{ label: "Brecha osmolar", value: gap.toFixed(0), hint: "> 10 sugiere osmoles no medidos" }]
            : []),
        ];
      }}
    />
  );
}

function AnionTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["na", "Sodio (mEq/L)", "138"],
        ["cl", "Cloro (mEq/L)", "105"],
        ["hco3", "Bicarbonato (mEq/L)", "18"],
      ]}
      compute={(v) => {
        const ag = (v.na ?? 0) - ((v.cl ?? 0) + (v.hco3 ?? 0));
        return [
          { label: "Anion gap", value: `${ag.toFixed(1)} mEq/L`, hint: "Normal 8–16" },
          {
            label: "Interpretación",
            value: ag > 16 ? "AG elevado" : ag < 8 ? "AG bajo" : "AG normal",
            hint: ag > 16 ? "Descartar acidosis láctica, errores del metabolismo, insuficiencia renal" : undefined,
          },
        ];
      }}
    />
  );
}

function NaCorrTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["na", "Sodio medido (mEq/L)", "130"],
        ["glu", "Glucosa (mg/dL)", "300"],
      ]}
      compute={(v) => {
        const corr = (v.na ?? 0) + 1.6 * (((v.glu ?? 0) - 100) / 100);
        return [
          { label: "Sodio corregido", value: `${corr.toFixed(1)} mEq/L`, hint: "Normal 135–145" },
        ];
      }}
    />
  );
}

function CaCorrTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["ca", "Calcio total (mg/dL)", "7.5"],
        ["alb", "Albúmina (g/dL)", "2.8"],
      ]}
      compute={(v) => {
        const corr = (v.ca ?? 0) + 0.8 * (4 - (v.alb ?? 0));
        return [
          { label: "Calcio corregido", value: `${corr.toFixed(2)} mg/dL`, hint: "Normal 8–10.4" },
          {
            label: "Interpretación",
            value: corr < 7 ? "Hipocalcemia" : corr > 11 ? "Hipercalcemia" : "Normal",
          },
        ];
      }}
    />
  );
}

function GasoTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["ph", "pH", "7.22"],
        ["paco2", "PaCO₂ (mmHg)", "55"],
        ["hco3", "HCO₃ (mEq/L)", "18"],
        ["eb", "Exceso de base", "-8"],
      ]}
      compute={(v) => {
        const ph = v.ph ?? 7.4;
        const co2 = v.paco2 ?? 40;
        const hco3 = v.hco3 ?? 22;
        let primary = "Equilibrio ácido-base normal";
        if (ph < 7.35) primary = hco3 < 20 ? "Acidosis metabólica" : co2 > 45 ? "Acidosis respiratoria" : "Acidosis mixta";
        else if (ph > 7.45) primary = hco3 > 26 ? "Alcalosis metabólica" : co2 < 35 ? "Alcalosis respiratoria" : "Alcalosis mixta";
        else if (co2 > 45 || hco3 > 26) primary = "Trastorno compensado (retención de CO₂ / HCO₃)";
        else if (co2 < 35 || hco3 < 20) primary = "Trastorno compensado (hipocapnia / HCO₃ bajo)";
        const expectedCo2 = 1.5 * hco3 + 8;
        const compensation =
          ph < 7.35 && hco3 < 20
            ? co2 > expectedCo2 + 2
              ? "Compensación respiratoria insuficiente"
              : co2 < expectedCo2 - 2
                ? "Hiperventilación adicional"
                : "Compensación respiratoria adecuada"
            : "—";
        return [
          { label: "Trastorno primario", value: primary },
          { label: "PaCO₂ esperada", value: `${expectedCo2.toFixed(0)} mmHg`, hint: "Winter: 1.5×HCO₃ + 8" },
          { label: "Compensación", value: compensation },
          { label: "Exceso de base", value: `${(v.eb ?? 0).toFixed(1)}`, hint: "Normal ±4" },
        ];
      }}
      note="Interpretar siempre con la clínica, la ventilación y la perfusión del recién nacido."
    />
  );
}

function BiliTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["horas", "Horas de vida", "48"],
        ["eg", "Edad gestacional (semanas)", "36"],
        ["bili", "Bilirrubina total (mg/dL)", "12"],
        ["riesgo", "Factores de riesgo (0 = no, 1 = sí)", "0"],
      ]}
      compute={(v) => {
        const horas = Math.max(6, v.horas ?? 24);
        const eg = v.eg ?? 38;
        // Umbral aproximado tipo nomograma AAP: crece con las horas y con la EG.
        let base = 5 + (horas / 24) * 4.2;
        base = Math.min(base, 15);
        const egAdj = eg >= 38 ? 2.5 : eg >= 36 ? 1 : eg >= 34 ? -0.5 : -2;
        const riskAdj = (v.riesgo ?? 0) >= 1 ? -1.8 : 0;
        const foto = base + egAdj + riskAdj;
        const exchange = foto + 5.5;
        const bili = v.bili ?? 0;
        return [
          { label: "Umbral de fototerapia", value: `${foto.toFixed(1)} mg/dL` },
          { label: "Umbral de exanguino", value: `${exchange.toFixed(1)} mg/dL` },
          {
            label: "Conducta sugerida",
            value:
              bili >= exchange
                ? "Exanguinotransfusión"
                : bili >= foto
                  ? "Iniciar fototerapia"
                  : bili >= foto - 2
                    ? "Control en 6–12 h"
                    : "Observación",
          },
          { label: "Margen al umbral", value: `${(foto - bili).toFixed(1)} mg/dL` },
        ];
      }}
      note="Estimación orientativa basada en la guía AAP 2022. Contrastar con el nomograma oficial impreso del servicio antes de indicar el tratamiento."
    />
  );
}

function ExchangeTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["peso", "Peso (kg)", "3"],
        ["volemia", "Volemia (mL/kg)", "80"],
        ["alicuota", "Alícuota (mL)", "10"],
      ]}
      compute={(v) => {
        const total = 2 * (v.volemia ?? 80) * (v.peso ?? 0);
        return [
          { label: "Volumen de recambio", value: `${total.toFixed(0)} mL`, hint: "Doble volemia" },
          { label: "Número de alícuotas", value: Math.round(total / Math.max(1, v.alicuota ?? 10)) },
          { label: "Sangre reconstituida", value: `${total.toFixed(0)} mL`, hint: "Hto objetivo 45–50 %" },
        ];
      }}
      note="Monitorización continua de glucemia, calcio, potasio y estado hemodinámico durante el procedimiento."
    />
  );
}

const EOS_FACTORS: { key: string; label: string; weight: number }[] = [
  { key: "rpm", label: "RPM ≥ 18 horas", weight: 2 },
  { key: "fiebre", label: "Fiebre materna ≥ 38 °C", weight: 2 },
  { key: "coriamnionitis", label: "Corioamnionitis", weight: 3 },
  { key: "egb", label: "EGB materno positivo sin profilaxis", weight: 2 },
  { key: "prematuro", label: "Prematuridad < 37 semanas", weight: 2 },
  { key: "profilaxis", label: "Profilaxis antibiótica intraparto incompleta", weight: 1 },
  { key: "clinica", label: "Clínica anormal del recién nacido", weight: 4 },
];

function EosTool({ accent }: { accent: string }) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const score = EOS_FACTORS.reduce((a, f) => a + (on[f.key] ? f.weight : 0), 0);
  const level = on["clinica"] || score >= 6 ? "alto" : score >= 3 ? "intermedio" : "bajo";
  return (
    <>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {EOS_FACTORS.map((f) => (
          <label
            key={f.key}
            className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/40 p-3 text-[12px] font-semibold"
          >
            <input
              type="checkbox"
              checked={!!on[f.key]}
              onChange={(e) => setOn({ ...on, [f.key]: e.target.checked })}
            />
            {f.label}
          </label>
        ))}
      </div>
      <Results>
        <Metric label="Puntaje de riesgo" value={score} accent={accent} />
        <Metric label="Nivel de riesgo" value={level} accent={accent} />
      </Results>
      <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">
        {level === "alto"
          ? "Hemocultivo y antibióticos empíricos (ampicilina + gentamicina); considerar punción lumbar si hay clínica neurológica."
          : level === "intermedio"
            ? "Hemograma y PCR seriada a las 12–24 h con vigilancia clínica estrecha."
            : "Vigilancia clínica por 48 h sin antibióticos si el recién nacido permanece asintomático."}
      </div>
    </>
  );
}

function CribTool({ accent }: { accent: string }) {
  return (
    <CalcForm
      accent={accent}
      fields={[
        ["peso", "Peso al nacer (g)", "1200"],
        ["eg", "Edad gestacional (semanas)", "29"],
        ["eb", "Exceso de base máximo", "-7"],
        ["sexo", "Sexo (0 = masculino, 1 = femenino)", "0"],
      ]}
      compute={(v) => {
        const peso = v.peso ?? 1500;
        const eg = v.eg ?? 30;
        const eb = Math.abs(v.eb ?? 0);
        const pesoPts = peso < 700 ? 8 : peso < 1000 ? 6 : peso < 1250 ? 4 : peso < 1500 ? 2 : 0;
        const egPts = eg < 25 ? 6 : eg < 27 ? 4 : eg < 29 ? 3 : eg < 31 ? 1 : 0;
        const ebPts = eb >= 15 ? 5 : eb >= 10 ? 3 : eb >= 7 ? 1 : 0;
        const sexPts = (v.sexo ?? 0) >= 1 ? 0 : 1;
        const total = pesoPts + egPts + ebPts + sexPts;
        return [
          { label: "CRIB II", value: total },
          {
            label: "Riesgo estimado",
            value: total >= 13 ? "Muy alto" : total >= 8 ? "Alto" : total >= 4 ? "Intermedio" : "Bajo",
            hint: "Mayor puntaje, mayor mortalidad hospitalaria",
          },
          { label: "Aporte por peso / EG", value: `${pesoPts} / ${egPts}` },
          { label: "Aporte por EB / sexo", value: `${ebPts} / ${sexPts}` },
        ];
      }}
      note="Aproximación del CRIB II con las variables de las primeras horas de vida; usar como indicador de severidad, no como pronóstico individual."
    />
  );
}

