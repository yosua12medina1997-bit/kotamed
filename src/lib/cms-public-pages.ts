/**
 * CMS KotaMed — páginas públicas oficiales del sitio.
 *
 * Define el contenido base (bloques modulares reutilizables) de las páginas
 * públicas que faltaban en KOTAMED.APP y permite sembrarlas + publicarlas en un
 * solo paso desde CMS Studio. Después de sembrarlas, todo se edita con el
 * constructor visual (bloques, imágenes, textos, SEO) como cualquier otra
 * página: esto es solo el punto de partida, no un contenido bloqueado.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublishPage } from "@/lib/cms-publish";
import type { CmsBlockProps, CmsBlockStyle, CmsBlockType, CmsItem, CmsPageKind } from "@/lib/cms";

type SeedBlock = { type: CmsBlockType; props: CmsBlockProps; style: CmsBlockStyle };

export type PublicSeedPage = {
  kind: CmsPageKind;
  slug: string;
  title: string;
  subtitle: string;
  blocks: SeedBlock[];
};

const st = (o: Partial<CmsBlockStyle> = {}): CmsBlockStyle => ({
  align: "center",
  paddingY: "lg",
  tone: "plain",
  columns: 3,
  animate: true,
  ...o,
});

const it = (title: string, text?: string, icon?: string): CmsItem => ({ title, text, icon });

const hero = (props: CmsBlockProps): SeedBlock => ({
  type: "hero",
  props: {
    primaryLabel: "Ver planes e inscribirme",
    primaryHref: "/p/planes",
    secondaryLabel: "Explorar programas",
    secondaryHref: "/programas",
    ...props,
  },
  style: st({ align: "left", paddingY: "xl", tone: "gradient" }),
});

const counters = (items: CmsItem[]): SeedBlock => ({
  type: "counters",
  props: { title: "KotaMed en números", items },
  style: st({ columns: 4 }),
});

const benefits = (title: string, subtitle: string, items: CmsItem[]): SeedBlock => ({
  type: "benefits",
  props: { title, subtitle, items },
  style: st({ columns: 3 }),
});

const courses = (title: string, subtitle: string, items: CmsItem[], columns = 3): SeedBlock => ({
  type: "courses",
  props: { title, subtitle, items },
  style: st({ columns }),
});

const features = (title: string, subtitle: string, items: CmsItem[], columns = 4): SeedBlock => ({
  type: "features",
  props: { title, subtitle, items },
  style: st({ columns, tone: "muted" }),
});

const faq = (items: CmsItem[]): SeedBlock => ({
  type: "faq",
  props: { title: "Preguntas frecuentes", items },
  style: st({ align: "left", columns: 2 }),
});

const plans = (): SeedBlock => ({
  type: "plans",
  props: {
    title: "Planes de membresía",
    subtitle: "Elige el nivel de acompañamiento que necesitas.",
  },
  style: st({ columns: 3 }),
});

const teachers = (): SeedBlock => ({
  type: "teachers",
  props: {
    title: "Docentes especialistas",
    subtitle: "Formadores activos en hospitales de nivel III.",
  },
  style: st({ columns: 4 }),
});

const cta = (title: string, subtitle: string, primaryHref = "/auth"): SeedBlock => ({
  type: "cta",
  props: {
    title,
    subtitle,
    primaryLabel: "Comenzar ahora",
    primaryHref,
    secondaryLabel: "Hablar con admisión",
    secondaryHref: "/p/contacto",
  },
  style: st({ tone: "gradient" }),
});

export const PUBLIC_SEED_PAGES: PublicSeedPage[] = [
  {
    kind: "program",
    slug: "ciencias-clinicas",
    title: "Ciencias Clínicas",
    subtitle: "Razonamiento clínico integrado, de la fisiopatología a la decisión terapéutica",
    blocks: [
      hero({
        eyebrow: "Etapa 2 · Práctica",
        title: "Ciencias Clínicas KotaMed",
        subtitle:
          "Domina el razonamiento clínico con casos reales, imágenes, laboratorio y decisiones terapéuticas guiadas por IA.",
        image: "/pg/clinicas.jpg",
        items: [
          it("Casos clínicos reales", undefined, "Stethoscope"),
          it("Semiología guiada", undefined, "Activity"),
          it("Banco por especialidad", undefined, "Target"),
          it("KotaMed AI 24/7", undefined, "Sparkles"),
        ],
      }),
      counters([
        { value: "12", label: "Especialidades clínicas" },
        { value: "+4 800", label: "Preguntas comentadas" },
        { value: "+300", label: "Casos clínicos" },
        { value: "24/7", label: "Tutor IA" },
      ]),
      benefits("¿Cómo se estudia clínica en KotaMed?", "Metodología por síndromes, no por listas de memoria.", [
        it("Del síntoma al diagnóstico", "Cada tema arranca con un caso y termina en una decisión terapéutica."),
        it("Integración por sistemas", "Cardio, respiratorio, digestivo, neuro y endocrino conectados entre sí."),
        it("Evaluación continua", "Flashcards, bancos y simulacros que ajustan tu ruta automáticamente."),
      ]),
      courses("Áreas clínicas incluidas", "Contenido completo con enfoque de examen y práctica hospitalaria.", [
        it("Medicina Interna", "Síndromes, guías y manejo escalonado."),
        it("Cirugía General", "Abdomen agudo, trauma y post operatorio."),
        it("Pediatría", "Crecimiento, desarrollo y patología prevalente."),
        it("Ginecología y Obstetricia", "Control prenatal, urgencias y puerperio."),
        it("Cardiología y ECG", "Interpretación paso a paso."),
        it("Infectología", "Antibioticoterapia razonada."),
      ]),
      features("Herramientas incluidas", "Todo integrado en tu campus.", [
        it("Interpretación de imágenes", "Radiografía, TAC y ecografía.", "Image"),
        it("Laboratorio y gasometría", "Lectura sistemática.", "FlaskConical"),
        it("Calculadoras clínicas", "Dosis, scores y riesgo.", "Calculator"),
        it("Simuladores", "Escenarios con toma de decisiones.", "MonitorPlay"),
      ]),
      teachers(),
      faq([
        it("¿Necesito haber terminado ciencias básicas?", "No es obligatorio, pero conviene tener los fundamentos activos."),
        it("¿Incluye simulacros tipo ENAM?", "Sí, con retroalimentación y bibliografía en cada pregunta."),
      ]),
      cta("Convierte la teoría en criterio clínico", "Estudia como se trabaja en el hospital, desde el primer día."),
    ],
  },
  {
    kind: "program",
    slug: "internado-medico",
    title: "Internado Médico",
    subtitle: "Rotaciones, guardias y práctica hospitalaria simulada de nivel III",
    blocks: [
      hero({
        eyebrow: "Etapa 3 · Hospital",
        title: "Internado Médico KotaMed",
        subtitle:
          "Vive el flujo real de un hospital: historias clínicas, evoluciones, indicaciones, cálculos y decisiones bajo presión.",
        image: "/pg/internado.jpg",
        items: [
          it("Hospitalización simulada", undefined, "Building2"),
          it("Guardias y urgencias", undefined, "Siren"),
          it("Historia clínica digital", undefined, "ClipboardList"),
          it("Copiloto clínico IA", undefined, "Sparkles"),
        ],
      }),
      counters([
        { value: "8", label: "Rotaciones" },
        { value: "+25", label: "Calculadoras clínicas" },
        { value: "+150", label: "Protocolos" },
        { value: "100%", label: "Práctica guiada" },
      ]),
      benefits("Un internado que se entrena antes de vivirlo", "Reduce la curva de aprendizaje de tu primera guardia.", [
        it("Flujo hospitalario real", "Ingreso, evolución, indicaciones, transferencias y alta."),
        it("Neonatología nivel III", "Módulo insignia con censo, laboratorio y procedimientos."),
        it("Decisiones cronometradas", "Escenarios que te obligan a priorizar."),
      ]),
      courses("Rotaciones disponibles", "Cada rotación con contenido, casos y evaluación.", [
        it("Medicina Interna", "Manejo integral del paciente hospitalizado."),
        it("Cirugía", "Sala de operaciones y post operatorio."),
        it("Pediatría y Neonatología", "Hospitalización neonatal completa."),
        it("Gineco-Obstetricia", "Sala de partos y emergencias."),
        it("Emergencia", "Triaje, reanimación y estabilización."),
        it("Salud Pública", "Atención primaria y comunidad."),
      ]),
      features("Tu estación de trabajo clínica", "Herramientas KotaMed listas para la guardia.", [
        it("Registro inteligente IA", "Lee documentos y arma la historia.", "ScanLine"),
        it("Censo de pacientes", "Panorama completo del servicio.", "Users"),
        it("Calculadoras neonatales", "Dosis y fluidos exactos.", "Calculator"),
        it("Copiloto por paciente", "Sugerencias con evidencia.", "Sparkles"),
      ]),
      faq([
        it("¿Sirve si ya estoy internando?", "Sí: es soporte diario para tus guardias y rotaciones."),
        it("¿Incluye preparación ENAM?", "El plan integral suma preparación ENAM al internado."),
      ]),
      cta("Llega a tu guardia con criterio y seguridad", "Activa el módulo de Internado Médico KotaMed."),
    ],
  },
  {
    kind: "program",
    slug: "enam",
    title: "ENAM",
    subtitle: "Alto rendimiento con simulacros, métricas y retroalimentación inteligente",
    blocks: [
      hero({
        eyebrow: "Etapa 4 · Evaluación",
        title: "Preparación ENAM KotaMed",
        subtitle:
          "Simulacros cronometrados, análisis de errores y una ruta adaptativa que se ajusta a tu rendimiento real.",
        image: "/pg/enam.jpg",
        items: [
          it("Simulacros cronometrados", undefined, "Timer"),
          it("Analítica de errores", undefined, "ChartBar"),
          it("Ruta adaptativa", undefined, "Route"),
          it("Repaso con flashcards", undefined, "Layers"),
        ],
      }),
      counters([
        { value: "+8 000", label: "Preguntas" },
        { value: "+40", label: "Simulacros" },
        { value: "90%", label: "Aprobación reportada" },
        { value: "IA", label: "Corrección explicada" },
      ]),
      benefits("Por qué funciona", "Estudias exactamente lo que te falta.", [
        it("Diagnóstico inicial", "Detectamos tus brechas en la primera semana."),
        it("Repetición espaciada", "Flashcards que vuelven justo antes de olvidar."),
        it("Explicación con bibliografía", "Cada respuesta con fundamento citado."),
      ]),
      courses("Bloques del temario", "Cobertura total del examen nacional.", [
        it("Medicina Interna", "Peso alto en el examen."),
        it("Pediatría", "Patología prevalente nacional."),
        it("Gineco-Obstetricia", "Guías MINSA vigentes."),
        it("Cirugía", "Emergencias quirúrgicas."),
        it("Salud Pública", "Normativa y epidemiología."),
        it("Ciencias Básicas aplicadas", "Fundamento del razonamiento."),
      ]),
      plans(),
      faq([
        it("¿Cuánto tiempo necesito?", "Con 3 meses de plan intensivo logras cobertura completa."),
        it("¿Los simulacros son cronometrados?", "Sí, replican tiempo y estructura real del examen."),
      ]),
      cta("Prepárate para el ENAM sin dejar nada al azar", "Comienza hoy con tu diagnóstico inicial."),
    ],
  },
  {
    kind: "program",
    slug: "residentado-medico",
    title: "Residentado Médico",
    subtitle: "Especialización con banco intensivo, casos complejos y mentoría",
    blocks: [
      hero({
        eyebrow: "Etapa 5 · Especialización",
        title: "Residentado Médico KotaMed",
        subtitle:
          "Prepara tu examen de residentado y avanza en tu especialidad con bancos intensivos, casos complejos y mentoría de especialistas.",
        image: "/pg/residentado.jpg",
        items: [
          it("Banco intensivo", undefined, "Target"),
          it("Casos complejos", undefined, "Stethoscope"),
          it("Mentoría 1 a 1", undefined, "Users"),
          it("Simulacros nacionales", undefined, "Timer"),
        ],
      }),
      counters([
        { value: "40/46", label: "Especialidades" },
        { value: "+26 000", label: "Médicos formados" },
        { value: "+20", label: "Docentes expertos" },
        { value: "90%", label: "Logró su especialidad" },
      ]),
      benefits("Formación de especialistas", "Alto rendimiento y criterio de decisión avanzado.", [
        it("Ruta por especialidad", "Contenido específico según la plaza que buscas."),
        it("Casos de alta complejidad", "Discusión guiada por especialistas activos."),
        it("Seguimiento de métricas", "Percentil, velocidad y precisión por tema."),
      ]),
      courses(
        "Ejes de preparación",
        "Todo lo que evalúa el examen y la residencia.",
        [
          it("Ciencias Básicas aplicadas", "Fundamento clínico avanzado."),
          it("Clínica integrada", "Manejo escalonado con evidencia."),
          it("Especialidad elegida", "Profundización dirigida."),
          it("Investigación y estadística", "Lectura crítica de artículos."),
        ],
        2,
      ),
      teachers(),
      faq([
        it("¿Cubre todas las especialidades?", "Cubrimos 40 de 46 especialidades reconocidas."),
        it("¿Incluye mentoría?", "Los planes superiores incluyen mentoría personalizada."),
      ]),
      cta("Tu especialidad empieza con una decisión", "Únete al programa de Residentado Médico KotaMed.", "/p/planes"),
    ],
  },
  {
    kind: "library",
    slug: "biblioteca",
    title: "Biblioteca KotaMed",
    subtitle: "Guías, libros, artículos y resúmenes clínicos organizados por especialidad",
    blocks: [
      hero({
        eyebrow: "Recursos",
        title: "Biblioteca médica inteligente",
        subtitle:
          "Miles de recursos clasificados por nivel, especialidad y tema, con resúmenes generados por IA y búsqueda semántica.",
        image: "/pg/biblioteca.jpg",
        primaryLabel: "Entrar a la biblioteca",
        primaryHref: "/auth",
        items: [
          it("Guías clínicas", undefined, "BookOpen"),
          it("Artículos y papers", undefined, "FileText"),
          it("Resúmenes con IA", undefined, "Sparkles"),
          it("Descarga offline", undefined, "Download"),
        ],
      }),
      benefits("Todo lo que necesitas leer, ordenado", "Sin perder horas buscando PDFs sueltos.", [
        it("Clasificación real", "Por nivel académico, especialidad, tema y subtema."),
        it("Resumen en segundos", "La IA extrae puntos clave y conducta terapéutica."),
        it("Bibliografía citada", "Cada recurso con autor, año y fuente."),
      ]),
      courses(
        "Colecciones destacadas",
        "Curadas por nuestros docentes.",
        [
          it("Guías MINSA y EsSalud", "Normativa nacional vigente."),
          it("Referencias clásicas", "Nelson, Harrison y Schwartz comentados."),
          it("Neonatología nivel III", "Protocolos y manejo práctico."),
          it("Farmacología aplicada", "Dosis y seguridad del paciente."),
        ],
        2,
      ),
      cta("Accede a la biblioteca completa", "Incluida en todos los planes de membresía KotaMed.", "/p/planes"),
    ],
  },
  {
    kind: "simulator",
    slug: "simuladores",
    title: "Simuladores Clínicos",
    subtitle: "Escenarios interactivos con decisiones, tiempo real y retroalimentación",
    blocks: [
      hero({
        eyebrow: "Recursos",
        title: "Simuladores clínicos KotaMed",
        subtitle:
          "Entrena reanimación, urgencias y manejo hospitalario en escenarios que reaccionan a cada decisión que tomas.",
        image: "/pg/simuladores.jpg",
        primaryLabel: "Probar un simulador",
        primaryHref: "/auth",
        items: [
          it("Casos ramificados", undefined, "GitBranch"),
          it("Tiempo real", undefined, "Timer"),
          it("Puntaje y feedback", undefined, "Trophy"),
          it("Modo examen", undefined, "Target"),
        ],
      }),
      features("Escenarios disponibles", "Cada uno con métricas de desempeño.", [
        it("Reanimación neonatal", "Algoritmo paso a paso.", "Baby"),
        it("PALS / ACLS", "Ritmos y fármacos.", "HeartPulse"),
        it("Abdomen agudo", "Diagnóstico diferencial.", "Stethoscope"),
        it("Sepsis y shock", "Metas de reanimación.", "Activity"),
      ]),
      benefits("Aprender haciendo", "El error en simulación enseña más que la lectura pasiva.", [
        it("Decisiones con consecuencia", "El paciente evoluciona según tu conducta."),
        it("Debriefing automático", "La IA explica qué salió bien y qué no."),
        it("Progreso medible", "Historial de intentos y mejora."),
      ]),
      cta("Entrena hoy el caso que verás mañana", "Los simuladores están incluidos desde el plan Pro.", "/p/planes"),
    ],
  },
  {
    kind: "page",
    slug: "calculadoras",
    title: "Calculadoras Clínicas",
    subtitle: "Más de 25 herramientas de cálculo y scores validados",
    blocks: [
      hero({
        eyebrow: "Recursos",
        title: "Centro de calculadoras clínicas",
        subtitle:
          "Dosis, fluidos, scores y conversiones con resultados interpretados y advertencias de seguridad.",
        image: "/pg/calculadoras.jpg",
        primaryLabel: "Abrir calculadoras",
        primaryHref: "/auth",
        items: [
          it("Dosis pediátricas", undefined, "Calculator"),
          it("Fluidos y nutrición", undefined, "Droplets"),
          it("Scores de riesgo", undefined, "Gauge"),
          it("Interpretación con IA", undefined, "Sparkles"),
        ],
      }),
      features("Categorías incluidas", "Cobertura clínica y neonatal completa.", [
        it("Neonatología", "Fluidos, calorías y bilirrubina.", "Baby"),
        it("Farmacología", "Dosis por peso y superficie.", "Pill"),
        it("Cardiología", "Riesgo y hemodinamia.", "HeartPulse"),
        it("Nefrología", "Depuración y electrolitos.", "Droplets"),
        it("Emergencias", "Scores de gravedad.", "Siren"),
        it("Nutrición", "Requerimientos y aportes.", "Apple"),
        it("Antropometría", "Percentiles y Z-score.", "Ruler"),
        it("Gasometría", "Lectura ácido-base.", "FlaskConical"),
      ]),
      benefits("Seguridad primero", "Cálculo correcto, decisión segura.", [
        it("Fórmulas validadas", "Referencia declarada en cada herramienta."),
        it("Alertas de rango", "Aviso cuando el resultado sale de lo esperado."),
        it("Uso en guardia", "Optimizadas para móvil."),
      ]),
      cta("Calcula sin dudar", "Disponibles en todos los planes de membresía.", "/p/planes"),
    ],
  },
  {
    kind: "page",
    slug: "docentes",
    title: "Docentes KotaMed",
    subtitle: "Especialistas activos en hospitales de nivel III",
    blocks: [
      hero({
        eyebrow: "Equipo académico",
        title: "Aprende de quienes ejercen todos los días",
        subtitle:
          "Nuestro equipo combina docencia universitaria, práctica hospitalaria y experiencia en exámenes nacionales.",
        image: "/pg/docentes.jpg",
        primaryLabel: "Ver programas",
        primaryHref: "/programas",
        secondaryLabel: "Postular como docente",
        secondaryHref: "/p/contacto",
        items: [
          it("Especialistas certificados", undefined, "ShieldCheck"),
          it("Docencia universitaria", undefined, "GraduationCap"),
          it("Casos reales", undefined, "Stethoscope"),
          it("Mentoría cercana", undefined, "Users"),
        ],
      }),
      teachers(),
      counters([
        { value: "+20", label: "Docentes expertos" },
        { value: "40/46", label: "Especialidades" },
        { value: "+15", label: "Años de experiencia" },
        { value: "4.9/5", label: "Valoración" },
      ]),
      benefits("Nuestro estándar docente", "Rigor académico con cercanía humana.", [
        it("Evidencia actualizada", "Guías vigentes y literatura reciente."),
        it("Enfoque práctico", "Todo se explica desde el paciente."),
        it("Acompañamiento", "Resolución de dudas y tutoría."),
      ]),
      cta("¿Quieres enseñar en KotaMed?", "Buscamos especialistas con vocación docente.", "/p/contacto"),
    ],
  },
  {
    kind: "page",
    slug: "planes",
    title: "Planes y Membresías",
    subtitle: "Elige el nivel de acompañamiento académico que necesitas",
    blocks: [
      hero({
        eyebrow: "Membresías",
        title: "Planes KotaMed",
        subtitle:
          "Acceso a campus, biblioteca, simuladores, calculadoras y KotaMed AI según el plan que elijas.",
        image: "/pg/planes.jpg",
        primaryLabel: "Iniciar inscripción",
        primaryHref: "/auth",
        secondaryLabel: "Comparar programas",
        secondaryHref: "/programas",
        items: [
          it("Pago con Yape o QR", undefined, "QrCode"),
          it("Validación en 24 h", undefined, "ShieldCheck"),
          it("Acceso inmediato gratuito", undefined, "Zap"),
          it("Sin permanencia", undefined, "Check"),
        ],
      }),
      plans(),
      features("Incluido en tu membresía", "Todo el ecosistema KotaMed.", [
        it("Campus académico", "Rutas y módulos por etapa.", "GraduationCap"),
        it("Biblioteca", "Guías, libros y artículos.", "BookOpen"),
        it("Simuladores", "Escenarios interactivos.", "MonitorPlay"),
        it("KotaMed AI", "Tutor y copiloto clínico.", "Sparkles"),
      ]),
      faq([
        it("¿Cómo pago?", "Con Yape o transferencia mediante el QR del centro de admisión, subiendo tu comprobante."),
        it("¿Cuándo se activa mi acceso?", "Tienes acceso gratuito inmediato y acceso completo al validar tu pago."),
        it("¿Puedo cambiar de plan?", "Sí, puedes escalar tu plan en cualquier momento."),
      ]),
      cta("Empieza hoy tu membresía KotaMed", "Crea tu cuenta y completa tu inscripción en minutos."),
    ],
  },
  {
    kind: "page",
    slug: "contacto",
    title: "Contacto",
    subtitle: "Habla con el equipo académico y de admisión",
    blocks: [
      hero({
        eyebrow: "Contacto",
        title: "Estamos para acompañarte",
        subtitle:
          "Orientación académica, dudas sobre planes y soporte de matrícula. Respondemos en menos de 24 horas.",
        image: "/pg/contacto.jpg",
        primaryLabel: "Escribir al equipo",
        primaryHref: "/auth",
        secondaryLabel: "Ver planes",
        secondaryHref: "/p/planes",
        items: [
          it("Soporte 24/7", undefined, "Headset"),
          it("Asesoría académica", undefined, "GraduationCap"),
          it("Admisión y pagos", undefined, "CreditCard"),
          it("Alianzas", undefined, "Handshake"),
        ],
      }),
      features("Canales de atención", "Elige el que prefieras.", [
        it("WhatsApp", "Atención rápida de lunes a domingo.", "MessageCircle"),
        it("Correo", "Escríbenos y te respondemos el mismo día.", "Mail"),
        it("Admisión", "Validación de comprobantes y matrícula.", "ClipboardCheck"),
        it("Institucional", "Convenios con universidades y hospitales.", "Building2"),
      ]),
      faq([
        it("¿Atienden fuera de Perú?", "Sí, atendemos a médicos y estudiantes de toda Latinoamérica."),
        it("¿Emiten comprobante?", "Sí, solicítalo al equipo de admisión."),
      ]),
      cta("¿Listo para empezar?", "Crea tu cuenta gratuita y explora el campus."),
    ],
  },
];

/**
 * Siembra (o actualiza) las páginas públicas oficiales y las publica en
 * producción. Es idempotente: reutiliza la página existente por slug y
 * reemplaza sus bloques por el contenido base.
 */
