
-- Enums
CREATE TYPE public.media_type AS ENUM ('Movie','Series','Book');
CREATE TYPE public.spot_role AS ENUM ('filming','setting');
CREATE TYPE public.report_entity AS ENUM ('title','location','spot');
CREATE TYPE public.report_status AS ENUM ('pending','accepted','rejected');
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

-- user_roles + has_role
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- titles
CREATE TABLE public.titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  tmdb_id integer,
  imdb_id text,
  type public.media_type NOT NULL,
  title text NOT NULL,
  year integer,
  synopsis text,
  genres text[] DEFAULT '{}',
  rating numeric,
  poster_url text,
  backdrop_url text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  verified boolean NOT NULL DEFAULT false,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_titles_tmdb ON public.titles(tmdb_id);
CREATE INDEX idx_titles_type_year ON public.titles(type, year);
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read titles" ON public.titles FOR SELECT USING (true);

-- locations
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text,
  country text,
  flag text,
  lat double precision,
  lng double precision,
  hero_image_url text,
  description text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  verified boolean NOT NULL DEFAULT false,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_country ON public.locations(country);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read locations" ON public.locations FOR SELECT USING (true);

-- spots
CREATE TABLE public.spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  city text,
  country text,
  flag text,
  lat double precision,
  lng double precision,
  image_url text,
  description text,
  fun_facts text[] DEFAULT '{}',
  visit_tips text[] DEFAULT '{}',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  verified boolean NOT NULL DEFAULT false,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_spots_latlng ON public.spots(lat, lng);
CREATE INDEX idx_spots_city ON public.spots(city);
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read spots" ON public.spots FOR SELECT USING (true);

-- title_spots join
CREATE TABLE public.title_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id uuid NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  spot_id uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  role public.spot_role NOT NULL DEFAULT 'filming',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(title_id, spot_id)
);
CREATE INDEX idx_title_spots_title ON public.title_spots(title_id);
CREATE INDEX idx_title_spots_spot ON public.title_spots(spot_id);
ALTER TABLE public.title_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read title_spots" ON public.title_spots FOR SELECT USING (true);

-- data_reports
CREATE TABLE public.data_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type public.report_entity NOT NULL,
  entity_id uuid NOT NULL,
  field text NOT NULL,
  current_value text,
  suggested_value text,
  reason text,
  status public.report_status NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_entity ON public.data_reports(entity_type, entity_id);
CREATE INDEX idx_reports_status ON public.data_reports(status);
ALTER TABLE public.data_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reports" ON public.data_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own reports" ON public.data_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all reports" ON public.data_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update reports" ON public.data_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at triggers (reuse existing update_updated_at_column)
CREATE TRIGGER trg_titles_updated BEFORE UPDATE ON public.titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spots_updated BEFORE UPDATE ON public.spots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.data_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
