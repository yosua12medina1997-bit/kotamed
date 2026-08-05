UPDATE public.neo_form_config
SET config = jsonb_set(
  config,
  '{modules}',
  (
    SELECT jsonb_agg(
      CASE WHEN m->>'id' = 'administracion'
        THEN jsonb_set(jsonb_set(m, '{hidden}', 'false'::jsonb), '{enabled}', 'true'::jsonb)
        ELSE m END
      ORDER BY ord
    )
    FROM jsonb_array_elements(config->'modules') WITH ORDINALITY AS t(m, ord)
  )
)
WHERE scope = 'internado:pediatria-neonatologia:hospitalizacion:nav';