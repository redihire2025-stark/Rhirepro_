-- Job seeker premium plan — mirrors the recruiter_subscriptions /
-- payment_transactions pattern (see plans_migration.sql), separate tables
-- rather than columns on `profiles`, keyed by profile_id (== auth.uid()).
--
-- "Is this job seeker's plan currently active" is decided the same way as
-- recruiters: status = 'active' AND expires_at >= now(), checked at read
-- time by the caller. There is no cron job flipping status to 'expired' —
-- same tradeoff the recruiter side already made.

create table if not exists public.jobseeker_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null default 'premium',
  amount integer not null,
  promo_code text,
  discount_amount integer not null default 0,
  final_amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'expired')),
  payment_method text default 'razorpay',
  transaction_ref text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.jobseeker_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null default 'premium',
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payment_id uuid references public.jobseeker_payment_transactions(id),
  created_at timestamptz default now()
);

create index if not exists idx_jobseeker_payment_transactions_profile on public.jobseeker_payment_transactions(profile_id);
create index if not exists idx_jobseeker_subscriptions_profile_status on public.jobseeker_subscriptions(profile_id, status, expires_at);

alter table public.jobseeker_payment_transactions enable row level security;
alter table public.jobseeker_subscriptions enable row level security;

-- Client-side reads are limited to the owner's own rows. All writes in this
-- feature happen server-side via the service-role key in Netlify Functions
-- (never from the browser), matching how recruiter plan activation works.
drop policy if exists "jobseeker_payment_transactions_owner" on public.jobseeker_payment_transactions;
create policy "jobseeker_payment_transactions_owner"
  on public.jobseeker_payment_transactions
  for select
  using (auth.uid() = profile_id);

drop policy if exists "jobseeker_subscriptions_owner" on public.jobseeker_subscriptions;
create policy "jobseeker_subscriptions_owner"
  on public.jobseeker_subscriptions
  for select
  using (auth.uid() = profile_id);
