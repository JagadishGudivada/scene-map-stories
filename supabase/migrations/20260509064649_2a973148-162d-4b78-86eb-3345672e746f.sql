CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT ai_cache_unique UNIQUE (function_name, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON public.ai_cache (function_name, cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON public.ai_cache (expires_at);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- No client policies: only service role (used by edge functions) reads/writes.
