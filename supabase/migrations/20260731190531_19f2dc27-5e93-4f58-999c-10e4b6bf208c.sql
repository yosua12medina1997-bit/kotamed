DROP POLICY IF EXISTS "Authenticated view plan access" ON public.plan_content_access;

CREATE POLICY "Admins view plan access"
ON public.plan_content_access
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members view own plan access"
ON public.plan_content_access
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_memberships um
    WHERE um.plan_id = plan_content_access.plan_id
      AND um.user_id = auth.uid()
      AND um.status = 'active'
  )
);