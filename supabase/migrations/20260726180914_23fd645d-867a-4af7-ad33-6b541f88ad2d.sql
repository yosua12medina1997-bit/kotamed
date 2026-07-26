GRANT SELECT ON public.content_nodes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_nodes TO authenticated;
GRANT ALL ON public.content_nodes TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;