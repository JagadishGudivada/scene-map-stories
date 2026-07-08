CREATE TABLE public.user_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone integer NOT NULL,
  shown_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone)
);

GRANT SELECT, INSERT ON public.user_milestones TO authenticated;
GRANT ALL ON public.user_milestones TO service_role;

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own milestones"
  ON public.user_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own milestones"
  ON public.user_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);