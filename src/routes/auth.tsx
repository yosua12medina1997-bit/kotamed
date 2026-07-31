import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Loader2 } from "lucide-react";
import kotaroLogo from "@/assets/kotaro-logo.png";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar · Kotaro Academy" },
      { name: "description", content: "Inicia sesión o crea tu cuenta en Kotaro Academy." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

/** Solo se aceptan destinos internos (mismo origen). */
function safeRedirect(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, "http://local");
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: rawRedirect } = Route.useSearch();
  const target = safeRedirect(rawRedirect);
  const goNext = () => {
    if (target) navigate({ href: target, replace: true });
    else navigate({ to: "/dashboard", replace: true });
  };
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMsg({ kind: "ok", text: "Cuenta creada. Revisa tu email si se pide confirmación." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goNext();
      }
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Error inesperado" });
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: target
        ? `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`
        : window.location.origin,
    });
    if (result.error) {
      setMsg({ kind: "err", text: result.error.message ?? "No se pudo iniciar sesión con Google" });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    goNext();
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[130px] animate-aurora"
        style={{ background: "color-mix(in oklab, var(--primary) 22%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] -right-[10%] w-[50%] h-[65%] rounded-full blur-[130px] animate-aurora"
        style={{
          background: "color-mix(in oklab, oklch(0.75 0.14 285) 20%, transparent)",
          animationDelay: "-6s",
        }}
      />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <img src={kotaroLogo} alt="Kotaro Academy" className="size-10 object-contain" />
          <span className="font-extrabold tracking-tighter text-xl">KOTARO</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Academy
          </span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-center">
            {mode === "signin" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h1>
          {target && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">
                Acceso requerido
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Para ingresar a este contenido debes iniciar sesión con tu cuenta. Una vez
                autenticado verificaremos automáticamente tu matrícula y los cursos incluidos en tu
                membresía.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center mt-2">
            {mode === "signin"
              ? "Ingresa a tu panel académico"
              : "El acceso al contenido requiere matrícula por el administrador"}
          </p>

          <button
            onClick={google}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-xl bg-white hover:bg-white/80 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              o email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="Nombre completo"
                type="text"
                value={fullName}
                onChange={setFullName}
                required
              />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />

            {msg && (
              <div
                className={`text-xs rounded-lg px-3 py-2 ${msg.kind === "err" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}
              >
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setMsg(null);
                  }}
                  className="font-bold text-primary hover:underline"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  onClick={() => {
                    setMode("signin");
                    setMsg(null);
                  }}
                  className="font-bold text-primary hover:underline"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="mt-1 w-full bg-white/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.87l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
