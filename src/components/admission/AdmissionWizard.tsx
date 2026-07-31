/**
 * Centro de Admisión — asistente por pasos (Wizard).
 * Extensión del flujo de AUTH: no modifica matrículas ni permisos existentes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  FileImage,
  GraduationCap,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProgramCatalog } from "@/lib/content-catalog";
import {
  STATUS_LABELS,
  useAdmissionPlans,
  useMyAdmission,
  usePaymentSettings,
  useSaveAdmission,
  type AdmissionApplication,
  type WizardPlan,
} from "@/lib/admission";
import { useMyProfile } from "@/lib/session";

const STEPS = [
  { n: 1, label: "Información personal", icon: UserRound },
  { n: 2, label: "Programa", icon: GraduationCap },
  { n: 3, label: "Plan", icon: Sparkles },
  { n: 4, label: "Resumen", icon: ClipboardList },
  { n: 5, label: "Pago", icon: CreditCard },
] as const;

const inputCls =
  "w-full bg-background/60 border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow";

type Personal = {
  full_name: string;
  document_id: string;
  email: string;
  phone: string;
  university: string;
  study_year: string;
  hospital: string;
  specialty: string;
};

export default function AdmissionWizard({ userId }: { userId: string }) {
  const admissionQ = useMyAdmission(userId);
  const { data: profile } = useMyProfile(userId);
  const save = useSaveAdmission(userId);
  const app = admissionQ.data ?? null;

  const [step, setStep] = useState(1);
  const [personal, setPersonal] = useState<Personal>({
    full_name: "",
    document_id: "",
    email: "",
    phone: "",
    university: "",
    study_year: "",
    hospital: "",
    specialty: "",
  });
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || admissionQ.isLoading) return;
    hydrated.current = true;
    setPersonal({
      full_name: app?.full_name ?? profile?.full_name ?? "",
      document_id: app?.document_id ?? "",
      email: app?.email ?? profile?.email ?? "",
      phone: app?.phone ?? "",
      university: app?.university ?? "",
      study_year: app?.study_year ?? "",
      hospital: app?.hospital ?? "",
      specialty: app?.specialty ?? "",
    });
    if (app && (app.status === "draft" || app.status === "pending")) {
      setStep(Math.min(Math.max(app.step ?? 1, 1), 5));
    }
  }, [admissionQ.isLoading, app, profile]);

  if (admissionQ.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Estados finales / de espera: pantalla de estado elegante.
  if (app && ["pending", "reviewing", "approved", "rejected", "refunded"].includes(app.status)) {
    return <AdmissionStatusScreen app={app} onRestart={() => admissionQ.refetch()} />;
  }

  return (
    <WizardBody
      app={app}
      step={step}
      setStep={setStep}
      personal={personal}
      setPersonal={setPersonal}
      save={save}
      userId={userId}
    />
  );
}

function WizardBody({
  app,
  step,
  setStep,
  personal,
  setPersonal,
  save,
  userId,
}: {
  app: AdmissionApplication | null;
  step: number;
  setStep: (n: number) => void;
  personal: Personal;
  setPersonal: (p: Personal) => void;
  save: ReturnType<typeof useSaveAdmission>;
  userId: string;
}) {
  const { programs } = useProgramCatalog();
  const plansQ = useAdmissionPlans();
  const plans = plansQ.data ?? [];

  const [programSlug, setProgramSlug] = useState<string | null>(app?.program_slug ?? null);
  const [planSlug, setPlanSlug] = useState<string | null>(app?.plan_slug ?? null);

  const program = programs.find((p) => p.slug === programSlug) ?? null;
  const plan = plans.find((p) => p.slug === planSlug) ?? null;

  const personalValid =
    personal.full_name.trim().length >= 3 &&
    personal.document_id.trim().length >= 6 &&
    /^\S+@\S+\.\S+$/.test(personal.email.trim()) &&
    personal.phone.trim().length >= 6;

  const persist = async (extra: Record<string, unknown>, nextStep: number) => {
    try {
      await save.mutateAsync({
        id: app?.id,
        status: "draft",
        step: nextStep,
        full_name: personal.full_name.trim(),
        document_id: personal.document_id.trim(),
        email: personal.email.trim(),
        phone: personal.phone.trim(),
        university: personal.university.trim(),
        study_year: personal.study_year.trim(),
        hospital: personal.hospital.trim(),
        specialty: personal.specialty.trim(),
        ...extra,
      } as any);
      setStep(nextStep);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el avance");
    }
  };

  return (
    <div className="space-y-8">
      <StepIndicator step={step} />

      {step === 1 && (
        <StepCard
          title="Información personal"
          hint="Estos datos aparecerán en tu matrícula y certificados."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label="Nombre completo *"
              value={personal.full_name}
              onChange={(v) => setPersonal({ ...personal, full_name: v })}
              error={personal.full_name.length > 0 && personal.full_name.trim().length < 3}
            />
            <TextField
              label="Documento (DNI / CE) *"
              value={personal.document_id}
              onChange={(v) => setPersonal({ ...personal, document_id: v })}
              error={personal.document_id.length > 0 && personal.document_id.trim().length < 6}
            />
            <TextField
              label="Correo *"
              type="email"
              value={personal.email}
              onChange={(v) => setPersonal({ ...personal, email: v })}
              error={personal.email.length > 0 && !/^\S+@\S+\.\S+$/.test(personal.email)}
            />
            <TextField
              label="Celular *"
              value={personal.phone}
              onChange={(v) => setPersonal({ ...personal, phone: v })}
              error={personal.phone.length > 0 && personal.phone.trim().length < 6}
            />
            <TextField
              label="Universidad"
              value={personal.university}
              onChange={(v) => setPersonal({ ...personal, university: v })}
            />
            <TextField
              label="Año de estudios"
              value={personal.study_year}
              onChange={(v) => setPersonal({ ...personal, study_year: v })}
            />
            <TextField
              label="Hospital / Sede"
              value={personal.hospital}
              onChange={(v) => setPersonal({ ...personal, hospital: v })}
            />
            <TextField
              label="Especialidad de interés"
              value={personal.specialty}
              onChange={(v) => setPersonal({ ...personal, specialty: v })}
            />
          </div>
          <WizardNav
            onNext={() => persist({}, 2)}
            nextDisabled={!personalValid || save.isPending}
            loading={save.isPending}
          />
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Selecciona tu programa" hint="Podrás ampliar tu acceso más adelante.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((p) => {
              const active = programSlug === p.slug;
              return (
                <button
                  key={p.slug}
                  onClick={() => setProgramSlug(p.slug)}
                  className={`text-left rounded-2xl p-5 border transition-all ${
                    active
                      ? "border-primary bg-primary/[0.06] shadow-lg shadow-primary/10"
                      : "border-border bg-background/40 hover:-translate-y-0.5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <GraduationCap className="size-5" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm tracking-tight">{p.title}</div>
                      {p.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </div>
                    {active && (
                      <CheckCircle2 className="size-5 text-primary ml-auto shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <WizardNav
            onBack={() => setStep(1)}
            onNext={() =>
              persist(
                { program_slug: programSlug, program_title: program?.title ?? programSlug },
                3,
              )
            }
            nextDisabled={!programSlug || save.isPending}
            loading={save.isPending}
          />
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Selecciona tu plan" hint="Compara beneficios, precio y duración.">
          {plansQ.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {plans.map((p) => (
                <PlanCard
                  key={p.slug}
                  plan={p}
                  active={planSlug === p.slug}
                  onSelect={() => setPlanSlug(p.slug)}
                />
              ))}
            </div>
          )}
          <WizardNav
            onBack={() => setStep(2)}
            onNext={() =>
              persist(
                {
                  plan_id: plan?.id ?? null,
                  plan_slug: plan?.slug ?? null,
                  plan_name: plan?.name ?? null,
                  amount: plan?.price_amount ?? 0,
                  currency: plan?.currency ?? "PEN",
                  duration_months: plan?.months ?? 12,
                },
                4,
              )
            }
            nextDisabled={!planSlug || save.isPending}
            loading={save.isPending}
          />
        </StepCard>
      )}

      {step === 4 && (
        <StepCard title="Resumen de tu admisión" hint="Verifica antes de continuar al pago.">
          <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <SummaryRow label="Postulante" value={personal.full_name} />
            <SummaryRow label="Programa" value={program?.title ?? app?.program_title ?? "—"} />
            <SummaryRow label="Plan" value={plan?.name ?? app?.plan_name ?? "—"} />
            <SummaryRow
              label="Duración"
              value={`${plan?.months ?? app?.duration_months ?? 12} meses`}
            />
            <SummaryRow
              label="Precio"
              value={`${plan?.currency ?? "PEN"} ${(plan?.price_amount ?? app?.amount ?? 0).toFixed(2)}`}
            />
            <div className="flex items-center justify-between px-5 py-4 bg-primary/[0.05]">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Total
              </span>
              <span className="text-2xl font-extrabold tracking-tight">
                {plan?.currency ?? "PEN"} {(plan?.price_amount ?? app?.amount ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
          <WizardNav
            onBack={() => setStep(3)}
            onNext={() => persist({}, 5)}
            nextLabel="Continuar al pago"
            nextDisabled={save.isPending}
            loading={save.isPending}
          />
        </StepCard>
      )}

      {step === 5 && (
        <PaymentStep
          app={app}
          userId={userId}
          amount={plan?.price_amount ?? app?.amount ?? 0}
          currency={plan?.currency ?? app?.currency ?? "PEN"}
          onBack={() => setStep(4)}
        />
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : done
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : <s.icon className="size-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.n}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-4 sm:w-8 ${done ? "bg-emerald-500/50" : "bg-border"}`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-6 sm:p-10 animate-slide-up">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground mt-1.5">{hint}</p>}
      <div className="mt-7 space-y-7">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} mt-1.5 ${error ? "border-rose-400 focus:ring-rose-300" : ""}`}
      />
      {error && <span className="text-[10px] text-rose-500 font-semibold">Revisa este campo</span>}
    </label>
  );
}

function PlanCard({
  plan,
  active,
  onSelect,
}: {
  plan: WizardPlan;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-2xl p-5 border flex flex-col transition-all ${
        active
          ? "border-primary bg-primary/[0.06] shadow-lg shadow-primary/10"
          : "border-border bg-background/40 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-extrabold tracking-tight">{plan.name}</span>
        {active && <CheckCircle2 className="size-4 text-primary" strokeWidth={2.5} />}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tighter">
        {plan.price_amount === 0 ? "Gratis" : `${plan.currency} ${plan.price_amount}`}
      </div>
      <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
        {plan.period} · {plan.months} meses
      </span>
      {plan.description && (
        <p className="text-[11px] text-muted-foreground mt-2">{plan.description}</p>
      )}
      <ul className="mt-3 space-y-1.5">
        {(plan.features ?? []).slice(0, 5).map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="size-3 mt-0.5 text-emerald-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-right">{value || "—"}</span>
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled,
  loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Atrás
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40 disabled:translate-y-0"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {nextLabel} <ArrowRight className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ---------------------------- PASO 5 · PAGO ---------------------------- */

