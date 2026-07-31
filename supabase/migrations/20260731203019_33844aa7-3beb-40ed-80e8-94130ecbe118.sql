DROP FUNCTION IF EXISTS public.approve_admission(uuid, integer);

CREATE OR REPLACE FUNCTION public.approve_admission(_application_id uuid, _actor_id uuid, _months integer DEFAULT NULL::integer)
 RETURNS public.admission_applications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app public.admission_applications;
  months integer;
  expires timestamptz;
BEGIN
  IF _actor_id IS NULL OR NOT public.has_role(_actor_id, 'admin') THEN
    RAISE EXCEPTION 'Solo el administrador puede aprobar matrículas';
  END IF;

  SELECT * INTO app FROM public.admission_applications WHERE id = _application_id;
  IF app.id IS NULL THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  months := COALESCE(_months, app.duration_months, 12);
  expires := now() + (months || ' months')::interval;

  IF app.program_slug IS NOT NULL AND app.program_slug = ANY (ARRAY['residentado','internado','r1','r2','r3']) THEN
    INSERT INTO public.enrollments (user_id, program, expires_at, created_by)
    VALUES (app.user_id, app.program_slug::public.program_slug, expires, _actor_id);
  END IF;

  IF app.program_slug IS NOT NULL THEN
    INSERT INTO public.user_content_access (user_id, node_id, granted, expires_at, created_by)
    SELECT app.user_id, n.id, true, expires, _actor_id
    FROM public.content_nodes n
    WHERE n.kind = 'program' AND n.slug = app.program_slug;
  END IF;

  IF app.plan_id IS NOT NULL THEN
    INSERT INTO public.user_memberships
      (user_id, plan_id, status, started_at, renews_at, payment_method, amount_paid, notes, created_by)
    VALUES
      (app.user_id, app.plan_id, 'active', now(), expires, app.payment_method, app.amount,
       'Aprobado desde Centro de Admisión', _actor_id);
  END IF;

  UPDATE public.admission_applications
  SET status = 'approved',
      reviewed_by = _actor_id,
      reviewed_at = now(),
      approved_expires_at = expires
  WHERE id = _application_id
  RETURNING * INTO app;

  RETURN app;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_admission(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_admission(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.approve_admission(uuid, uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_admission(uuid, uuid, integer) TO service_role;