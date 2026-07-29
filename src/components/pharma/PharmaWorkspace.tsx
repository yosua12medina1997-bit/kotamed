/**
 * Calculadora farmacológica pediátrica editable (Subtema 26).
 * Aditivo: componente independiente, no altera nada preexistente.
 * El catálogo de fármacos se guarda en `content_nodes.metadata.pharma`.
 * Si no se recibe `nodeId`, se resuelve/crea un nodo raíz global
 * (`slug = pharma-catalogo-global`) para que el catálogo sea compartido.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calculator,
  Copy,
  Download,
  Droplets,
  FileUp,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
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
  category?: string;
  notes?: string;
};

const GLOBAL_SLUG = "pharma-catalogo-global";

const uid = () => "d" + Math.random().toString(36).slice(2, 9);

const seed = (
  name: string,
  category: string,
  indication: string,
  mgPerKgPerDose: number,
  dosesPerDay: number,
  maxMgPerDose: number | undefined,
  route: string,
  conc?: [number, number],
  notes?: string,
): PharmaDrug => ({
  id: uid(),
  name,
  category,
  indication,
  mgPerKgPerDose,
  dosesPerDay,
  maxMgPerDose,
  route,
  concentrationMg: conc?.[0],
  concentrationMl: conc?.[1],
  notes,
});

/** Catálogo base ampliado (editable y ampliable por el administrador). */
export function baseCatalog(): PharmaDrug[] {
  return [
    // Analgesia / antipiréticos
    seed("Paracetamol", "Analgesia y antipiréticos", "Fiebre / dolor", 15, 4, 1000, "VO", [120, 5], "Máx 60 mg/kg/día."),
    seed("Ibuprofeno", "Analgesia y antipiréticos", "Fiebre / dolor / inflamación", 10, 3, 600, "VO", [100, 5], "> 6 meses, con alimentos."),
    seed("Metamizol", "Analgesia y antipiréticos", "Dolor moderado", 15, 4, 1000, "VO/EV", [500, 1], "Vigilar agranulocitosis."),
    seed("Naproxeno", "Analgesia y antipiréticos", "Dolor / inflamación", 5, 2, 500, "VO", [125, 5]),
    seed("Morfina", "Analgesia y antipiréticos", "Dolor severo", 0.1, 6, 10, "EV", [10, 1], "Monitorizar depresión respiratoria."),
    seed("Fentanilo", "Analgesia y antipiréticos", "Analgesia / sedación", 0.001, 6, 0.05, "EV", [0.05, 1], "1–2 mcg/kg/dosis."),
    seed("Ketorolaco", "Analgesia y antipiréticos", "Dolor agudo", 0.5, 4, 30, "EV", [30, 1], "Máx 5 días."),

    // Antibióticos VO
    seed("Amoxicilina", "Antibióticos orales", "Neumonía / OMA", 25, 2, 1000, "VO", [250, 5], "80–90 mg/kg/día en dosis altas."),
    seed("Amoxicilina/Clavulánico", "Antibióticos orales", "OMA / sinusitis", 22.5, 2, 875, "VO", [400, 5], "Relación 14:1 en dosis altas."),
    seed("Azitromicina", "Antibióticos orales", "Atípicos / tos ferina", 10, 1, 500, "VO", [200, 5], "5 mg/kg/día días 2–5."),
    seed("Claritromicina", "Antibióticos orales", "Atípicos", 7.5, 2, 500, "VO", [125, 5]),
    seed("Cefalexina", "Antibióticos orales", "Piel y partes blandas", 12.5, 4, 500, "VO", [250, 5]),
    seed("Cefuroxima axetilo", "Antibióticos orales", "Vía respiratoria", 15, 2, 500, "VO", [250, 5]),
    seed("Cefixima", "Antibióticos orales", "ITU / respiratorio", 4, 2, 200, "VO", [100, 5]),
    seed("Trimetoprim/Sulfametoxazol", "Antibióticos orales", "ITU / PJP", 4, 2, 160, "VO", [40, 5], "Dosis según trimetoprim."),
    seed("Clindamicina", "Antibióticos orales", "SAMR / anaerobios", 10, 3, 600, "VO/EV", [75, 5]),
    seed("Nitrofurantoína", "Antibióticos orales", "ITU baja", 1.75, 4, 100, "VO", [25, 5]),
    seed("Metronidazol", "Antibióticos orales", "Anaerobios / giardiasis", 7.5, 3, 500, "VO/EV", [125, 5]),

    // Antibióticos EV
    seed("Ampicilina", "Antibióticos parenterales", "Sepsis neonatal", 50, 4, 2000, "EV", [250, 1]),
    seed("Ampicilina/Sulbactam", "Antibióticos parenterales", "Infección mixta", 50, 4, 2000, "EV", [250, 1]),
    seed("Ceftriaxona", "Antibióticos parenterales", "Infección severa / meningitis", 50, 1, 2000, "EV/IM", [100, 1], "Evitar con calcio EV en neonatos."),
    seed("Cefotaxima", "Antibióticos parenterales", "Sepsis neonatal / meningitis", 50, 4, 2000, "EV", [100, 1]),
    seed("Ceftazidima", "Antibióticos parenterales", "Pseudomonas", 50, 3, 2000, "EV", [100, 1]),
    seed("Cefazolina", "Antibióticos parenterales", "Profilaxis quirúrgica", 25, 3, 1000, "EV", [100, 1]),
    seed("Vancomicina", "Antibióticos parenterales", "SAMR / sepsis", 15, 4, 1000, "EV", [50, 1], "Ajustar por niveles valle."),
    seed("Gentamicina", "Antibióticos parenterales", "Gram negativos", 5, 1, 240, "EV/IM", [40, 1], "Monitorizar función renal."),
    seed("Amikacina", "Antibióticos parenterales", "Gram negativos", 15, 1, 1500, "EV", [250, 1]),
    seed("Meropenem", "Antibióticos parenterales", "Multirresistentes", 20, 3, 2000, "EV", [50, 1], "40 mg/kg/dosis en meningitis."),
    seed("Piperacilina/Tazobactam", "Antibióticos parenterales", "Sepsis nosocomial", 100, 4, 4000, "EV", [200, 1]),
    seed("Oxacilina", "Antibióticos parenterales", "SAMS", 50, 4, 2000, "EV", [100, 1]),
    seed("Penicilina G sódica", "Antibióticos parenterales", "Sífilis / estreptococo", 50000, 4, 4000000, "EV", undefined, "Dosis en UI/kg/dosis."),

    // Antivirales / antifúngicos / antiparasitarios
    seed("Aciclovir", "Antivirales y antifúngicos", "VHS neonatal / varicela", 20, 3, 800, "EV/VO", [200, 5]),
    seed("Oseltamivir", "Antivirales y antifúngicos", "Influenza", 2, 2, 75, "VO", [12, 1]),
    seed("Fluconazol", "Antivirales y antifúngicos", "Candidiasis", 6, 1, 400, "VO/EV", [50, 5]),
    seed("Anfotericina B liposomal", "Antivirales y antifúngicos", "Micosis invasiva", 3, 1, 350, "EV", [50, 1]),
    seed("Nistatina", "Antivirales y antifúngicos", "Muguet", 1, 4, 1, "VO", [100000, 1], "100.000 UI c/6 h tópico oral."),
    seed("Albendazol", "Antivirales y antifúngicos", "Helmintiasis", 400, 1, 400, "VO", [400, 10], "Dosis fija > 2 años."),
    seed("Ivermectina", "Antivirales y antifúngicos", "Escabiosis / estrongiloides", 0.2, 1, 12, "VO", [6, 1]),

    // Respiratorio
    seed("Salbutamol nebulizado", "Respiratorio", "Crisis asmática", 0.15, 3, 5, "NBZ", [5, 1], "Mín 2.5 mg por dosis."),
    seed("Bromuro de ipratropio", "Respiratorio", "Crisis asmática severa", 0.25, 3, 0.5, "NBZ", [0.25, 1], "250–500 mcg por dosis."),
    seed("Prednisolona", "Respiratorio", "Asma / crup", 1, 1, 40, "VO", [15, 5]),
    seed("Dexametasona", "Respiratorio", "Crup / antiinflamatorio", 0.15, 1, 10, "VO/EV", [4, 1], "0.6 mg/kg dosis única en crup."),
    seed("Adrenalina nebulizada", "Respiratorio", "Crup moderado-severo", 0.5, 3, 5, "NBZ", [1, 1], "0.5 mL/kg de 1:1000, máx 5 mL."),
    seed("Hidrocortisona", "Respiratorio", "Estatus asmático", 5, 4, 100, "EV", [100, 1]),
    seed("Sulfato de magnesio", "Respiratorio", "Asma severa", 40, 1, 2000, "EV", [200, 1], "Infundir en 20 min."),
    seed("Cafeína citrato", "Respiratorio", "Apnea del prematuro", 5, 1, 20, "EV/VO", [20, 1], "Carga 20 mg/kg."),

    // Digestivo
    seed("Ondansetrón", "Digestivo", "Vómitos", 0.15, 3, 8, "VO/EV", [4, 5]),
    seed("Ranitidina", "Digestivo", "Reflujo", 2, 3, 150, "VO", [75, 5]),
    seed("Omeprazol", "Digestivo", "ERGE / úlcera", 1, 1, 20, "VO", [10, 1]),
    seed("Domperidona", "Digestivo", "Vómitos / reflujo", 0.25, 3, 10, "VO", [5, 5]),
    seed("Polietilenglicol", "Digestivo", "Estreñimiento", 0.5, 1, 17, "VO", undefined, "g/kg/día."),
    seed("Lactulosa", "Digestivo", "Estreñimiento", 1, 2, 30, "VO", [3.33, 5], "mL/kg/día."),
    seed("Zinc", "Digestivo", "Diarrea aguda", 1, 1, 20, "VO", [20, 5], "10 mg < 6 m; 20 mg > 6 m por 14 días."),

    // Neuro / sedación
    seed("Midazolam", "Neurología y sedación", "Convulsión / sedación", 0.1, 4, 5, "EV/IN", [5, 1]),
    seed("Diazepam", "Neurología y sedación", "Estatus convulsivo", 0.3, 3, 10, "EV/rectal", [5, 1]),
    seed("Fenitoína", "Neurología y sedación", "Estatus convulsivo", 20, 1, 1000, "EV", [50, 1], "Carga; máx 50 mg/min."),
    seed("Fenobarbital", "Neurología y sedación", "Convulsión neonatal", 20, 1, 1000, "EV", [200, 1], "Carga."),
    seed("Levetiracetam", "Neurología y sedación", "Epilepsia", 20, 2, 1500, "VO/EV", [100, 1]),
    seed("Ácido valproico", "Neurología y sedación", "Epilepsia", 10, 2, 1000, "VO", [250, 5]),
    seed("Ketamina", "Neurología y sedación", "Sedación procedural", 1, 1, 100, "EV", [50, 1]),

    // Cardiovascular / UCI
    seed("Adrenalina", "Cardiovascular y UCI", "PCR / anafilaxia", 0.01, 1, 1, "EV/IM", [1, 1], "0.01 mg/kg (1:10.000 EV)."),
    seed("Dopamina", "Cardiovascular y UCI", "Shock", 0.005, 1, undefined, "EV", [40, 1], "5–20 mcg/kg/min — usar infusión."),
    seed("Dobutamina", "Cardiovascular y UCI", "Disfunción miocárdica", 0.005, 1, undefined, "EV", [250, 20], "5–20 mcg/kg/min."),
    seed("Noradrenalina", "Cardiovascular y UCI", "Shock séptico", 0.0001, 1, undefined, "EV", [4, 4], "0.05–2 mcg/kg/min."),
    seed("Milrinona", "Cardiovascular y UCI", "Bajo gasto", 0.0005, 1, undefined, "EV", [1, 1], "0.25–0.75 mcg/kg/min."),
    seed("Furosemida", "Cardiovascular y UCI", "Sobrecarga hídrica", 1, 3, 40, "EV/VO", [20, 2]),
    seed("Espironolactona", "Cardiovascular y UCI", "ICC", 1, 2, 100, "VO", [25, 5]),
    seed("Captopril", "Cardiovascular y UCI", "HTA / ICC", 0.3, 3, 25, "VO", [25, 5]),
    seed("Digoxina", "Cardiovascular y UCI", "ICC / TSV", 0.005, 2, 0.25, "VO", [0.05, 1]),
    seed("Adenosina", "Cardiovascular y UCI", "TSV", 0.1, 1, 6, "EV", [3, 1], "Bolo rápido; 2ª dosis 0.2 mg/kg."),
    seed("Prostaglandina E1", "Cardiovascular y UCI", "Cardiopatía ductus-dependiente", 0.00005, 1, undefined, "EV", [0.5, 1], "0.01–0.1 mcg/kg/min."),

    // Alergia / dermato
    seed("Clorfenamina", "Alergia y dermatología", "Alergia", 0.1, 4, 4, "VO", [2, 5]),
    seed("Loratadina", "Alergia y dermatología", "Rinitis / urticaria", 0.2, 1, 10, "VO", [5, 5]),
    seed("Cetirizina", "Alergia y dermatología", "Urticaria", 0.25, 1, 10, "VO", [5, 5]),
    seed("Permetrina 5%", "Alergia y dermatología", "Escabiosis", 1, 1, 1, "Tópico", undefined, "Aplicar 8–12 h, repetir a la semana."),

    // Neonatología
    seed("Surfactante (poractant alfa)", "Neonatología", "SDR", 200, 1, 200, "Intratraqueal", [80, 1], "mg/kg dosis inicial."),
    seed("Vitamina K", "Neonatología", "Profilaxis hemorrágica", 1, 1, 1, "IM", [1, 1], "1 mg IM dosis única (0.5 mg < 1500 g)."),
    seed("Sulfato ferroso", "Neonatología", "Profilaxis / anemia", 2, 1, 60, "VO", [25, 1], "mg de hierro elemental/kg/día."),
    seed("Insulina regular", "Neonatología", "Hiperglicemia", 0.05, 1, undefined, "EV", [100, 1], "0.01–0.1 U/kg/h en infusión."),
    seed("Gluconato de calcio 10%", "Neonatología", "Hipocalcemia", 100, 1, 2000, "EV", [100, 1], "mg/kg lento con monitoreo."),
    seed("Dextrosa 10%", "Neonatología", "Hipoglicemia", 2, 1, undefined, "EV", undefined, "Bolo 2 mL/kg de D10%."),
  ];
}

