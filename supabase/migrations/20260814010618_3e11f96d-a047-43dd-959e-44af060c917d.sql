DROP POLICY IF EXISTS "apex_attempts_own_write" ON public.apex_attempts;
REVOKE UPDATE, INSERT ON public.apex_attempts FROM authenticated;
REVOKE UPDATE ON public.apex_attempt_items FROM authenticated;