-- 1) Limit anonymous visitors to only the non-internal columns of cms_settings
REVOKE SELECT ON public.cms_settings FROM anon;
GRANT SELECT (id, home_page_id, safe_mode) ON public.cms_settings TO anon;
GRANT SELECT ON public.cms_settings TO authenticated;

DROP POLICY IF EXISTS "CMS settings readable" ON public.cms_settings;
CREATE POLICY "CMS settings readable" ON public.cms_settings
FOR SELECT TO anon, authenticated USING (true);

-- 2) Harden the enrollment-admin role check
CREATE OR REPLACE FUNCTION public.is_enrollment_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$function$;