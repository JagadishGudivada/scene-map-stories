CREATE TABLE public.affiliate_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  partner text NOT NULL,
  service text NOT NULL,
  spot_name text NULL,
  location_name text NULL,
  origin text NULL,
  destination_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_created_at ON public.affiliate_clicks (created_at DESC);
CREATE INDEX idx_affiliate_clicks_partner ON public.affiliate_clicks (partner);
CREATE INDEX idx_affiliate_clicks_service ON public.affiliate_clicks (service);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert affiliate clicks"
  ON public.affiliate_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
