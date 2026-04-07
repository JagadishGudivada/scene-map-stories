
-- Saved titles
CREATE TABLE public.saved_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_slug)
);
ALTER TABLE public.saved_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved titles" ON public.saved_titles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved titles" ON public.saved_titles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved titles" ON public.saved_titles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved locations
CREATE TABLE public.saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_slug)
);
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved locations" ON public.saved_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved locations" ON public.saved_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved locations" ON public.saved_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);
