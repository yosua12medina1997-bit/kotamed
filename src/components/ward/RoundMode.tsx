/** Modo Ronda: recorrido cama por cama con checklist y nota rápida. */
import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Save } from "lucide-react";
import { Btn, Empty, Field, Textarea } from "@/components/academy/ui";
import {
  SOAP_OBJECTIVE,
  WARD_KEYS,
  hospitalDay,
  patientLabel,
  useWardSave,
  type WardBed,
  type WardPatient,
  type WardZone,
} from "@/lib/ward-os";
import { Input } from "@/components/academy/ui";
import { StatusPill, WardCard } from "./ui";

const CHECKLIST = [
  "Revisé funciones vitales de las últimas 24 h",
  "Examen físico dirigido al problema principal",
  "Revisé exámenes auxiliares pendientes",
  "Verifiqué indicaciones y dosis actuales",
  "Actualicé la lista de problemas",
  "Informé a la familia",
];

export function RoundMode({
  patients,
  zones,
  beds,
  accent,
}: {
  patients: WardPatient[];
  zones: WardZone[];
  beds: WardBed[];
  accent: string;
}) {
  const [index, setIndex] = useState(0);
  const [checks, setChecks] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState("");
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const save = useWardSave("ward_evolutions", [WARD_KEYS.evolutions]);

  if (patients.length === 0) {
    return (
      <WardCard title="Modo Ronda">
        <Empty text="No hay pacientes activos en el pabellón para iniciar la ronda." />
      </WardCard>
    );
  }

  const patient = patients[Math.min(index, patients.length - 1)]!;
  const bed = beds.find((b) => b.id === patient.bed_id);
  const zone = zones.find((z) => z.id === bed?.zone_id);
  const done = checks[patient.id] ?? [];

  function toggle(item: string) {
    setChecks((c) => {
      const list = c[patient.id] ?? [];
      return {
        ...c,
        [patient.id]: list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
      };
    });
  }

  async function saveRound(next: boolean) {
    if (note.trim() || Object.values(vitals).some(Boolean)) {
      await save.mutateAsync({
        patient_id: patient.id,
        evo_date: new Date().toISOString().slice(0, 10),
        hosp_day: hospitalDay(patient.admitted_at),
        status: "borrador",
        objective: vitals,
        summary: "Nota de ronda",
        analysis: note.trim() || null,
      });
    }
    setNote("");
    setVitals({});
    if (next) setIndex((i) => Math.min(patients.length - 1, i + 1));
  }

  return (
    <div className="space-y-5">
      <WardCard
        title={`Ronda · paciente ${index + 1} de ${patients.length}`}
        subtitle="Avanza cama por cama registrando lo esencial de cada paciente."
        actions={
          <>
            <Btn onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ChevronLeft className="size-3.5" /> Anterior
            </Btn>
            <Btn
              variant="solid"
              accent={accent}
              loading={save.isPending}
              onClick={() => saveRound(true)}
            >
              Guardar y siguiente <ChevronRight className="size-3.5" />
            </Btn>
          </>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-black tracking-tight">{patientLabel(patient)}</span>
                <StatusPill status={patient.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  zone ? `${zone.label} · Cama ${bed?.number}` : "Sin cama",
                  patient.age_label,
                  `Día ${hospitalDay(patient.admitted_at)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-2 text-sm font-semibold">{patient.main_dx ?? "Sin diagnóstico"}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {SOAP_OBJECTIVE.slice(0, 6).map((f) => (
                <Field key={f.key} label={f.label}>
                  <Input
                    value={vitals[f.key] ?? ""}
                    onChange={(e) => setVitals((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>

            <Field label="Nota rápida de la ronda">
              <Textarea
                className="min-h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hallazgos, decisiones tomadas en la visita y acuerdos con el staff."
              />
            </Field>
            <div className="flex flex-wrap justify-end">
              <Btn loading={save.isPending} onClick={() => saveRound(false)}>
                <Save className="size-3.5" /> Guardar sin avanzar
              </Btn>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <h4 className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent }}>
              Checklist de visita
            </h4>
            <ul className="mt-3 space-y-2">
              {CHECKLIST.map((item) => {
                const active = done.includes(item);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-xl border px-3 py-2 text-left text-[12px] transition ${
                        active ? "border-transparent" : "border-border/60 hover:border-primary/40"
                      }`}
                      style={active ? { background: `${accent}14`, color: accent } : undefined}
                    >
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                      <span className={active ? "font-bold" : ""}>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {done.length}/{CHECKLIST.length} completado en este paciente.
            </p>
          </div>
        </div>
      </WardCard>
    </div>
  );
}
