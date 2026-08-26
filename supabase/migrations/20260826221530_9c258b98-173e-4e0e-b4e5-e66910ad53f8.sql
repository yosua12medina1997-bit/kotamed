UPDATE public.content_nodes SET is_published = true WHERE is_published = false;

ALTER TABLE public.content_nodes ALTER COLUMN is_published SET DEFAULT true;