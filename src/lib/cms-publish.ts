/**
 * CMS KotaMed — capa DRAFT → PRODUCCIÓN.
 *
 * `cms_pages` + `cms_blocks` son SIEMPRE el borrador de trabajo (lo que edita
 * CMS Studio). La producción vive en `cms_published`: una fila por página con
 * el snapshot completo de sus bloques. El sitio público lee exclusivamente esa
 * tabla, así que editar nunca altera KOTAMED.APP hasta pulsar «Publicar».
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CmsBlock, CmsPage, CmsSeo } from "@/lib/cms";

/* ------------------------------- Tipos ---------------------------- */

export type PublishedPage = {
  page_id: string;
  slug: string;
  kind: string;
  title: string;
  subtitle: string | null;
  seo: CmsSeo;
  theme: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sort_order: number;
  blocks: CmsBlock[];
  version: number;
  published_at: string;
};

export type CmsAuditEntry = {
  id: string;
  actor_email: string | null;
  entity: string;
  entity_label: string | null;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
};

export type PageStatusRow = {
  page: CmsPage;
  published: { version: number; published_at: string } | null;
  /** Hay cambios en el borrador que aún no están en producción. */
  pending: boolean;
  lastDraftEdit: string;
};

export type ValidationCheck = { id: string; label: string; ok: boolean; detail?: string };

const PUB_COLS =
  "page_id, slug, kind, title, subtitle, seo, theme, metadata, sort_order, blocks, version, published_at";

/* ------------------------------ Auditoría -------------------------- */

