DROP POLICY IF EXISTS "Admins can view website projects" ON public.website_projects;
DROP POLICY IF EXISTS "Admins can register website projects" ON public.website_projects;
DROP POLICY IF EXISTS "Admins can update website projects" ON public.website_projects;
DROP POLICY IF EXISTS "Admins can view website activity" ON public.website_scan_events;
DROP POLICY IF EXISTS "Admins can log website activity" ON public.website_scan_events;

CREATE POLICY "website_projects_admin_read"
ON public.website_projects FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "website_projects_admin_insert"
ON public.website_projects FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "website_projects_admin_update"
ON public.website_projects FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "website_scan_events_admin_read"
ON public.website_scan_events FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "website_scan_events_admin_insert"
ON public.website_scan_events FOR INSERT TO authenticated
WITH CHECK (
  (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  AND actor_id = auth.uid()
);