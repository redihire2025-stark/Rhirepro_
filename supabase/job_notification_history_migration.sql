-- =============================================================
-- RhirePro - Job notification history and duplicate-safe keys
-- Run this once in Supabase SQL Editor before/with job_expiry_scheduler.sql
-- =============================================================

alter table public.notifications
  add column if not exists job_id uuid references public.jobs(id) on delete set null;

alter table public.notifications
  add column if not exists notification_key text;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'application',
    'message',
    'status_change',
    'job_alert',
    'expiry_warning',
    'expired',
    'reposted'
  ));

create unique index if not exists notifications_notification_key_idx
  on public.notifications(notification_key);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, user_type, is_read, created_at desc);

create index if not exists notifications_job_id_idx
  on public.notifications(job_id, created_at desc);
