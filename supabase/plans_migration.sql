-- ─── Recruiter Plan Purchase System ──────────────────────────────────────────
-- Run this migration in your Supabase SQL editor after the main schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Payment Transactions (created first, referenced by subscriptions)
create table if not exists public.payment_transactions (
  id               uuid        primary key default gen_random_uuid(),
  recruiter_id     uuid        not null references public.recruiter_profiles(id) on delete cascade,
  plan_id          text        not null,
  amount           integer     not null,         -- original price in rupees
  promo_code       text,
  discount_amount  integer     not null default 0, -- rupees saved
  final_amount     integer     not null,           -- rupees charged
  status           text        not null default 'pending'
                               check (status in ('pending', 'success', 'failed', 'expired')),
  payment_method   text        default 'phonepe',
  transaction_ref  text,
  created_at       timestamptz default now(),
  completed_at     timestamptz
);

alter table public.payment_transactions enable row level security;

drop policy if exists "Recruiters manage own payments" on public.payment_transactions;
create policy "Recruiters manage own payments"
  on public.payment_transactions for all
  using (auth.uid() = recruiter_id);

-- 2. Recruiter Subscriptions
create table if not exists public.recruiter_subscriptions (
  id               uuid        primary key default gen_random_uuid(),
  recruiter_id     uuid        not null references public.recruiter_profiles(id) on delete cascade,
  plan_id          text        not null,
  status           text        not null default 'active'
                               check (status in ('active', 'expired', 'cancelled')),
  started_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  daily_job_posts  integer,    -- null = unlimited
  payment_id       uuid        references public.payment_transactions(id),
  created_at       timestamptz default now()
);

alter table public.recruiter_subscriptions enable row level security;

drop policy if exists "Recruiters manage own subscriptions" on public.recruiter_subscriptions;
create policy "Recruiters manage own subscriptions"
  on public.recruiter_subscriptions for all
  using (auth.uid() = recruiter_id);

-- 3. Promo Codes (publicly readable, only system can insert)
create table if not exists public.promo_codes (
  id              uuid        primary key default gen_random_uuid(),
  code            text        unique not null,
  discount_type   text        not null check (discount_type in ('percentage', 'fixed', 'set_price')),
  discount_value  integer     not null, -- % or rupees
  valid_until     timestamptz,
  max_uses        integer,
  used_count      integer     default 0,
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

alter table public.promo_codes enable row level security;

drop policy if exists "Promo codes publicly readable" on public.promo_codes;
create policy "Promo codes publicly readable"
  on public.promo_codes for select
  using (true);

-- 4. Seed promo codes
insert into public.promo_codes (code, discount_type, discount_value, valid_until, max_uses)
values
  ('RHIRE20', 'percentage', 20,  now() + interval '1 year', 100),
  ('HIRE50',  'percentage', 50,  now() + interval '1 year',  50),
  ('NEWJOIN', 'fixed',      100, now() + interval '1 year', 200),
  ('RHIRE99', 'set_price',  1,   now() + interval '1 year', 999)  -- testing: pay only ₹1
on conflict (code) do nothing;
