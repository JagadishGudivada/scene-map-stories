CREATE POLICY "Public can read reveal cards cache"
ON public.ai_cache FOR SELECT
TO anon, authenticated
USING (function_name = 'reveal-cards' AND expires_at > now());