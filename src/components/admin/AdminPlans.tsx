/** Gestión de planes de membresía y permisos por curso. */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Btn, Card, Field, Modal, SectionTitle, inputCls } from "./ui";

const db = supabase as any;

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_amount: number;
  currency: string;
  period: string;
  color: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

export function usePlans() {
  return useQuery({
    queryKey: ["membership-plans"],
    queryFn: async () => {
      const { data, error } = await db
        .from("membership_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
      })) as Plan[];
    },
  });
}

export function useCourseNodes() {
  return useQuery({
    queryKey: ["admin-course-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,title,kind,slug,parent_id,sort_order")
        .in("kind", ["course", "program"])
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const EMPTY: Omit<Plan, "id"> = {
  slug: "",
  name: "",
  description: "",
  price_amount: 0,
  currency: "PEN",
  period: "mensual",
  color: "#6366f1",
  features: [],
  is_active: true,
  sort_order: 100,
};

export default function AdminPlans() {
  const qc = useQueryClient();
  const plansQ = usePlans();
  const nodesQ = useCourseNodes();
  const [editing, setEditing] = useState<(Omit<Plan, "id"> & { id?: string }) | null>(null);
  const [featuresText, setFeaturesText] = useState("");

  const accessQ = useQuery({
    queryKey: ["plan-content-access"],
    queryFn: async () => {
      const { data, error } = await db.from("plan_content_access").select("plan_id,node_id");
      if (error) throw error;
      return (data ?? []) as { plan_id: string; node_id: string }[];
    },
  });

  const accessSet = useMemo(
    () => new Set((accessQ.data ?? []).map((r) => `${r.plan_id}:${r.node_id}`)),
    [accessQ.data],
  );

  const save = useMutation({
    mutationFn: async (p: Omit<Plan, "id"> & { id?: string }) => {
      const payload = {
        slug: p.slug || slugify(p.name),
        name: p.name,
        description: p.description,
        price_amount: Number(p.price_amount) || 0,
        currency: p.currency,
        period: p.period,
        color: p.color,
        features: p.features,
        is_active: p.is_active,
        sort_order: Number(p.sort_order) || 0,
      };
      if (p.id) {
        const { error } = await db.from("membership_plans").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("membership_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plan guardado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["membership-plans"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("membership_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membership-plans"] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
  });

  const toggleAccess = useMutation({
    mutationFn: async (v: { planId: string; nodeId: string; on: boolean }) => {
      if (v.on) {
        const { error } = await db
          .from("plan_content_access")
          .insert({ plan_id: v.planId, node_id: v.nodeId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await db
          .from("plan_content_access")
          .delete()
          .eq("plan_id", v.planId)
          .eq("node_id", v.nodeId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-content-access"] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar el permiso"),
  });

  if (plansQ.isLoading) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Membresías" hint="Crea planes y define qué contenido incluye cada uno." />
        <Btn
          onClick={() => {
            setEditing({ ...EMPTY });
            setFeaturesText("");
          }}
        >
          <Plus className="size-3.5" /> Nuevo plan
        </Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(plansQ.data ?? []).map((p) => (
          <Card key={p.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span
                className="size-9 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: p.color }}
              >
                <Crown className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold tracking-tight">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.description}</div>
              </div>
              <Badge tone={p.is_active ? "ok" : "muted"}>{p.is_active ? "Activo" : "Oculto"}</Badge>
            </div>
            <div className="text-sm font-bold">
              {p.currency} {Number(p.price_amount).toFixed(2)}{" "}
              <span className="text-xs font-medium text-muted-foreground">/ {p.period}</span>
            </div>
            {p.features.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {p.features.slice(0, 5).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            )}

            <details className="text-xs" open>
              <summary className="cursor-pointer font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                Programas incluidos automáticamente
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                {(nodesQ.data ?? []).filter((n: any) => n.kind === "program").length === 0 && (
                  <p className="text-muted-foreground">Aún no hay programas creados.</p>
                )}
                {(nodesQ.data ?? [])
                  .filter((n: any) => n.kind === "program")
                  .map((n: any) => {
                    const on = accessSet.has(`${p.id}:${n.id}`);
                    return (
                      <label key={n.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            toggleAccess.mutate({ planId: p.id, nodeId: n.id, on: e.target.checked })
                          }
                        />
                        <span className="truncate">{n.title}</span>
                      </label>
                    );
                  })}
              </div>
              <Btn
                variant="ghost"
                className="mt-2"
                disabled={sync.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Desea agregar este nuevo contenido también a todos los usuarios que ya poseen esta membresía?",
                    )
                  ) {
                    sync.mutate(p.id);
                  }
                }}
              >
                {sync.isPending && <Loader2 className="size-3.5 animate-spin" />} Sincronizar usuarios
                existentes
              </Btn>
            </details>

            <details className="text-xs">
              <summary className="cursor-pointer font-bold text-muted-foreground uppercase tracking-widest text-[10px]">
                Contenido incluido
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                {(nodesQ.data ?? []).length === 0 && (
                  <p className="text-muted-foreground">Aún no hay cursos creados.</p>
                )}
                {(nodesQ.data ?? []).map((n: any) => {
                  const on = accessSet.has(`${p.id}:${n.id}`);
                  return (
                    <label key={n.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          toggleAccess.mutate({ planId: p.id, nodeId: n.id, on: e.target.checked })
                        }
                      />
                      <span className="truncate">
                        {n.title}
                        <span className="text-muted-foreground"> · {n.kind}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </details>

            <div className="flex items-center gap-2 pt-1">
              <Btn
                variant="ghost"
                onClick={() => {
                  setEditing(p);
                  setFeaturesText(p.features.join("\n"));
                }}
              >
                <Pencil className="size-3.5" /> Editar
              </Btn>
              <Btn variant="danger" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="size-3.5" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Editar plan" : "Nuevo plan"}>
        {editing && (
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                ...editing,
                features: featuresText
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          >
            <Field label="Nombre">
              <input
                className={inputCls}
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Identificador">
              <input
                className={inputCls}
                placeholder="pro"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <input
                  className={inputCls}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Precio">
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={editing.price_amount}
                onChange={(e) => setEditing({ ...editing, price_amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Periodo">
              <select
                className={inputCls}
                value={editing.period}
                onChange={(e) => setEditing({ ...editing, period: e.target.value })}
              >
                {["mensual", "trimestral", "semestral", "anual", "vitalicio"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Color">
              <input
                type="color"
                className={`${inputCls} h-10 p-1`}
                value={editing.color}
                onChange={(e) => setEditing({ ...editing, color: e.target.value })}
              />
            </Field>
            <Field label="Orden">
              <input
                type="number"
                className={inputCls}
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Beneficios (uno por línea)">
                <textarea
                  rows={5}
                  className={inputCls}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Plan activo y visible
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Btn>
              <Btn type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-3.5 animate-spin" />} Guardar
              </Btn>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