export async function logCmsAudit(entry: {
  entity: string;
  entityId?: string | null;
  entityLabel?: string | null;
  action: string;
  detail?: Record<string, unknown>;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  await supabase.from("cms_audit_log").insert({
    actor_id: user.id,
    actor_email: user.email ?? null,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    entity_label: entry.entityLabel ?? null,
    action: entry.action,
    detail: (entry.detail ?? {}) as never,
  } as never);
}

export function useCmsAudit(limit = 60) {
  return useQuery({
    queryKey: ["cms-audit", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_audit_log")
        .select("id, actor_email, entity, entity_label, action, detail, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CmsAuditEntry[];
    },
  });
}

/* ------------------------------ Ajustes ---------------------------- */

export function useCmsSettings() {
  return useQuery({
    queryKey: ["cms-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_settings")
        .select("id, safe_mode, updated_at")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return (data ?? { id: "global", safe_mode: false, updated_at: null }) as unknown as {
        id: string;
        safe_mode: boolean;
        updated_at: string | null;
      };
    },
  });
}

export function useSetSafeMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (safe: boolean) => {
      const { error } = await supabase
        .from("cms_settings")
        .update({ safe_mode: safe } as never)
        .eq("id", "global");
      if (error) throw error;
      await logCmsAudit({ entity: "settings", action: safe ? "activó modo seguro" : "desactivó modo seguro" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-settings"] }),
  });
}

/* --------------------------- Estado de páginas --------------------- */

/** Estado borrador/producción de todas las páginas + cambios pendientes. */
export function usePublishStatus() {
  return useQuery({
    queryKey: ["cms-publish-status"],
    staleTime: 5_000,
    queryFn: async () => {
      const [pagesRes, pubRes, blocksRes] = await Promise.all([
        supabase
          .from("cms_pages")
          .select(
            "id, kind, slug, title, subtitle, status, seo, theme, metadata, sort_order, published_at, updated_at",
          )
          .order("kind")
          .order("sort_order"),
        supabase.from("cms_published").select("page_id, version, published_at"),
        supabase.from("cms_blocks").select("id, page_id, updated_at, visible"),
      ]);
      if (pagesRes.error) throw pagesRes.error;
      if (pubRes.error) throw pubRes.error;
      if (blocksRes.error) throw blocksRes.error;

      const pages = (pagesRes.data ?? []) as unknown as CmsPage[];
      const pub = new Map(
        ((pubRes.data ?? []) as unknown as { page_id: string; version: number; published_at: string }[]).map((r) => [
          r.page_id,
          r,
        ]),
      );
      const blocks = (blocksRes.data ?? []) as unknown as {
        id: string;
        page_id: string;
        updated_at: string;
        visible: boolean;
      }[];

      const blockCount = new Map<string, number>();
      const lastBlockEdit = new Map<string, string>();
      for (const b of blocks) {
        blockCount.set(b.page_id, (blockCount.get(b.page_id) ?? 0) + 1);
        const prev = lastBlockEdit.get(b.page_id);
        if (!prev || b.updated_at > prev) lastBlockEdit.set(b.page_id, b.updated_at);
      }

      const rows: PageStatusRow[] = pages.map((p) => {
        const published = pub.get(p.id) ?? null;
        const lastDraftEdit = [p.updated_at, lastBlockEdit.get(p.id) ?? ""].sort().reverse()[0] ?? p.updated_at;
        // Tolerancia: al publicar, los triggers de `updated_at` corren después del
        // sello de publicación, así que unos segundos de diferencia no son cambios reales.
        const pending = published
          ? new Date(lastDraftEdit).getTime() - new Date(published.published_at).getTime() > 10_000
          : p.status !== "published";
        return { page: p, published, pending, lastDraftEdit };
      });

      return {
        rows,
        blockCount,
        totals: {
          pages: pages.length,
          blocks: blocks.length,
          drafts: rows.filter((r) => !r.published).length,
          pending: rows.filter((r) => r.pending).length,
          lastPublish:
            [...pub.values()].map((v) => v.published_at).sort().reverse()[0] ?? null,
        },
      };
    },
  });
}

/* ------------------------------ Validación ------------------------- */

const isValidHref = (href?: string) =>
  !!href && (href.startsWith("/") || href.startsWith("#") || /^https?:\/\//.test(href) || href.startsWith("mailto:"));

export function validatePage(page: CmsPage, blocks: CmsBlock[]): ValidationCheck[] {
  const visible = blocks.filter((b) => b.visible);
  const brokenLinks: string[] = [];
  const missingAssets: string[] = [];
  for (const b of visible) {
    const p = b.props ?? {};
    if (p.primaryLabel && !isValidHref(p.primaryHref)) brokenLinks.push(`${b.type}: botón principal`);
    if (p.secondaryLabel && !isValidHref(p.secondaryHref)) brokenLinks.push(`${b.type}: botón secundario`);
    for (const it of p.items ?? []) {
      if (it.href && !isValidHref(it.href)) brokenLinks.push(`${b.type}: «${it.title ?? "elemento"}»`);
    }
    if (b.type === "video" && !p.video) missingAssets.push(`${b.type}: sin URL de video`);
    if (p.image !== undefined && p.image !== "" && !/^(https?:|\/|data:)/.test(p.image)) {
      missingAssets.push(`${b.type}: imagen inválida`);
    }
  }
  const seo = page.seo ?? {};
  return [
    {
      id: "content",
      label: "Contenido válido",
      ok: !!page.title?.trim() && visible.length > 0,
      detail: visible.length === 0 ? "La página no tiene bloques visibles." : `${visible.length} bloques visibles`,
    },
    {
      id: "seo",
      label: "SEO válido",
      ok: !!(seo.title && seo.title.length <= 60 && seo.description && seo.description.length <= 160),
      detail: !seo.title
        ? "Falta el meta título."
        : !seo.description
          ? "Falta la meta descripción."
          : seo.title.length > 60 || (seo.description?.length ?? 0) > 160
            ? "Longitudes fuera de rango recomendado."
            : "Título y descripción correctos",
    },
    {
      id: "links",
      label: "Enlaces válidos",
      ok: brokenLinks.length === 0,
      detail: brokenLinks.length ? brokenLinks.slice(0, 4).join(" · ") : "Todos los enlaces resuelven",
    },
    {
      id: "assets",
      label: "Assets válidos",
      ok: missingAssets.length === 0,
      detail: missingAssets.length ? missingAssets.slice(0, 4).join(" · ") : "Imágenes y videos correctos",
    },
    {
      id: "slug",
      label: "Ruta válida",
      ok: /^[a-z0-9-]+$/.test(page.slug ?? ""),
      detail: `/p/${page.slug}`,
    },
  ];
}

/* ------------------------------ Publicación ------------------------ */

async function nextVersion(pageId: string) {
  const { count } = await supabase
    .from("cms_page_versions")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);
  return (count ?? 0) + 1;
}

function invalidatePublic(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["cms-public"] });
  qc.invalidateQueries({ queryKey: ["cms-public-list"] });
  qc.invalidateQueries({ queryKey: ["cms-publish-status"] });
  qc.invalidateQueries({ queryKey: ["cms-pages"] });
  qc.invalidateQueries({ queryKey: ["cms-audit"] });
}

