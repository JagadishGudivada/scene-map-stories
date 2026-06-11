-- Schedule the enrichment-cron edge function to run daily at 02:00 UTC.
--
-- Prerequisites (run once in Supabase SQL editor, not in migrations):
--   alter database postgres set app.settings.service_role_key = '<your-service-role-key>';
--
-- pg_cron and pg_net must be enabled (Supabase dashboard → Integrations → Cron).

select cron.schedule(
  'enrichment-cron-daily',
  '0 2 * * *',
  $$
  select net.http_post(
    url     := 'https://vtblupfehbkrbnsdrrfq.supabase.co/functions/v1/enrichment-cron',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
