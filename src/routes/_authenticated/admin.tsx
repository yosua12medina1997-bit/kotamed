import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAM_LABELS, useIsAdmin, useSupabaseUser, type ProgramSlug } from "@/lib/session";
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Shield, Sparkles, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel de administración · KotaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/admin") return <Outlet />;
  return <AdminPage />;
}

type Row = {
  id: string;
  user_id: string;
  program: ProgramSlug;
  expires_at: string;
  created_at: string;
  profiles: { email: string; full_name: string | null } | null;
};

function AdminPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);
  const qc = useQueryClient();

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);
  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, navigate]);

  const enrollments = useQuery({
    queryKey: ["admin-enrollments"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id,user_id,program,expires_at,created_at,profiles(email,full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { email: string; program: ProgramSlug; expires_at: string }) => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", input.email.toLowerCase())
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("Ese email no está registrado todavía. Pide al usuario que se registre primero.");
      const { error } = await supabase.from("enrollments").upsert(
        {
          user_id: profile.id,
          program: input.program,
          expires_at: input.expires_at,
          created_by: user!.id,
        },
        { onConflict: "user_id,program" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-enrollments"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-enrollments"] }),
  });

  const defaultExpires = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [email, setEmail] = useState("");
  const [program, setProgram] = useState<ProgramSlug>("residentado");
  const [expiresAt, setExpiresAt] = useState(defaultExpires);
  const [err, setErr] = useState<string | null>(null);

  if (adminLoading || isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-3.5" strokeWidth={2.5} /> Volver al dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <span className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Shield className="size-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Panel de administración</h1>
            <p className="text-sm text-muted-foreground">Control total de matrículas y contenido</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <Link
            to="/admin/command"
            className="glass rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group md:col-span-2"
          >
            <span className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-5" strokeWidth={2.25} />
            </span>
            <div className="flex-1">
              <div className="font-bold text-sm">👑 Command Center</div>
              <div className="text-xs text-muted-foreground">
                Analítica, usuarios, membresías, permisos por curso y docentes
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
          </Link>
          <Link
            to="/admin/contenido"
            className="glass rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
          >
            <span className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="size-5" strokeWidth={2.25} />
            </span>
            <div className="flex-1">
              <div className="font-bold text-sm">Editor de contenido</div>
              <div className="text-xs text-muted-foreground">Cursos, programas, áreas, subáreas, capítulos y lecciones</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
          </Link>
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <span className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-5" strokeWidth={2.25} />
            </span>
            <div className="flex-1">
              <div className="font-bold text-sm">Matrículas de estudiantes</div>
              <div className="text-xs text-muted-foreground">Otorga o revoca acceso por programa</div>
            </div>
          </div>
        </div>

        <section className="glass rounded-3xl p-6 mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Nueva matrícula
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              try {
                await create.mutateAsync({ email, program, expires_at: new Date(expiresAt).toISOString() });
                setEmail("");
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Error");
              }
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Email del estudiante
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="estudiante@correo.com"
                className="mt-1 w-full bg-white/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Programa
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value as ProgramSlug)}
                className="mt-1 w-full bg-white/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.keys(PROGRAM_LABELS) as ProgramSlug[]).map((p) => (
                  <option key={p} value={p}>{PROGRAM_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Vence el
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
                className="mt-1 w-full bg-white/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-4 flex items-center justify-between gap-3">
              {err && <span className="text-xs text-rose-600 font-semibold">{err}</span>}
              <button
                type="submit"
                disabled={create.isPending}
                className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
              >
                {create.isPending && <Loader2 className="size-4 animate-spin" />}
                Matricular
              </button>
            </div>
          </form>
        </section>

        <section className="glass rounded-3xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Matrículas activas ({enrollments.data?.length ?? 0})
          </h2>
          {enrollments.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : !enrollments.data?.length ? (
            <p className="text-sm text-muted-foreground">Aún no hay matrículas.</p>
          ) : (
            <div className="divide-y divide-border">
              {enrollments.data.map((row) => {
                const expired = new Date(row.expires_at).getTime() < Date.now();
                return (
                  <div key={row.id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">
                        {row.profiles?.full_name || row.profiles?.email || row.user_id}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {row.profiles?.email} · {PROGRAM_LABELS[row.program]}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${expired ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                    >
                      {expired ? "Vencida" : "Activa"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono w-24 text-right">
                      {new Date(row.expires_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => remove.mutate(row.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
