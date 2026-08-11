/**
 * CMS Studio → KOTAMED.APP · Content Operating System.
 *
 * Consola real de contenido: borrador vs producción, publicación validada con
 * versionado, gestor de assets, auditoría, modo seguro y explorador técnico
 * del sitio. Todo lo que se muestra aquí opera contra la base de datos real.
 */
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCode2,
  FileStack,
  Globe,
  History,
  Image as ImageIcon,
  Loader2,
  Lock,
  Monitor,
  Network,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  XCircle,
} from "lucide-react";
import { Btn, Chip, Field, Input, Panel, Select, Textarea } from "@/components/academy/ui";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import {
  WEBSITE_URL,
  useScanWebsite,
  useWebsiteActivity,
  useWebsiteProject,
} from "@/lib/website-projects";
import { buildSiteTree, inspectSite, type SiteInspection, type SiteTreeNode } from "@/lib/website-inspect";
import {
  diffDraftVsProduction,
  useCmsAudit,
  useCmsSettings,
  usePublishPage,
  usePublishStatus,
  useProductionSnapshot,
  useRestoreVersionToDraft,
  useSetSafeMode,
  useUnpublishPage,
  useVersionHistory,
  validatePage,
  type PageStatusRow,
} from "@/lib/cms-publish";
import {
  ASSET_LABEL,
  formatBytes,
  useAssetUsage,
  useCmsAssets,
  useDeleteAsset,
  useUpdateAsset,
  useUploadAsset,
  type CmsAsset,
} from "@/lib/cms-assets";
import { useCmsBlocks } from "@/lib/cms";

type Tab =
  | "resumen"
  | "paginas"
  | "publicar"
  | "assets"
  | "versiones"
  | "auditoria"
  | "estructura"
  | "seguridad";

const TABS: { value: Tab; label: string }[] = [
  { value: "resumen", label: "📊 Panel de control" },
  { value: "paginas", label: "📄 Páginas y estado" },
  { value: "publicar", label: "🚀 Revisar y publicar" },
  { value: "assets", label: "🖼️ Biblioteca de assets" },
  { value: "versiones", label: "🕘 Versiones y rollback" },
  { value: "auditoria", label: "🧾 Auditoría" },
  { value: "estructura", label: "🌳 Explorador técnico" },
  { value: "seguridad", label: "🛡️ Modo seguro y permisos" },
];

const DEVICES = [
  { id: "desktop", icon: Monitor, width: "100%", label: "Escritorio" },
  { id: "tablet", icon: Tablet, width: "834px", label: "Tablet" },
  { id: "mobile", icon: Smartphone, width: "420px", label: "Móvil" },
] as const;

