ALTER TABLE public.spots     ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
ALTER TABLE public.titles    ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_spots_enriched_at     ON public.spots     (enriched_at);
CREATE INDEX IF NOT EXISTS idx_locations_enriched_at ON public.locations (enriched_at);
CREATE INDEX IF NOT EXISTS idx_titles_enriched_at    ON public.titles    (enriched_at);
