GRANT SELECT, INSERT, UPDATE ON public.website_projects TO authenticated;
GRANT ALL ON public.website_projects TO service_role;
GRANT SELECT, INSERT ON public.website_scan_events TO authenticated;
GRANT ALL ON public.website_scan_events TO service_role;