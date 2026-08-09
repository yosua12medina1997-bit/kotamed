/**
 * CMS Studio → KOTAMED.APP
 * Capa de integración en MODO SOLO LECTURA con el sitio público.
 * No escribe, publica ni modifica nada del sitio actual.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Database,
  ExternalLink,
  Eye,
  FileCode2,
  GitBranch,
  Globe,
  Image as ImageIcon,
  Loader2,
  Lock,
  Network,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Btn, Chip, Panel, Select } from "@/components/academy/ui";
import {
  WEBSITE_URL,
  useScanWebsite,
  useWebsiteActivity,
  useWebsiteProject,
} from "@/lib/website-projects";
import { buildSiteTree, inspectSite, type SiteInspection, type SiteTreeNode } from "@/lib/website-inspect";

type Tab =
  | "resumen"
  | "estructura"
  | "paginas"
  | "componentes"
  | "assets"
  | "contenido"
  | "configuracion"
  | "repositorio"
  | "actividad";

const TABS: { value: Tab; label: string }[] = [
  { value: "resumen", label: "📊 Resumen del sitio" },
  { value: "estructura", label: "🌳 Explorador de estructura" },
  { value: "paginas", label: "📄 Mapa de páginas" },
  { value: "componentes", label: "🧩 Componentes" },
  { value: "assets", label: "🖼️ Assets" },
  { value: "contenido", label: "📝 Contenido detectado" },
  { value: "configuracion", label: "⚙️ Configuración" },
  { value: "repositorio", label: "🔗 Repositorio" },
  { value: "actividad", label: "🕒 Actividad" },
];

const READONLY_TIP = "Disponible en una futura fase de edición.";

function Detected() {
  return (
    <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      Detectado
    </span>
  );
}

function Disabled({ children }: { children: React.ReactNode }) {
  return (
    <span title={READONLY_TIP} className="inline-flex cursor-not-allowed opacity-50">
      <span className="pointer-events-none">
        <Btn variant="outline">{children}</Btn>
      </span>
    </span>
  );
}

function Tree({ nodes, depth = 0 }: { nodes: SiteTreeNode[]; depth?: number }) {
  return (
    <ul className={depth ? "ml-4 border-l border-border/60 pl-3" : "space-y-1"}>
      {nodes.map((n) => (
        <li key={`${n.label}-${n.path ?? ""}`} className="py-0.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold">{n.label}</span>
            {n.path && <code className="font-mono text-[10px] text-muted-foreground">{n.path}</code>}
          </div>
          {n.children?.length ? <Tree nodes={n.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Globe }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 truncate text-sm font-extrabold">{value}</div>
    </div>
  );
}

export function WebsiteStudio() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [inspection, setInspection] = useState<SiteInspection | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const project = useWebsiteProject();
  const activity = useWebsiteActivity(project.data?.id);
  const scan = useScanWebsite(project.data);

  const data = inspection;
  const summary = project.data?.last_scan_summary ?? {};
  const tree = useMemo(() => (data ? buildSiteTree(data.pages) : []), [data]);
  const editableCount = data
    ? data.editableCandidates.reduce((n, g) => n + g.items.length, 0)
    : (summary.editable ?? 0);

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: (result) => {
        setInspection(result);
        toast.success("Análisis completado en modo solo lectura");
      },
      onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
    });

  if (project.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando integración del sitio…
      </div>
    );
  }

  if (!project.data) {
    return (
      <Panel accent="primary" title="Sitio web no conectado">
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
          <div>
            <p className="font-semibold">No se pudo leer el registro del sitio.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No se inventa información: falta el registro de <code>website_projects</code> o tu cuenta no tiene
              permiso <code>website.read</code>.
            </p>
            <div className="mt-3">
              <Disabled>Configurar conexión</Disabled>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  const p = project.data;

  return (
    <div className="space-y-3">
      {/* Banner de modo seguro */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900">
        <Lock className="size-4" />
        <span className="uppercase tracking-widest">Modo actual: solo lectura</span>
        <span className="font-medium">
          El sitio está conectado en modo seguro. Ningún cambio realizado desde CMS Studio modifica actualmente
          KOTAMED.APP.
        </span>
      </div>

      {/* Tarjeta principal */}
      <div className="rounded-3xl border border-border/60 bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">KOTAMED.APP</h2>
                <p className="text-xs text-muted-foreground">Sitio web conectado</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <a href={p.url} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline">
                {p.url}
              </a>
              <Chip accent="emerald">● {p.status === "connected" ? "Sitio conectado" : p.status}</Chip>
              <Chip>🔒 {p.integration_mode === "read_only" ? "read_only" : p.integration_mode}</Chip>
              <Chip>{p.environment}</Chip>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <a href={p.url} target="_blank" rel="noreferrer">
              <Btn variant="outline">
                <ExternalLink className="size-3.5" /> Abrir sitio
              </Btn>
            </a>
            <Btn variant="outline" onClick={() => setPreviewOn((v) => !v)}>
              <Eye className="size-3.5" /> Vista previa
            </Btn>
            <Btn variant="solid" loading={scan.isPending} onClick={runScan}>
              <RefreshCw className="size-3.5" /> Analizar sitio
            </Btn>
            <Btn variant="ghost" onClick={() => setTab("estructura")}>
              <Network className="size-3.5" /> Ver estructura
            </Btn>
            <Disabled>
              <Settings2 className="size-3.5" /> Configurar CMS
            </Disabled>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <Stat label="Último análisis" value={p.last_scan_at ? new Date(p.last_scan_at).toLocaleString() : "—"} icon={Activity} />
          <Stat label="Tecnología" value={p.framework ?? summary.framework ?? "—"} icon={FileCode2} />
          <Stat label="Páginas" value={data?.pages.length ?? summary.pages ?? "—"} icon={FileCode2} />
          <Stat label="Componentes" value={data?.components.length ?? summary.components ?? "—"} icon={Boxes} />
          <Stat label="Assets" value={data?.assets.length ?? summary.assets ?? "—"} icon={ImageIcon} />
          <Stat label="Contenido editable potencial" value={editableCount || "—"} icon={ShieldCheck} />
        </div>

        {previewOn && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/60">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
              <span className="text-xs font-bold">Vista previa de KOTAMED.APP</span>
              <a href={p.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                Abrir en nueva pestaña
              </a>
            </div>
            <iframe src={p.url} title="Vista previa de KOTAMED.APP" className="h-[520px] w-full bg-white" loading="lazy" />
            <p className="border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
              Vista incrustada del sitio real. No se crea ninguna copia funcional.
            </p>
          </div>
        )}
      </div>

      {/* Selector de vista */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
          {TABS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        {!data && tab !== "resumen" && tab !== "actividad" && tab !== "configuracion" && tab !== "repositorio" && (
          <Btn variant="outline" onClick={() => setInspection(inspectSite())}>
            <RefreshCw className="size-3.5" /> Detectar estructura ahora
          </Btn>
        )}
      </div>

      {tab === "resumen" && (
        <Panel accent="primary" title="Permisos de la integración">
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              <Chip accent="emerald">activo</Chip> <code>website.read</code> — inspección y representación del sitio.
            </li>
            {["website.write", "website.publish", "website.delete"].map((perm) => (
              <li key={perm} className="flex items-center gap-2 text-muted-foreground">
                <Chip>desactivado</Chip> <code>{perm}</code> — {READONLY_TIP}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {p.notes ??
              "CMS Studio no tiene permisos de escritura sobre KOTAMED durante esta fase."}
          </p>
          <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Preparado para la siguiente fase:</strong> editor visual, gestión de
            textos, imágenes, botones, secciones, SEO y navegación, con flujo Draft → Preview → Review → Publish,
            historial de versiones y rollback. Nada de esto está activado todavía.
          </div>
        </Panel>
      )}

      {tab === "estructura" && (
        <Panel accent="primary" title="Explorador del sitio">
          {!data ? (
            <p className="text-xs text-muted-foreground">Ejecuta «Analizar sitio» para detectar la estructura real.</p>
          ) : (
            <Tree nodes={tree} />
          )}
        </Panel>
      )}

      {tab === "paginas" && (
        <Panel title={`Mapa de páginas${data ? ` (${data.pages.length})` : ""}`}>
          {!data ? (
            <p className="text-xs text-muted-foreground">Sin análisis todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">Página</th>
                    <th className="py-1.5 pr-3">Ruta</th>
                    <th className="py-1.5 pr-3">Estado</th>
                    <th className="py-1.5 pr-3">Fuente</th>
                    <th className="py-1.5 pr-3">Archivo</th>
                    <th className="py-1.5">Editable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.pages.map((pg) => (
                    <tr key={pg.file}>
                      <td className="py-1.5 pr-3 font-semibold">{pg.title}</td>
                      <td className="py-1.5 pr-3 font-mono text-[11px]">{pg.routePath}</td>
                      <td className="py-1.5 pr-3">
                        {pg.visibility === "public" ? "Activa · pública" : pg.visibility === "authenticated" ? "Activa · con sesión" : "Activa · API"}
                      </td>
                      <td className="py-1.5 pr-3">{pg.source}</td>
                      <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground">{pg.file}</td>
                      <td className="py-1.5">No</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "componentes" && (
        <Panel title={`Componentes${data ? ` (${data.components.length})` : ""}`}>
          {!data ? (
            <p className="text-xs text-muted-foreground">Sin análisis todavía.</p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3">Nombre</th>
                    <th className="py-1.5 pr-3">Grupo</th>
                    <th className="py-1.5 pr-3">Tipo</th>
                    <th className="py-1.5 pr-3">Ubicación</th>
                    <th className="py-1.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.components.map((c) => (
                    <tr key={c.file}>
                      <td className="py-1.5 pr-3 font-semibold">{c.name}</td>
                      <td className="py-1.5 pr-3">{c.group}</td>
                      <td className="py-1.5 pr-3">{c.kind}</td>
                      <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground">{c.file}</td>
                      <td className="py-1.5">
                        <Detected />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "assets" && (
        <Panel title={`Assets${data ? ` (${data.assets.length})` : ""}`}>
          {!data ? (
            <p className="text-xs text-muted-foreground">Sin análisis todavía.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {data.assets.map((a) => (
                <div key={a.file} className="rounded-2xl border border-border/60 p-2">
                  {a.type === "Imagen" || a.type === "Vector / icono" ? (
                    <img src={a.url} alt={a.name} className="h-24 w-full rounded-xl object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-xs text-muted-foreground">
                      {a.type}
                    </div>
                  )}
                  <div className="mt-1.5 truncate text-xs font-bold">{a.name}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{a.file}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{a.type}</span>
                    <Detected />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "contenido" && (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel accent="primary" title="Fuentes de contenido detectadas">
            {!data ? (
              <p className="text-xs text-muted-foreground">Sin análisis todavía.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {data.contentSources.map((c) => (
                  <li key={c.label} className="rounded-xl border border-border/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{c.label}</span>
                      <Chip>{c.origin}</Chip>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">{c.detail}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              No se copia ni duplica contenido dinámico: solo se referencia su origen.
            </p>
          </Panel>
          <Panel accent="primary" title="Elementos administrables potenciales">
            {!data ? (
              <p className="text-xs text-muted-foreground">Sin análisis todavía.</p>
            ) : (
              <div className="space-y-2">
                {data.editableCandidates.map((g) => (
                  <div key={g.group} className="rounded-xl border border-border/60 p-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{g.group}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {g.items.map((it) => (
                        <span key={it} className="flex items-center gap-1 text-xs">
                          {it} <Detected />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "configuracion" && (
        <Panel accent="primary" title="Configuración del sitio (informativa)">
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            {[
              ["Dominio", "www.kotamed.app · kotamed.app"],
              ["Framework", p.framework ?? "TanStack Start (React 19 + Vite)"],
              ["Repositorio", p.repository ?? "No detectado desde la aplicación"],
              ["Backend", "Lovable Cloud (funciones de servidor + Data API)"],
              ["Base de datos", "PostgreSQL gestionado por Lovable Cloud"],
              ["Autenticación", "Sesiones de Lovable Cloud + roles (admin, super_admin, academic_admin, student)"],
              ["Deployment", "Publicación gestionada por Lovable (edge runtime)"],
              ["SEO", "head() por ruta: título, descripción, Open Graph, robots"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 p-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
            <div className="rounded-xl border border-border/60 p-2 sm:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Variables de entorno / claves / tokens
              </dt>
              <dd className="mt-0.5 flex items-center gap-2 font-mono font-semibold">
                ••••••••
                <span className="font-sans text-[10px] font-normal text-muted-foreground">
                  Nunca se muestran ni se exponen desde CMS Studio.
                </span>
              </dd>
            </div>
          </dl>
        </Panel>
      )}

      {tab === "repositorio" && (
        <Panel accent="primary" title="Repositorio">
          <div className="flex items-start gap-3 text-xs">
            <GitBranch className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">No se pudo analizar el repositorio Git directamente.</p>
              <p className="mt-1 text-muted-foreground">
                La aplicación en ejecución no expone repositorio, rama ni commits. No se inventa información y no se
                realizan commits, push, branches ni escrituras de archivos.
              </p>
              <div className="mt-3">
                <Disabled>
                  <GitBranch className="size-3.5" /> Configurar conexión
                </Disabled>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {tab === "actividad" && (
        <Panel accent="primary" title="Actividad de la integración">
          {activity.isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : !activity.data?.length ? (
            <p className="text-xs text-muted-foreground">Todavía no hay análisis registrados.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {activity.data.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                  <span className="font-bold">{ev.action}</span>
                  <Chip accent={ev.status === "error" ? "rose" : ev.status === "ok" ? "emerald" : undefined}>
                    {ev.status}
                  </Chip>
                  {ev.actor_email && <span className="text-muted-foreground">{ev.actor_email}</span>}
                  {ev.duration_ms != null && <span className="text-muted-foreground">{ev.duration_ms} ms</span>}
                  {ev.error_message && <span className="text-rose-600">{ev.error_message}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Database className="size-3" /> Auditoría almacenada en website_scan_events (solo lectura para el sitio).
          </p>
        </Panel>
      )}
    </div>
  );
}
