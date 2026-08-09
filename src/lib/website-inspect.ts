/**
 * Inspección SOLO LECTURA del sitio público KOTAMED.
 *
 * No modifica nada: únicamente deriva la estructura real del proyecto
 * (rutas, componentes, assets, fuentes de contenido) a partir del grafo de
 * módulos de Vite. Nunca se ejecutan los módulos detectados: solo se leen
 * sus rutas de archivo, por lo que la inspección es inocua.
 */

/* Solo claves: los loaders NUNCA se invocan. */
const routeModules = import.meta.glob("/src/routes/**/*.{tsx,ts}");
const componentModules = import.meta.glob("/src/components/**/*.tsx");
const libModules = import.meta.glob("/src/lib/**/*.{ts,tsx}");
const assetModules = import.meta.glob("/src/assets/**/*", { query: "?url", eager: true });

export type DetectedPage = {
  file: string;
  routePath: string;
  title: string;
  visibility: "public" | "authenticated" | "api";
  source: "Código (TanStack Start)" | "CMS (base de datos)";
  editable: false;
};

export type DetectedComponent = {
  name: string;
  file: string;
  group: string;
  kind: string;
};

export type DetectedAsset = {
  name: string;
  file: string;
  type: string;
  url: string;
};

export type DetectedContentSource = {
  label: string;
  origin: "Estático (código)" | "Dinámico (CMS)" | "Base de datos" | "API / IA";
  detail: string;
};

export type EditableCandidate = {
  group: string;
  items: string[];
};

export type SiteInspection = {
  framework: string;
  pages: DetectedPage[];
  components: DetectedComponent[];
  assets: DetectedAsset[];
  contentSources: DetectedContentSource[];
  editableCandidates: EditableCandidate[];
  modulesScanned: number;
  scannedAt: string;
};

const PUBLIC_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/auth": "Acceso / Registro",
  "/programas": "Programas",
  "/programas/$slug": "Detalle de programa",
  "/programas/$slug/areas": "Áreas del programa",
  "/programas/$slug/areas/$area": "Módulo de área",
  "/p/$slug": "Landing CMS",
  "/dashboard": "Dashboard",
  "/admin": "Administración",
  "/admin/cms": "CMS Studio",
  "/admin/command": "Command Center",
  "/admin/contenido": "Editor de contenido",
  "/admision": "Centro de admisión",
  "/anatomy-lab": "Anatomy Lab",
};

function fileToRoutePath(file: string): string {
  let rel = file.replace("/src/routes/", "").replace(/\.(tsx|ts)$/, "");
  if (rel === "__root") return "/";
  rel = rel.replace(/\[\.([^\]]+)\]/g, ".$1");
  const segments = rel
    .split("/")
    .flatMap((part) => part.split("."))
    .filter((part) => part && part !== "_authenticated" && !part.startsWith("_") === false ? part !== "" : true);
  const clean = rel
    .split("/")
    .flatMap((part) => (part.includes(".") ? part.split(".") : [part]))
    .filter((part) => part.length > 0)
    .filter((part) => part !== "_authenticated")
    .map((part) => part.replace(/_$/, ""))
    .filter((part) => part !== "index" || segments.length === 0);
  const path = "/" + clean.filter((p) => p !== "index").join("/");
  return path === "/" ? "/" : path.replace(/\/+$/, "");
}

function humanize(value: string): string {
  const last = value.split("/").filter(Boolean).pop() ?? "Inicio";
  return last
    .replace(/\$/g, "")
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function componentGroup(file: string): string {
  const rel = file.replace("/src/components/", "");
  const dir = rel.includes("/") ? rel.split("/")[0]! : "raíz";
  const labels: Record<string, string> = {
    cms: "CMS Studio",
    academy: "Academia",
    admin: "Administración",
    hospital: "Hospitalización",
    admission: "Admisión",
    anatomy: "Anatomy Lab",
    access: "Control de acceso",
    profile: "Perfil de usuario",
    topic: "Temas / clases",
    pharma: "Farmacología",
    ui: "Sistema de diseño (shadcn)",
    "raíz": "Componentes raíz",
  };
  return labels[dir] ?? dir;
}

function componentKind(name: string): string {
  if (/Nav|Sidebar|Menu/.test(name)) return "Navegación";
  if (/Block|Hero|Card|Panel|Rail/.test(name)) return "Bloque / sección";
  if (/Dialog|Modal|Wizard|Sheet/.test(name)) return "Interacción";
  if (/Editor|Form|Table/.test(name)) return "Gestión";
  return "Componente";
}

function assetType(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "avif"].includes(ext)) return "Imagen";
  if (ext === "svg") return "Vector / icono";
  if (["woff", "woff2", "ttf", "otf"].includes(ext)) return "Fuente";
  if (["mp4", "webm"].includes(ext)) return "Video";
  return ext.toUpperCase() || "Archivo";
}

