-- Watched titles (user has seen this movie/series/book)
CREATE TABLE public.watched_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_slug)
);
ALTER TABLE public.watched_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watched titles" ON public.watched_titles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watched titles" ON public.watched_titles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watched titles" ON public.watched_titles FOR DELETE TO authenticated USING (auth.uid() = user_id);
