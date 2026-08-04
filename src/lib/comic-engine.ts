/**
 * Motor desacoplado del cómic: narrativa, ilustración, caché, cola de render,
 * reintentos y estado de créditos. Nunca expone errores técnicos del proveedor.
 */

export type CreditState = "ok" | "cooldown" | "exhausted";

export type IllustrateResult = {
  dataUrl: string | null;
  status: "ok" | "quota" | "rate" | "error";
};

/** Convierte cualquier error técnico en un mensaje amable en español. */
export function friendlyAiError(error: unknown): string {
  const raw = (
    error instanceof Error ? error.message : typeof error === "string" ? error : ""
  ).toLowerCase();

  if (/402|payment required|credit|billing|quota|insufficient|token exhaust/.test(raw))
    return "El asistente de IA alcanzó su límite de recursos por ahora. La historia continúa y las ilustraciones se completarán automáticamente más tarde.";
  if (/429|rate limit|too many/.test(raw))
    return "Demasiadas solicitudes seguidas. Reintentaremos automáticamente en unos segundos.";
  if (/timeout|gateway|503|502|504|network|failed to fetch/.test(raw))
    return "El servicio de IA está ocupado. Reintentando automáticamente…";
  if (/unauthorized|401|403|forbidden/.test(raw))
    return "Tu sesión necesita refrescarse para continuar. Vuelve a iniciar sesión.";
  return "No pudimos completar ese paso ahora mismo. Puedes reintentarlo en un momento.";
}

/** Hash estable para caché de ilustraciones (prompt + estilo). */
export function panelHash(prompt: string, style: string): string {
  const s = `${style}::${prompt}`.trim();
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = ((h1 ^ s.charCodeAt(i)) * 0x01000193) >>> 0;
    h2 = ((h2 + s.charCodeAt(i) * (i + 7)) * 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

/** Caché en memoria compartida por toda la sesión: evita recobrar a la IA. */
const imageCache = new Map<string, string>();

export function getCachedPanel(prompt: string, style: string) {
  return imageCache.get(panelHash(prompt, style)) ?? null;
}
export function setCachedPanel(prompt: string, style: string, dataUrl: string) {
  if (imageCache.size > 400) imageCache.clear();
  imageCache.set(panelHash(prompt, style), dataUrl);
}

type ImgFn = (args: {
  data: { prompt: string; style: string };
}) => Promise<IllustrateResult | { dataUrl: string }>;

export type IllustratorEvents = {
  onCredit?: (state: CreditState, secondsLeft: number) => void;
  onQueue?: (pending: number) => void;
};

/**
 * Gestor de ilustraciones: caché + reintentos + cola + gestión de créditos.
 * Si los créditos se agotan, devuelve null sin lanzar: la narrativa sigue.
 */
export function createIllustrator(img: ImgFn, events: IllustratorEvents = {}) {
  let credit: CreditState = "ok";
  let resumeAt = 0;
  const queue: { prompt: string; style: string; apply: (dataUrl: string) => void }[] = [];
  let draining = false;

  const setCredit = (state: CreditState, seconds: number) => {
    credit = state;
    resumeAt = state === "ok" ? 0 : Date.now() + seconds * 1000;
    events.onCredit?.(state, seconds);
  };

  const available = () => credit === "ok" || Date.now() >= resumeAt;

  const call = async (prompt: string, style: string): Promise<string | null> => {
    const cached = getCachedPanel(prompt, style);
    if (cached) return cached;
    if (!available()) return null;
    try {
      const res: any = await img({ data: { prompt, style } });
      const status: IllustrateResult["status"] = res?.status ?? (res?.dataUrl ? "ok" : "error");
      if (status === "ok" && res.dataUrl) {
        if (credit !== "ok") setCredit("ok", 0);
        setCachedPanel(prompt, style, res.dataUrl);
        return res.dataUrl as string;
      }
      if (status === "quota") setCredit("exhausted", res?.retryAfter ?? 900);
      else if (status === "rate") setCredit("cooldown", res?.retryAfter ?? 30);
      return null;
    } catch (e) {
      const raw = (e instanceof Error ? e.message : String(e)).toLowerCase();
      if (/402|payment|credit|quota|billing/.test(raw)) setCredit("exhausted", 900);
      else setCredit("cooldown", 30);
      return null;
    }
  };

  /** Encola una viñeta pendiente para reintentar cuando haya recursos. */
  const enqueue = (prompt: string, style: string, apply: (dataUrl: string) => void) => {
    if (queue.length > 200) queue.shift();
    queue.push({ prompt, style, apply });
    events.onQueue?.(queue.length);
  };

  /** Vacía la cola de pendientes si hay disponibilidad. Seguro de llamar siempre. */
  const drain = async () => {
    if (draining || queue.length === 0 || !available()) return;
    draining = true;
    try {
      while (queue.length > 0 && available()) {
        const job = queue[0]!;
        const dataUrl = await call(job.prompt, job.style);
        if (!dataUrl) break;
        queue.shift();
        events.onQueue?.(queue.length);
        job.apply(dataUrl);
      }
    } finally {
      draining = false;
    }
  };

  return {
    /** Ilustra bajo demanda; si no hay recursos deja la viñeta pendiente en cola. */
    illustrate: async (
      prompt: string,
      style: string,
      apply: (dataUrl: string) => void,
    ): Promise<boolean> => {
      const dataUrl = await call(prompt, style);
      if (dataUrl) {
        apply(dataUrl);
        return true;
      }
      enqueue(prompt, style, apply);
      return false;
    },
    drain,
    state: () => credit,
    secondsLeft: () => Math.max(0, Math.ceil((resumeAt - Date.now()) / 1000)),
    pending: () => queue.length,
    reset: () => setCredit("ok", 0),
  };
}

export type Illustrator = ReturnType<typeof createIllustrator>;

/* ------------------------------------------------------------------ */
/*  Reanudación de lectura                                             */
/* ------------------------------------------------------------------ */

const RESUME_KEY = "kotamed.comic.progress.v1";

export type ComicProgress = {
  current: string;
  path: string[];
  score: { ok: number; total: number };
  savedAt: number;
};

export function saveProgress(id: string, p: Omit<ComicProgress, "savedAt">) {
  if (typeof window === "undefined" || !id) return;
  try {
    const all = JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}");
    all[id] = { ...p, savedAt: Date.now() };
    localStorage.setItem(RESUME_KEY, JSON.stringify(all));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function loadProgress(id: string): ComicProgress | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const all = JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}");
    const p = all[id];
    return p && typeof p.current === "string" ? (p as ComicProgress) : null;
  } catch {
    return null;
  }
}

export function clearProgress(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const all = JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}");
    delete all[id];
    localStorage.setItem(RESUME_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

/** Ventana deslizante: mantiene como máximo `max` nodos vivos en memoria. */
export function pruneNodes<T extends { id: string }>(
  nodes: T[],
  keepIds: string[],
  max = 20,
): T[] {
  if (nodes.length <= max) return nodes;
  const keep = new Set(keepIds);
  const tail = nodes.slice(-max).map((n) => n.id);
  tail.forEach((id) => keep.add(id));
  return nodes.filter((n) => keep.has(n.id));
}
