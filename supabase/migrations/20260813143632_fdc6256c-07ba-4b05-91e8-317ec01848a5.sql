
CREATE OR REPLACE FUNCTION private.is_cms_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$$;

REVOKE ALL ON FUNCTION private.is_cms_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_cms_admin(uuid) TO authenticated;

-- cms_assets
DROP POLICY IF EXISTS "Admins manage CMS assets" ON public.cms_assets;
CREATE POLICY "Admins manage CMS assets" ON public.cms_assets
  FOR ALL TO authenticated
  USING (private.is_cms_admin(auth.uid()))
  WITH CHECK (private.is_cms_admin(auth.uid()));

-- cms_audit_log
DROP POLICY IF EXISTS "Admins read CMS audit" ON public.cms_audit_log;
CREATE POLICY "Admins read CMS audit" ON public.cms_audit_log
  FOR SELECT TO authenticated
  USING (private.is_cms_admin(auth.uid()));

-- cms_collection_items
DROP POLICY IF EXISTS "cms_collection_admin_read" ON public.cms_collection_items;
CREATE POLICY "cms_collection_admin_read" ON public.cms_collection_items
  FOR SELECT TO authenticated
  USING (private.is_cms_admin(auth.uid()));
DROP POLICY IF EXISTS "cms_collection_admin_write" ON public.cms_collection_items;
CREATE POLICY "cms_collection_admin_write" ON public.cms_collection_items
  FOR ALL TO authenticated
  USING (private.is_cms_admin(auth.uid()))
  WITH CHECK (private.is_cms_admin(auth.uid()));

-- cms_nav_items
DROP POLICY IF EXISTS "cms_nav_admin_read" ON public.cms_nav_items;
CREATE POLICY "cms_nav_admin_read" ON public.cms_nav_items
  FOR SELECT TO authenticated
  USING (private.is_cms_admin(auth.uid()));
DROP POLICY IF EXISTS "cms_nav_admin_write" ON public.cms_nav_items;
CREATE POLICY "cms_nav_admin_write" ON public.cms_nav_items
  FOR ALL TO authenticated
  USING (private.is_cms_admin(auth.uid()))
  WITH CHECK (private.is_cms_admin(auth.uid()));

-- cms_published
DROP POLICY IF EXISTS "Admins publish CMS content" ON public.cms_published;
CREATE POLICY "Admins publish CMS content" ON public.cms_published
  FOR INSERT TO authenticated
  WITH CHECK (private.is_cms_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update published CMS content" ON public.cms_published;
CREATE POLICY "Admins update published CMS content" ON public.cms_published
  FOR UPDATE TO authenticated
  USING (private.is_cms_admin(auth.uid()))
  WITH CHECK (private.is_cms_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins unpublish CMS content" ON public.cms_published;
CREATE POLICY "Admins unpublish CMS content" ON public.cms_published
  FOR DELETE TO authenticated
  USING (private.is_cms_admin(auth.uid()));

-- cms_redirects
DROP POLICY IF EXISTS "cms_redirects_admin_read" ON public.cms_redirects;
CREATE POLICY "cms_redirects_admin_read" ON public.cms_redirects
  FOR SELECT TO authenticated
  USING (private.is_cms_admin(auth.uid()));
DROP POLICY IF EXISTS "cms_redirects_admin_write" ON public.cms_redirects;
CREATE POLICY "cms_redirects_admin_write" ON public.cms_redirects
  FOR ALL TO authenticated
  USING (private.is_cms_admin(auth.uid()))
  WITH CHECK (private.is_cms_admin(auth.uid()));

-- cms_settings
DROP POLICY IF EXISTS "Super admins insert CMS settings" ON public.cms_settings;
CREATE POLICY "Super admins insert CMS settings" ON public.cms_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.is_cms_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins update CMS settings" ON public.cms_settings;
CREATE POLICY "Super admins update CMS settings" ON public.cms_settings
  FOR UPDATE TO authenticated
  USING (private.is_cms_admin(auth.uid()))
  WITH CHECK (private.is_cms_admin(auth.uid()));
