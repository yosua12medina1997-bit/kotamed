CREATE TABLE public.command_center (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  area_slug text NOT NULL,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  missions jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy jsonb NOT NULL DEFAULT '[]'::jsonb,
  coach jsonb NOT NULL DEFAULT '{}'::jsonb,
  system_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.command_center TO authenticated;
GRANT ALL ON public.command_center TO service_role;

ALTER TABLE public.command_center ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own command center"
ON public.command_center FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_command_center_updated_at
BEFORE UPDATE ON public.command_center
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();