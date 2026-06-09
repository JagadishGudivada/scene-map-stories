
-- 1. Affiliate clicks: prevent user_id spoofing + allow own/admin reads
DROP POLICY IF EXISTS "Anyone can insert affiliate clicks" ON public.affiliate_clicks;

CREATE POLICY "Insert affiliate clicks own or anon"
ON public.affiliate_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users read own affiliate clicks"
ON public.affiliate_clicks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all affiliate clicks"
ON public.affiliate_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Revoke EXECUTE on security definer helpers from anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- keep EXECUTE for authenticated since RLS policies invoke has_role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Restrict storage bucket listing (public URLs still work for direct access)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read post-images" ON storage.objects;

-- Owners can still list/inspect their own files via API
CREATE POLICY "Owners read own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners read own covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners read own post-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Realtime channel authorization for notifications
-- Allow authenticated users to subscribe only to their own per-user notifications topic
DROP POLICY IF EXISTS "Users subscribe to own notification topic" ON realtime.messages;
CREATE POLICY "Users subscribe to own notification topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('notifications:' || auth.uid()::text)
);
