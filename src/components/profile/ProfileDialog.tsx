import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload, X, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useMyProfile, useMyRoles } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Recorta al centro en cuadrado y comprime a JPEG (máx 512px) para uniformar avatares. */
async function compressSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.88),
  );
}

type Tab = "personal" | "cuenta";

export function ProfileDialog({
  userId,
  open,
  onClose,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  // Rendimiento: los datos solo se consultan cuando el diálogo está abierto.
  const profileQ = useMyProfile(open ? userId : undefined);
  const rolesQ = useMyRoles(open ? userId : undefined);
  const profile = profileQ.data;

  const [tab, setTab] = useState<Tab>("personal");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab("personal");
    setFile(null);
    setPreviewUrl(null);
    setRemoveAvatar(false);
  }, [open]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile?.id, profile?.full_name, profile?.email]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const nameError = useMemo(() => {
    const v = fullName.trim();
    if (v.length === 0) return null;
    if (v.length < 2) return "Mínimo 2 caracteres";
    if (v.length > 80) return "Máximo 80 caracteres";
    return null;
  }, [fullName]);

  const emailError = useMemo(() => {
    const v = email.trim();
    if (v.length === 0) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Formato de correo inválido";
  }, [email]);

  const roles = rolesQ.data ?? [];
  const roleLabel =
    roles.length > 0 ? roles.map((r) => ROLE_LABELS[r] ?? r).join(" · ") : "Miembro Free";

  const displayName = (profile?.full_name || profile?.email?.split("@")[0] || "Usuario") as string;
  const shownAvatar = previewUrl ?? (removeAvatar ? null : profile?.avatar_url ?? null);

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || (f.type && !ACCEPTED.includes(f.type.toLowerCase()))) {
      toast.error("Formato no permitido", { description: "Usa JPG, PNG o WEBP." });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("La imagen es muy pesada", {
        description: "El tamaño máximo permitido es de 5 MB.",
      });
      return;
    }
    setRemoveAvatar(false);
    setFile(f);
  };

  const dirty =
    (profile && (fullName.trim() !== (profile.full_name ?? "") || email.trim() !== profile.email)) ||
    !!file ||
    removeAvatar;

  const save = async () => {
    if (!profile) return;
    if (nameError || emailError) return;
    if (fullName.trim().length < 2) {
      toast.error("Ingresa tu nombre completo");
      return;
    }
    setSaving(true);
    try {
      let avatar_url: string | null | undefined;

      if (file) {
        const blob = await compressSquare(file);
        const path = `${userId}/avatar-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, TEN_YEARS);
        if (sErr) throw sErr;
        avatar_url = signed.signedUrl;
      } else if (removeAvatar) {
        avatar_url = null;
      }

      const newEmail = email.trim().toLowerCase();
      if (newEmail !== profile.email.toLowerCase()) {
        const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
        if (authErr) {
          throw new Error(
            /already|registered|exists/i.test(authErr.message)
              ? "Ese correo ya está registrado por otra cuenta."
              : authErr.message,
          );
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim().replace(/\s+/g, " "),
          email: newEmail,
          ...(avatar_url !== undefined ? { avatar_url } : {}),
        })
        .eq("id", userId);
      if (error) throw error;

      // Reflejo global sin recargar la app.
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setFile(null);
      setPreviewUrl(null);
      setRemoveAvatar(false);
      toast.success("Perfil actualizado correctamente.");
      onClose();
    } catch (e) {
      toast.error("No se pudo actualizar el perfil", {
        description: e instanceof Error ? e.message : "Intenta nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !saving && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mi perfil"
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto glass rounded-t-3xl sm:rounded-3xl border border-border/60 shadow-2xl animate-slide-up"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 sm:px-8 py-5 border-b border-border/60 backdrop-blur-xl bg-background/70">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
              Mi cuenta
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Mi Perfil</h2>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.05] transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="px-6 sm:px-8 pt-5 flex gap-2">
          {(
            [
              ["personal", "Información personal"],
              ["cuenta", "Cuenta"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-black/[0.04]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 sm:px-8 py-6">
          {profileQ.isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="size-24 rounded-full bg-black/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-black/[0.06]" />
                  <div className="h-3 w-56 rounded bg-black/[0.06]" />
                </div>
              </div>
              <div className="h-11 rounded-xl bg-black/[0.06]" />
              <div className="h-11 rounded-xl bg-black/[0.06]" />
              <div className="h-11 rounded-xl bg-black/[0.06]" />
            </div>
          ) : tab === "personal" ? (
            <div className="space-y-7">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-dashed p-5 transition-colors ${
                  dragging ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="relative shrink-0">
                  {shownAvatar ? (
                    <img
                      src={shownAvatar}
                      alt={displayName}
                      className="size-24 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-extrabold border-4 border-white shadow-md">
                      {initialsOf(displayName)}
                    </div>
                  )}
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:-translate-y-0.5 transition-transform"
                    aria-label="Cambiar foto"
                    title="Cambiar foto"
                  >
                    <Camera className="size-4" strokeWidth={2.25} />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="font-bold tracking-tight">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{profile?.email}</div>
                  <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-widest">
                    <ShieldCheck className="size-3" /> {roleLabel}
                  </span>
                  <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold hover:bg-black/[0.04] transition-colors"
                    >
                      <Upload className="size-3.5" strokeWidth={2.25} /> Cambiar foto
                    </button>
                    {file && (
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold hover:bg-black/[0.04] transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    {(profile?.avatar_url || file) && !removeAvatar && (
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                          setRemoveAvatar(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-rose-600 hover:bg-rose-500/5 transition-colors"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2.25} /> Eliminar
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Arrastra una imagen aquí · JPG, PNG o WEBP · máx. 5 MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Nombre completo"
                  value={fullName}
                  onChange={setFullName}
                  error={nameError}
                  maxLength={80}
                />
                <Field
                  label="Correo electrónico"
                  value={email}
                  onChange={setEmail}
                  error={emailError}
                  type="email"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ReadOnly label="ID del usuario" value={profile?.id ?? "—"} mono />
              <ReadOnly label="Rol" value={roleLabel} />
              <ReadOnly
                label="Fecha de creación"
                value={
                  profile?.created_at ? new Date(profile.created_at).toLocaleString() : "—"
                }
              />
              <ReadOnly
                label="Último acceso"
                value={
                  profile?.last_seen_at ? new Date(profile.last_seen_at).toLocaleString() : "—"
                }
              />
              <p className="text-[11px] text-muted-foreground pt-2">
                Próximamente: cambio de contraseña, verificación en dos pasos, preferencias de
                idioma, zona horaria y notificaciones.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 sm:px-8 py-4 border-t border-border/60 backdrop-blur-xl bg-background/70">
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-black/[0.04] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty || !!nameError || !!emailError}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:translate-y-0"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-background/60 text-sm font-medium outline-none transition-colors focus:border-primary ${
          error ? "border-rose-400" : "border-border"
        }`}
      />
      {error && <span className="mt-1 block text-[10px] font-bold text-rose-600">{error}</span>}
    </label>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-black/[0.03] text-sm text-muted-foreground">
        <Lock className="size-3.5 shrink-0" strokeWidth={2.25} />
        <span className={`truncate ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</span>
      </div>
    </div>
  );
}
