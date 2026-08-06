import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  BookOpen,
  Crown,
  GraduationCap,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminTeachers from "@/components/admin/AdminTeachers";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminAdmissions from "@/components/admin/AdminAdmissions";
import AdminEnrollments from "@/components/admin/AdminEnrollments";

export const Route = createFileRoute("/_authenticated/admin/command")({
  head: () => ({
    meta: [
      { title: "Command Center · KotaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenterPage,
});

const SECTIONS = [
  { key: "analitica", label: "Analítica", icon: BarChart3 },
  { key: "matriculas", label: "Matrículas", icon: ClipboardCheck },
  { key: "usuarios", label: "Usuarios", icon: Users },
  { key: "matriculacion", label: "Matriculación manual", icon: GraduationCap },
  { key: "membresias", label: "Membresías y permisos", icon: Crown },
  { key: "docentes", label: "Docentes", icon: GraduationCap },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function CommandCenterPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const [section, setSection] = useState<SectionKey>("analitica");

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);
  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, navigate]);

  if (isLoading || isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.5} /> Volver al panel
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="size-11 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Sparkles className="size-5" strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">⚙️ KotaMed Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Control total de academia, usuarios, membresías, permisos y analítica.
            </p>
          </div>
          <Link
            to="/admin/contenido"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            <BookOpen className="size-4" /> Árbol académico
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                section === s.key
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <s.icon className="size-3.5" /> {s.label}
            </button>
          ))}
        </div>

        {section === "analitica" && <AdminAnalytics />}
        {section === "matriculas" && <AdminAdmissions />}
        {section === "usuarios" && <AdminUsers />}
        {section === "membresias" && <AdminPlans />}
        {section === "docentes" && <AdminTeachers />}
      </div>
    </div>
  );
}
