/**
 * Organizador jerárquico de temas — exclusivo SUPER ADMIN.
 *
 * Arrastrar y soltar para reordenar, anidar (tema → subtema → sub-subtema) y
 * devolver un subtema al nivel principal. Solo modifica estructura y orden.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  CornerDownRight,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CmsNode } from "@/lib/pednn-cms";
import {
  buildOrgTree,
  deleteTopic,
  dropNode,
  moveNode,
  patchNode,
  renameTopic,
  saveOrganization,
  setTopicPublished,
  structureSignature,
  type DropMode,
  type OrgNode,
} from "@/lib/topic-organizer";

export function TopicOrganizer({
  blockId,
  blockTitle,
  nodes,
  accent,
  onClose,
  onSaved,
}: {
  blockId: string;
  blockTitle: string;
  nodes: CmsNode[];
  accent: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const original = useMemo(() => buildOrgTree(nodes), [nodes]);
  const [tree, setTree] = useState<OrgNode[]>(original);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string | null; mode: DropMode } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setTree(original), [original]);

  const dirty = useMemo(
    () => structureSignature(tree) !== structureSignature(original),
    [tree, original],
  );

  const applyDrop = (targetId: string | null, mode: DropMode) => {
    if (!dragId) return;
    setTree((prev) => moveNode(prev, dragId, targetId, mode));
    setDragId(null);
    setOver(null);
  };

  /** Renombrar en línea: guarda de inmediato solo el título. */
  const rename = async (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setTree((prev) => patchNode(prev, id, { title: clean }));
    try {
      await renameTopic(id, clean);
      toast.success("Título actualizado");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo renombrar");
      onSaved();
    }
  };

  const togglePublished = async (id: string, next: boolean) => {
    setTree((prev) => patchNode(prev, id, { published: next }));
    try {
      await setTopicPublished(id, next);
      toast.success(next ? "Tema publicado" : "Tema oculto");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo cambiar la visibilidad");
      onSaved();
    }
  };

  const remove = async (node: OrgNode) => {
    if (!confirm(`¿Eliminar «${node.title}»? Se eliminarán también sus subtemas.`)) return;
    setTree((prev) => dropNode(prev, node.id));
    try {
      await deleteTopic(node.id);
      toast.success("Tema eliminado");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo eliminar");
      onSaved();
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const n = await saveOrganization(tree, blockId, original);
      toast.success(n === 0 ? "Sin cambios por guardar" : `Estructura guardada (${n} nodos)`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la estructura");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-3xl border border-border/60 bg-card p-4 shadow-xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <FolderTree className="size-4" style={{ color: accent }} />
          <h3 className="text-sm font-extrabold tracking-tight">
            Organizar temas · {blockTitle}
          </h3>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
            Super admin
          </span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-foreground/[0.05]"
            aria-label="Cerrar organizador"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Arrastra un tema por el asa (⠿). Suelta en el borde superior o inferior de otro tema
          para reordenar, o en el centro para convertirlo en subtema. Suelta al final de la lista
          para devolverlo al nivel principal. Además puedes renombrar (✏️), publicar u ocultar (👁)
          y eliminar temas aquí mismo; esos cambios se guardan al instante.
        </p>

        <div className="mt-4 space-y-1 rounded-2xl border border-border/50 bg-background/40 p-2">
          {tree.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">Este bloque no tiene temas.</p>
          )}
          {tree.map((n) => (
            <Row
              key={n.id}
              node={n}
              depth={0}
              accent={accent}
              dragId={dragId}
              over={over}
              setDragId={setDragId}
              setOver={setOver}
              onDrop={applyDrop}
              onRename={rename}
              onTogglePublished={togglePublished}
              onDelete={remove}
            />
          ))}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver({ id: null, mode: "after" });
            }}
            onDrop={(e) => {
              e.preventDefault();
              applyDrop(null, "after");
            }}
            className={`mt-1 rounded-xl border border-dashed px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${
              over?.id === null
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground"
            }`}
          >
            Soltar aquí para nivel principal
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setTree(original)}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" /> Restablecer
          </button>
          <div className="flex-1" />
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-extrabold text-white shadow-sm disabled:opacity-50"
            style={{ background: accent }}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar estructura
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  node,
  depth,
  accent,
  dragId,
  over,
  setDragId,
  setOver,
  onDrop,
}: {
  node: OrgNode;
  depth: number;
  accent: string;
  dragId: string | null;
  over: { id: string | null; mode: DropMode } | null;
  setDragId: (id: string | null) => void;
  setOver: (v: { id: string | null; mode: DropMode } | null) => void;
  onDrop: (targetId: string | null, mode: DropMode) => void;
}) {
  const isOver = over?.id === node.id;

  const zoneFor = (e: React.DragEvent<HTMLDivElement>): DropMode => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y < rect.height * 0.28) return "before";
    if (y > rect.height * 0.72) return "after";
    return "inside";
  };

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver({ id: node.id, mode: node.fixed ? "inside" : zoneFor(e) });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(node.id, node.fixed ? "inside" : zoneFor(e));
        }}
        className={`flex items-center gap-2 rounded-xl border bg-background/60 px-2.5 py-2 transition ${
          dragId === node.id ? "opacity-40" : ""
        } ${
          isOver && over?.mode === "inside"
            ? "border-primary/70 ring-2 ring-primary/30"
            : "border-border/50"
        } ${isOver && over?.mode === "before" ? "border-t-2 border-t-primary" : ""} ${
          isOver && over?.mode === "after" ? "border-b-2 border-b-primary" : ""
        }`}
      >
        {node.fixed ? (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <span
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              setDragId(node.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDragId(null);
              setOver(null);
            }}
            className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label={`Arrastrar ${node.title}`}
          >
            <GripVertical className="size-4" />
          </span>
        )}
        {depth > 0 && !node.fixed && (
          <CornerDownRight className="size-3.5 shrink-0" style={{ color: accent }} />
        )}
        <span
          className={`min-w-0 flex-1 truncate text-xs ${
            node.fixed ? "font-extrabold uppercase tracking-widest" : "font-semibold"
          }`}
        >
          {node.title}
        </span>
        {!node.published && <EyeOff className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {node.fixed ? "categoría" : depth === 0 ? "tema" : depth === 1 ? "subtema" : "sub-subtema"}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((c) => (
            <Row
              key={c.id}
              node={c}
              depth={depth + 1}
              accent={accent}
              dragId={dragId}
              over={over}
              setDragId={setDragId}
              setOver={setOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
