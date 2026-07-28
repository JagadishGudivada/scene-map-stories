-- Replace policies that depend on SECURITY DEFINER helpers with inline checks
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins read all reports" ON public.data_reports;
CREATE POLICY "Admins read all reports" ON public.data_reports
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update reports" ON public.data_reports;
CREATE POLICY "Admins update reports" ON public.data_reports
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read all affiliate clicks" ON public.affiliate_clicks;
CREATE POLICY "Admins read all affiliate clicks" ON public.affiliate_clicks
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

DROP POLICY IF EXISTS "Public read visited spots when public" ON public.visited_spots;
CREATE POLICY "Public read visited spots when public" ON public.visited_spots
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.user_id = visited_spots.user_id AND p.is_public_passport = true
));

-- Revoke direct execution of SECURITY DEFINER helpers from API roles
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_passport_public(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;