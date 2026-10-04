-- =============================================================
-- RhirePro — Fixed-window rate limiter used by Netlify Functions
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times.
--
-- WHY
-- ---
-- /send-otp, /verify-otp and the sign-in paths were unthrottled, so a 6-digit
-- OTP could be brute-forced and the email sender abused. The AI endpoints spend
-- real money per call, so they need a ceiling too.
--
-- One atomic upsert per check, so concurrent requests cannot both slip under
-- the limit. Only the service role can call it.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: RLS blocks every non-service-role caller.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key            TEXT,
  p_limit          INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count  INTEGER;
  v_start  TIMESTAMPTZ;
BEGIN
  INSERT INTO public.rate_limits AS r (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds)
                        THEN now() ELSE r.window_start END,
    count        = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds)
                        THEN 1 ELSE r.count + 1 END
  RETURNING r.count, r.window_start INTO v_count, v_start;

  allowed     := v_count <= p_limit;
  remaining   := GREATEST(p_limit - v_count, 0);
  retry_after := GREATEST(CEIL(EXTRACT(EPOCH FROM (v_start + make_interval(secs => p_window_seconds) - now())))::INTEGER, 0);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT ALL ON public.rate_limits TO service_role;

-- Housekeeping: call occasionally (or from the existing background-jobs module).
CREATE OR REPLACE FUNCTION public.purge_rate_limits() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.purge_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_rate_limits() TO service_role;

COMMIT;
