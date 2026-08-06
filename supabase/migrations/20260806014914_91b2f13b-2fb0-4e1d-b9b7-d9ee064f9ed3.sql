-- Matrículas individuales (manuales o derivadas de una membresía)
CREATE TABLE public.user_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.content_nodes(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  enrollment_kind text NOT NULL DEFAULT 'programa',
  assignment_type text NOT NULL DEFAULT 'manual',
  reason text,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  observations text,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_enrollments_user_node_unique UNIQUE (user_id, node_id)
);

CREATE INDEX user_enrollments_user_idx ON public.user_enrollments (user_id);
CREATE INDEX user_enrollments_node_idx ON public.user_enrollments (node_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_enrollments TO authenticated;
GRANT ALL ON public.user_enrollments TO service_role;

ALTER TABLE public.user_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own enrollments"
  ON public.user_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert enrollments"
  ON public.user_enrollments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update enrollments"
  ON public.user_enrollments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete enrollments"
  ON public.user_enrollments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_user_enrollments_updated_at
  BEFORE UPDATE ON public.user_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bitácora de auditoría de matrículas
CREATE TABLE public.enrollment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  target_user_id uuid,
  target_email text,
  node_id uuid,
  node_title text,
  enrollment_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX enrollment_audit_log_created_idx ON public.enrollment_audit_log (created_at DESC);
CREATE INDEX enrollment_audit_log_target_idx ON public.enrollment_audit_log (target_user_id);

GRANT SELECT, INSERT ON public.enrollment_audit_log TO authenticated;
GRANT ALL ON public.enrollment_audit_log TO service_role;

ALTER TABLE public.enrollment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read enrollment audit"
  ON public.enrollment_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write enrollment audit"
  ON public.enrollment_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());