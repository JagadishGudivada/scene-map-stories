CREATE TYPE public.cluster_tag AS ENUM ('best_base','most_iconic','day_trip');

CREATE TABLE public.destination_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id uuid NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  country_iso2 text,
  lat double precision,
  lng double precision,
  primary_airport text,
  alt_airports text[] NOT NULL DEFAULT '{}',
  verified_location_count integer NOT NULL DEFAULT 0,
  radius_minutes integer,
  rank_score double precision NOT NULL DEFAULT 0,
  tag public.cluster_tag,
  hero_image_url text,
  is_visitable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (title_id, slug)
);
CREATE INDEX idx_destination_clusters_title ON public.destination_clusters(title_id);
GRANT SELECT ON public.destination_clusters TO anon, authenticated;
GRANT ALL ON public.destination_clusters TO service_role;
ALTER TABLE public.destination_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clusters are public" ON public.destination_clusters FOR SELECT USING (true);

CREATE TABLE public.cluster_locations (
  cluster_id uuid NOT NULL REFERENCES public.destination_clusters(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  PRIMARY KEY (cluster_id, location_id)
);
GRANT SELECT ON public.cluster_locations TO anon, authenticated;
GRANT ALL ON public.cluster_locations TO service_role;
ALTER TABLE public.cluster_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cluster locations are public" ON public.cluster_locations FOR SELECT USING (true);

CREATE TABLE public.outbound_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  title_id uuid,
  cluster_id uuid,
  partner text NOT NULL CHECK (partner IN ('booking','viator','gyg','flights')),
  surface text NOT NULL CHECK (surface IN ('hero','title_page','location_page','trail')),
  label text NOT NULL CHECK (char_length(label) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.outbound_clicks TO anon, authenticated;
GRANT ALL ON public.outbound_clicks TO service_role;
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log outbound clicks" ON public.outbound_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE TABLE public.saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_trips TO authenticated;
GRANT ALL ON public.saved_trips TO service_role;
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own trips" ON public.saved_trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own trips" ON public.saved_trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own trips" ON public.saved_trips FOR DELETE TO authenticated USING (auth.uid() = user_id);