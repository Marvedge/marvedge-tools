-- Fix epoch-aligned window calculation in rate_limit_hit().
-- PostgreSQL double-precision::bigint rounds instead of flooring, causing
-- requests in the second half of a second (>= .500ms) to land in a different
-- window_start bucket and split fixed-window counts across two rows.

CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key text,
  p_window_seconds int,
  p_limit int
) RETURNS TABLE(allowed bool, remaining int, retry_after int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count int;
  v_elapsed int;
BEGIN
  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'p_window_seconds must be a positive integer';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'p_limit must be a positive integer';
  END IF;
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'p_key cannot be empty';
  END IF;

  v_window := to_timestamp(
    (floor(EXTRACT(EPOCH FROM now()))::bigint / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limits (key, window_start, count)
    VALUES (p_key, v_window, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING count INTO v_count;

  v_elapsed := EXTRACT(EPOCH FROM (now() - v_window))::int;

  RETURN QUERY SELECT
    (v_count <= p_limit) AS allowed,
    GREATEST(0, p_limit - v_count)::int AS remaining,
    CASE WHEN v_count > p_limit
      THEN GREATEST(1, p_window_seconds - v_elapsed)::int
      ELSE 0::int
    END AS retry_after;
END;
$$;
