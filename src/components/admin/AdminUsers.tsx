/** Gestión total de usuarios: perfil, membresía, accesos y actividad. */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, ShieldCheck, User as UserIcon } from "lucide-react";
import { Badge, Btn, Card, Field, Modal, SectionTitle, Stat, inputCls } from "./ui";
import { usePlans, useCourseNodes } from "./AdminPlans";

const db = supabase as any;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  university: string | null;
  hospital: string | null;
  specialty: string | null;
  academic_level: string | null;
  cmp: string | null;
  rne: string | null;
  avatar_url: string | null;
  language: string | null;
  timezone: string | null;
  notes: string | null;
  last_seen_at: string | null;
  created_at: string;
};

const TABS = ["Perfil", "Membresía", "Accesos", "Actividad"] as const;

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Perfil");

  const usersQ = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id,role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const membershipsQ = useQuery({
    queryKey: ["admin-user-memberships"],
    queryFn: async () => {
      const { data, error } = await db.from("user_memberships").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const plansQ = usePlans();
  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    (rolesQ.data ?? []).forEach((r: any) => m.set(r.user_id, r.role));
    return m;
  }, [rolesQ.data]);

  const memMap = useMemo(() => {
    const m = new Map<string, any>();
    (membershipsQ.data ?? []).forEach((r: any) => m.set(r.user_id, r));
    return m;
  }, [membershipsQ.data]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return usersQ.data ?? [];
    return (usersQ.data ?? []).filter(
      (u) =>
        u.email.toLowerCase().includes(t) ||
        (u.full_name ?? "").toLowerCase().includes(t) ||
        (u.specialty ?? "").toLowerCase().includes(t),
    );
  }, [q, usersQ.data]);

  const setRole = useMutation({
    mutationFn: async (v: { userId: string; role: "admin" | "student" }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", v.userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: v.userId, role: v.role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar el rol"),
  });

  return (
    <div className="space-y-5">
      <SectionTitle title="Gestión de usuarios" hint="Perfil completo, rol, membresía, accesos y actividad." />

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo o especialidad…"
          className={`${inputCls} pl-9`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Usuarios" value={usersQ.data?.length ?? 0} />
        <Stat label="Con membresía" value={membershipsQ.data?.length ?? 0} />
        <Stat label="Admins" value={(rolesQ.data ?? []).filter((r: any) => r.role === "admin").length} />
        <Stat label="Planes" value={plansQ.data?.length ?? 0} />
      </div>

      {usersQ.isLoading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((u) => {
              const mem = memMap.get(u.id);
              const plan = plansQ.data?.find((p) => p.id === mem?.plan_id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelected(u);
                    setTab("Perfil");
                  }}
                  className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                >
                  <span className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <UserIcon className="size-4" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{u.full_name || u.email}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {u.email} {u.specialty ? `· ${u.specialty}` : ""}
                    </span>
                  </span>
                  {roleMap.get(u.id) === "admin" && <Badge tone="warn">Admin</Badge>}
                  {plan ? <Badge tone="ok">{plan.name}</Badge> : <Badge>Sin plan</Badge>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">No hay usuarios que coincidan.</p>
            )}
          </div>
        </Card>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        wide
        title={selected ? selected.full_name || selected.email : ""}
      >
        {selected && (
          <div>
            <div className="flex flex-wrap gap-2 mb-5">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    tab === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
              <div className="ml-auto">
                <Btn
                  variant={roleMap.get(selected.id) === "admin" ? "danger" : "ghost"}
                  onClick={() =>
                    setRole.mutate({
                      userId: selected.id,
                      role: roleMap.get(selected.id) === "admin" ? "student" : "admin",
                    })
                  }
                >
                  <ShieldCheck className="size-3.5" />
                  {roleMap.get(selected.id) === "admin" ? "Quitar admin" : "Hacer admin"}
                </Btn>
              </div>
            </div>

            {tab === "Perfil" && <ProfileTab profile={selected} onSaved={() => usersQ.refetch()} />}
            {tab === "Membresía" && <MembershipTab userId={selected.id} />}
            {tab === "Accesos" && <AccessTab userId={selected.id} />}
            {tab === "Actividad" && <ActivityTab userId={selected.id} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

const PROFILE_FIELDS: { key: keyof ProfileRow; label: string }[] = [
  { key: "full_name", label: "Nombre completo" },
  { key: "phone", label: "Teléfono" },
  { key: "country", label: "País" },
  { key: "city", label: "Ciudad" },
  { key: "university", label: "Universidad" },
  { key: "hospital", label: "Hospital" },
  { key: "specialty", label: "Especialidad" },
  { key: "academic_level", label: "Nivel académico" },
  { key: "cmp", label: "CMP" },
  { key: "rne", label: "RNE" },
  { key: "avatar_url", label: "Foto (URL)" },
  { key: "language", label: "Idioma" },
  { key: "timezone", label: "Zona horaria" },
];

function ProfileTab({ profile, onSaved }: { profile: ProfileRow; onSaved: () => void }) {
  const [form, setForm] = useState<ProfileRow>(profile);
  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      PROFILE_FIELDS.forEach(({ key }) => (payload[key as string] = (form[key] as string) || null));
      payload.notes = form.notes || null;
      const { error } = await db.from("profiles").update(payload).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Correo">
          <input className={inputCls} value={profile.email} disabled />
        </Field>
        {PROFILE_FIELDS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <input
              className={inputCls}
              value={(form[key] as string) ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field label="Notas internas">
        <textarea
          rows={3}
          className={inputCls}
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Field>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Registro: {new Date(profile.created_at).toLocaleDateString()} · Último acceso:{" "}
          {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString() : "—"}
        </span>
        <Btn onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="size-3.5 animate-spin" />} Guardar perfil
        </Btn>
      </div>
    </div>
  );
}

function MembershipTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const plansQ = usePlans();
  const memQ = useQuery({
    queryKey: ["user-membership", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("user_memberships")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  const value =
    form ??
    memQ.data ?? {
      plan_id: "",
      status: "active",
      renews_at: "",
      payment_method: "",
      amount_paid: "",
      notes: "",
    };

  const save = useMutation({
    mutationFn: async () => {
      if (!value.plan_id) throw new Error("Selecciona un plan");
      const payload = {
        user_id: userId,
        plan_id: value.plan_id,
        status: value.status,
        renews_at: value.renews_at ? new Date(value.renews_at).toISOString() : null,
        payment_method: value.payment_method || null,
        amount_paid:
          value.amount_paid === "" || value.amount_paid == null ? null : Number(value.amount_paid),
        notes: value.notes || null,
      };
      const { error } = await db.from("user_memberships").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membresía actualizada");
      qc.invalidateQueries({ queryKey: ["user-membership", userId] });
      qc.invalidateQueries({ queryKey: ["admin-user-memberships"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
  });

  if (memQ.isLoading) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Plan">
          <select
            className={inputCls}
            value={value.plan_id ?? ""}
            onChange={(e) => setForm({ ...value, plan_id: e.target.value })}
          >
            <option value="">— Selecciona —</option>
            {(plansQ.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select
            className={inputCls}
            value={value.status}
            onChange={(e) => setForm({ ...value, status: e.target.value })}
          >
            {["active", "trial", "paused", "cancelled", "expired"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Renueva el">
          <input
            type="date"
            className={inputCls}
            value={value.renews_at ? String(value.renews_at).slice(0, 10) : ""}
            onChange={(e) => setForm({ ...value, renews_at: e.target.value })}
          />
        </Field>
        <Field label="Método de pago">
          <input
            className={inputCls}
            value={value.payment_method ?? ""}
            onChange={(e) => setForm({ ...value, payment_method: e.target.value })}
          />
        </Field>
        <Field label="Monto pagado">
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={value.amount_paid ?? ""}
            onChange={(e) => setForm({ ...value, amount_paid: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Notas de facturación">
        <textarea
          rows={3}
          className={inputCls}
          value={value.notes ?? ""}
          onChange={(e) => setForm({ ...value, notes: e.target.value })}
        />
      </Field>
      <div className="flex justify-end">
        <Btn onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="size-3.5 animate-spin" />} Guardar membresía
        </Btn>
      </div>
    </div>
  );
}

function AccessTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const nodesQ = useCourseNodes();
  const accessQ = useQuery({
    queryKey: ["user-content-access", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("user_content_access")
        .select("node_id,granted,expires_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as { node_id: string; granted: boolean; expires_at: string | null }[];
    },
  });

  const map = useMemo(() => {
    const m = new Map<string, { granted: boolean }>();
    (accessQ.data ?? []).forEach((r) => m.set(r.node_id, { granted: r.granted }));
    return m;
  }, [accessQ.data]);

  const setAccess = useMutation({
    mutationFn: async (v: { nodeId: string; mode: "plan" | "grant" | "revoke" }) => {
      if (v.mode === "plan") {
        const { error } = await db
          .from("user_content_access")
          .delete()
          .eq("user_id", userId)
          .eq("node_id", v.nodeId);
        if (error) throw error;
        return;
      }
      const { error } = await db.from("user_content_access").upsert(
        { user_id: userId, node_id: v.nodeId, granted: v.mode === "grant" },
        { onConflict: "user_id,node_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-content-access", userId] }),
    onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar el acceso"),
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Por defecto el acceso depende del plan. Aquí puedes conceder o bloquear contenido manualmente.
      </p>
      <div className="divide-y divide-border">
        {(nodesQ.data ?? []).map((n: any) => {
          const ov = map.get(n.id);
          const mode = !ov ? "plan" : ov.granted ? "grant" : "revoke";
          return (
            <div key={n.id} className="py-2.5 flex items-center gap-3">
              <span className="flex-1 min-w-0 text-sm truncate">
                {n.title} <span className="text-xs text-muted-foreground">· {n.kind}</span>
              </span>
              <select
                className="bg-background/60 border border-border rounded-lg px-2 py-1.5 text-xs"
                value={mode}
                onChange={(e) => setAccess.mutate({ nodeId: n.id, mode: e.target.value as any })}
              >
                <option value="plan">Según su plan</option>
                <option value="grant">Acceso concedido</option>
                <option value="revoke">Acceso bloqueado</option>
              </select>
            </div>
          );
        })}
        {(nodesQ.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Aún no hay cursos creados.</p>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const eventsQ = useQuery({
    queryKey: ["user-activity", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_study_events")
        .select("id,area_slug,activity,topic,minutes,score,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });

  const attemptsQ = useQuery({
    queryKey: ["user-attempts", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("academy_attempts")
        .select("is_correct")
        .eq("user_id", userId)
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalMin = (eventsQ.data ?? []).reduce((a: number, e: any) => a + Number(e.minutes || 0), 0);
  const attempts = attemptsQ.data ?? [];
  const correct = attempts.filter((a: any) => a.is_correct).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Horas estudiadas" value={(totalMin / 60).toFixed(1)} />
        <Stat label="Sesiones" value={eventsQ.data?.length ?? 0} />
        <Stat label="Preguntas" value={attempts.length} />
        <Stat
          label="Acierto"
          value={attempts.length ? `${Math.round((correct / attempts.length) * 100)}%` : "—"}
        />
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {(eventsQ.data ?? []).map((e: any) => (
            <div key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              <span className="font-bold">{e.activity}</span>
              <span className="text-muted-foreground truncate flex-1">
                {e.area_slug} {e.topic ? `· ${e.topic}` : ""}
              </span>
              <span className="text-muted-foreground">{Number(e.minutes).toFixed(0)} min</span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {(eventsQ.data ?? []).length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">Sin actividad registrada.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
