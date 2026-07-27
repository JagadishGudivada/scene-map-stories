-- 1. Profiles: restrict anonymous reads to public passports only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles readable by anon"
ON public.profiles FOR SELECT TO anon
USING (is_public_passport = true);

CREATE POLICY "Profiles readable by authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- 2. affiliate_clicks: validate shape of anonymous/user submitted tracking rows
ALTER TABLE public.affiliate_clicks
  ADD CONSTRAINT affiliate_clicks_partner_len CHECK (char_length(partner) BETWEEN 1 AND 80),
  ADD CONSTRAINT affiliate_clicks_service_allowed CHECK (char_length(service) BETWEEN 1 AND 40),
  ADD CONSTRAINT affiliate_clicks_destination_url_valid CHECK (
    destination_url ~ '^https?://' AND char_length(destination_url) BETWEEN 8 AND 2048
  ),
  ADD CONSTRAINT affiliate_clicks_spot_name_len CHECK (spot_name IS NULL OR char_length(spot_name) <= 200),
  ADD CONSTRAINT affiliate_clicks_location_name_len CHECK (location_name IS NULL OR char_length(location_name) <= 200),
  ADD CONSTRAINT affiliate_clicks_origin_len CHECK (origin IS NULL OR char_length(origin) <= 200);

-- 3. SECURITY DEFINER functions: remove needless API execute rights
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_passport_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_passport_public(uuid) TO anon, authenticated;