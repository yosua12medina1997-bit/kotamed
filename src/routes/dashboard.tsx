import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  Brain,
  ClipboardList,
  CornerDownLeft,
  Flame,
  Home,
  Layers,
  MessageSquare,
  Sparkles,
  Stethoscope,
  Trophy,
} from "lucide-react";
import doctorAvatar from "@/assets/doctor-avatar.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel de estudio · Kotaro Academy" },
      {
        name: "description",
        content:
          "Continúa tu preparación para el Residentado Médico. Tema actual, tutor IA con evidencia, casos clínicos y progreso académico.",
      },
      { property: "og:title", content: "Panel de estudio · Kotaro Academy" },
      {
        property: "og:description",
        content:
          "Dashboard académico premium: pediatría, ENAM, ESSALUD, residencia. Aprendizaje activo con IA basada en AAP, Nelson y UpToDate.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 20%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[20%] -right-[5%] w-[40%] h-[60%] rounded-full blur-[120px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.12 280) 18%, transparent)",
          animationDelay: "-5s",
        }}
      />

      <RailSidebar />
      <TopNav />

      <main className="pl-20 pt-16 min-h-screen relative">
        <div className="max-w-7xl mx-auto px-10 py-10 grid grid-cols-12 gap-8">
          <div className="col-span-12 xl:col-span-8 space-y-8 animate-slide-up">
            <HeroTopic />
            <StatsRow />
            <LearningModes />
          </div>

          <div
            className="col-span-12 xl:col-span-4 space-y-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <AiTutorPanel />
            <CurriculumPath />
          </div>
        </div>
      </main>
    </div>
  );
}

