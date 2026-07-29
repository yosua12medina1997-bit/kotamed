/**
 * Calculadora farmacológica pediátrica editable (Subtema 26).
 * Aditivo: componente independiente, no altera nada preexistente.
 * El catálogo de fármacos se guarda en `content_nodes.metadata.pharma`.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calculator,
  Droplets,
  Loader2,
  Plus,
  Save,
  Syringe,
  Timer,
  Trash2,
} from "lucide-react";

export type PharmaDrug = {
  id: string;
  name: string;
  indication?: string;
  mgPerKgPerDose: number;
  dosesPerDay: number;
  maxMgPerDose?: number;
  concentrationMg?: number; // mg
  concentrationMl?: number; // por mL
  route?: string;
  notes?: string;
};

const DEFAULT_DRUGS: PharmaDrug[] = [
  { id: "d1", name: "Paracetamol", indication: "Fiebre / dolor", mgPerKgPerDose: 15, dosesPerDay: 4, maxMgPerDose: 1000, concentrationMg: 120, concentrationMl: 5, route: "VO", notes: "Máx 60 mg/kg/día." },
  { id: "d2", name: "Ibuprofeno", indication: "Fiebre / dolor / inflamación", mgPerKgPerDose: 10, dosesPerDay: 3, maxMgPerDose: 600, concentrationMg: 100, concentrationMl: 5, route: "VO", notes: "> 6 meses. Con alimentos." },
  { id: "d3", name: "Amoxicilina", indication: "Neumonía / OMA", mgPerKgPerDose: 25, dosesPerDay: 2, maxMgPerDose: 1000, concentrationMg: 250, concentrationMl: 5, route: "VO", notes: "80–90 mg/kg/día en dosis altas." },
  { id: "d4", name: "Ceftriaxona", indication: "Infección severa", mgPerKgPerDose: 50, dosesPerDay: 1, maxMgPerDose: 2000, concentrationMg: 100, concentrationMl: 1, route: "EV/IM", notes: "Evitar con calcio EV en neonatos." },
  { id: "d5", name: "Salbutamol nebulizado", indication: "Crisis asmática", mgPerKgPerDose: 0.15, dosesPerDay: 3, maxMgPerDose: 5, concentrationMg: 5, concentrationMl: 1, route: "NBZ", notes: "Mín 2.5 mg por dosis." },
];

function n(v: string) {
  const x = parseFloat(v.replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
const f = (x: number, d = 2) =>
  Number.isFinite(x) ? x.toLocaleString("es-PE", { maximumFractionDigits: d }) : "—";

export function PharmaWorkspace({
  nodeId,
  isAdmin,
  accent,
  initialDrugs,
}: {
  nodeId?: string | null;
  isAdmin: boolean;
  accent: string;
  initialDrugs?: PharmaDrug[] | null;
}) {
  const [drugs, setDrugs] = useState<PharmaDrug[]>(
    initialDrugs && initialDrugs.length ? initialDrugs : DEFAULT_DRUGS,
  );
  const [weight, setWeight] = useState("12");
  const [height, setHeight] = useState("88");
  const [ageMonths, setAgeMonths] = useState("24");
  const [selected, setSelected] = useState<string>(drugs[0]?.id ?? "");
  const qc = useQueryClient();

  useEffect(() => {
    if (!drugs.find((d) => d.id === selected)) setSelected(drugs[0]?.id ?? "");
  }, [drugs, selected]);

  const kg = n(weight);
  const cm = n(height);
  const bsaMosteller = Math.sqrt((cm * kg) / 3600);
  const bsaHaycock = 0.024265 * Math.pow(kg, 0.5378) * Math.pow(cm, 0.3964);

  const drug = drugs.find((d) => d.id === selected) ?? null;
  const perDose = drug
    ? Math.min(drug.mgPerKgPerDose * kg, drug.maxMgPerDose ?? Number.POSITIVE_INFINITY)
    : 0;
  const perDay = drug ? perDose * drug.dosesPerDay : 0;
  const mlPerDose =
    drug && drug.concentrationMg && drug.concentrationMl
      ? (perDose * drug.concentrationMl) / drug.concentrationMg
      : null;

  const saveMut = useMutation({
    mutationFn: async (next: PharmaDrug[]) => {
      if (!nodeId) throw new Error("Nodo no disponible");
      const { data: row, error: readErr } = await supabase
        .from("content_nodes")
        .select("metadata")
        .eq("id", nodeId)
        .maybeSingle();
      if (readErr) throw readErr;
      const md = ((row?.metadata ?? {}) as Record<string, unknown>) || {};
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: { ...md, pharma: { drugs: next } } })
        .eq("id", nodeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pednn-topic-node"] });
      toast.success("Catálogo farmacológico guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  const patch = (id: string, p: Partial<PharmaDrug>) =>
    setDrugs((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4">
      {/* Paciente */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="size-4" style={{ color: accent }} />
          <span className="text-sm font-bold">Datos del paciente</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Peso (kg)" value={weight} onChange={setWeight} />
          <Field label="Talla (cm)" value={height} onChange={setHeight} />
          <Field label="Edad (meses)" value={ageMonths} onChange={setAgeMonths} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
          <Stat label="SC Mosteller" value={`${f(bsaMosteller)} m²`} accent={accent} />
          <Stat label="SC Haycock" value={`${f(bsaHaycock)} m²`} accent={accent} />
          <Stat
            label="Mantenimiento (Holliday-Segar)"
            value={`${f(maintenanceMlDay(kg), 0)} mL/día · ${f(maintenanceMlDay(kg) / 24, 1)} mL/h`}
            accent={accent}
          />
        </div>
      </div>

      {/* Motor de dosificación */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Syringe className="size-4" style={{ color: accent }} />
          <span className="text-sm font-bold">Motor de dosificación</span>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full sm:w-80 rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {drugs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {drug && (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
              <Stat label="Dosis por toma" value={`${f(perDose)} mg`} accent={accent} />
              <Stat label="Total diario" value={`${f(perDay)} mg/día`} accent={accent} />
              <Stat
                label="Volumen por toma"
                value={mlPerDose !== null ? `${f(mlPerDose)} mL` : "—"}
                accent={accent}
              />
              <Stat label="Frecuencia" value={`c/${f(24 / drug.dosesPerDay, 0)} h`} accent={accent} />
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                <Timer className="inline size-3 mr-1" /> Horario sugerido
              </div>
              <div className="flex flex-wrap gap-1.5">
                {schedule(drug.dosesPerDay).map((h) => (
                  <span
                    key={h}
                    className="rounded-lg border border-border/50 bg-background/60 px-2 py-1 text-[11px] font-bold"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
            {drug.notes && (
              <p className="mt-3 text-[11px] text-muted-foreground">{drug.notes}</p>
            )}
          </>
        )}
      </div>

      {/* Calculadora general */}
      <GeneralCalculators accent={accent} kg={kg} />

      {/* Catálogo editable */}
      <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="size-4" style={{ color: accent }} />
          <span className="text-sm font-bold">Catálogo de fármacos</span>
          <div className="flex-1" />
          {isAdmin && (
            <>
              <button
                onClick={() =>
                  setDrugs((d) => [
                    ...d,
                    {
                      id: "d" + Math.random().toString(36).slice(2, 8),
                      name: "Nuevo fármaco",
                      mgPerKgPerDose: 10,
                      dosesPerDay: 3,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
              >
                <Plus className="size-3" /> Añadir
              </button>
              <button
                onClick={() => saveMut.mutate(drugs)}
                disabled={saveMut.isPending || !nodeId}
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2 py-1 text-[11px] font-bold disabled:opacity-50"
              >
                {saveMut.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Save className="size-3" />
                )}
                Guardar
              </button>
            </>
          )}
        </div>

        <div className="space-y-2">
          {drugs.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-border/40 bg-background/40 p-3 grid gap-2 sm:grid-cols-6"
            >
              <TextCell
                label="Fármaco"
                value={d.name}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { name: v })}
                className="sm:col-span-2"
              />
              <TextCell
                label="mg/kg/dosis"
                value={String(d.mgPerKgPerDose)}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { mgPerKgPerDose: n(v) })}
              />
              <TextCell
                label="Dosis/día"
                value={String(d.dosesPerDay)}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { dosesPerDay: Math.max(1, n(v)) })}
              />
              <TextCell
                label="Máx mg/dosis"
                value={d.maxMgPerDose ? String(d.maxMgPerDose) : ""}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { maxMgPerDose: v ? n(v) : undefined })}
              />
              <TextCell
                label="Presentación mg / mL"
                value={
                  d.concentrationMg && d.concentrationMl
                    ? `${d.concentrationMg}/${d.concentrationMl}`
                    : ""
                }
                editable={isAdmin}
                onChange={(v) => {
                  const [a, b] = v.split("/");
                  patch(d.id, {
                    concentrationMg: a ? n(a) : undefined,
                    concentrationMl: b ? n(b) : undefined,
                  });
                }}
              />
              <TextCell
                label="Indicación"
                value={d.indication ?? ""}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { indication: v })}
                className="sm:col-span-3"
              />
              <TextCell
                label="Notas"
                value={d.notes ?? ""}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { notes: v })}
                className="sm:col-span-2"
              />
              {isAdmin && (
                <div className="flex items-end">
                  <button
                    onClick={() => setDrugs((x) => x.filter((y) => y.id !== d.id))}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-[11px] font-bold text-destructive/80 hover:text-destructive"
                  >
                    <Trash2 className="size-3" /> Quitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Herramienta de apoyo académico. Verifica siempre las dosis con la guía institucional
          vigente antes de prescribir.
        </p>
      </div>
    </div>
  );
}