const DEFAULT_DRUGS: PharmaDrug[] = baseCatalog();

function n(v: string) {
  const x = parseFloat(String(v).replace(",", "."));
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
  const qc = useQueryClient();

  // Catálogo global compartido cuando no hay nodo de tema.
  const globalQ = useQuery({
    queryKey: ["pharma-global-node"],
    enabled: !nodeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_nodes")
        .select("id, metadata")
        .eq("slug", GLOBAL_SLUG)
        .maybeSingle();
      return data ?? null;
    },
  });

  const effectiveNodeId = nodeId ?? globalQ.data?.id ?? null;

  const [drugs, setDrugs] = useState<PharmaDrug[]>(
    initialDrugs && initialDrugs.length ? initialDrugs : DEFAULT_DRUGS,
  );
  const [loadedRemote, setLoadedRemote] = useState(false);

  useEffect(() => {
    if (nodeId || loadedRemote) return;
    const remote = (globalQ.data?.metadata as any)?.pharma?.drugs as PharmaDrug[] | undefined;
    if (remote?.length) {
      setDrugs(remote);
      setLoadedRemote(true);
    }
  }, [globalQ.data, nodeId, loadedRemote]);

  const [weight, setWeight] = useState("12");
  const [height, setHeight] = useState("88");
  const [ageMonths, setAgeMonths] = useState("24");
  const [selected, setSelected] = useState<string>(drugs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    if (!drugs.find((d) => d.id === selected)) setSelected(drugs[0]?.id ?? "");
  }, [drugs, selected]);

  const kg = n(weight);
  const cm = n(height);
  const bsaMosteller = Math.sqrt((cm * kg) / 3600);
  const bsaHaycock = 0.024265 * Math.pow(kg, 0.5378) * Math.pow(cm, 0.3964);

  const categories = useMemo(
    () => Array.from(new Set(drugs.map((d) => d.category?.trim() || "Sin categoría"))).sort(),
    [drugs],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drugs.filter((d) => {
      const inCat = cat === "all" || (d.category?.trim() || "Sin categoría") === cat;
      if (!inCat) return false;
      if (!q) return true;
      return [d.name, d.indication, d.route, d.category, d.notes]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [drugs, query, cat]);

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
      let target = effectiveNodeId;
      if (!target) {
        const { data: created, error: createErr } = await supabase
          .from("content_nodes")
          .insert({
            kind: "catalog",
            title: "Catálogo farmacológico pediátrico",
            slug: GLOBAL_SLUG,
            parent_id: null,
            is_published: true,
            metadata: { pharma: { drugs: next } },
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        target = created.id;
        return;
      }
      const { data: row, error: readErr } = await supabase
        .from("content_nodes")
        .select("metadata")
        .eq("id", target)
        .maybeSingle();
      if (readErr) throw readErr;
      const md = ((row?.metadata ?? {}) as Record<string, unknown>) || {};
      const { error } = await supabase
        .from("content_nodes")
        .update({ metadata: { ...md, pharma: { drugs: next } } })
        .eq("id", target);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pednn-topic-node"] });
      qc.invalidateQueries({ queryKey: ["pharma-global-node"] });
      toast.success("Catálogo farmacológico guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  const patch = (id: string, p: Partial<PharmaDrug>) =>
    setDrugs((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));

  /** Importación masiva: una línea por fármaco, separada por ; o tabulador
   *  nombre; categoría; indicación; mg/kg/dosis; dosis/día; máx mg; mg/mL; vía; notas
   *  También acepta JSON (array de PharmaDrug). */
  function runImport(replace: boolean) {
    const raw = importText.trim();
    if (!raw) return;
    let parsed: PharmaDrug[] = [];
    try {
      if (raw.startsWith("[")) {
        parsed = (JSON.parse(raw) as PharmaDrug[]).map((d) => ({
          ...d,
          id: d.id || uid(),
          mgPerKgPerDose: Number(d.mgPerKgPerDose) || 0,
          dosesPerDay: Math.max(1, Number(d.dosesPerDay) || 1),
        }));
      } else {
        parsed = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !/^nombre\s*;/i.test(l))
          .map((line) => {
            const c = line.split(/[;\t]/).map((s) => s.trim());
            const conc = (c[6] ?? "").split("/");
            return {
              id: uid(),
              name: c[0] ?? "Sin nombre",
              category: c[1] || undefined,
              indication: c[2] || undefined,
              mgPerKgPerDose: n(c[3] ?? "0"),
              dosesPerDay: Math.max(1, n(c[4] ?? "1") || 1),
              maxMgPerDose: c[5] ? n(c[5]) : undefined,
              concentrationMg: conc[0] ? n(conc[0]) : undefined,
              concentrationMl: conc[1] ? n(conc[1]) : undefined,
              route: c[7] || undefined,
              notes: c[8] || undefined,
            } as PharmaDrug;
          });
      }
    } catch (e: any) {
      toast.error("No se pudo interpretar el texto: " + (e?.message ?? ""));
      return;
    }
    if (!parsed.length) return toast.error("Sin filas válidas");
    setDrugs((prev) => (replace ? parsed : [...prev, ...parsed]));
    setImportText("");
    setImportOpen(false);
    toast.success(`${parsed.length} fármacos importados (recuerda Guardar)`);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(drugs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogo-farmacologico.json";
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {drugs.length} fármacos
          </span>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full sm:w-96 rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {categories.map((c) => (
            <optgroup key={c} label={c}>
              {drugs
                .filter((d) => (d.category?.trim() || "Sin categoría") === c)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </optgroup>
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
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Droplets className="size-4" style={{ color: accent }} />
          <span className="text-sm font-bold">Catálogo de fármacos</span>
          <div className="flex-1" />
          {isAdmin && (
            <>
              <button
                onClick={() =>
                  setDrugs((d) => [
                    { id: uid(), name: "Nuevo fármaco", category: cat === "all" ? "Sin categoría" : cat, mgPerKgPerDose: 10, dosesPerDay: 3 },
                    ...d,
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
              >
                <Plus className="size-3" /> Añadir
              </button>
              <button
                onClick={() => setImportOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
              >
                <FileUp className="size-3" /> Importar
              </button>
              <button
                onClick={() =>
                  setDrugs((prev) => {
                    const names = new Set(prev.map((d) => d.name.toLowerCase()));
                    const add = baseCatalog().filter((d) => !names.has(d.name.toLowerCase()));
                    if (!add.length) toast.info("El catálogo base ya está incluido");
                    else toast.success(`${add.length} fármacos añadidos del catálogo base`);
                    return [...prev, ...add];
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
              >
                <Sparkles className="size-3" /> Catálogo base
              </button>
              <button
                onClick={exportJson}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
              >
                <Download className="size-3" /> Exportar
              </button>
              <button
                onClick={() => saveMut.mutate(drugs)}
                disabled={saveMut.isPending}
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

        {isAdmin && importOpen && (
          <div className="mb-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Importación masiva
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Una línea por fármaco:{" "}
              <code>nombre; categoría; indicación; mg/kg/dosis; dosis/día; máx mg; mg/mL; vía; notas</code>{" "}
              — o pega un arreglo JSON.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder={"Cefepime; Antibióticos parenterales; Neutropenia febril; 50; 3; 2000; 100/1; EV; Ajustar en falla renal"}
              className="mt-2 w-full rounded-lg border border-border/60 bg-background/60 px-2 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => runImport(false)}
                className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-bold"
              >
                Añadir al catálogo
              </button>
              <button
                onClick={() => runImport(true)}
                className="rounded-lg border border-border/60 px-2.5 py-1 text-[11px] font-bold"
              >
                Reemplazar todo
              </button>
            </div>
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fármaco, indicación o vía…"
              className="w-full rounded-lg border border-border/60 bg-background/60 pl-8 pr-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-xs outline-none"
          >
            <option value="all">Todas las categorías ({drugs.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {visible.map((d) => (
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
                label="Categoría"
                value={d.category ?? ""}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { category: v })}
                className="sm:col-span-2"
              />
              <TextCell
                label="Vía"
                value={d.route ?? ""}
                editable={isAdmin}
                onChange={(v) => patch(d.id, { route: v })}
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
                <div className="flex items-end gap-1.5">
                  <button
                    onClick={() =>
                      setDrugs((x) => [
                        ...x,
                        { ...d, id: uid(), name: `${d.name} (copia)` },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-bold hover:border-primary/40"
                  >
                    <Copy className="size-3" />
                  </button>
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
          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
              Sin coincidencias.
            </div>
          )}
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
