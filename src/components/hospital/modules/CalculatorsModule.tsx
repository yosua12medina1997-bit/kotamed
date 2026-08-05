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
