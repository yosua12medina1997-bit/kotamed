/** Formulario de ingreso / edición de paciente académico del pabellón. */
import { useState } from "react";
import { Save } from "lucide-react";
import { Btn, Field, Input, Select, Textarea } from "@/components/academy/ui";
import {
  PATIENT_STATUS,
  PRIORITIES,
  WARD_KEYS,
  useWardSave,
  type PatientStatus,
  type WardBed,
  type WardPatient,
  type WardZone,
} from "@/lib/ward-os";
import { Modal } from "./ui";

export function PatientForm({
  open,
  onClose,
  patient,
  bedId,
  zones,
  beds,
  patients,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  patient?: WardPatient | null;
  bedId?: string | null;
  zones: WardZone[];
  beds: WardBed[];
  patients: WardPatient[];
  accent: string;
}) {
  const save = useWardSave("ward_patients", [WARD_KEYS.patients]);
  const [form, setForm] = useState(() => ({
    code: patient?.code ?? "",
    initials: patient?.initials ?? "",
    sex: patient?.sex ?? "",
    age_label: patient?.age_label ?? "",
    weight_kg: patient?.weight_kg?.toString() ?? "",
    admitted_at: patient?.admitted_at ?? new Date().toISOString().slice(0, 10),
    bed_id: patient?.bed_id ?? bedId ?? "",
    reason: patient?.reason ?? "",
    main_dx: patient?.main_dx ?? "",
    secondary_dx: (patient?.secondary_dx ?? []).join(", "),
    background: patient?.background ?? "",
    allergies: patient?.allergies ?? "",
    medications: patient?.medications ?? "",
    devices: (patient?.devices ?? []).join(", "),
    status: (patient?.status ?? "estable") as PatientStatus,
    priority: patient?.priority ?? "media",
    notes: patient?.notes ?? "",
  }));

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const takenBeds = new Set(
    patients.filter((p) => p.id !== patient?.id && p.bed_id).map((p) => p.bed_id as string),
  );

  async function submit() {
    try {
      await save.mutateAsync({
        ...(patient?.id ? { id: patient.id } : {}),
        code: form.code || null,
        initials: form.initials || null,
        sex: form.sex || null,
        age_label: form.age_label || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        admitted_at: form.admitted_at,
        bed_id: form.bed_id || null,
        reason: form.reason || null,
        main_dx: form.main_dx || null,
        secondary_dx: form.secondary_dx
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        background: form.background || null,
        allergies: form.allergies || null,
        medications: form.medications || null,
        devices: form.devices
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: form.status,
        priority: form.priority,
        notes: form.notes || null,
      });
      toast.success(patient?.id ? "Paciente actualizado" : "Paciente registrado");
      onClose();
    } catch {
      /* el motivo ya se muestra con un toast desde useWardSave */
    }
  }


  return (
    <Modal
      open={open}
      wide
      onClose={onClose}
      title={patient ? "Editar paciente" : "Nuevo ingreso al pabellón"}
      subtitle="Usa iniciales o un código académico. No registres datos identificables del paciente real."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Iniciales">
          <Input value={form.initials} onChange={(e) => set("initials")(e.target.value)} placeholder="J.P.M." />
        </Field>
        <Field label="Código académico">
          <Input value={form.code} onChange={(e) => set("code")(e.target.value)} placeholder="HP-024" />
        </Field>
        <Field label="Cama">
          <Select value={form.bed_id} onChange={(e) => set("bed_id")(e.target.value)}>
            <option value="">Sin cama asignada</option>
            {zones
              .filter((z) => beds.some((b) => b.zone_id === z.id))
              .map((z) => (
                <optgroup key={z.id} label={z.label}>
                  {beds
                    .filter((b) => b.zone_id === z.id && b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id} disabled={takenBeds.has(b.id)}>
                        Cama {b.number}
                        {takenBeds.has(b.id) ? " · ocupada" : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
          </Select>
        </Field>
        <Field label="Sexo">
          <Select value={form.sex} onChange={(e) => set("sex")(e.target.value)}>
            <option value="">—</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </Select>
        </Field>
        <Field label="Edad (texto libre)">
          <Input value={form.age_label} onChange={(e) => set("age_label")(e.target.value)} placeholder="2 años 4 meses" />
        </Field>
        <Field label="Peso (kg)">
          <Input
            type="number"
            step="0.01"
            value={form.weight_kg}
            onChange={(e) => set("weight_kg")(e.target.value)}
          />
        </Field>
        <Field label="Fecha de ingreso">
          <Input type="date" value={form.admitted_at} onChange={(e) => set("admitted_at")(e.target.value)} />
        </Field>
        <Field label="Estado">
          <Select value={form.status} onChange={(e) => set("status")(e.target.value)}>
            {Object.entries(PATIENT_STATUS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select value={form.priority} onChange={(e) => set("priority")(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Motivo de ingreso">
            <Input value={form.reason} onChange={(e) => set("reason")(e.target.value)} placeholder="Tos y fiebre de 4 días" />
          </Field>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Diagnóstico principal">
            <Input value={form.main_dx} onChange={(e) => set("main_dx")(e.target.value)} placeholder="Neumonía adquirida en la comunidad" />
          </Field>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Diagnósticos secundarios (separados por coma)">
            <Input value={form.secondary_dx} onChange={(e) => set("secondary_dx")(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Dispositivos (separados por coma)">
            <Input value={form.devices} onChange={(e) => set("devices")(e.target.value)} placeholder="Vía periférica, cánula binasal" />
          </Field>
        </div>
        <Field label="Antecedentes">
          <Textarea value={form.background} onChange={(e) => set("background")(e.target.value)} />
        </Field>
        <Field label="Alergias">
          <Textarea value={form.allergies} onChange={(e) => set("allergies")(e.target.value)} />
        </Field>
        <Field label="Medicación actual">
          <Textarea value={form.medications} onChange={(e) => set("medications")(e.target.value)} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Notas del interno">
            <Textarea value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="solid" accent={accent} loading={save.isPending} onClick={submit}>
          <Save className="size-3.5" /> Guardar paciente
        </Btn>
      </div>
    </Modal>
  );
}
