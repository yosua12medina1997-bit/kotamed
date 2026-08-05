/**
 * KotaMed · Pantalla genérica de módulo del Centro de Operaciones.
 * Presenta el módulo como una aplicación independiente: pestañas superiores o
 * tarjetas, búsqueda contextual y breadcrumb — nunca listas infinitas.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Btn, Empty, Input, Panel } from "@/components/academy/ui";
import { navIcon, type NeoModule } from "@/lib/neonatal-nav";

export function ModuleTabs({
  tabs,
  active,
  onSelect,
  accent,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
  accent: string;
}) {
  if (tabs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/50 bg-background/40 p-1.5">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
              on ? "text-foreground" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
            style={on ? { background: `${accent}1f`, boxShadow: `inset 0 0 0 1px ${accent}55` } : undefined}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function GenericModule({
  mod,
  accent,
  onGoCenso,
}: {
  mod: NeoModule;
  accent: string;
  onGoCenso: () => void;
}) {
  const Icon = navIcon(mod.icon);
  const [tab, setTab] = useState(mod.tabs[0]?.id ?? "");
  const [card, setCard] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    setTab(mod.tabs[0]?.id ?? "");
    setCard(null);
    setQ("");
  }, [mod.id, mod.tabs]);

  const cards = useMemo(() => {
    const query = q.trim().toLowerCase();
    return mod.tabs.filter((t) => !query || t.label.toLowerCase().includes(query));
  }, [mod.tabs, q]);

  /* ---------- Tarjetas ---------- */
  if (mod.layout === "cards") {
    const open = mod.tabs.find((t) => t.id === card);
    if (open) {
      return (
        <Panel
          title={open.label}
          subtitle={open.hint ?? `${mod.label} · pantalla de trabajo`}
          icon={<Icon className="size-4" />}
          accent={accent}
          actions={
            <Btn variant="outline" onClick={() => setCard(null)}>
              <ArrowLeft className="size-3" /> {mod.label}
            </Btn>
          }
        >
          <Workspace label={open.label} onGoCenso={onGoCenso} />
        </Panel>
      );
    }
    return (
      <Panel
        title={mod.label}
        subtitle="Selecciona una tarjeta: cada una abre su propia pantalla enfocada."
        icon={<Icon className="size-4" />}
        accent={accent}
        actions={<SearchBox value={q} onChange={setQ} />}
      >
        {cards.length === 0 ? (
          <Empty text="Sin resultados en este módulo." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <button
                key={c.id}
                onClick={() => setCard(c.id)}
                className="rounded-2xl border border-border/50 bg-background/40 p-4 text-left transition hover:border-primary/40 hover:bg-background/60"
              >
                <div className="text-[12px] font-extrabold tracking-tight">{c.label}</div>
                {c.hint && (
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.hint}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  /* ---------- Pestañas ---------- */
  const current = mod.tabs.find((t) => t.id === tab) ?? mod.tabs[0];
  return (
    <Panel
      title={mod.label}
      subtitle="Pantalla independiente del módulo; navega por sus pestañas superiores."
      icon={<Icon className="size-4" />}
      accent={accent}
      actions={<SearchBox value={q} onChange={setQ} />}
    >
      <ModuleTabs tabs={cards} active={current?.id ?? ""} onSelect={setTab} accent={accent} />
      <div className="mt-4">
        {current ? (
          <>
            {current.hint && (
              <p className="mb-3 text-xs text-muted-foreground">{current.hint}</p>
            )}
            <Workspace label={current.label} onGoCenso={onGoCenso} />
          </>
        ) : (
          <Empty text="Este módulo aún no tiene secciones. Configúralas en Administración › Módulos." />
        )}
      </div>
    </Panel>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Search className="size-3.5 text-muted-foreground" />
      <Input
        value={value}
        placeholder="Buscar en el módulo"
        onChange={(e) => onChange(e.target.value)}
        className="w-48"
      />
    </div>
  );
}

function Workspace({ label, onGoCenso }: { label: string; onGoCenso: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-8 text-center">
      <div className="text-sm font-bold tracking-tight">{label}</div>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
        Este proceso se registra sobre un paciente concreto. Abre un expediente del censo para
        trabajar en {label.toLowerCase()} con los formularios del servicio.
      </p>
      <div className="mt-4 flex justify-center">
        <Btn variant="outline" onClick={onGoCenso}>
          Abrir censo del servicio
        </Btn>
      </div>
    </div>
  );
}
