import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSupabaseUser } from "@/lib/session";
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
      { title: "Editor de contenido · Kotaro Academy" },
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

  const nodesQ = useQuery({
    queryKey: ["content-nodes"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_nodes")
        .select("id,parent_id,kind,title,slug,description,sort_order,is_published,created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentNode[];
    },
  });

  const tree = useMemo(() => {
    const byParent = new Map<string | null, ContentNode[]>();
    (nodesQ.data ?? []).forEach((n) => {
      const arr = byParent.get(n.parent_id) ?? [];
      arr.push(n);
      byParent.set(n.parent_id, arr);
    });
    return byParent;
  }, [nodesQ.data]);

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
      const { error } = await supabase.from("content_nodes").insert({
        parent_id: input.parent_id,
        kind: input.kind,
        title: input.title,
        slug: input.slug || slugify(input.title),
        description: input.description || null,
        sort_order,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-nodes"] }),
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo crear el contenido."),
  });

  const updateMut = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      slug?: string;
      description?: string | null;
      is_published?: boolean;
      sort_order?: number;
    }) => {
      setMutationError(null);
      const { id, ...rest } = input;
      const { error } = await supabase.from("content_nodes").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-nodes"] }),
    onError: (error) => setMutationError(error instanceof Error ? error.message : "No se pudo guardar el cambio."),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      setMutationError(null);
      const { error } = await supabase.from("content_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-nodes"] }),
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
  const [title, setTitle] = useState(node.title);
  const [slug, setSlug] = useState(node.slug);
  const [description, setDescription] = useState(node.description ?? "");
  const [busy, setBusy] = useState(false);
  const allowed = CHILD_KINDS[node.kind];

  return (
    <li>
      <div
        className="group flex items-center gap-2 py-2 pr-2 rounded-xl hover:bg-black/[0.03] transition-colors"
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 text-muted-foreground shrink-0"
          aria-label={open ? "Contraer" : "Expandir"}
        >
          {children.length > 0 ? (
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
