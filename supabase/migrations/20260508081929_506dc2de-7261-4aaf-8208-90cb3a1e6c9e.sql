CREATE TABLE public.watched_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_slug)
);

ALTER TABLE public.watched_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watched titles"
ON public.watched_titles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watched titles"
ON public.watched_titles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watched titles"
ON public.watched_titles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_watched_titles_user ON public.watched_titles(user_id);