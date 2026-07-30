
-- 1. Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS hospital text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS academic_level text,
  ADD COLUMN IF NOT EXISTS cmp text,
  ADD COLUMN IF NOT EXISTS rne text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Lima',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles" ON public.profiles
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles" ON public.profiles
      FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2. Membership plans
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PEN',
  period text NOT NULL DEFAULT 'mensual',
  color text NOT NULL DEFAULT '#6366f1',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  modules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_plans TO authenticated;
GRANT ALL ON public.membership_plans TO service_role;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active plans" ON public.membership_plans
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage plans insert" ON public.membership_plans
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage plans update" ON public.membership_plans
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage plans delete" ON public.membership_plans
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. User memberships
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  renews_at timestamptz,
  payment_method text,
  amount_paid numeric,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memberships TO authenticated;
GRANT ALL ON public.user_memberships TO service_role;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own membership" ON public.user_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert memberships" ON public.user_memberships
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update memberships" ON public.user_memberships
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete memberships" ON public.user_memberships
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE ON public.user_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Plan -> content access
CREATE TABLE IF NOT EXISTS public.plan_content_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.content_nodes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, node_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_content_access TO authenticated;
GRANT ALL ON public.plan_content_access TO service_role;
ALTER TABLE public.plan_content_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view plan access" ON public.plan_content_access
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert plan access" ON public.plan_content_access
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update plan access" ON public.plan_content_access
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete plan access" ON public.plan_content_access
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Per-user overrides
CREATE TABLE IF NOT EXISTS public.user_content_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES public.content_nodes(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, node_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_content_access TO authenticated;
GRANT ALL ON public.user_content_access TO service_role;
ALTER TABLE public.user_content_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own access" ON public.user_content_access
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert user access" ON public.user_content_access
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update user access" ON public.user_content_access
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete user access" ON public.user_content_access
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_user_content_access_updated_at BEFORE UPDATE ON public.user_content_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Teachers
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text,
  avatar_url text,
  specialty text,
  hospital text,
  university text,
  bio text,
  cv_url text,
  rating numeric NOT NULL DEFAULT 0,
  years_teaching integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view active teachers" ON public.teachers
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert teachers" ON public.teachers
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update teachers" ON public.teachers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete teachers" ON public.teachers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Seed default plans
INSERT INTO public.membership_plans (slug, name, description, price_amount, period, color, features, sort_order)
VALUES
  ('free','FREE','Acceso básico a ciencias básicas',0,'mensual','#94a3b8','["Ciencias Básicas","Comunidad"]'::jsonb,1),
  ('essential','ESSENTIAL','Acceso ampliado a contenido clínico',49,'mensual','#38bdf8','["Ciencias Básicas","Ciencias Clínicas"]'::jsonb,2),
  ('pro','PRO','Acceso completo + IA + Biblioteca',99,'mensual','#6366f1','["ENAM","Internado","Residentado","IA Clínica","Biblioteca","Casos Clínicos","Certificados"]'::jsonb,3),
  ('master','MASTER','Acceso absoluto a toda la plataforma',149,'mensual','#a855f7','["Acceso absoluto"]'::jsonb,4),
  ('institucional','INSTITUCIONAL','Para universidades y hospitales',0,'anual','#10b981','["Licencias múltiples","Reportes institucionales"]'::jsonb,5),
  ('empresarial','EMPRESARIAL','Para empresas y clínicas',0,'anual','#f59e0b','["Licencias por equipo","Soporte dedicado"]'::jsonb,6),
  ('vip','VIP','Mentoría 1 a 1 y acceso absoluto',299,'mensual','#e11d48','["Acceso absoluto","Mentoría 1 a 1"]'::jsonb,7)
ON CONFLICT (slug) DO NOTHING;
