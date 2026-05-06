-- Store map-ready metadata for Been Here spots so profile map can render directly from DB.
ALTER TABLE public.visited_spots
  ADD COLUMN IF NOT EXISTS spot_name text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS type text;

-- Backfill existing rows to safe defaults for older records.
UPDATE public.visited_spots
SET
  spot_name = COALESCE(spot_name, initcap(replace(spot_slug, '-', ' '))),
  lat = COALESCE(lat, 0),
  lng = COALESCE(lng, 0),
  city = COALESCE(city, 'Unknown City'),
  country = COALESCE(country, 'Unknown Country'),
  type = COALESCE(type, 'Movie')
WHERE
  spot_name IS NULL
  OR lat IS NULL
  OR lng IS NULL
  OR city IS NULL
  OR country IS NULL
  OR type IS NULL;

ALTER TABLE public.visited_spots
  ALTER COLUMN spot_name SET NOT NULL,
  ALTER COLUMN lat SET NOT NULL,
  ALTER COLUMN lng SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN country SET NOT NULL,
  ALTER COLUMN type SET NOT NULL;

ALTER TABLE public.visited_spots
  ADD CONSTRAINT visited_spots_type_check CHECK (type IN ('Movie', 'Series', 'Book'));