const fmt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString("es-PE") : "—");

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Globe;
  tone?: "accent" | "warn";
}) {
  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        tone === "warn"
          ? "border-amber-300/70 bg-amber-50/50"
          : tone === "accent"
            ? "border-primary/30 bg-primary/5"
            : "border-border/60 bg-background"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 truncate text-xl font-black tracking-tight">{value}</div>
      {hint && <div className="truncate text-[10px] text-muted-foreground">{hint}</div>}
    </div>
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

/* ------------------------- Revisión y publicación ------------------ */

function ReviewPanel({ row, canPublish }: { row: PageStatusRow; canPublish: boolean }) {
  const { data: blocks = [] } = useCmsBlocks(row.page.id);
  const { data: production } = useProductionSnapshot(row.page.id);
  const publish = usePublishPage();
  const unpublish = useUnpublishPage();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");

  const checks = useMemo(() => validatePage(row.page, blocks), [row.page, blocks]);
  const diff = useMemo(
    () => diffDraftVsProduction({ page: row.page, blocks }, production ?? null),
    [row.page, blocks, production],
  );
  const blockers = checks.filter((c) => !c.ok && (c.id === "content" || c.id === "slug"));

  const doPublish = () =>
    publish.mutate(
      { pageId: row.page.id, note: note.trim() || undefined },
      {
        onSuccess: (r) => {
          setConfirm(false);
          setNote("");
          toast.success(`Publicado correctamente · Versión ${r.version} · ${fmt(r.publishedAt)}`);
        },
        onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
      },
    );

  return (
    <div className="space-y-3">
      <Panel
        accent="primary"
        title={`Revisión de «${row.page.title}»`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip accent={row.pending ? "#f59e0b" : "#10b981"}>
              {row.published ? (row.pending ? "Cambios sin publicar" : "Sincronizado") : "Nunca publicada"}
            </Chip>
            {row.published && <Chip>v{row.published.version}</Chip>}
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Checklist de publicación
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  )}
                  <span>
                    <span className="font-semibold">{c.label}</span>
                    {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {canPublish ? (
                <Btn variant="solid" onClick={() => setConfirm(true)} disabled={blockers.length > 0}>
                  <Rocket className="size-3.5" /> Publicar cambios
                </Btn>
              ) : (
                <Chip accent="#f59e0b">Tu rol no permite publicar</Chip>
              )}
              {row.published && canPublish && (
                <Btn
                  variant="outline"
                  loading={unpublish.isPending}
                  onClick={() => {
                    if (!window.confirm("¿Retirar esta página de producción? El borrador se conserva.")) return;
                    unpublish.mutate(row.page.id, {
                      onSuccess: () => toast.success("Página retirada de producción"),
                      onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
                    });
                  }}
                >
                  <Undo2 className="size-3.5" /> Despublicar
                </Btn>
              )}
              <a href={`/p/${row.page.slug}`} target="_blank" rel="noreferrer">
                <Btn variant="ghost">
                  <ExternalLink className="size-3.5" /> Ver en producción
                </Btn>
              </a>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cambios respecto a producción ({diff.length})
            </div>
            {diff.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                El borrador coincide exactamente con lo que ve el público.
              </p>
            ) : (
              <div className="mt-1.5 max-h-64 space-y-1.5 overflow-auto pr-1">
                {diff.map((d) => (
                  <div key={d.path} className="rounded-xl border border-border/60 p-2 text-[11px]">
                    <div className="font-mono text-[10px] text-muted-foreground">{d.path}</div>
                    <div className="mt-0.5 line-through opacity-60">{d.before}</div>
                    <div className="font-semibold text-emerald-700">{d.after}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        accent="primary"
        title="Vista previa del borrador"
        actions={
          <div className="flex rounded-lg border border-border/60 p-0.5">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                title={d.label}
                className={`rounded-md px-2 py-1 ${device === d.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <d.icon className="size-4" />
              </button>
            ))}
          </div>
        }
      >
        <div className="mx-auto overflow-hidden rounded-2xl border border-border/60" style={{ width: DEVICES.find((d) => d.id === device)!.width, maxWidth: "100%" }}>
          <iframe
            src={`/p/${row.page.slug}?preview=draft`}
            title="Vista previa del borrador"
            className="h-[560px] w-full bg-white"
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          La vista previa usa datos de borrador y nunca altera producción.
        </p>
      </Panel>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setConfirm(false)}>
          <div
            className="w-full max-w-lg rounded-3xl border border-border/60 bg-background p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black tracking-tight">Publicar cambios</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.page.title} · {diff.length} cambios · {blocks.filter((b) => b.visible).length} bloques visibles
            </p>
            <ul className="mt-3 space-y-1">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-600" />
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Field label="Comentario de la versión (opcional)">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué cambió y por qué" />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Btn variant="outline" onClick={() => setConfirm(false)}>
                Cancelar
              </Btn>
              <Btn variant="solid" loading={publish.isPending} onClick={doPublish}>
                <Rocket className="size-3.5" /> Publicar cambios
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Versiones -------------------------- */

function VersionsPanel({ row }: { row: PageStatusRow }) {
  const { data: versions = [], isLoading } = useVersionHistory(row.page.id);
  const restore = useRestoreVersionToDraft();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Panel accent="primary" title={`Historial de versiones · ${row.page.title}`}>
      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay versiones guardadas de esta página.</p>
      ) : (
        <ul className="space-y-1.5">
          {versions.map((v) => (
            <li key={v.id} className="rounded-2xl border border-border/60 p-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-black">Versión {v.version}</span>
                <Chip accent={v.status === "published" ? "#10b981" : "#64748b"}>
                  {v.status === "published" ? "Publicada" : v.status === "archived" ? "Archivada" : "Borrador"}
                </Chip>
                <span className="text-muted-foreground">{fmt(v.created_at)}</span>
                {v.created_by_email && <span className="text-muted-foreground">por {v.created_by_email}</span>}
                <div className="ml-auto flex items-center gap-1.5">
                  <Btn variant="ghost" onClick={() => setOpen(open === v.id ? null : v.id)}>
                    <Eye className="size-3.5" /> Ver
                  </Btn>
                  <Btn
                    variant="outline"
                    loading={restore.isPending}
                    onClick={() => {
                      if (!window.confirm(`Restaurar la versión ${v.version} al BORRADOR (no se publica)?`)) return;
                      restore.mutate(v, {
                        onSuccess: () => toast.success(`Versión ${v.version} restaurada como borrador`),
                        onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
                      });
                    }}
                  >
                    <Undo2 className="size-3.5" /> Restaurar
                  </Btn>
                </div>
              </div>
              {v.note && <p className="mt-1 text-[11px] text-muted-foreground">{v.note}</p>}
              {open === v.id && (
                <div className="mt-2 max-h-56 overflow-auto rounded-xl bg-muted/40 p-2">
                  <ul className="space-y-1 text-[11px]">
                    {(v.snapshot?.blocks ?? []).map((b, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Chip>{b.type}</Chip>
                        <span className="truncate">{(b.props as { title?: string } | undefined)?.title ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        Restaurar nunca publica: la versión vuelve al borrador y necesitas revisarla y publicarla.
      </p>
    </Panel>
  );
}

/* -------------------------------- Assets --------------------------- */

function AssetUsage({ url }: { url: string }) {
  const { data = [], isLoading } = useAssetUsage(url);
  if (isLoading) return <span className="text-[10px] text-muted-foreground">Comprobando uso…</span>;
  if (data.length === 0) return <span className="text-[10px] text-muted-foreground">Sin uso detectado</span>;
  return (
    <span className="text-[10px] text-amber-700">
      Usado en {data.length} bloque(s): {data.slice(0, 3).map((d) => `${d.page}/${d.type}`).join(", ")}
    </span>
  );
}

function AssetsPanel({ canEdit }: { canEdit: boolean }) {
  const { data: assets = [], isLoading } = useCmsAssets();
  const upload = useUploadAsset();
  const update = useUpdateAsset();
  const remove = useDeleteAsset();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<CmsAsset | null>(null);

  const filtered = assets.filter(
    (a) => (!type || a.type === type) && (!q || a.name.toLowerCase().includes(q.toLowerCase())),
  );

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      try {
        await upload.mutateAsync(f);
      } catch (e) {
        toast.error(`${f.name}: ${String((e as { message?: string })?.message ?? e)}`);
      }
    }
    toast.success("Assets subidos");
  };

  return (
    <Panel
      accent="primary"
      title={`Biblioteca de assets (${assets.length})`}
      actions={
        canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept="image/*,video/*,application/pdf"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Btn variant="solid" loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5" /> Subir archivos
            </Btn>
          </>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar asset…" className="pl-7" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(ASSET_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={view} onChange={(e) => setView(e.target.value as "grid" | "list")}>
          <option value="grid">Vista cuadrícula</option>
          <option value="list">Vista lista</option>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="mt-3 size-4 animate-spin text-muted-foreground" />
      ) : filtered.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No hay assets todavía. Sube imágenes, videos o PDFs para usarlos en los bloques.
        </p>
      ) : view === "grid" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border/60 p-2">
              {a.type === "image" || a.type === "svg" ? (
                <img src={a.url} alt={a.alt ?? a.name} className="h-24 w-full rounded-xl object-cover" loading="lazy" />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl bg-muted/40 text-xs text-muted-foreground">
                  {ASSET_LABEL[a.type] ?? a.type}
                </div>
              )}
              <div className="mt-1.5 truncate text-xs font-bold">{a.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {ASSET_LABEL[a.type] ?? a.type} · {formatBytes(a.size_bytes)}
                {a.width ? ` · ${a.width}×${a.height}` : ""}
              </div>
              <AssetUsage url={a.url} />
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <Btn
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(a.url);
                    toast.success("URL copiada: pégala en el campo de imagen del bloque");
                  }}
                >
                  Usar
                </Btn>
                {canEdit && (
                  <>
                    <Btn variant="ghost" onClick={() => setEditing(a)}>
                      Editar
                    </Btn>
                    <Btn
                      variant="ghost"
                      onClick={() => {
                        if (!window.confirm(`Eliminar «${a.name}»? Revisa antes dónde se está usando.`)) return;
                        remove.mutate(a, {
                          onSuccess: () => toast.success("Asset eliminado"),
                          onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Btn>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-3">Nombre</th>
                <th className="py-1.5 pr-3">Tipo</th>
                <th className="py-1.5 pr-3">Tamaño</th>
                <th className="py-1.5 pr-3">Dimensiones</th>
                <th className="py-1.5 pr-3">Fecha</th>
                <th className="py-1.5">Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="py-1.5 pr-3 font-semibold">{a.name}</td>
                  <td className="py-1.5 pr-3">{ASSET_LABEL[a.type] ?? a.type}</td>
                  <td className="py-1.5 pr-3">{formatBytes(a.size_bytes)}</td>
                  <td className="py-1.5 pr-3">{a.width ? `${a.width}×${a.height}` : "—"}</td>
                  <td className="py-1.5 pr-3">{fmt(a.created_at)}</td>
                  <td className="py-1.5">
                    <AssetUsage url={a.url} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-md space-y-2 rounded-3xl border border-border/60 bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black">Editar asset</h3>
            <Field label="Nombre">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Texto alternativo (alt)">
              <Input value={editing.alt ?? ""} onChange={(e) => setEditing({ ...editing, alt: e.target.value })} />
            </Field>
            <Field label="Descripción">
              <Textarea
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Btn>
              <Btn
                variant="solid"
                loading={update.isPending}
                onClick={() =>
                  update.mutate(
                    {
                      id: editing.id,
                      name: editing.name,
                      alt: editing.alt,
                      description: editing.description,
                    },
                    {
                      onSuccess: () => {
                        setEditing(null);
                        toast.success("Asset actualizado");
                      },
                      onError: (e) => toast.error(String((e as { message?: string })?.message ?? e)),
                    },
                  )
                }
              >
                Guardar
              </Btn>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------ Componente ------------------------- */

export function WebsiteStudio() {
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const [tab, setTab] = useState<Tab>("resumen");
  const [inspection, setInspection] = useState<SiteInspection | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [previewOn, setPreviewOn] = useState(false);

  const project = useWebsiteProject();
  const activity = useWebsiteActivity(project.data?.id);
  const scan = useScanWebsite(project.data);
  const status = usePublishStatus();
  const settings = useCmsSettings();
  const setSafeMode = useSetSafeMode();
  const audit = useCmsAudit();
  const assets = useCmsAssets();
  const publish = usePublishPage();

  const rows = status.data?.rows ?? [];
  const totals = status.data?.totals;
  const safeMode = settings.data?.safe_mode ?? false;
  const canPublish = !!isAdmin && !safeMode;
  const current = rows.find((r) => r.page.id === selectedPage) ?? rows[0] ?? null;
  const pendingRows = rows.filter((r) => r.pending);
  const tree = useMemo(() => (inspection ? buildSiteTree(inspection.pages) : []), [inspection]);

  const publishAll = async () => {
    if (!window.confirm(`Publicar ${pendingRows.length} página(s) con cambios pendientes?`)) return;
    let ok = 0;
    for (const r of pendingRows) {
      try {
        await publish.mutateAsync({ pageId: r.page.id, note: "Publicación conjunta" });
        ok++;
      } catch (e) {
        toast.error(`${r.page.title}: ${String((e as { message?: string })?.message ?? e)}`);
      }
    }
    if (ok) toast.success(`${ok} página(s) publicadas en producción`);
  };

  if (project.isLoading || status.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando KotaMed Content OS…
      </div>
    );
  }

  const siteUrl = project.data?.url ?? WEBSITE_URL;

  return (
    <div className="space-y-3">
      {/* Barra de estado draft / producción */}
      <div className="rounded-3xl border border-border/60 bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">KOTAMED.APP</h2>
                <p className="text-xs text-muted-foreground">KotaMed Content Operating System</p>
              </div>
              <Chip accent="#0ea5a4">● Sitio conectado</Chip>
              <Chip accent="#f59e0b">● Borrador</Chip>
              <Chip accent="#10b981">● Producción</Chip>
              {safeMode && (
                <Chip accent="#ef4444">
                  <Lock className="size-3" /> Modo seguro
                </Chip>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <a href={siteUrl} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline">
                {siteUrl}
              </a>
              <span className={`font-bold ${pendingRows.length ? "text-amber-700" : "text-emerald-700"}`}>
                {pendingRows.length ? `Cambios sin publicar · ${pendingRows.length}` : "Todo publicado"}
              </span>
              <span className="text-muted-foreground">Última publicación: {fmt(totals?.lastPublish)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Btn variant="outline" onClick={() => setPreviewOn((v) => !v)}>
              <Eye className="size-3.5" /> Vista previa
            </Btn>
            <Btn variant="outline" onClick={() => setTab("versiones")}>
              <History className="size-3.5" /> Versiones
            </Btn>
            <Btn variant="ghost" loading={scan.isPending} onClick={() => scan.mutate(undefined, { onSuccess: (r) => { setInspection(r); toast.success("Estructura del sitio analizada"); } })}>
              <RefreshCw className="size-3.5" /> Analizar sitio
            </Btn>
            {canPublish ? (
              <Btn variant="solid" disabled={pendingRows.length === 0} loading={publish.isPending} onClick={publishAll}>
                <Rocket className="size-3.5" /> Publicar ({pendingRows.length})
              </Btn>
            ) : (
              <Chip accent="#ef4444">Publicación bloqueada</Chip>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <Kpi label="Páginas" value={totals?.pages ?? 0} icon={FileStack} />
          <Kpi label="Bloques" value={totals?.blocks ?? 0} icon={Boxes} />
          <Kpi label="Assets" value={assets.data?.length ?? 0} icon={ImageIcon} />
          <Kpi label="Borradores" value={totals?.drafts ?? 0} icon={FileCode2} />
          <Kpi
            label="Cambios pendientes"
            value={pendingRows.length}
            icon={Activity}
            tone={pendingRows.length ? "warn" : undefined}
          />
          <Kpi label="Última publicación" value={fmt(totals?.lastPublish)} icon={Rocket} tone="accent" />
        </div>

        {previewOn && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/60">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
              <span className="text-xs font-bold">Vista previa de producción</span>
              <a href={siteUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                Abrir en nueva pestaña
              </a>
            </div>
            <iframe src="/" title="Vista previa de KOTAMED.APP" className="h-[520px] w-full bg-white" loading="lazy" />
          </div>
        )}
      </div>

      {/* Selector de sección */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
          {TABS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        {(tab === "publicar" || tab === "versiones") && rows.length > 0 && (
          <Select value={current?.page.id ?? ""} onChange={(e) => setSelectedPage(e.target.value)}>
            {rows.map((r) => (
              <option key={r.page.id} value={r.page.id}>
                {r.page.title}
                {r.pending ? " • cambios sin publicar" : ""}
              </option>
            ))}
          </Select>
        )}
      </div>

      {tab === "resumen" && (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel accent="primary" title="Flujo de contenido">
            <ol className="space-y-1.5 text-xs">
              {[
                ["Editar", "Diseñador de páginas y bloques (borrador)"],
                ["Guardar borrador", "Persistente en base de datos"],
                ["Previsualizar", "Vista con datos de borrador"],
                ["Revisar cambios", "Comparación antes / después"],
                ["Publicar", "Snapshot versionado a producción"],
                ["Producción", "KOTAMED.APP sirve el snapshot publicado"],
              ].map(([a, b], i) => (
                <li key={a} className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-bold">{a}</span>
                    <span className="text-muted-foreground"> — {b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel accent="primary" title={`Páginas con cambios sin publicar (${pendingRows.length})`}>
            {pendingRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">Producción está sincronizada con el borrador.</p>
            ) : (
              <ul className="space-y-1.5">
                {pendingRows.map((r) => (
                  <li key={r.page.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2 text-xs">
                    <span className="font-bold">{r.page.title}</span>
                    <code className="font-mono text-[10px] text-muted-foreground">/p/{r.page.slug}</code>
                    <Chip accent="#f59e0b">{r.published ? `v${r.published.version} en producción` : "sin publicar"}</Chip>
                    <span className="ml-auto text-[10px] text-muted-foreground">Editado {fmt(r.lastDraftEdit)}</span>
                    <Btn
                      variant="outline"
                      onClick={() => {
                        setSelectedPage(r.page.id);
                        setTab("publicar");
                      }}
                    >
                      Revisar
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "paginas" && (
        <Panel accent="primary" title={`Páginas (${rows.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-3">Página</th>
                  <th className="py-1.5 pr-3">Ruta</th>
                  <th className="py-1.5 pr-3">Estado</th>
                  <th className="py-1.5 pr-3">SEO</th>
                  <th className="py-1.5 pr-3">Última edición</th>
                  <th className="py-1.5 pr-3">Última publicación</th>
                  <th className="py-1.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.page.id}>
                    <td className="py-1.5 pr-3 font-semibold">{r.page.title}</td>
                    <td className="py-1.5 pr-3 font-mono text-[10px]">/p/{r.page.slug}</td>
                    <td className="py-1.5 pr-3">
                      <Chip accent={!r.published ? "#64748b" : r.pending ? "#f59e0b" : "#10b981"}>
                        {!r.published ? "Borrador" : r.pending ? "Cambios sin publicar" : "Publicada"}
                      </Chip>
                    </td>
                    <td className="py-1.5 pr-3">{r.page.seo?.title ? "✓" : "—"}</td>
                    <td className="py-1.5 pr-3">{fmt(r.lastDraftEdit)}</td>
                    <td className="py-1.5 pr-3">{fmt(r.published?.published_at)}</td>
                    <td className="py-1.5">
                      <div className="flex flex-wrap gap-1">
                        <Btn
                          variant="ghost"
                          onClick={() => {
                            setSelectedPage(r.page.id);
                            setTab("publicar");
                          }}
                        >
                          Revisar
                        </Btn>
                        <Btn
                          variant="ghost"
                          onClick={() => {
                            setSelectedPage(r.page.id);
                            setTab("versiones");
                          }}
                        >
                          Versiones
                        </Btn>
                        <a href={`/p/${r.page.slug}`} target="_blank" rel="noreferrer">
                          <Btn variant="ghost">
                            <ExternalLink className="size-3.5" />
                          </Btn>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            El contenido y los bloques se editan en «Diseñador de páginas»; aquí se controla su paso a producción.
          </p>
        </Panel>
      )}

      {tab === "publicar" &&
        (current ? (
          <ReviewPanel row={current} canPublish={canPublish} />
        ) : (
          <Panel accent="primary" title="Sin páginas">
            <p className="text-xs text-muted-foreground">Crea una página en el diseñador para revisarla aquí.</p>
          </Panel>
        ))}

      {tab === "versiones" &&
        (current ? (
          <VersionsPanel row={current} />
        ) : (
          <Panel accent="primary" title="Sin páginas">
            <p className="text-xs text-muted-foreground">No hay páginas con historial todavía.</p>
          </Panel>
        ))}

      {tab === "assets" && <AssetsPanel canEdit={!!isAdmin} />}

      {tab === "auditoria" && (
        <Panel accent="primary" title="Registro de auditoría">
          {audit.isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (audit.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin actividad registrada todavía.</p>
          ) : (
            <ul className="space-y-1">
              {(audit.data ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2 text-xs">
                  <span className="font-bold">{a.actor_email ?? "—"}</span>
                  <span>{a.action}</span>
                  {a.entity_label && <Chip>{a.entity_label}</Chip>}
                  <span className="ml-auto text-[10px] text-muted-foreground">{fmt(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          {(activity.data ?? []).length > 0 && (
            <div className="mt-3 border-t border-border/60 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Análisis técnicos del sitio
              </div>
              <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                {(activity.data ?? []).slice(0, 8).map((e) => (
                  <li key={e.id}>
                    {e.action} · {e.status} · {fmt(e.created_at)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      {tab === "estructura" && (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel
            accent="primary"
            title="Explorador de rutas del sitio"
            actions={
              <Btn variant="outline" onClick={() => setInspection(inspectSite())}>
                <Network className="size-3.5" /> Detectar estructura
              </Btn>
            }
          >
            {!inspection ? (
              <p className="text-xs text-muted-foreground">Pulsa «Detectar estructura» para mapear las rutas reales.</p>
            ) : (
              <Tree nodes={tree} />
            )}
          </Panel>
          <Panel accent="primary" title={`Componentes${inspection ? ` (${inspection.components.length})` : ""}`}>
            {!inspection ? (
              <p className="text-xs text-muted-foreground">Sin análisis todavía.</p>
            ) : (
              <ul className="max-h-[420px] space-y-1 overflow-auto text-xs">
                {inspection.components.map((c) => (
                  <li key={c.file} className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    <code className="font-mono text-[10px] text-muted-foreground">{c.file}</code>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "seguridad" && (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel accent="primary" title="Modo seguro">
            <p className="text-xs text-muted-foreground">
              Con el modo seguro activado se puede editar y previsualizar, pero la publicación queda bloqueada para
              todos. Solo el super administrador puede cambiarlo.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Chip accent={safeMode ? "#ef4444" : "#10b981"}>{safeMode ? "Activado" : "Desactivado"}</Chip>
              <Btn
                variant="outline"
                loading={setSafeMode.isPending}
                onClick={() =>
                  setSafeMode.mutate(!safeMode, {
                    onSuccess: () => toast.success(safeMode ? "Modo seguro desactivado" : "Modo seguro activado"),
                    onError: () => toast.error("Solo el super administrador puede cambiar el modo seguro."),
                  })
                }
              >
                <ShieldCheck className="size-3.5" /> {safeMode ? "Desactivar" : "Activar"} modo seguro
              </Btn>
            </div>
          </Panel>
          <Panel accent="primary" title="Permisos por rol">
            <ul className="space-y-1.5 text-xs">
              {[
                ["Super admin", "Edita, publica, restaura y controla el modo seguro."],
                ["Administrador", "Edita y publica contenido."],
                ["Admin académico", "Edita y publica contenido académico."],
                ["Resto de usuarios", "Solo ven el contenido publicado en producción."],
              ].map(([r, d]) => (
                <li key={r} className="rounded-xl border border-border/60 p-2">
                  <span className="font-bold">{r}</span>
                  <span className="text-muted-foreground"> — {d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Las políticas de seguridad de la base de datos aplican estos permisos también fuera de la interfaz.
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
