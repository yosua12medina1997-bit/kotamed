/**
 * Página individual del tema — visor educativo multimedia premium.
 *
 * Reemplaza el acordeón embebido en el catálogo: al pulsar "Abrir tema" el
 * usuario navega aquí y ve el contenido a pantalla amplia (banner, video
 * principal grande, diapositivas, bloques de recursos y siguiente tema).
 * El super admin gestiona portada, banner, diapositivas y recursos aquí mismo.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Play,
  Settings2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useMyRoles, useSupabaseUser } from "@/lib/session";
import {
  isDirectVideoFile,
  isPdf,
  nodeBanner,
  nodeCover,
  toEmbedUrl,
  useTopicPage,
  type TopicResourceRow,
} from "@/lib/topic-page";
import { DECK_STATUS_LABEL, isDeckVisible, readDeck } from "@/lib/topic-deck";
import { DeckViewer } from "@/components/topic/DeckViewer";
import { DeckEditor } from "@/components/topic/DeckEditor";
import { TopicPresenter } from "@/components/topic/TopicPresenter";
import { TopicEditor } from "@/components/topic/TopicEditor";
import { ResourcesPanelStandalone } from "@/components/ResourcesPanelStandalone";
import { ImagePicker } from "@/components/cms/ImagePicker";
import type { Topic } from "@/lib/topic-schema";

export const Route = createFileRoute("/tema/$topicId")({
  head: () => ({
    meta: [
      { title: "Tema · Biblioteca clínica · KotaMed" },
      {
        name: "description",
        content:
          "Visor multimedia del tema: video principal, diapositivas, lecturas, PDFs y recursos complementarios en KotaMed.",
      },
      { property: "og:title", content: "Tema · Biblioteca clínica · KotaMed" },
      {
        property: "og:description",
        content: "Contenido educativo multimedia del tema en KotaMed.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopicPage,
});

const ACCENT_FALLBACK = "hsl(var(--primary))";

function TopicPage() {
  const { topicId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useSupabaseUser();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: myRoles = [] } = useMyRoles(user?.id);
  const isSuperAdmin = myRoles.includes("super_admin") || myRoles.includes("admin");

  const q = useTopicPage(topicId);
  const [deckOpen, setDeckOpen] = useState(false);
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);

  const topic = q.data?.topic ?? null;
  const parent = q.data?.parent ?? null;
  const resources = useMemo(
    () => (q.data?.resources ?? []).filter((r) => r.is_published || isAdmin),
    [q.data?.resources, isAdmin],
  );

  const deck = readDeck(topic?.metadata ?? null);
  const deckReady = isDeckVisible(deck);
  const deckAdmin = !!isAdmin && !!deck && deck.slides.length > 0;
  const storedTopic = (topic?.metadata?.topic as Topic | undefined) ?? null;
  const accent = (topic?.metadata?.accent as string) || ACCENT_FALLBACK;

  const videos = resources.filter((r) => r.kind === "video" || r.kind === "embed");
  const mainVideo = videos[0] ?? null;
  const otherVideos = videos.slice(1);
  const images = resources.filter((r) => r.kind === "image");
  const notes = resources.filter((r) => r.kind === "text");
  const docs = resources.filter((r) => r.kind === "file");
  const links = resources.filter((r) => r.kind === "link");

  const siblings = q.data?.siblings ?? [];
  const idx = siblings.findIndex((s) => s.id === topic?.id);
  const next = idx >= 0 ? siblings[idx + 1] : undefined;

  const saveMeta = async (patch: Record<string, unknown>) => {
    if (!topic) return;
    const { error } = await supabase
      .from("content_nodes")
      .update({ metadata: { ...(topic.metadata ?? {}), ...patch } as never })
      .eq("id", topic.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Guardado");
    void qc.invalidateQueries({ queryKey: ["topic-page", topicId] });
    void qc.invalidateQueries({ queryKey: ["pednn"] });
  };

  const saveTopicText = async (t: Topic) => {
    await saveMeta({ topic: t });
    setEditorOpen(false);
  };

  if (q.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-20">
        <div className="glass flex items-center gap-2 rounded-3xl p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando tema…
        </div>
      </main>
    );
  }

  if (!topic || (!topic.is_published && !isAdmin)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Tema no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este tema no existe o aún no está publicado.
        </p>
        <button
          onClick={() => router.history.back()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-sm font-bold hover:border-primary/40"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>
      </main>
    );
  }

  const banner = nodeBanner(topic.metadata);

  return (
    <main className="pb-20">
      {/* HEADER / BANNER */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${accent}, transparent 70%)` }}
        />
        {banner && (
          <img
            src={banner}
            alt={topic.title}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 md:pt-12">
          <button
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-bold backdrop-blur hover:border-primary/40"
          >
            <ArrowLeft className="size-3.5" />
            {parent ? `Volver a ${parent.title}` : "Volver"}
          </button>

          {parent && (
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {parent.title}
            </p>
          )}
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {topic.title}
          </h1>
          {topic.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              {topic.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <Chip icon={<Layers className="size-3" />} label={`${resources.length} recursos`} />
            {videos.length > 0 && (
              <Chip icon={<Film className="size-3" />} label={`${videos.length} videos`} />
            )}
            {(deckReady || deckAdmin) && (
              <Chip
                icon={<ImageIcon className="size-3" />}
                label={`${deck!.slides.length} diapositivas${
                  deckReady ? "" : ` · ${DECK_STATUS_LABEL[deck!.status].toLowerCase()}`
                }`}
              />
            )}
            {!topic.is_published && <Chip label="Oculto para usuarios" />}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(deckReady || deckAdmin) && (
              <button
                onClick={() => setDeckOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:opacity-90"
                style={{ background: accent }}
              >
                <Play className="size-3.5" /> Ver presentación
              </button>
            )}
            {storedTopic && (
              <button
                onClick={() => setPresenterOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-4 py-2.5 text-xs font-extrabold backdrop-blur hover:border-primary/40"
              >
                <FileText className="size-3.5" /> Contenido teórico
              </button>
            )}
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setCoverOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-4 py-2.5 text-xs font-extrabold backdrop-blur hover:border-primary/40"
                >
                  <Settings2 className="size-3.5" /> Portada y ajustes
                </button>
                <button
                  onClick={() => setDeckEditorOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-extrabold text-amber-600 backdrop-blur hover:bg-amber-500/20"
                >
                  <ImageIcon className="size-3.5" /> Contenido visual
                </button>
                <button
                  onClick={() => setEditorOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-extrabold text-primary backdrop-blur hover:bg-primary/20"
                >
                  <Sparkles className="size-3.5" /> Editar con IA
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4">
        {isSuperAdmin && coverOpen && (
          <AdminTopicSettings
            title={topic.title}
            description={topic.description}
            cover={nodeCover(topic.metadata)}
            banner={(topic.metadata?.banner as string) ?? null}
            published={topic.is_published}
            onSaveMeta={saveMeta}
            onSaveNode={async (patch) => {
              const { error } = await supabase
                .from("content_nodes")
                .update(patch as never)
                .eq("id", topic.id);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Tema actualizado");
              void qc.invalidateQueries({ queryKey: ["topic-page", topicId] });
            }}
          />
        )}

        {/* VIDEO PRINCIPAL */}
        {mainVideo ? (
          <Block icon={<Film className="size-4" />} title="Video principal" accent={accent}>
            <VideoPlayer resource={mainVideo} />
          </Block>
        ) : (
          (deckReady || deckAdmin) && (
            <Block
              icon={<ImageIcon className="size-4" />}
              title="Presentación del tema"
              accent={accent}
            >
              <button
                onClick={() => setDeckOpen(true)}
                className="group relative block w-full overflow-hidden rounded-2xl border border-border/60"
              >
                <img
                  src={deck!.slides[0]!.url}
                  alt={topic.title}
                  className="aspect-video w-full bg-black/5 object-contain"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-xs font-extrabold text-black">
                    <Play className="size-3.5" /> Abrir presentación
                  </span>
                </span>
              </button>
            </Block>
          )
        )}

        {otherVideos.length > 0 && (
          <Block icon={<Film className="size-4" />} title="Más videos" accent={accent}>
            <div className="grid gap-4 lg:grid-cols-2">
              {otherVideos.map((v) => (
                <div key={v.id}>
                  <VideoPlayer resource={v} />
                </div>
              ))}
            </div>
          </Block>
        )}

        {images.length > 0 && (
          <Block icon={<ImageIcon className="size-4" />} title="Imágenes e infografías" accent={accent}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((r) => (
                <ResourceImage key={r.id} resource={r} />
              ))}
            </div>
          </Block>
        )}

        {notes.length > 0 && (
          <Block icon={<FileText className="size-4" />} title="Lecturas" accent={accent}>
            <div className="space-y-4">
              {notes.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur"
                >
                  <h3 className="text-sm font-extrabold tracking-tight">{r.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {r.content}
                  </p>
                </article>
              ))}
            </div>
          </Block>
        )}

        {docs.length > 0 && (
          <Block icon={<FileText className="size-4" />} title="Documentos y PDFs" accent={accent}>
            <div className="space-y-4">
              {docs.map((r) => (
                <DocResource key={r.id} resource={r} accent={accent} />
              ))}
            </div>
          </Block>
        )}

        {links.length > 0 && (
          <Block icon={<Link2 className="size-4" />} title="Enlaces externos" accent={accent}>
            <div className="grid gap-2 sm:grid-cols-2">
              {links.map((r) => (
                <a
                  key={r.id}
                  href={r.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-semibold hover:border-primary/40"
                >
                  <ExternalLink className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                </a>
              ))}
            </div>
          </Block>
        )}

        {resources.length === 0 && !deck && !storedTopic && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-10 text-center text-sm text-muted-foreground">
            {isAdmin
              ? "Este tema aún no tiene contenido. Agrega diapositivas, videos o recursos abajo."
              : "Contenido en preparación."}
          </div>
        )}

        {/* GESTIÓN DE RECURSOS */}
        <Block
          icon={<Layers className="size-4" />}
          title={isAdmin ? "Gestión de recursos del tema" : "Material complementario"}
          accent={accent}
        >
          <ResourcesPanelStandalone
            nodeId={topic.id}
            nodeTitle={topic.title}
            readOnly={!isAdmin}
          />
        </Block>

        {next && (
          <Link
            to="/tema/$topicId"
            params={{ topicId: next.id }}
            className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4 backdrop-blur transition hover:border-primary/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Siguiente tema
              </span>
              <span className="block truncate text-sm font-extrabold tracking-tight">
                {next.title}
              </span>
            </span>
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {deckOpen && deck && deck.slides.length > 0 && (
        <DeckViewer
          deck={deck}
          title={topic.title}
          accent={accent}
          badge={deck.status !== "published" ? DECK_STATUS_LABEL[deck.status] : undefined}
          onClose={() => setDeckOpen(false)}
        />
      )}
      {presenterOpen && storedTopic && (
        <TopicPresenter
          topic={storedTopic}
          accent={accent}
          onClose={() => setPresenterOpen(false)}
        />
      )}
      {editorOpen && isSuperAdmin && (
        <TopicEditor
          initialTopic={storedTopic}
          fallbackTitle={topic.title}
          accent={accent}
          nodeId={topic.id}
          nodeTitle={topic.title}
          onClose={() => setEditorOpen(false)}
          onSave={saveTopicText}
          saving={false}
        />
      )}
      {deckEditorOpen && isSuperAdmin && (
        <DeckEditor
          nodeId={topic.id}
          nodeTitle={topic.title}
          metadata={topic.metadata ?? {}}
          initialDeck={deck}
          accent={accent}
          onClose={() => setDeckEditorOpen(false)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["topic-page", topicId] });
          }}
        />
      )}
    </main>
  );
}

function Chip({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-muted-foreground backdrop-blur">
      {icon}
      {label}
    </span>
  );
}

function Block({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex size-7 items-center justify-center rounded-lg text-white"
          style={{ background: accent }}
        >
          {icon}
        </span>
        <h2 className="text-sm font-extrabold uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** Reproductor grande: embed (YouTube/Vimeo/Drive), archivo directo o Storage. */
function VideoPlayer({ resource }: { resource: TopicResourceRow }) {
  const signed = useSignedUrl(resource.storage_path);
  const raw = resource.url ?? signed ?? "";
  const embed = raw ? toEmbedUrl(raw) : null;

  return (
    <figure className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-lg">
      <div className="aspect-video w-full">
        {embed ? (
          <iframe
            src={embed}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        ) : raw && (isDirectVideoFile(raw) || resource.storage_path) ? (
          <video src={raw} controls className="h-full w-full bg-black" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-white/70">
            {raw ? (
              <a href={raw} target="_blank" rel="noreferrer" className="underline">
                Abrir video en una pestaña nueva
              </a>
            ) : (
              "Video no disponible"
            )}
          </div>
        )}
      </div>
      <figcaption className="border-t border-border/40 bg-card/70 px-4 py-2.5 text-xs font-bold">
        {resource.title}
      </figcaption>
    </figure>
  );
}

function ResourceImage({ resource }: { resource: TopicResourceRow }) {
  const signed = useSignedUrl(resource.storage_path);
  const src = resource.url ?? signed;
  if (!src) return null;
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card/60"
    >
      <img
        src={src}
        alt={resource.title}
        loading="lazy"
        className="aspect-video w-full object-cover transition group-hover:scale-[1.03]"
      />
      <p className="px-3 py-2 text-[11px] font-bold">{resource.title}</p>
    </a>
  );
}

function DocResource({ resource, accent }: { resource: TopicResourceRow; accent: string }) {
  const signed = useSignedUrl(resource.storage_path);
  const src = resource.url ?? signed;
  const pdf = isPdf(resource);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      <div className="flex items-center gap-2 px-4 py-3">
        <FileText className="size-4" style={{ color: accent }} />
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{resource.title}</span>
        {src && (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1 text-[11px] font-bold hover:border-primary/40"
          >
            <ExternalLink className="size-3" /> Abrir
          </a>
        )}
      </div>
      {pdf && src && (
        <iframe src={src} title={resource.title} className="h-[70vh] w-full border-t border-border/40" />
      )}
    </div>
  );
}

/** Panel super admin: portada, banner, título, descripción y estado. */
function AdminTopicSettings({
  title,
  description,
  cover,
  banner,
  published,
  onSaveMeta,
  onSaveNode,
}: {
  title: string;
  description: string | null;
  cover: string | null;
  banner: string | null;
  published: boolean;
  onSaveMeta: (patch: Record<string, unknown>) => Promise<void>;
  onSaveNode: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [t, setT] = useState(title);
  const [d, setD] = useState(description ?? "");

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-widest text-amber-600">
        Configuración del tema
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Nombre del tema
            <input
              value={t}
              onChange={(e) => setT(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Descripción
            <textarea
              value={d}
              onChange={(e) => setD(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void onSaveNode({ title: t.trim() || title, description: d.trim() || null })}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              Guardar datos
            </button>
            <button
              onClick={() => void onSaveNode({ is_published: !published })}
              className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs font-extrabold hover:border-primary/40"
            >
              {published ? "Ocultar tema" : "Publicar tema"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ImagePicker
            label="Imagen de portada"
            value={cover}
            aiHint={`Portada educativa premium para el tema "${title}"`}
            onChange={(url) => void onSaveMeta({ cover: url || null })}
          />
          <ImagePicker
            label="Banner (opcional)"
            value={banner}
            aiHint={`Banner panorámico para el tema "${title}"`}
            onChange={(url) => void onSaveMeta({ banner: url || null })}
          />
        </div>
      </div>
    </section>
  );
}

/** URL firmada temporal para recursos almacenados en Storage. */
function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!path) return;
    void supabase.storage
      .from("content")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  return url;
}
