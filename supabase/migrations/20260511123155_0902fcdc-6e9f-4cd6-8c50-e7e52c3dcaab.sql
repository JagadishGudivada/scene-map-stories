
CREATE TYPE public.suggestion_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE public.location_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title_slug TEXT NOT NULL,
  title_name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  description TEXT,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  verified_lat DOUBLE PRECISION,
  verified_lng DOUBLE PRECISION,
  verified_label TEXT,
  ai_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_suggestions_title_slug ON public.location_suggestions(title_slug);
CREATE INDEX idx_location_suggestions_status ON public.location_suggestions(status);

ALTER TABLE public.location_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own suggestions"
ON public.location_suggestions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own suggestions"
ON public.location_suggestions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified suggestions"
ON public.location_suggestions FOR SELECT TO anon, authenticated
USING (status = 'verified');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_location_suggestions_updated_at
BEFORE UPDATE ON public.location_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
