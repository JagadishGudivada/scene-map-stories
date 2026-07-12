-- Wave 1 (accuracy overhaul): real per-record trust signal.
-- Adds a stored confidence score in [0,1] and a geocoder-verified flag to the
-- three canonical tables. Mirrors the style of 20260609000001_add_enriched_at_columns.sql.

ALTER TABLE public.spots     ADD COLUMN IF NOT EXISTS confidence   double precision;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS confidence   double precision;
ALTER TABLE public.titles    ADD COLUMN IF NOT EXISTS confidence   double precision;

ALTER TABLE public.spots     ADD COLUMN IF NOT EXISTS geo_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS geo_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.titles    ADD COLUMN IF NOT EXISTS geo_verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_spots_confidence     ON public.spots     (confidence);
CREATE INDEX IF NOT EXISTS idx_locations_confidence ON public.locations (confidence);
CREATE INDEX IF NOT EXISTS idx_titles_confidence    ON public.titles    (confidence);