export function inspectSite(): SiteInspection {
  const started = Date.now();

  const pages: DetectedPage[] = Object.keys(routeModules)
    .filter((file) => !file.includes("/routes/api/"))
    .filter((file) => !file.includes("[.mcp]") && !file.includes("[.well-known]") && !file.endsWith("/mcp.ts"))
    .filter((file) => !file.endsWith("__root.tsx") && !file.endsWith("_authenticated/route.tsx"))
    .map((file) => {
      const routePath = fileToRoutePath(file);
      const authenticated = file.includes("_authenticated");
      return {
        file,
        routePath,
        title: PUBLIC_TITLES[routePath] ?? humanize(routePath),
        visibility: authenticated ? ("authenticated" as const) : ("public" as const),
        source:
          routePath === "/p/$slug"
            ? ("CMS (base de datos)" as const)
            : ("Código (TanStack Start)" as const),
        editable: false as const,
      };
    })
    .sort((a, b) => a.routePath.localeCompare(b.routePath));

  const apiRoutes = Object.keys(routeModules).filter((f) => f.includes("/routes/api/"));
  for (const file of apiRoutes) {
    pages.push({
      file,
      routePath: fileToRoutePath(file),
      title: "Endpoint HTTP",
      visibility: "api",
      source: "Código (TanStack Start)",
      editable: false,
    });
  }

  const components: DetectedComponent[] = Object.keys(componentModules)
    .map((file) => {
      const name = file.split("/").pop()!.replace(/\.tsx$/, "");
      return { name, file, group: componentGroup(file), kind: componentKind(name) };
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const assets: DetectedAsset[] = Object.entries(assetModules)
    .map(([file, mod]) => ({
      file,
      name: file.split("/").pop()!,
      type: assetType(file),
      url: typeof (mod as { default?: unknown })?.default === "string" ? (mod as { default: string }).default : "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const contentSources: DetectedContentSource[] = [
    {
      label: "Bloques y páginas del CMS",
      origin: "Dinámico (CMS)",
      detail: "cms_pages · cms_blocks · cms_page_versions · cms_nav_items · cms_collection_items",
    },
    {
      label: "Catálogo académico",
      origin: "Base de datos",
      detail: "content_nodes · content_resources · membership_plans · teachers",
    },
    {
      label: "Matrículas y accesos",
      origin: "Base de datos",
      detail: "enrollments · user_enrollments · user_content_access · plan_content_access",
    },
    {
      label: "Textos e imágenes del código",
      origin: "Estático (código)",
      detail: `${pages.length} rutas y ${assets.length} assets bajo src/routes y src/assets`,
    },
    {
      label: "Generación asistida por IA",
      origin: "API / IA",
      detail: "Funciones de servidor *.functions.ts sobre la pasarela de IA",
    },
  ];

  const editableCandidates: EditableCandidate[] = [
    { group: "Textos", items: ["Títulos", "Subtítulos", "Párrafos", "Etiquetas de botones"] },
    { group: "Imágenes", items: ["Logo (isotipo KotaMed)", "Imágenes de audiencia", "Banners", "Iconos"] },
    { group: "Navegación", items: ["Menú principal", "Submenús", "Enlaces del footer", "CTA de cabecera"] },
    { group: "Secciones", items: ["Hero", "Beneficios", "Cards", "Testimonios", "FAQ", "Footer"] },
    { group: "Contenido", items: ["Programas", "Recursos", "Noticias", "Documentación"] },
    { group: "Configuración", items: ["SEO por página", "Metadata", "Open Graph", "Favicon"] },
  ];

  return {
    framework: "TanStack Start v1 · React 19 · Vite 7 · Tailwind v4 · Lovable Cloud",
    pages,
    components,
    assets,
    contentSources,
    editableCandidates,
    modulesScanned:
      Object.keys(routeModules).length + Object.keys(componentModules).length + Object.keys(libModules).length,
    scannedAt: new Date(started).toISOString(),
  };
}

export type SiteTreeNode = { label: string; path?: string; children?: SiteTreeNode[] };

export function buildSiteTree(pages: DetectedPage[]): SiteTreeNode[] {
  const publicPages = pages.filter((p) => p.visibility === "public");
  const authPages = pages.filter((p) => p.visibility === "authenticated");
  const apiPages = pages.filter((p) => p.visibility === "api");

  const nodes: SiteTreeNode[] = publicPages.map((p) => ({ label: p.title, path: p.routePath }));
  if (authPages.length) {
    nodes.push({
      label: "Aplicación (requiere sesión)",
      children: authPages.map((p) => ({ label: p.title, path: p.routePath })),
    });
  }
  if (apiPages.length) {
    nodes.push({
      label: "Endpoints HTTP",
      children: apiPages.map((p) => ({ label: p.routePath, path: p.routePath })),
    });
  }
  return nodes;
}