function PaymentStep({
  app,
  userId,
  amount,
  currency,
  onBack,
}: {
  app: AdmissionApplication | null;
  userId: string;
  amount: number;
  currency: string;
  onBack: () => void;
}) {
  const settingsQ = usePaymentSettings();
  const save = useSaveAdmission(userId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const setting = (settingsQ.data ?? []).find((s) => s.is_active) ?? null;

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("El archivo supera 8 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!app?.id) {
      toast.error("Vuelve al paso anterior para guardar tu solicitud");
      return;
    }
    if (!file) {
      toast.error("Sube tu comprobante de pago");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${app.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("comprobantes")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;
      await save.mutateAsync({
        id: app.id,
        status: "pending",
        step: 5,
        receipt_path: path,
        receipt_uploaded_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        payment_method: setting?.method ?? "yape",
      } as any);
      toast.success("Pago recibido. Tu matrícula será revisada.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo enviar el comprobante");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="glass rounded-3xl p-6 sm:p-10 animate-slide-up">
      <h2 className="text-2xl font-extrabold tracking-tight">Realiza tu pago</h2>
      <p className="text-sm text-muted-foreground mt-1.5">
        Paga con Yape, Plin o transferencia y sube tu comprobante.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna izquierda: QR */}
        <div className="rounded-2xl border border-border bg-background/40 p-6 flex flex-col items-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {setting?.method ? setting.method.toUpperCase() : "YAPE"}
          </span>
          <div className="mt-4 size-56 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden">
            {setting?.qr_url ? (
              <img src={setting.qr_url} alt="QR de pago" className="size-full object-contain" />
            ) : (
              <QrCode className="size-24 text-muted-foreground/40" strokeWidth={1.25} />
            )}
          </div>
          <div className="mt-5 space-y-1">
            <div className="text-lg font-extrabold tracking-tight">
              {setting?.holder_name || "KotaMed Academy"}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {setting?.phone_number || "—"}
            </div>
            <div className="mt-3 text-3xl font-extrabold tracking-tighter">
              {currency} {amount.toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(setting?.phone_number ?? "");
              toast.success("Número copiado");
            }}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-black/[0.04] transition-colors"
          >
            <Copy className="size-3.5" /> Copiar número
          </button>
        </div>

        {/* Columna derecha: instrucciones + comprobante */}
        <div className="space-y-6">
          <ol className="space-y-3">
            {[
              "Escanea el QR con tu app de pagos.",
              "Realiza el pago por el monto exacto.",
              "Sube la captura del comprobante.",
              "Espera la validación (1–24 horas).",
            ].map((t, i) => (
              <li key={t} className="flex items-start gap-3">
                <span className="size-6 rounded-lg bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground pt-0.5">{t}</span>
              </li>
            ))}
          </ol>
          {setting?.instructions && (
            <p className="text-[11px] text-muted-foreground border-l-2 border-primary/40 pl-3">
              {setting.instructions}
            </p>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pick(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/[0.04]" : "border-border"
            }`}
          >
            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Comprobante"
                  className="mx-auto max-h-52 rounded-xl border border-border object-contain"
                />
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <>
                <FileImage className="size-8 mx-auto text-muted-foreground/50" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-semibold">Arrastra tu comprobante aquí</p>
                <p className="text-[11px] text-muted-foreground">o</p>
                <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-bold cursor-pointer hover:bg-black/[0.04] transition-colors">
                  <Upload className="size-3.5" /> Seleccionar imagen
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => pick(e.target.files?.[0] ?? null)}
                  />
                </label>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Atrás
            </button>
            <button
              onClick={submit}
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40 disabled:translate-y-0"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Enviar comprobante
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------- PANTALLA DE ESTADO ------------------------- */

function AdmissionStatusScreen({
  app,
  onRestart,
}: {
  app: AdmissionApplication;
  onRestart: () => void;
}) {
  const approved = app.status === "approved";
  const rejected = app.status === "rejected" || app.status === "refunded";

  return (
    <section className="glass rounded-3xl p-8 sm:p-12 text-center animate-slide-up">
      <div
        className={`mx-auto size-16 rounded-2xl flex items-center justify-center ${
          approved
            ? "bg-emerald-500/10 text-emerald-600"
            : rejected
              ? "bg-rose-500/10 text-rose-600"
              : "bg-primary/10 text-primary"
        }`}
      >
        {approved ? (
          <BadgeCheck className="size-8" strokeWidth={2} />
        ) : rejected ? (
          <ClipboardList className="size-8" strokeWidth={2} />
        ) : (
          <Loader2 className="size-8 animate-spin" strokeWidth={2} />
        )}
      </div>

      <span className="mt-6 inline-block text-[10px] font-bold uppercase tracking-widest text-primary">
        {STATUS_LABELS[app.status]}
      </span>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
        {approved
          ? "¡Bienvenido, alumno KotaMed!"
          : rejected
            ? "Tu matrícula necesita atención"
            : "Tu matrícula está siendo revisada"}
      </h2>
      <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-pretty">
        {approved
          ? "Tu acceso premium ya está activo. Entra a tu panel para comenzar."
          : rejected
            ? app.admin_notes || "Escríbenos para regularizar tu pago o solicitar una revisión."
            : "Tiempo estimado: 1–24 horas. Mientras tanto puedes explorar todo el contenido gratuito."}
      </p>

      <div className="mt-8 mx-auto max-w-md rounded-2xl border border-border divide-y divide-border overflow-hidden text-left">
        <SummaryRow label="Programa" value={app.program_title ?? app.program_slug ?? "—"} />
        <SummaryRow label="Plan" value={app.plan_name ?? "—"} />
        <SummaryRow
          label="Monto"
          value={`${app.currency} ${Number(app.amount ?? 0).toFixed(2)}`}
        />
        <SummaryRow
          label="Enviado"
          value={app.submitted_at ? new Date(app.submitted_at).toLocaleString() : "—"}
        />
        {approved && (
          <SummaryRow
            label="Vence"
            value={
              app.approved_expires_at
                ? new Date(app.approved_expires_at).toLocaleDateString()
                : "—"
            }
          />
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:-translate-y-0.5 transition-transform"
        >
          Ir a mi panel <ArrowRight className="size-4" />
        </Link>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          Actualizar estado
        </button>
      </div>
    </section>
  );
}
