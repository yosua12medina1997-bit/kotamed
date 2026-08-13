GRANT SELECT ON public.ui_menu_prefs TO anon;
CREATE POLICY "ui_menu_prefs_public_pages_read" ON public.ui_menu_prefs
  FOR SELECT TO anon
  USING (scope = 'hero-home' OR scope LIKE 'page-%');