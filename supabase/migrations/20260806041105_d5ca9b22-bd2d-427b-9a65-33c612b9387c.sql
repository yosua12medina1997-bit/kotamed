
CREATE TABLE public.ui_menu_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ui_menu_prefs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ui_menu_prefs TO authenticated;
GRANT ALL ON public.ui_menu_prefs TO service_role;

ALTER TABLE public.ui_menu_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ui_menu_prefs_read" ON public.ui_menu_prefs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ui_menu_prefs_admin_write" ON public.ui_menu_prefs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_ui_menu_prefs_updated_at
  BEFORE UPDATE ON public.ui_menu_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