function RailSidebar() {
  const items = [
    { icon: Home, label: "Inicio", active: true },
    { icon: BookOpen, label: "Biblioteca" },
    { icon: ClipboardList, label: "Simulacros" },
    { icon: Trophy, label: "Ranking" },
  ];
  return (
    <aside className="fixed left-0 top-0 h-full w-20 border-r border-border bg-white/40 flex flex-col items-center py-8 z-50 backdrop-blur-md">
      <div className="size-10 bg-primary rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-primary/20">
        <Stethoscope className="size-5 text-primary-foreground" strokeWidth={2.25} />
      </div>
      <nav className="flex flex-col gap-3">
        {items.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            aria-label={label}
            className={`size-11 rounded-xl flex items-center justify-center transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-black/[0.03]"
            }`}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopNav() {
  return (
    <header className="fixed top-0 left-20 right-0 h-16 glass z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="font-extrabold tracking-tighter text-xl">KOTARO</span>
        <span className="text-muted-foreground/40">/</span>
        <div className="flex items-center gap-2 bg-black/[0.04] px-3 py-1 rounded-full">
          <span className="size-2 bg-primary rounded-full" />
          <span className="text-xs font-semibold uppercase tracking-wider">Pediatría</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold">Dr. Arisaka</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Nivel 42 · Residente R2
          </span>
        </div>
        <img
          src={doctorAvatar}
          alt="Foto de perfil"
          className="size-9 rounded-full border-2 border-white shadow-sm object-cover"
        />
      </div>
    </header>
  );
}

function HeroTopic() {
  return (
    <section className="glass rounded-3xl p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 text-right pointer-events-none">
        <div className="text-[44px] font-extrabold text-black/[0.06] leading-none tabular-nums">
          65%
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
          Progreso del tema
        </div>
      </div>

      <div className="max-w-xl relative">
        <span className="text-primary font-bold text-xs uppercase tracking-widest">
          Continuar estudiando
        </span>
        <h1 className="text-4xl font-extrabold mt-2 tracking-tight text-balance leading-[1.1]">
          Ictericia Neonatal: Manejo y Fototerapia
        </h1>
        <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
          Enfoque clínico basado en las guías AAP 2022 para el manejo de la hiperbilirrubinemia
          en recién nacidos.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip label="Neonatología" />
          <Chip label="Frecuencia ENAM: Alta" tone="warning" />
          <Chip label="Dificultad: Media-Alta" />
          <Chip label="4.5 hrs" />
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex justify-between text-xs font-semibold">
            <span>Fisiopatología y diagnóstico</span>
            <span className="text-muted-foreground">45 min restantes</span>
          </div>
          <div className="h-1.5 w-full bg-black/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full w-[65%]"
              style={{ boxShadow: "0 0 12px color-mix(in oklab, var(--primary) 40%, transparent)" }}
            />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/20 cursor-pointer">
            Iniciar clase premium
          </button>
          <button className="px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Ver programa completo
          </button>
        </div>
      </div>
    </section>
  );
}

function Chip({ label, tone = "default" }: { label: string; tone?: "default" | "warning" }) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-200/60"
      : "bg-white/60 text-muted-foreground border-border";
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${toneClass}`}
    >
      {label}
    </span>
  );
}

function StatsRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Estudio total" value="142h" />
      <StatCard
        label="Racha"
        value="12"
        icon={<Flame className="size-4 text-amber-500" strokeWidth={2.5} />}
      />
      <StatCard label="Ranking" value="#4" />
      <StatCard label="Examen ENAM" value="14d" accent="rose" />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "rose";
}) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-1">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className={`text-2xl font-extrabold tabular-nums ${
            accent === "rose" ? "text-rose-500" : ""
          }`}
        >
          {value}
        </span>
        {icon}
      </div>
    </div>
  );
}

function LearningModes() {
  const modes = [
    {
      icon: BookOpen,
      title: "Manual Premium",
      desc: "Texto curado con perlas clave del examen.",
      tint: "teal",
    },
    {
      icon: Layers,
      title: "Flashcards",
      desc: "Repetición espaciada (SRS) personalizada.",
      tint: "indigo",
    },
    {
      icon: Activity,
      title: "Casos Clínicos",
      desc: "Simulación real con toma de decisiones.",
      tint: "rose",
    },
    {
      icon: ClipboardList,
      title: "Simulacros",
      desc: "Evaluación adaptativa nivel ENAM.",
      tint: "orange",
    },
    {
      icon: Brain,
      title: "Algoritmos",
      desc: "Diagnóstico y tratamiento paso a paso.",
      tint: "violet",
    },
    {
      icon: MessageSquare,
      title: "Perlas & Errores",
      desc: "Mnemotecnias y trampas del examen.",
      tint: "emerald",
    },
  ];

  const tintMap: Record<string, string> = {
    teal: "bg-teal-100 text-teal-700",
    indigo: "bg-indigo-100 text-indigo-700",
    rose: "bg-rose-100 text-rose-700",
    orange: "bg-orange-100 text-orange-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Modos de aprendizaje
        </h2>
        <button className="text-xs font-semibold text-primary hover:underline">
          Ver todos
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modes.map(({ icon: Icon, title, desc, tint }) => (
          <button
            key={title}
            className="glass p-6 rounded-2xl text-left hover:bg-white/80 transition-colors group cursor-pointer"
          >
            <div
              className={`size-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${tintMap[tint]}`}
            >
              <Icon className="size-5" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function AiTutorPanel() {
  return (
    <div className="glass rounded-3xl p-6 flex flex-col h-[520px] shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-8 bg-foreground rounded-full flex items-center justify-center">
          <Sparkles className="size-4 text-background" strokeWidth={2} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm tracking-tight">Tutor Kotaro</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Evidencia científica
          </span>
        </div>
        <div className="ml-auto flex gap-1">
          <span className="size-1.5 bg-primary rounded-full" />
          <span className="size-1.5 bg-primary/30 rounded-full" />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        <div className="bg-black/[0.04] p-4 rounded-2xl rounded-tl-none">
          <p className="text-xs leading-relaxed">
            ¿Cuál es el umbral para iniciar fototerapia en un neonato de 38 semanas con 24 horas
            de vida?
          </p>
        </div>
        <div className="bg-primary/[0.06] p-4 rounded-2xl rounded-tr-none border border-primary/10">
          <p className="text-xs leading-relaxed font-medium">
            Según la guía <strong>AAP 2022</strong>, para un neonato de 38 semanas sin factores
            de riesgo a las 24 h, el umbral es <strong>11.4 mg/dL</strong>. Utiliza el nomograma
            ajustado por edad gestacional y factores neurotóxicos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Source label="AAP 2022" />
            <Source label="Nelson 21ed" />
            <Source label="UpToDate" />
            <Source label="Red Book" />
          </div>
        </div>
        <div className="bg-black/[0.04] p-4 rounded-2xl rounded-tl-none">
          <p className="text-xs leading-relaxed">
            ¿Y si presenta isoinmunización Rh?
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Pregunta al tutor..."
            className="w-full bg-white/60 border border-border rounded-xl py-3 pl-4 pr-12 text-xs outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
          <button
            aria-label="Enviar"
            className="absolute right-2 top-1/2 -translate-y-1/2 size-8 bg-black/[0.05] hover:bg-black/[0.1] rounded-lg flex items-center justify-center text-muted-foreground transition-colors"
          >
            <CornerDownLeft className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Source({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 bg-white border border-border rounded text-[9px] font-mono text-muted-foreground">
      {label}
    </span>
  );
}

function CurriculumPath() {
  const stages = [
    { label: "Ciencias Clínicas", sub: "En curso · Pediatría", status: "active" as const },
    { label: "Internado Médico", sub: "Próximamente", status: "next" as const },
    { label: "ENAM / ESSALUD", sub: "Bloqueado", status: "locked" as const },
    { label: "Residencia (R1–R3)", sub: "Bloqueado", status: "locked" as const },
    { label: "Especialista", sub: "", status: "locked" as const },
  ];
  return (
    <div className="glass rounded-3xl p-6">
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
        Hoja de ruta académica
      </h4>
      <div className="space-y-5 relative">
        <div className="absolute left-[11px] top-1 bottom-1 w-px bg-black/[0.06]" />
        {stages.map((s) => (
          <div
            key={s.label}
            className={`relative pl-8 ${s.status === "locked" ? "opacity-45" : ""}`}
          >
            {s.status === "active" ? (
              <div className="absolute left-0 top-0.5 size-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-background">
                <span className="size-2 rounded-full bg-primary-foreground" />
              </div>
            ) : (
              <div className="absolute left-[5px] top-1.5 size-3 rounded-full bg-background border-2 border-black/10" />
            )}
            <div>
              <span
                className={`block text-xs font-bold leading-tight ${
                  s.status === "active" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {s.sub && (
                <span className="text-[10px] text-muted-foreground/70 uppercase tracking-tight">
                  {s.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
