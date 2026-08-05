/**
 * Módulo CMS académico premium para "Casos clínicos" y "Docencia".
 * Explorador jerárquico ilimitado + lector de contenido + edición total
 * para el administrador (estructura, secciones, campos, recursos, IA).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  History,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Btn, Chip, Empty, Input, Metric, Panel } from "@/components/academy/ui";
import {
  CmsFieldsAdmin,
  CmsNodeEditor,
  CmsVersionHistory,
} from "@/components/hospital/modules/academic-cms-editor";
import {
  childrenOf,
  countDescendants,
  levelLabel,
  nextLevel,
  pathOf,
  searchNodes,
  sectionsFor,
  useCmsNodes,
  useDeleteCmsNode,
  useDuplicateCmsNode,
  useSaveCmsNode,
  useSeedCms,
  type CmsModule,
  type CmsNode,
} from "@/lib/academy-cms";

type View = "read" | "edit" | "fields" | "versions";

export function AcademicCmsModule({
  module,
  isAdmin,
  accent,
}: {
  module: CmsModule;
  isAdmin: boolean;
  accent: string;
}) {
  const { data: nodes = [], isLoading } = useCmsNodes(module);
  const save = useSaveCmsNode(module);
  const del = useDeleteCmsNode(module);
  const dup = useDuplicateCmsNode(module);
  const seed = useSeedCms(module);

  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [term, setTerm] = useState("");
  const [view, setView] = useState<View>("read");
  const [draft, setDraft] = useState<Partial<CmsNode> | null>(null);

  const visible = useMemo(
    () => (isAdmin ? nodes : nodes.filter((n) => n.is_published && !n.hidden)),
    [nodes, isAdmin],
  );
  const node = visible.find((n) => n.id === selected) ?? null;
  const path = pathOf(visible, selected);
  const pathText = path.map((p) => p.title).join(" › ");
  const results = searchNodes(visible, term);

  const stats = useMemo(() => {
    const leafKind = module === "casos" ? "caso" : "clase";
    return {
      total: visible.length,
      leaf: visible.filter((n) => n.level_kind === leafKind).length,
      published: visible.filter((n) => n.is_published && !n.hidden).length,
      tags: new Set(visible.flatMap((n) => n.tags)).size,
    };
  }, [visible, module]);

  const openEditor = (base: Partial<CmsNode>) => {
    setDraft(base);
    setView("edit");
  };

  const persist = (d: Partial<CmsNode>) => {
    if (!d.title?.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    save.mutate(d, {
      onSuccess: (id) => {
        toast.success("Contenido guardado");
        if (id) setSelected(id);
        setView("read");
        setDraft(null);
      },
      onError: (e: any) => toast.error(String(e?.message ?? e)),
    });
  };

  const sections = sectionsFor(module);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Nodos totales" value={stats.total} accent={accent} />
        <Metric
          label={module === "casos" ? "Casos clínicos" : "Clases"}
          value={stats.leaf}
          accent={accent}
        />
        <Metric label="Publicados" value={stats.published} accent={accent} />
        <Metric label="Etiquetas" value={stats.tags} accent={accent} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
        {/* ============ EXPLORADOR ============ */}
        <Panel
          title={module === "casos" ? "Árbol de casos" : "Árbol académico"}
          accent={accent}
          actions={
            isAdmin ? (
              <div className="flex gap-1">
                <Btn
                  variant="outline"
                  onClick={() =>
                    openEditor({ parent_id: null, level_kind: nextLevel(module, null) })
                  }
                >
                  <FolderPlus className="size-3" /> Raíz
                </Btn>
                <Btn variant="ghost" onClick={() => setView("fields")}>
                  <Settings2 className="size-3" />
                </Btn>
              </div>
            ) : undefined
          }
        >
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por título, etiqueta o contenido"
              className="pl-8"
            />
          </div>

          {isLoading ? (
            <Empty text="Cargando estructura…" />
          ) : term ? (
            <div className="space-y-1">
              {results.length === 0 ? (
                <Empty text="Sin resultados." />
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelected(r.id);
                      setView("read");
                      setTerm("");
                    }}
                    className="block w-full rounded-lg border border-border/40 px-2 py-1.5 text-left text-xs hover:border-primary/40"
                  >
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {levelLabel(r.level_kind)}
                    </span>
                    <div className="font-semibold">{r.title}</div>
                  </button>
                ))
              )}
            </div>
          ) : visible.length === 0 ? (
            <div className="space-y-3">
              <Empty text="Aún no hay contenido en este módulo." />
              {isAdmin && (
                <Btn
                  variant="solid"
                  accent={accent}
                  loading={seed.isPending}
                  onClick={() =>
                    seed.mutate(undefined, {
                      onSuccess: () => toast.success("Estructura inicial creada"),
                      onError: (e: any) => toast.error(String(e?.message ?? e)),
                    })
                  }
                >
                  <Sparkles className="size-3" /> Crear estructura sugerida
                </Btn>
              )}
            </div>
          ) : (
            <div className="max-h-[560px] space-y-0.5 overflow-auto pr-1">
              {childrenOf(visible, null).map((root) => (
                <TreeItem
                  key={root.id}
                  node={root}
                  nodes={visible}
                  depth={0}
                  open={open}
                  setOpen={setOpen}
                  selected={selected}
                  onSelect={(id) => {
                    setSelected(id);
                    setView("read");
                  }}
                  accent={accent}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* ============ CONTENIDO ============ */}
        <div className="space-y-4">
          {view === "fields" && isAdmin ? (
            <>
              <Btn onClick={() => setView("read")}>Volver al contenido</Btn>
              <CmsFieldsAdmin module={module} accent={accent} />
            </>
          ) : view === "edit" && isAdmin && draft ? (
            <CmsNodeEditor
              module={module}
              node={draft}
              nodes={visible}
              path={pathText}
              accent={accent}
              onSave={persist}
              onCancel={() => {
                setView("read");
                setDraft(null);
              }}
            />
          ) : view === "versions" && node ? (
            <>
              <Btn onClick={() => setView("read")}>Volver al contenido</Btn>
              <CmsVersionHistory nodeId={node.id} accent={accent} />
            </>
          ) : !node ? (
            <Empty text="Selecciona un elemento del árbol para ver su contenido." />
          ) : (
            <>
              <Panel
                title={node.title}
                subtitle={node.subtitle ?? pathText}
                accent={accent}
                actions={
                  isAdmin ? (
                    <div className="flex flex-wrap gap-1">
                      <Btn variant="outline" onClick={() => openEditor(node)}>
                        <Pencil className="size-3" /> Editar
                      </Btn>
                      <Btn
                        variant="outline"
                        onClick={() =>
                          openEditor({
                            parent_id: node.id,
                            level_kind: nextLevel(module, node.level_kind),
                            sort_order: childrenOf(visible, node.id).length,
                          })
                        }
                      >
                        <Plus className="size-3" /> Subnivel
                      </Btn>
                      <Btn onClick={() => dup.mutate({ node, all: nodes })}>
                        <Copy className="size-3" />
                      </Btn>
                      <Btn
                        onClick={() =>
                          save.mutate({ id: node.id, hidden: !node.hidden })
                        }
                      >
                        {node.hidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      </Btn>
                      <Btn onClick={() => setView("versions")}>
                        <History className="size-3" />
                      </Btn>
                      <Btn
                        onClick={() => {
                          if (!confirm(`¿Eliminar "${node.title}" y todo su contenido?`)) return;
                          del.mutate(node.id, {
                            onSuccess: () => {
                              toast.success("Contenido eliminado");
                              setSelected(node.parent_id);
                            },
                          });
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Btn>
                    </div>
                  ) : undefined
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  <Chip accent={accent}>{levelLabel(node.level_kind)}</Chip>
                  {node.case_type && <Chip>{node.case_type}</Chip>}
                  {node.hidden && <Chip>Oculto</Chip>}
                  {!node.is_published && <Chip>Borrador</Chip>}
                  <Chip>v{node.version}</Chip>
                  {node.tags.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
                {node.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {node.body}
                  </p>
                )}
              </Panel>

              {childrenOf(visible, node.id).length > 0 && (
                <Panel title="Contenido de este nivel" accent={accent}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {childrenOf(visible, node.id).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className="rounded-xl border border-border/50 bg-background/40 p-3 text-left transition hover:border-primary/40"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {levelLabel(c.level_kind)}
                        </div>
                        <div className="text-sm font-bold">{c.title}</div>
                        {c.subtitle && (
                          <div className="text-[11px] text-muted-foreground">{c.subtitle}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </Panel>
              )}

              {sections
                .filter((s) => (node.data.sections?.[s.key] ?? "").trim())
                .map((s) => (
                  <Panel key={s.key} title={s.label} accent={accent}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {node.data.sections?.[s.key]}
                    </p>
                  </Panel>
                ))}

              {Object.entries(node.data.custom ?? {}).filter(([, v]) => v !== "" && v != null).length >
                0 && (
                <Panel title="Datos adicionales" accent={accent}>
                  <ul className="space-y-1 text-sm">
                    {Object.entries(node.data.custom ?? {})
                      .filter(([, v]) => v !== "" && v != null)
                      .map(([k, v]) => (
                        <li key={k}>
                          <b className="text-muted-foreground">{k}:</b>{" "}
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </li>
                      ))}
                  </ul>
                </Panel>
              )}

              {(node.data.resources ?? []).length > 0 && (
                <Panel title="Recursos" accent={accent}>
                  <ul className="space-y-1 text-sm">
                    {(node.data.resources ?? []).map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Chip>{r.kind}</Chip>
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold underline decoration-dotted"
                          >
                            {r.title || r.url}
                          </a>
                        ) : (
                          <span>{r.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              {(node.data.relations ?? []).length > 0 && (
                <Panel title="Contenido relacionado" accent={accent}>
                  <div className="flex flex-wrap gap-2">
                    {(node.data.relations ?? [])
                      .map((id) => visible.find((n) => n.id === id))
                      .filter(Boolean)
                      .map((rel) => (
                        <Btn key={rel!.id} variant="outline" onClick={() => setSelected(rel!.id)}>
                          {rel!.title}
                        </Btn>
                      ))}
                  </div>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeItem({
  node,
  nodes,
  depth,
  open,
  setOpen,
  selected,
  onSelect,
  accent,
}: {
  node: CmsNode;
  nodes: CmsNode[];
  depth: number;
  open: Record<string, boolean>;
  setOpen: (fn: (o: Record<string, boolean>) => Record<string, boolean>) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  accent: string;
}) {
  const kids = childrenOf(nodes, node.id);
  const isOpen = open[node.id] ?? depth < 2;
  const active = selected === node.id;
  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs transition ${
          active ? "bg-primary/10" : "hover:bg-muted/40"
        }`}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        {kids.length > 0 ? (
          <button onClick={() => setOpen((o) => ({ ...o, [node.id]: !isOpen }))}>
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="inline-block size-3.5" />
        )}
        <button
          onClick={() => onSelect(node.id)}
          className="flex-1 truncate text-left"
          style={active ? { color: accent } : undefined}
          title={node.title}
        >
          <span className="font-semibold">{node.title}</span>
          {kids.length > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              ({countDescendants(nodes, node.id)})
            </span>
          )}
          {node.hidden && <span className="ml-1 text-[10px] text-muted-foreground">· oculto</span>}
        </button>
      </div>
      {isOpen &&
        kids.map((k) => (
          <TreeItem
            key={k.id}
            node={k}
            nodes={nodes}
            depth={depth + 1}
            open={open}
            setOpen={setOpen}
            selected={selected}
            onSelect={onSelect}
            accent={accent}
          />
        ))}
    </div>
  );
}
