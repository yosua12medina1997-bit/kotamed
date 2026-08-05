/** Formulario dinámico: renderiza grupos de campos definidos por el admin. */
import type { DynamicField, DynamicGroup } from "@/lib/neonatal-hospital";
import { Field, Input, Select, Textarea } from "@/components/academy/ui";

export function DynamicForm({
  groups,
  values,
  onChange,
  accent,
  disabled,
}: {
  groups: DynamicGroup[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key} className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <div
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: accent }}
          >
            {g.title}
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {g.fields.map((f) => (
              <div
                key={f.key}
                className={f.type === "textarea" ? "md:col-span-2 xl:col-span-3" : undefined}
              >
                <DynamicInput
                  field={f}
                  value={values?.[f.key]}
                  onChange={(v) => onChange(f.key, v)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DynamicInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: DynamicField;
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
}) {
  const label = field.unit ? `${field.label} (${field.unit})` : field.label;

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="truncate">{label}</span>
      </label>
    );
  }

  return (
    <Field label={label}>
      {field.type === "textarea" ? (
        <Textarea
          value={value ?? ""}
          disabled={disabled}
          placeholder={field.hint ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <Select value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
          step={field.type === "number" ? "any" : undefined}
          value={value ?? ""}
          disabled={disabled}
          placeholder={field.hint ?? ""}
          onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        />
      )}
    </Field>
  );
}
