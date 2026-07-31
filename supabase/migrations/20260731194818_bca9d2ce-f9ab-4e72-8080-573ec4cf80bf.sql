-- ============ Centro de Admisión ============
CREATE TABLE public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 1,
  full_name text,
  document_id text,
  email text,
  phone text,
  university text,
  study_year text,
  hospital text,
  specialty text,
  program_slug text,
  program_title text,
  plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  plan_slug text,
  plan_name text,
  duration_months integer NOT NULL DEFAULT 12,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PEN',
  payment_method text,
  receipt_path text,
  receipt_uploaded_at timestamptz,
  submitted_at timestamptz,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_applications TO authenticated;
GRANT ALL ON public.admission_applications TO service_role;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_admissions_select" ON public.admission_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_admissions_select" ON public.admission_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own_admissions_insert" ON public.admission_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status IN ('draft','pending'));
CREATE POLICY "own_admissions_update" ON public.admission_applications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft','pending'))
  WITH CHECK (user_id = auth.uid() AND status IN ('draft','pending'));
CREATE POLICY "admin_admissions_update" ON public.admission_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_admissions_delete" ON public.admission_applications
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admission_applications_updated_at
  BEFORE UPDATE ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_admission_applications_user ON public.admission_applications(user_id);
CREATE INDEX idx_admission_applications_status ON public.admission_applications(status);

-- Validación de estado sin CHECK inmutable problemático
CREATE OR REPLACE FUNCTION public.validate_admission_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft','pending','reviewing','approved','rejected','refunded') THEN
    RAISE EXCEPTION 'Estado de matrícula inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_admission_status
  BEFORE INSERT OR UPDATE ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_admission_status();

-- ============ Configuración de pago (QR) ============
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method text NOT NULL DEFAULT 'yape',
  holder_name text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  qr_url text,
  qr_storage_path text,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_settings_read" ON public.payment_settings
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payment_settings_admin_insert" ON public.payment_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payment_settings_admin_update" ON public.payment_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "payment_settings_admin_delete" ON public.payment_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (method, holder_name, phone_number, instructions, sort_order)
VALUES ('yape', 'KotaMed Academy', '999 999 999', 'Escanea el QR con Yape o Plin, realiza el pago exacto y sube la captura del comprobante.', 1);

-- ============ Aprobación automática ============
CREATE OR REPLACE FUNCTION public.approve_admission(_application_id uuid, _months integer DEFAULT NULL)
RETURNS public.admission_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.admission_applications;
  months integer;
  expires timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede aprobar matrículas';
  END IF;

  SELECT * INTO app FROM public.admission_applications WHERE id = _application_id;
  IF app.id IS NULL THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  months := COALESCE(_months, app.duration_months, 12);
  expires := now() + (months || ' months')::interval;

  -- Matrícula en el programa (si el slug corresponde a un programa del enum)
  IF app.program_slug IS NOT NULL AND app.program_slug = ANY (ARRAY['residentado','internado','r1','r2','r3']) THEN
    INSERT INTO public.enrollments (user_id, program, expires_at, created_by)
    VALUES (app.user_id, app.program_slug::public.program_slug, expires, auth.uid());
  END IF;

  -- Acceso directo al nodo de contenido del programa (CMS)
  IF app.program_slug IS NOT NULL THEN
    INSERT INTO public.user_content_access (user_id, node_id, granted, expires_at, created_by)
    SELECT app.user_id, n.id, true, expires, auth.uid()
    FROM public.content_nodes n
    WHERE n.kind = 'program' AND n.slug = app.program_slug;
  END IF;

  -- Membresía
  IF app.plan_id IS NOT NULL THEN
    INSERT INTO public.user_memberships
      (user_id, plan_id, status, started_at, renews_at, payment_method, amount_paid, notes, created_by)
    VALUES
      (app.user_id, app.plan_id, 'active', now(), expires, app.payment_method, app.amount,
       'Aprobado desde Centro de Admisión', auth.uid());
  END IF;

  UPDATE public.admission_applications
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      approved_expires_at = expires
  WHERE id = _application_id
  RETURNING * INTO app;

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_admission(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_admission(uuid, integer) TO authenticated;
