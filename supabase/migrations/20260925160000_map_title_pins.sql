-- Slim pin rows for the discovery map. Mirrors toLocationArray(): the first of
-- data.locations, data.spots, data.pins that is an array wins. Callers page
-- by title (p_limit / p_offset), not by pin, so a page of titles with no
-- coordinates still advances via title_count.

CREATE OR REPLACE FUNCTION public.map_title_pins(p_limit integer, p_offset integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      LEAST(GREATEST(COALESCE(p_limit, 0), 0), 500) AS lim,
      GREATEST(COALESCE(p_offset, 0), 0) AS off
  ),
  page AS (
    SELECT t.slug, t.title, t.type::text AS type, t.poster_url, t.backdrop_url, t.data
    FROM public.titles t
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT (SELECT lim FROM bounds)
    OFFSET (SELECT off FROM bounds)
  ),
  expanded AS (
    SELECT
      p.slug,
      p.title,
      p.type,
      p.poster_url,
      p.backdrop_url,
      loc
    FROM page p
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN jsonb_typeof(p.data -> 'locations') = 'array' THEN p.data -> 'locations'
        WHEN jsonb_typeof(p.data -> 'spots') = 'array' THEN p.data -> 'spots'
        WHEN jsonb_typeof(p.data -> 'pins') = 'array' THEN p.data -> 'pins'
        ELSE '[]'::jsonb
      END AS arr
    ) chosen
    CROSS JOIN LATERAL jsonb_array_elements(chosen.arr) AS loc
    WHERE jsonb_typeof(loc) = 'object'
  ),
  pins AS (
    SELECT
      e.slug,
      e.title,
      e.type,
      e.poster_url,
      e.backdrop_url,
      btrim(e.loc ->> 'lat') AS lat_text,
      btrim(e.loc ->> 'lng') AS lng_text,
      COALESCE(
        NULLIF(btrim(e.loc ->> 'label'), ''),
        NULLIF(btrim(e.loc ->> 'name'), ''),
        NULLIF(
          btrim(concat_ws(
            ', ',
            NULLIF(btrim(e.loc ->> 'city'), ''),
            NULLIF(btrim(e.loc ->> 'country'), '')
          )),
          ''
        ),
        NULLIF(btrim(e.title), '')
      ) AS label,
      NULLIF(btrim(e.loc ->> 'city'), '') AS city,
      NULLIF(btrim(e.loc ->> 'country'), '') AS country,
      COALESCE(NULLIF(e.loc ->> 'image_url', ''), NULLIF(e.loc ->> 'image', '')) AS image
    FROM expanded e
  )
  SELECT jsonb_build_object(
    'title_count', (SELECT count(*)::int FROM page),
    'pins', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'slug', slug,
        'title', title,
        'type', type,
        'poster_url', poster_url,
        'backdrop_url', backdrop_url,
        'lat', lat_text::double precision,
        'lng', lng_text::double precision,
        'label', label,
        'city', city,
        'country', country,
        'image', image
      ))
      FROM pins
      WHERE label IS NOT NULL
        AND lat_text ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND lng_text ~ '^-?[0-9]+(\.[0-9]+)?$'
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.map_title_pins(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.map_title_pins(integer, integer) TO anon, authenticated, service_role;
