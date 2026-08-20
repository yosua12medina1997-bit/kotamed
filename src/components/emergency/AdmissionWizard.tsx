/**
 * Nuevo ingreso a Emergencia: flujo rápido de 4 pasos
 * IDENTIFICACIÓN → MOTIVO → CLASIFICACIÓN → UBICACIÓN.
 */
import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Btn, Field, Input, Select, Textarea } from "@/components/academy/ui";
import {
  AREAS,
  EMERG_KEYS,
  EMERG_STATUS,
  logEmergEvent,
  useEmergSave,
  type EmergArea,
  type EmergBox,
  type EmergPatient,
  type EmergStatus,
} from "@/lib/emergency-os";
import { Modal } from "./ui";

const STEPS = ["Identificación", "Motivo de atención", "Clasificación", "Ubicación"];

export function AdmissionWizard({
  open,
  onClose,
  accent,
  boxes,
  patients,
  presetBoxId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  boxes: EmergBox[];
  patients: EmergPatient[];
  presetBoxId: string | null;
  onCreated: (id: string) => void;
}) {
  const save = useEmergSave("emerg_patients", [EMERG_KEYS.patients]);
  const [step, setStep] = useState(0);
  const [initials, setInitials] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [reason, setReason] = useState("");
  const [area, setArea] = useState<EmergArea>("observacion");
  const [status, setStatus] = useState<EmergStatus>("seguimiento");
  const [boxId, setBoxId] = useState<string | null>(presetBoxId);

  const occupied = useMemo(
    () => new Set(patients.map((p) => p.box_id).filter(Boolean) as string[]),
    [patients],
  );
  const freeBoxes = useMemo(
    () => boxes.filter((b) => b.area === area && (!occupied.has(b.id) || b.id === boxId)),
    [boxes, area, occupied, boxId],
  );

  function reset() {
    setStep(0);
    setInitials("");
    setAgeLabel("");
    setSex("");
    setWeight("");
    setReason("");
    setArea("observacion");
    setStatus("seguimiento");
    setBoxId(null);
  }

  const canNext =
    step === 0 ? initials.trim().length > 0 : step === 1 ? reason.trim().length > 0 : true;

  async function submit() {
    const id = await save.mutateAsync({
      initials: initials.trim().toUpperCase(),
      age_label: ageLabel.trim() || null,
      sex: sex || null,
      weight_kg: weight ? Number(weight) : null,
      reason: reason.trim(),
      area,
      status,
      box_id: boxId,
      admitted_at: new Date().toISOString(),
    });
    if (!id) return;
    await logEmergEvent({
      patient_id: id,
      kind: "ingreso",
      title: "Ingreso a Emergencia",
      detail: `${AREAS.find((a) => a.value === area)?.label ?? area} · ${reason.trim()}`,
    });
    toast.success("Paciente ingresado a Emergencia");
    reset();
    onCreated(id);
  }

  return (
    <Modal
      open={open}
      title="Nuevo ingreso"
      subtitle="Registro rápido: identificación, motivo, clasificación y ubicación."
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide"
            style={
              i === step
                ? { background: accent, color: "#fff" }
                : { background: `${accent}12`, color: accent, opacity: i < step ? 1 : 0.55 }
            }
          >
            {i < step ? <Check className="size-3" /> : <span>{`0${i + 1}`}</span>}
            {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Iniciales / ID del paciente">
            <Input
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              placeholder="A.S.M."
            />
          </Field>
          <Field label="Edad">
            <Input
              value={ageLabel}
              onChange={(e) => setAgeLabel(e.target.value)}
              placeholder="3 años 2 meses"
            />
          </Field>
          <Field label="Sexo">
            <Select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </Select>
          </Field>
          <Field label="Peso (kg)">
            <Input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="12.4"
              inputMode="decimal"
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <Field label="Motivo de atención">
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Fiebre y dificultad respiratoria."
          />
        </Field>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div>
            <div className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Área
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {AREAS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => {
                    setArea(a.value);
                    setBoxId(null);
                  }}
                  className="rounded-2xl border p-3 text-left transition hover:shadow-sm"
                  style={{
                    borderColor: area === a.value ? a.color : undefined,
                    background: area === a.value ? `${a.color}0d` : undefined,
                  }}
                >
                  <div className="text-[13px] font-black" style={{ color: a.color }}>
                    {a.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{a.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Prioridad
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EMERG_STATUS) as EmergStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="rounded-xl border px-3 py-1.5 text-[11.5px] font-bold transition"
                  style={{
                    borderColor: status === s ? EMERG_STATUS[s].color : undefined,
                    background: status === s ? `${EMERG_STATUS[s].color}14` : undefined,
                    color: status === s ? EMERG_STATUS[s].color : undefined,
                  }}
                >
                  {EMERG_STATUS[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Ubicación disponible
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {freeBoxes.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBoxId(b.id)}
                className="rounded-xl border px-2 py-2 text-[12px] font-black transition"
                style={{
                  borderColor: boxId === b.id ? accent : undefined,
                  background: boxId === b.id ? `${accent}12` : undefined,
                  color: boxId === b.id ? accent : undefined,
                }}
              >
                {b.code}
              </button>
            ))}
          </div>
          {freeBoxes.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              No hay boxes libres en esta área. Puedes ingresar al paciente sin ubicación y asignarla
              después.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <Btn variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
          {step === 0 ? "Cancelar" : "Atrás"}
        </Btn>
        {step < 3 ? (
          <Btn variant="solid" accent={accent} disabled={!canNext} onClick={() => setStep(step + 1)}>
            Continuar <ArrowRight className="size-3.5" />
          </Btn>
        ) : (
          <Btn variant="solid" accent={accent} loading={save.isPending} onClick={() => void submit()}>
            Ingresar paciente <ArrowRight className="size-3.5" />
          </Btn>
        )}
      </div>
    </Modal>
  );
}
