create policy "Public can read title details cache"
on public.ai_cache
for select
to anon, authenticated
using (
  function_name = 'title-details'
  and expires_at > now()
);