export function useSeedPublicPages() {
  const qc = useQueryClient();
  const publish = usePublishPage();

  return useMutation({
    mutationFn: async (opts?: { onlyMissing?: boolean }) => {
      const { data: existing, error } = await supabase.from("cms_pages").select("id, slug");
      if (error) throw error;
      const bySlug = new Map(
        ((existing ?? []) as { id: string; slug: string }[]).map((p) => [p.slug, p.id]),
      );

      let done = 0;
      for (let i = 0; i < PUBLIC_SEED_PAGES.length; i++) {
        const seed = PUBLIC_SEED_PAGES[i]!;
        const current = bySlug.get(seed.slug);
        if (current && opts?.onlyMissing) continue;

        const seo = {
          title: `${seed.title} · KotaMed`,
          description: seed.subtitle,
          index: true,
        };
        const payload = {
          kind: seed.kind,
          slug: seed.slug,
          title: seed.title,
          subtitle: seed.subtitle,
          status: "draft",
          seo,
          sort_order: 100 + i,
        };

        let pageId = current;
        if (pageId) {
          const { error: e1 } = await supabase
            .from("cms_pages")
            .update(payload as never)
            .eq("id", pageId);
          if (e1) throw e1;
          const { error: e2 } = await supabase.from("cms_blocks").delete().eq("page_id", pageId);
          if (e2) throw e2;
        } else {
          const { data: inserted, error: e1 } = await supabase
            .from("cms_pages")
            .insert(payload as never)
            .select("id")
            .single();
          if (e1) throw e1;
          pageId = (inserted as { id: string }).id;
        }

        const rows = seed.blocks.map((b, idx) => ({
          page_id: pageId,
          type: b.type,
          name: null,
          sort_order: idx,
          visible: true,
          props: b.props,
          style: b.style,
        }));
        const { error: e3 } = await supabase.from("cms_blocks").insert(rows as never);
        if (e3) throw e3;

        await publish.mutateAsync({ pageId, note: "Publicación inicial del sitio público" });
        done++;
      }
      return done;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      qc.invalidateQueries({ queryKey: ["cms-publish-status"] });
      qc.invalidateQueries({ queryKey: ["cms-public-list"] });
    },
  });
}
