/** Gestión de docentes de la academia. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge, Btn, Card, Field, Modal, SectionTitle, inputCls } from "./ui";

const db = supabase as any;

type Teacher = {
  id?: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  specialty: string | null;
  hospital: string | null;
  university: string | null;
  bio: string | null;
  cv_url: string | null;
  rating: number;
  years_teaching: number;
  is_active: boolean;
  sort_order: number;
};

const EMPTY: Teacher = {
  full_name: "",
  email: "",
  avatar_url: "",
  specialty: "",
  hospital: "",
  university: "",
  bio: "",
  cv_url: "",
  rating: 5,
  years_teaching: 0,
  is_active: true,
  sort_order: 100,
};

export default function AdminTeachers() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Teacher | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const { data, error } = await db.from("teachers").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Teacher[];
    },
  });

  const save = useMutation({
    mutationFn: async (t: Teacher) => {
      const payload = {
        full_name: t.full_name,
        email: t.email || null,
        avatar_url: t.avatar_url || null,
        specialty: t.specialty || null,
        hospital: t.hospital || null,
        university: t.university || null,
        bio: t.bio || null,
        cv_url: t.cv_url || null,
        rating: Number(t.rating) || 0,
        years_teaching: Number(t.years_teaching) || 0,
        is_active: t.is_active,
        sort_order: Number(t.sort_order) || 0,
      };
      if (t.id) {
        const { error } = await db.from("teachers").update(payload).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("teachers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Docente guardado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-teachers"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-teachers"] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionTitle title="Docentes" hint="Perfiles del equipo académico." />
        <Btn onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="size-3.5" /> Nuevo docente
        </Btn>
      </div>

      {listQ.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(listQ.data ?? []).map((t) => (
            <Card key={t.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <GraduationCap className="size-5" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{t.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.specialty}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[t.hospital, t.university].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Badge tone={t.is_active ? "ok" : "muted"}>{t.is_active ? "Activo" : "Oculto"}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 text-amber-500" /> {Number(t.rating).toFixed(1)}
                </span>
                <span>{t.years_teaching} años enseñando</span>
              </div>
              {t.bio && <p className="text-xs text-muted-foreground line-clamp-3">{t.bio}</p>}
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => setEditing(t)}>
                  <Pencil className="size-3.5" /> Editar
                </Btn>
                <Btn variant="danger" onClick={() => t.id && remove.mutate(t.id)}>
                  <Trash2 className="size-3.5" />
                </Btn>
              </div>
            </Card>
          ))}
          {(listQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay docentes registrados.</p>
          )}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Editar docente" : "Nuevo docente"}>
        {editing && (
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            {(
              [
                ["full_name", "Nombre completo"],
                ["email", "Correo"],
                ["specialty", "Especialidad"],
                ["hospital", "Hospital"],
                ["university", "Universidad"],
                ["avatar_url", "Foto (URL)"],
                ["cv_url", "Currículum (URL)"],
              ] as [keyof Teacher, string][]
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  className={inputCls}
                  required={key === "full_name"}
                  value={(editing[key] as string) ?? ""}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                />
              </Field>
            ))}
            <Field label="Calificación">
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                className={inputCls}
                value={editing.rating}
                onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
              />
            </Field>
            <Field label="Años enseñando">
              <input
                type="number"
                className={inputCls}
                value={editing.years_teaching}
                onChange={(e) => setEditing({ ...editing, years_teaching: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Biografía">
                <textarea
                  rows={4}
                  className={inputCls}
                  value={editing.bio ?? ""}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Docente visible
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
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
