/** Módulo "Matriculación Manual": busca usuarios, matricula y audita el historial. */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, History, Loader2, Search, User as UserIcon } from "lucide-react";
import { Badge, Btn, Card, SectionTitle, Stat, inputCls } from "./ui";
import { usePlans } from "./AdminPlans";
import { EnrollmentModal } from "./EnrollmentModal";
import { UserEnrollmentsTable } from "./UserEnrollmentsTable";
import { useAllEnrollments, useEnrollmentAudit, useUserEnrollments } from "@/lib/enrollments";
import { isEnrollmentLive } from "@/lib/enrollments-shared";

const db = supabase as any;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  university: string | null;
  specialty: string | null;
  academic_level: string | null;
  cmp: string | null;
  avatar_url: string | null;
  created_at: string;
};

const AUDIT_LABELS: Record<string, string> = {
  enrollment_created: "Matrícula creada",
  enrollment_renewed: "Matrícula renovada",
  enrollment_updated: "Matrícula modificada",
  enrollment_deleted: "Matrícula eliminada",
  plan_synced: "Membresía sincronizada",
};

export default function AdminEnrollments() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProfileRow | null>(null);
  const [openModal, setOpenModal] = useState(false);

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

  const membershipsQ = useQuery({
    queryKey: ["admin-user-memberships"],
    queryFn: async () => {
      const { data, error } = await db.from("user_memberships").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const plansQ = usePlans();
  const allQ = useAllEnrollments();
  const auditQ = useEnrollmentAudit();

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return (usersQ.data ?? []).slice(0, 60);
    return (usersQ.data ?? []).filter((u) =>
      [u.email, u.full_name, u.phone, u.cmp, u.university, u.specialty]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [q, usersQ.data]);

  const membership = useMemo(() => {
    if (!selected) return null;
    return (membershipsQ.data ?? []).find((m: any) => m.user_id === selected.id) ?? null;
  }, [selected, membershipsQ.data]);

  const plan = plansQ.data?.find((p) => p.id === membership?.plan_id);
  const all = allQ.data ?? [];

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Matriculación manual"
        hint="Asigna programas, cursos, diplomados o bibliotecas a cualquier usuario sin necesidad de compra."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Matrículas" value={all.length} />
        <Stat label="Vigentes" value={all.filter(isEnrollmentLive).length} />
        <Stat label="Manuales" value={all.filter((e) => e.assignment_type === "manual").length} />
        <Stat label="Permanentes" value={all.filter((e) => !e.expires_at).length} />
      </div>

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, apellido, correo, teléfono, CMP o universidad…"
          className={`${inputCls} pl-9`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
        <Card className="p-0 overflow-hidden max-h-[460px] overflow-y-auto">
          {usersQ.isLoading ? (
            <div className="p-5">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    selected?.id === u.id ? "bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <UserIcon className="size-4" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{u.full_name || u.email}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{u.email}</span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {!selected ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                Selecciona un usuario para ver su información y matricularlo.
              </p>
            </Card>
          ) : (
            <>
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
                    {selected.avatar_url ? (
                      <img src={selected.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <UserIcon className="size-5" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold tracking-tight truncate">
                      {selected.full_name || selected.email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{selected.email}</div>
                  </div>
                  {plan ? <Badge tone="ok">{plan.name}</Badge> : <Badge>Sin plan</Badge>}
                  {membership?.status && <Badge tone="warn">{membership.status}</Badge>}
                  <Btn onClick={() => setOpenModal(true)}>
                    <GraduationCap className="size-3.5" /> Matricular usuario
                  </Btn>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Info label="País" value={selected.country} />
                  <Info label="Universidad" value={selected.university} />
                  <Info label="Especialidad" value={selected.specialty} />
                  <Info label="Nivel académico" value={selected.academic_level} />
                  <Info label="Teléfono" value={selected.phone} />
                  <Info label="CMP" value={selected.cmp} />
                  <Info
                    label="Registro"
                    value={new Date(selected.created_at).toLocaleDateString()}
                  />
                  <QuickCounts userId={selected.id} />
                </div>
              </Card>

              <UserEnrollmentsTable
                userId={selected.id}
                userLabel={selected.full_name || selected.email}
              />

              <EnrollmentModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                userId={selected.id}
                userLabel={selected.full_name || selected.email}
              />
            </>
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="Historial y auditoría" hint="Cada acción queda registrada con fecha, hora, IP y dispositivo." />
        <Card className="p-0 overflow-x-auto">
          {auditQ.isLoading ? (
            <div className="p-5">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (auditQ.data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Sin registros todavía.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  {["Acción", "Administrador", "Usuario", "Programa", "Fecha", "IP", "Dispositivo"].map((h) => (
                    <th key={h} className="text-left font-bold px-3 py-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(auditQ.data ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                      {AUDIT_LABELS[r.action] ?? r.action}
                    </td>
                    <td className="px-3 py-2.5 truncate max-w-[160px]">{r.actor_email ?? "—"}</td>
                    <td className="px-3 py-2.5 truncate max-w-[160px]">{r.target_email ?? "—"}</td>
                    <td className="px-3 py-2.5 truncate max-w-[180px]">{r.node_title ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-mono">{r.ip_address ?? "—"}</td>
                    <td className="px-3 py-2.5 truncate max-w-[200px]" title={r.user_agent ?? ""}>
                      {r.user_agent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-semibold truncate">{value || "—"}</div>
    </div>
  );
}

function QuickCounts({ userId }: { userId: string }) {
  const q = useUserEnrollments(userId);
  const rows = q.data ?? [];
  const live = rows.filter(isEnrollmentLive).length;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Matrículas
      </div>
      <div className="font-semibold">
        {live} activas · {rows.length - live} cerradas
      </div>
    </div>
  );
}