/** Publica el borrador de una página a producción, versionando el snapshot. */
export function usePublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, note }: { pageId: string; note?: string }) => {
      const { data: settings } = await supabase
        .from("cms_settings")
        .select("safe_mode")
        .eq("id", "global")
        .maybeSingle();
      if ((settings as { safe_mode?: boolean } | null)?.safe_mode) {
        throw new Error("Modo seguro activado: la publicación está bloqueada.");
      }

      const [{ data: page, error: pe }, { data: blocks, error: be }] = await Promise.all([
        supabase
          .from("cms_pages")
          .select("id, kind, slug, title, subtitle, status, seo, theme, metadata, sort_order, published_at, updated_at")
          .eq("id", pageId)
          .single(),
        supabase
          .from("cms_blocks")
          .select("id, page_id, type, name, sort_order, visible, props, style")
          .eq("page_id", pageId)
          .order("sort_order"),
      ]);
      if (pe) throw pe;
      if (be) throw be;

      const p = page as unknown as CmsPage;
      const allBlocks = (blocks ?? []) as unknown as CmsBlock[];
      const checks = validatePage(p, allBlocks);
      const blocking = checks.find((c) => (c.id === "content" || c.id === "slug") && !c.ok);
      if (blocking) throw new Error(`${blocking.label}: ${blocking.detail ?? ""}`);

      const version = await nextVersion(pageId);
      const visible = allBlocks.filter((b) => b.visible);

      const { data: auth } = await supabase.auth.getUser();

      const { error: upErr } = await supabase.from("cms_published").upsert(
        {
          page_id: pageId,
          slug: p.slug,
          kind: p.kind,
          title: p.title,
          subtitle: p.subtitle,
          seo: p.seo as never,
          theme: p.theme as never,
          metadata: p.metadata as never,
          sort_order: p.sort_order,
          blocks: visible as never,
          version,
          published_by: auth.user?.id ?? null,
          published_at: new Date().toISOString(),
        } as never,
        { onConflict: "page_id" },
      );
      if (upErr) throw upErr;

      const { error: verErr } = await supabase.from("cms_page_versions").insert({
        page_id: pageId,
        version,
        status: "published",
        note: note ?? null,
        created_by: auth.user?.id ?? null,
        created_by_email: auth.user?.email ?? null,
        snapshot: { page: p, blocks: allBlocks } as never,
      } as never);
      if (verErr) throw verErr;

      const { error: statusErr } = await supabase
        .from("cms_pages")
        .update({ status: "published", published_at: new Date().toISOString() } as never)
        .eq("id", pageId);
      if (statusErr) throw statusErr;

      await logCmsAudit({
        entity: "page",
        entityId: pageId,
        entityLabel: p.title,
        action: `publicó versión ${version}`,
        detail: { blocks: visible.length, slug: p.slug },
      });

      return { version, publishedAt: new Date().toISOString(), blocks: visible.length, title: p.title };
    },
    onSuccess: () => invalidatePublic(qc),
  });
}

/** Retira la página de producción (el borrador se conserva intacto). */
export function useUnpublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("cms_published").delete().eq("page_id", pageId);
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("cms_pages")
        .update({ status: "draft", published_at: null } as never)
        .eq("id", pageId);
      if (e2) throw e2;
      await logCmsAudit({ entity: "page", entityId: pageId, action: "despublicó la página" });
    },
    onSuccess: () => invalidatePublic(qc),
  });
}

