-- ── 1. Create Webhook Trigger Function ────────────────────────
create or replace function public.handle_elasticsearch_sync()
returns trigger as $$
declare
  payload json;
  webhook_url text := 'http://your-fastapi-backend-url/webhooks/supabase';
begin
  -- Build the webhook payload matching Supabase Webhook payload specification
  payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', case when TG_OP = 'DELETE' then null else row_to_json(NEW) end,
    'old_record', case when TG_OP = 'INSERT' then null else row_to_json(OLD) end
  );

  -- Perform the asynchronous HTTP POST request to your FastAPI server
  perform net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload::jsonb
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- ── 2. Attach triggers to public.jobs ───────────────────────
drop trigger if exists on_job_change_sync on public.jobs;
create trigger on_job_change_sync
after insert or update or delete
on public.jobs
for each row
execute function public.handle_elasticsearch_sync();

-- ── 3. Attach triggers to public.profiles ───────────────────
drop trigger if exists on_profile_change_sync on public.profiles;
create trigger on_profile_change_sync
after insert or update or delete
on public.profiles
for each row
execute function public.handle_elasticsearch_sync();
