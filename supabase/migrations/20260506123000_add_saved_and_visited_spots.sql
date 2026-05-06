-- Saved spots (wishlist)
CREATE TABLE public.saved_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spot_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, spot_slug)
);
ALTER TABLE public.saved_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved spots" ON public.saved_spots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved spots" ON public.saved_spots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved spots" ON public.saved_spots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Been here / visited spots
CREATE TABLE public.visited_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spot_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, spot_slug)
);
ALTER TABLE public.visited_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own visited spots" ON public.visited_spots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own visited spots" ON public.visited_spots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own visited spots" ON public.visited_spots FOR DELETE TO authenticated USING (auth.uid() = user_id);
