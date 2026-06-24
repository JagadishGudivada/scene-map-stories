
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public_passport boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.is_passport_public(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_public_passport FROM public.profiles WHERE user_id = _user_id), false)
$$;

GRANT SELECT ON public.visited_spots TO anon;

DROP POLICY IF EXISTS "Public read visited spots when public" ON public.visited_spots;
CREATE POLICY "Public read visited spots when public"
ON public.visited_spots
FOR SELECT
TO anon, authenticated
USING (public.is_passport_public(user_id));
