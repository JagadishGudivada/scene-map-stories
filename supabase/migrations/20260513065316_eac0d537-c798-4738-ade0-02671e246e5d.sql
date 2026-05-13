CREATE POLICY "Public can read spot details cache"
ON public.ai_cache
FOR SELECT
TO anon, authenticated
USING (function_name = 'spot-details' AND expires_at > now());