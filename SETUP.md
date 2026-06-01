# RedHire — Supabase Setup Guide

## Why Supabase?
- **Free forever tier** — 500MB DB, 1GB Storage, 50k monthly active users
- Built-in Auth (email/password, OTP, Google OAuth)
- Real-time subscriptions (notifications)
- PostgreSQL (relational, perfect for jobs/applications/profiles)
- File storage for avatars and resumes

---

## Step 1 — Create a Supabase Project

1. Go to https://supabase.com → Sign up (free)
2. Click **New Project**
3. Name: `redhire` | DB Password: (save this) | Region: closest to you
4. Wait ~2 minutes for the project to be ready

---

## Step 2 — Set Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in: **Supabase Dashboard → Settings → API**
- Project URL = `VITE_SUPABASE_URL`
- `anon` `public` key = `VITE_SUPABASE_ANON_KEY`

---

## Step 3 — Run the Schema

1. Go to **Supabase Dashboard → SQL Editor**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**
4. If the `jobs` table already exists in your project, also run:

```sql
alter table jobs add column if not exists deadline_time text;
alter table jobs alter column deadline set default (now() + interval '15 days');
update jobs set deadline = created_at + interval '15 days' where deadline is null;
alter table jobs drop constraint if exists jobs_deadline_time_check;
alter table jobs add constraint jobs_deadline_time_check
  check (deadline_time is null or deadline_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table notifications add column if not exists job_id uuid references jobs(id) on delete set null;
alter table notifications add column if not exists notification_key text;
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('application','message','status_change','job_alert','expiry_warning','expired','reposted'));
create unique index if not exists notifications_notification_key_idx
  on notifications(notification_key);
create index if not exists notifications_user_unread_idx
  on notifications(user_id, user_type, is_read, created_at desc);
create index if not exists notifications_job_id_idx
  on notifications(job_id, created_at desc);
```

5. Paste the contents of `supabase/job_expiry_scheduler.sql`
6. Click **Run** to enable automatic daily expiry-status updates for jobs

---

## Step 4 — Configure Google OAuth (Optional, for Job Seekers)

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable Google
3. Create OAuth credentials at https://console.cloud.google.com:
   - Authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
4. Paste Client ID and Client Secret back into Supabase

---

## Step 5 — Create Dummy Accounts

### Option A: Via the App (Recommended)
Just open the app and sign up with these emails. The sign-up form automatically creates the auth user AND the profile.

### Job Seeker Accounts
| Name | Email | Password |
|------|-------|----------|
| Arjun Mehta | arjun.mehta@redhire.dev | RedHire@123 |
| Priya Sharma | priya.sharma@redhire.dev | RedHire@123 |
| Rohan Gupta | rohan.gupta@redhire.dev | RedHire@123 |
| Sneha Verma | sneha.verma@redhire.dev | RedHire@123 |

### Recruiter Accounts
| Company | Email | Password |
|---------|-------|----------|
| TechCorp Inc. | hr@techcorp.redhire.dev | RedHire@123 |
| Infosys Solutions | hr@infosys.redhire.dev | RedHire@123 |
| Zomato Pvt. Ltd. | hr@zomato.redhire.dev | RedHire@123 |
| Flipkart Internet | hr@flipkart.redhire.dev | RedHire@123 |

### Option B: Via Supabase Auth Admin + Seed SQL
1. Go to **Authentication → Users → Add User** for each account above
2. Set email, password, and check "Auto-confirm email"
3. Copy each user's UUID
4. Open `supabase/seed.sql`, replace the placeholder UUIDs with real ones
5. Run the seed SQL in SQL Editor

---

## Step 6 — Enable Real-time

1. Go to **Database → Replication**
2. Enable real-time for tables: `notifications`, `messages`, `applications`

---

## Step 7 — Storage Buckets

1. Go to **Storage → New Bucket**
2. Create bucket: `avatars` (public)
3. Create bucket: `resumes` (private)
4. Create bucket: `offer-letters` (private)

The `avatars` bucket is also used for recruiter company logos and cover photos. Existing databases should also include these recruiter branding columns:

```sql
alter table public.recruiter_profiles
  add column if not exists cover_image_url text,
  add column if not exists cover_image_name text;
```

Set storage policies:
```sql
-- avatars: public read, authenticated write
create policy "Public avatar access" on storage.objects for select using (bucket_id = 'avatars');
create policy "Auth users upload avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- resumes: owner access + recruiters can read
create policy "Owner resume access" on storage.objects for all using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- offer-letters: authenticated read/write (needed for recruiter offer upload and jobseeker preview/download)
create policy "Authenticated read offer letters" on storage.objects for select using (bucket_id = 'offer-letters' and auth.role() = 'authenticated');
create policy "Authenticated upload offer letters" on storage.objects for insert with check (bucket_id = 'offer-letters' and auth.role() = 'authenticated');
create policy "Authenticated update offer letters" on storage.objects for update using (bucket_id = 'offer-letters' and auth.role() = 'authenticated') with check (bucket_id = 'offer-letters' and auth.role() = 'authenticated');
create policy "Authenticated delete offer letters" on storage.objects for delete using (bucket_id = 'offer-letters' and auth.role() = 'authenticated');
```

---

## Step 8 — OTP Authentication Note

The app uses a simulated OTP flow:
- After signing in with email + password, a 6-digit OTP is generated and stored in the DB
- **During development**: The OTP is displayed on screen in a yellow banner (for testing)
- **In production**: Replace the `generateAndStoreOTP` function with an email/SMS service (e.g., Resend, Twilio)

Supabase's own email OTP can also be enabled via: **Authentication → Email Templates → Magic Link**

---

## How the App Works

### Job Seeker Flow
1. Sign Up → profile stored in `profiles` table
2. Sign In (password) → OTP step → navigate to job seeker dashboard
3. Google Sign In → auto-create profile → navigate to job seeker dashboard
4. Browse jobs (fetched from `jobs` table posted by recruiters)
5. Apply (insert into `applications`) → recruiter gets notification
6. Save jobs, view application status, get status notifications

### Recruiter Flow
1. Sign Up → profile stored in `recruiter_profiles` table
2. Sign In (password) → OTP step → navigate to recruiter dashboard
3. Post jobs → stored in `jobs` table
4. View applicants (from `applications` with full profile + career timeline)
5. Search all candidate profiles by skill/name
6. Change application status → candidate gets notification
7. Send messages to candidates

---

## Running the App

```bash
npm install
npm run dev
```

Open http://localhost:5173
