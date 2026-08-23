import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
import { moduleRowsForProgram } from "@/lib/program-modules";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
  Eye,
  EyeOff,
  Paperclip,
  Upload,
  Film,
  Link2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/contenido")({
  head: () => ({
    meta: [
      { title: "Editor de contenido · KotaMed" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContenidoPage,
});

type NodeKind = "course" | "program" | "area" | "subarea" | "chapter" | "lesson";

type ContentNode = {
  id: string;
  parent_id: string | null;
  kind: NodeKind;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

const KIND_LABEL: Record<NodeKind, string> = {
  course: "Curso",
  program: "Programa",
  area: "Área",
  subarea: "Subárea",
  chapter: "Capítulo",
  lesson: "Lección",
};

const KIND_ORDER: NodeKind[] = ["course", "program", "area", "subarea", "chapter", "lesson"];

const CHILD_KINDS: Record<NodeKind | "root", NodeKind[]> = {
  root: ["course"],
  course: ["program"],
  program: ["area"],
  area: ["subarea", "chapter"],
  subarea: ["chapter"],
  chapter: ["lesson"],
  lesson: [],
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function ContenidoPage() {
  const user = useSupabaseUser();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);
  const qc = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) navigate({ to: "/auth", replace: true });
  }, [user, navigate]);
  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, navigate]);

  const nodesQ = useAllContentNodes(!!isAdmin);

  const idx = useMemo(() => buildAuditIndex((nodesQ.data ?? []) as AuditNode[]), [nodesQ.data]);
  const tree = idx.childrenOf as unknown as Map<string | null, ContentNode[]>;



  const createMut = useMutation({
    mutationFn: async (input: {
      parent_id: string | null;
      kind: NodeKind;
      title: string;
      slug: string;
      description?: string;
    }) => {
      if (!user) throw new Error("Necesitas iniciar sesión para editar contenido.");
      setMutationError(null);
      const siblings = tree.get(input.parent_id) ?? [];
      const sort_order = siblings.length;
      const slug = input.slug || slugify(input.title);
      const { data: created, error } = await supabase
        .from("content_nodes")
        .insert({
          parent_id: input.parent_id,
          kind: input.kind,
          title: input.title,
          slug,
          description: input.description || null,
          sort_order,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Al crear un PROGRAMA se generan automáticamente sus módulos base,
      // de modo que el programa nace con su ecosistema académico completo.
      if (input.kind === "program" && created?.id) {
        const rows = moduleRowsForProgram(slug, created.id).map((r) => ({
          ...r,
          created_by: user.id,
        }));
        const { error: modErr } = await supabase.from("content_nodes").insert(rows);
        if (modErr) throw modErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["program-areas"] });
    },
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo crear el contenido."),
  });

  const updateMut = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      slug?: string;
      description?: string | null;
      parent_id?: string | null;
      is_published?: boolean;

      sort_order?: number;
    }) => {
      setMutationError(null);
      const { id, ...rest } = input;
      const { error } = await supabase.from("content_nodes").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["program-areas"] });
    },
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo guardar el cambio."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      setMutationError(null);
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-nodes"] });
      qc.invalidateQueries({ queryKey: ["content-catalog-nodes"] });
      qc.invalidateQueries({ queryKey: ["program-node"] });
      qc.invalidateQueries({ queryKey: ["program-areas"] });
    },
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo eliminar el contenido."),
  });

  if (adminLoading || isAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const roots = tree.get(null) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.5} /> Volver a admin
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <span className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Shield className="size-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Editor de contenido</h1>
            <p className="text-sm text-muted-foreground">
              Crea y organiza cursos, programas, áreas, subáreas, capítulos y lecciones.
            </p>
          </div>
        </div>

        <section className="glass rounded-3xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Árbol de contenido
            </h2>
            <AddInline
              parentId={null}
              allowedKinds={CHILD_KINDS.root}
              onCreate={(v) => createMut.mutateAsync(v)}
            />
          </div>

          {(mutationError || nodesQ.error) && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              {mutationError || (nodesQ.error instanceof Error ? nodesQ.error.message : "No se pudo cargar el contenido.")}
            </div>
          )}

          {nodesQ.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : roots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay cursos. Añade el primero (por ejemplo, "Pediatría").
            </p>
          ) : (
            <ul className="space-y-1.5">
              {roots.map((n) => (
                <TreeItem
                  key={n.id}
                  node={n}
                  tree={tree}
                  depth={0}
                  onCreate={(v) => createMut.mutateAsync(v)}
                  onUpdate={(v) => updateMut.mutateAsync(v)}
                  onDelete={(id) => deleteMut.mutateAsync(id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function TreeItem({
  node,
  tree,
  depth,
  onCreate,
  onUpdate,
  onDelete,
}: {
  node: ContentNode;
  tree: Map<string | null, ContentNode[]>;
  depth: number;
  onCreate: (v: {
    parent_id: string | null;
    kind: NodeKind;
    title: string;
    slug: string;
    description?: string;
  }) => Promise<unknown>;
  onUpdate: (v: {
    id: string;
    title?: string;
    slug?: string;
    description?: string | null;
    is_published?: boolean;
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const children = tree.get(node.id) ?? [];
  const [open, setOpen] = useState(depth < 1);
  const [editing, setEditing] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [description, setDescription] = useState(node.description ?? "");
  const [busy, setBusy] = useState(false);
  const allowed = CHILD_KINDS[node.kind];
  const expandable = children.length > 0 || allowed.length > 0;

  return (
    <li>
      <div
        className="group flex items-center gap-2 py-2 pr-2 rounded-xl hover:bg-black/[0.03] transition-colors"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 text-muted-foreground shrink-0 disabled:opacity-30"
          aria-label={open ? "Contraer" : "Expandir"}
          disabled={!expandable}
        >
          {expandable ? (
            open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>


        <span
          className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0 ${
            KIND_ORDER.indexOf(node.kind) < 2
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-black/[0.04] text-muted-foreground border-border"
          }`}
        >
          {KIND_LABEL[node.kind]}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate flex items-center gap-2">
            {node.title}
            {!node.is_published && (
              <span className="text-[9px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Borrador
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">/{node.slug}</div>
        </div>

        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {allowed.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              title={`Añadir ${allowed.map((k) => KIND_LABEL[k]).join(" / ").toLowerCase()}`}
              className="p-1.5 rounded-lg text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </button>
          )}

          <button
            onClick={() => setResourcesOpen((v) => !v)}
            title="Recursos (archivos, videos, enlaces)"
            className={`p-1.5 rounded-lg hover:bg-black/[0.05] ${resourcesOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Paperclip className="size-3.5" />
          </button>
          <button
            onClick={() =>
              onUpdate({ id: node.id, is_published: !node.is_published })
            }
            title={node.is_published ? "Ocultar" : "Publicar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            {node.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            title="Editar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar "${node.title}" y todo su contenido?`)) return;
              setBusy(true);
              try {
                await onDelete(node.id);
              } finally {
                setBusy(false);
              }
            }}
            title="Eliminar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
            disabled={busy}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div
          className="ml-2 mb-2 rounded-xl border border-border bg-white/60 p-3 grid gap-2"
          style={{ marginLeft: 8 + depth * 18 + 24 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full bg-white border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Slug
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 block w-full bg-white border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </label>
          </div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full bg-white border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setTitle(node.title);
                setSlug(node.slug);
                setDescription(node.description ?? "");
                setEditing(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-black/[0.05]"
            >
              <X className="size-3.5" /> Cancelar
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await onUpdate({
                    id: node.id,
                    title,
                    slug: slug || slugify(title),
                    description: description || null,
                  });
                  setEditing(false);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {resourcesOpen && (
        <div
          className="mb-2 rounded-xl border border-primary/20 bg-primary/[0.03] p-3"
          style={{ marginLeft: 8 + depth * 18 + 24 }}
        >
          <ResourcesPanel nodeId={node.id} nodeTitle={node.title} />
        </div>
      )}

      {open && (
        <>
          {allowed.length > 0 && (
            <div style={{ paddingLeft: 8 + (depth + 1) * 18 }} className="py-1">
              <AddInline parentId={node.id} allowedKinds={allowed} onCreate={onCreate} />
            </div>
          )}
          {children.length > 0 && (
            <ul className="space-y-1.5">
              {children.map((c) => (
                <TreeItem
                  key={c.id}
                  node={c}
                  tree={tree}
                  depth={depth + 1}
                  onCreate={onCreate}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

function AddInline({
  parentId,
  allowedKinds,
  onCreate,
}: {
  parentId: string | null;
  allowedKinds: NodeKind[];
  onCreate: (v: {
    parent_id: string | null;
    kind: NodeKind;
    title: string;
    slug: string;
    description?: string;
  }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<NodeKind>(allowedKinds[0]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 border border-dashed border-primary/40"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
        Añadir {allowedKinds.map((k) => KIND_LABEL[k]).join(" / ").toLowerCase()}
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        setError(null);
        try {
          await onCreate({
            parent_id: parentId,
            kind,
            title: title.trim(),
            slug: slugify(title),
          });
          setTitle("");
          setOpen(false);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo crear.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 flex-wrap"
    >
      {allowedKinds.length > 1 && (
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as NodeKind)}
          className="bg-white border border-border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
        >
          {allowedKinds.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`Nombre del ${KIND_LABEL[kind].toLowerCase()}`}
        autoFocus
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring min-w-[220px]"
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Crear
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-black/[0.05]"
      >
        <X className="size-3.5" />
      </button>
      {error && <span className="basis-full text-[11px] font-semibold text-destructive">{error}</span>}
    </form>
  );
}

// -------------------- Resources panel --------------------

type ResourceKind = "file" | "video" | "link" | "text" | "image" | "audio" | "embed";

type ContentResource = {
  id: string;
  node_id: string;
  kind: ResourceKind;
  title: string;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  content: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

const RESOURCE_LABEL: Record<ResourceKind, string> = {
  file: "Archivo",
  video: "Video",
  link: "Enlace",
  text: "Nota",
  image: "Imagen",
  audio: "Audio",
  embed: "Embed",
};

function ResourceIcon({ kind, className }: { kind: ResourceKind; className?: string }) {
  const cls = className ?? "size-4";
  if (kind === "video") return <Film className={cls} />;
  if (kind === "link" || kind === "embed") return <Link2 className={cls} />;
  if (kind === "text") return <FileText className={cls} />;
  if (kind === "image") return <ImageIcon className={cls} />;
  return <Paperclip className={cls} />;
}

function ResourcesPanel({ nodeId, nodeTitle }: { nodeId: string; nodeTitle: string }) {
  const user = useSupabaseUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"file" | "video" | "link" | "text">("file");
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["content-resources", nodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_resources")
        .select("*")
        .eq("node_id", nodeId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentResource[];
    },
  });

  const createMut = useMutation({
    mutationFn: async (r: Partial<ContentResource> & { kind: ResourceKind; title: string }) => {
      setError(null);
      const siblings = q.data ?? [];
      const { error } = await supabase.from("content_resources").insert({
        node_id: nodeId,
        kind: r.kind,
        title: r.title,
        url: r.url ?? null,
        storage_path: r.storage_path ?? null,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes ?? null,
        content: r.content ?? null,
        metadata: (r.metadata ?? {}) as never,
        sort_order: siblings.length,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo agregar el recurso."),
  });

  const updateMut = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ContentResource> }) => {
      setError(null);
      const { error } = await supabase.from("content_resources").update(input.patch as never).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo guardar."),
  });

  const deleteMut = useMutation({
    mutationFn: async (r: ContentResource) => {
      setError(null);
      if (r.storage_path) {
        await supabase.storage.from("content").remove([r.storage_path]);
      }
      const { error } = await supabase.from("content_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-resources", nodeId] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo eliminar."),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Recursos de "{nodeTitle}"
        </div>
        <div className="text-[10px] text-muted-foreground">
          {q.data?.length ?? 0} elemento(s)
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-3">
        {(["file", "video", "link", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <ResourceIcon kind={t} className="size-3.5" />
            {t === "file" ? "Subir archivo" : t === "video" ? "Subir video" : t === "link" ? "Añadir enlace" : "Nota / texto"}
          </button>
        ))}
      </div>

      <div className="mb-4">
        {tab === "file" && (
          <UploadForm
            nodeId={nodeId}
            accept="*/*"
            kindHint="file"
            onDone={(payload) => createMut.mutateAsync(payload)}
            onError={(m) => setError(m)}
          />
        )}
        {tab === "video" && (
          <UploadForm
            nodeId={nodeId}
            accept="video/*"
            kindHint="video"
            onDone={(payload) => createMut.mutateAsync(payload)}
            onError={(m) => setError(m)}
          />
        )}
        {tab === "link" && (
          <LinkForm onCreate={(payload) => createMut.mutateAsync(payload)} />
        )}
        {tab === "text" && (
          <TextForm onCreate={(payload) => createMut.mutateAsync(payload)} />
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] font-semibold text-destructive">
          {error}
        </div>
      )}

      {q.isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="text-[12px] text-muted-foreground italic">Sin recursos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {q.data!.map((r) => (
            <ResourceRow
              key={r.id}
              r={r}
              onUpdate={(patch) => updateMut.mutateAsync({ id: r.id, patch })}
              onDelete={() => deleteMut.mutateAsync(r)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadForm({
  nodeId,
  accept,
  kindHint,
  onDone,
  onError,
}: {
  nodeId: string;
  accept: string;
  kindHint: "file" | "video";
  onDone: (payload: Partial<ContentResource> & { kind: ResourceKind; title: string }) => Promise<unknown>;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  return (
    <label className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-dashed border-primary/40 bg-white cursor-pointer hover:bg-primary/[0.04]">
      <Upload className="size-4 text-primary" />
      <span className="text-[12px] font-semibold text-foreground">
        {kindHint === "video" ? "Elegir video para subir" : "Elegir archivo(s) para subir"}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {busy ? progress ?? "Subiendo…" : "PDF, DOCX, PPTX, MP4, MP3, imágenes…"}
      </span>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          setBusy(true);
          try {
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`);
              const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
              const path = `${nodeId}/${Date.now()}_${safe}`;
              const { error: upErr } = await supabase.storage
                .from("content")
                .upload(path, file, {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: file.type || undefined,
                });
              if (upErr) throw upErr;
              const isVideo = file.type.startsWith("video/") || kindHint === "video";
              const isImage = file.type.startsWith("image/");
              const isAudio = file.type.startsWith("audio/");
              const kind: ResourceKind = isVideo ? "video" : isImage ? "image" : isAudio ? "audio" : "file";
              await onDone({
                kind,
                title: file.name,
                storage_path: path,
                mime_type: file.type || null,
                size_bytes: file.size,
              });
            }
          } catch (err) {
            onError(err instanceof Error ? err.message : "Error al subir archivo.");
          } finally {
            setBusy(false);
            setProgress(null);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
      {busy && <Loader2 className="size-4 animate-spin text-primary" />}
    </label>
  );
}

function LinkForm({
  onCreate,
}: {
  onCreate: (payload: Partial<ContentResource> & { kind: ResourceKind; title: string }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const detectKind = (u: string): ResourceKind => {
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|player\.|\.mp4($|\?)/i.test(u)) return "video";
    return "link";
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!url.trim()) return;
        setBusy(true);
        try {
          await onCreate({
            kind: detectKind(url),
            title: title.trim() || url.trim(),
            url: url.trim(),
          });
          setTitle("");
          setUrl("");
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-border bg-white"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[160px]"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtube.com/… o cualquier URL"
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[220px] font-mono"
      />
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Agregar
      </button>
    </form>
  );
}

function TextForm({
  onCreate,
}: {
  onCreate: (payload: Partial<ContentResource> & { kind: ResourceKind; title: string }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() && !content.trim()) return;
        setBusy(true);
        try {
          await onCreate({
            kind: "text",
            title: title.trim() || "Nota",
            content: content,
          });
          setTitle("");
          setContent("");
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-2 p-3 rounded-lg border border-border bg-white"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la nota"
        className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Escribe contenido, teoría, algoritmos, perlas clínicas… (soporta Markdown)"
        className="bg-white border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Guardar nota
        </button>
      </div>
    </form>
  );
}

function ResourceRow({
  r,
  onUpdate,
  onDelete,
}: {
  r: ContentResource;
  onUpdate: (patch: Partial<ContentResource>) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [url, setUrl] = useState(r.url ?? "");
  const [content, setContent] = useState(r.content ?? "");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function getSigned() {
    if (!r.storage_path) return;
    if (signedUrl) return;
    const { data, error } = await supabase.storage
      .from("content")
      .createSignedUrl(r.storage_path, 60 * 60);
    if (!error && data) setSignedUrl(data.signedUrl);
  }

  useEffect(() => {
    if (r.storage_path) getSigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.storage_path]);

  const sizeLabel = r.size_bytes
    ? r.size_bytes > 1024 * 1024
      ? `${(r.size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(r.size_bytes / 1024))} KB`
    : null;

  return (
    <li className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ResourceIcon kind={r.kind} className="size-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-black/[0.04] text-muted-foreground border border-border">
              {RESOURCE_LABEL[r.kind]}
            </span>
            <span className="text-sm font-bold truncate">{r.title}</span>
            {!r.is_published && (
              <span className="text-[9px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Borrador
              </span>
            )}
            {sizeLabel && <span className="text-[10px] text-muted-foreground">{sizeLabel}</span>}
          </div>
          {r.kind === "text" && r.content && !editing && (
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{r.content}</p>
          )}
          {(r.url || signedUrl) && !editing && (
            <a
              href={r.url ?? signedUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline break-all"
            >
              <ExternalLink className="size-3" />
              {r.url ?? "Abrir archivo"}
            </a>
          )}
          {r.kind === "video" && signedUrl && !editing && (
            <video src={signedUrl} controls className="mt-2 w-full max-w-md rounded-lg border border-border" />
          )}
          {r.kind === "image" && signedUrl && !editing && (
            <img src={signedUrl} alt={r.title} className="mt-2 max-h-40 rounded-lg border border-border" />
          )}
          {r.kind === "audio" && signedUrl && !editing && (
            <audio src={signedUrl} controls className="mt-2 w-full" />
          )}

          {editing && (
            <div className="mt-2 grid gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                placeholder="Título"
              />
              {(r.kind === "link" || r.kind === "video" || r.kind === "embed") && !r.storage_path && (
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="URL"
                />
              )}
              {r.kind === "text" && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="bg-white border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTitle(r.title);
                    setUrl(r.url ?? "");
                    setContent(r.content ?? "");
                    setEditing(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:bg-black/[0.05]"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onUpdate({
                        title: title.trim() || r.title,
                        url: r.storage_path ? r.url : url.trim() || null,
                        content: r.kind === "text" ? content : r.content,
                      });
                      setEditing(false);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              title="Abrir / descargar"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
            >
              <Download className="size-3.5" />
            </a>
          )}
          <button
            onClick={() => onUpdate({ is_published: !r.is_published })}
            title={r.is_published ? "Ocultar" : "Publicar"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            {r.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            title="Editar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar "${r.title}"?`)) return;
              setBusy(true);
              try {
                await onDelete();
              } finally {
                setBusy(false);
              }
            }}
            title="Eliminar"
            disabled={busy}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