function GeneralCalculators({ accent, kg }: { accent: string; kg: number }) {
  const [mcgKgMin, setMcgKgMin] = useState("5");
  const [concMg, setConcMg] = useState("50");
  const [volMl, setVolMl] = useState("50");
  const [dropVol, setDropVol] = useState("500");
  const [dropHours, setDropHours] = useState("6");

  const mgPerMl = n(concMg) / Math.max(n(volMl), 0.0001);
  const mlHour = (n(mcgKgMin) * kg * 60) / Math.max(mgPerMl * 1000, 0.0001);
  const gttMin = (n(dropVol) * 20) / Math.max(n(dropHours) * 60, 0.0001);
  const microgttMin = (n(dropVol) * 60) / Math.max(n(dropHours) * 60, 0.0001);

  return (
    <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="size-4" style={{ color: accent }} />
        <span className="text-sm font-bold">Calculadora de medicación general</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Infusión continua
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="mcg/kg/min" value={mcgKgMin} onChange={setMcgKgMin} />
            <Field label="mg en jeringa" value={concMg} onChange={setConcMg} />
            <Field label="Volumen (mL)" value={volMl} onChange={setVolMl} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
            <Stat label="Concentración" value={`${f(mgPerMl)} mg/mL`} accent={accent} />
            <Stat label="Velocidad" value={`${f(mlHour)} mL/h`} accent={accent} />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Goteo endovenoso
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Volumen total (mL)" value={dropVol} onChange={setDropVol} />
            <Field label="Tiempo (horas)" value={dropHours} onChange={setDropHours} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
            <Stat label="Macrogotero" value={`${f(gttMin, 0)} gotas/min`} accent={accent} />
            <Stat label="Microgotero" value={`${f(microgttMin, 0)} µgotas/min`} accent={accent} />
          </div>
        </div>
      </div>
    </div>
  );
}

function maintenanceMlDay(kg: number) {
  if (kg <= 0) return 0;
  if (kg <= 10) return kg * 100;
  if (kg <= 20) return 1000 + (kg - 10) * 50;
  return 1500 + (kg - 20) * 20;
}

function schedule(dosesPerDay: number) {
  const step = 24 / Math.max(1, Math.round(dosesPerDay));
  const out: string[] = [];
  for (let i = 0; i < Math.round(dosesPerDay); i++) {
    const h = Math.round((8 + i * step) % 24);
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function TextCell({
  label,
  value,
  onChange,
  editable,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {editable ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <div className="mt-1 text-xs font-semibold">{value || "—"}</div>
      )}
    </div>
  );
}