/** Publica todas las páginas con cambios pendientes que ya estaban en producción. */
export function usePublishAllPending() {
  const publish = usePublishPage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pageIds: string[]) => {
      let done = 0;
      for (const id of pageIds) {
        await publish.mutateAsync({ pageId: id, note: "Publicación conjunta" });
        done++;
      }
      return done;
    },
    onSuccess: () => invalidatePublic(qc),
  });
}

/* ------------------------- Comparación de cambios ------------------ */

export type DiffRow = { path: string; before: string; after: string };

function flat(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flat(v, `${prefix}[${i + 1}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "id" || k === "page_id" || k === "updated_at" || k === "created_at") continue;
      flat(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out[prefix] = String(value);
  return out;
}

/** Diferencias legibles entre el borrador y lo que está en producción. */
export function diffDraftVsProduction(
  draft: { page: CmsPage; blocks: CmsBlock[] },
  production: PublishedPage | null,
): DiffRow[] {
  const a = flat(
    production
      ? { titulo: production.title, subtitulo: production.subtitle, seo: production.seo, bloques: production.blocks }
      : {},
  );
  const b = flat({
    titulo: draft.page.title,
    subtitulo: draft.page.subtitle,
    seo: draft.page.seo,
    bloques: draft.blocks.filter((x) => x.visible),
  });
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  return keys
    .filter((k) => (a[k] ?? "") !== (b[k] ?? ""))
    .map((k) => ({ path: k, before: a[k] ?? "—", after: b[k] ?? "—" }))
    .slice(0, 120);
}

/* --------------------------- Lecturas públicas --------------------- */

export function usePublishedPage(slug: string | null) {
  return useQuery({
    queryKey: ["cms-public", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_published")
        .select(PUB_COLS)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PublishedPage | null;
    },
  });
}

/** Snapshot de producción de una página concreta (para comparar cambios). */
export function useProductionSnapshot(pageId: string | null) {
  return useQuery({
    queryKey: ["cms-production", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_published")
        .select(PUB_COLS)
        .eq("page_id", pageId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PublishedPage | null;
    },
  });
}

/** Restaura una versión al BORRADOR (nunca publica directamente). */
export function useRestoreVersionToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (version: {
      id: string;
      page_id: string;
      version: number;
      snapshot: { page?: Partial<CmsPage>; blocks?: Partial<CmsBlock>[] };
    }) => {
      const snap = version.snapshot ?? {};
      if (snap.page) {
        const { id: _i, updated_at: _u, published_at: _p, status: _s, ...rest } = snap.page as Record<string, unknown>;
        const { error } = await supabase.from("cms_pages").update(rest as never).eq("id", version.page_id);
        if (error) throw error;
      }
      await supabase.from("cms_blocks").delete().eq("page_id", version.page_id);
      const rows = (snap.blocks ?? []).map((b, i) => ({
        page_id: version.page_id,
        type: b.type,
        name: b.name ?? null,
        sort_order: b.sort_order ?? i,
        visible: b.visible ?? true,
        props: b.props ?? {},
        style: b.style ?? {},
      }));
      if (rows.length) {
        const { error } = await supabase.from("cms_blocks").insert(rows as never);
        if (error) throw error;
      }
      await logCmsAudit({
        entity: "page",
        entityId: version.page_id,
        action: `restauró la versión ${version.version} al borrador`,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["cms-blocks", v.page_id] });
      invalidatePublic(qc);
    },
  });
}

/** Historial de versiones con estado y autor. */
export function useVersionHistory(pageId: string | null) {
  return useQuery({
    queryKey: ["cms-versions", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_page_versions")
        .select("id, page_id, version, note, status, created_by_email, created_at, snapshot")
        .eq("page_id", pageId!)
        .order("version", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        page_id: string;
        version: number;
        note: string | null;
        status: string;
        created_by_email: string | null;
        created_at: string;
        snapshot: { page?: Partial<CmsPage>; blocks?: Partial<CmsBlock>[] };
      }[];
    },
  });
}
