-- 1) Storage: prevent owner reassignment on clinico bucket
DROP POLICY IF EXISTS clinico_update_owner ON storage.objects;
CREATE POLICY clinico_update_owner ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'clinico' AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)))
WITH CHECK (bucket_id = 'clinico' AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)));

-- 2) public.is_enrollment_admin no longer SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_enrollment_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::public.app_role, 'academic_admin'::public.app_role)
  )
$function$;