# RhirePro — Release Notes

---

## v0.4.0 — Email OTP & Password Reset Overhaul
**Branch:** `feature/testimonials-ui`
**Date:** 26 March 2026

---

### What Changed

#### ✉ Real Email OTP (Brevo)
- Replaced EmailJS with **Brevo REST API** for sending OTPs
- OTPs are now delivered to the user's actual inbox — no more dev-mode yellow banner showing the code on screen
- Two distinct email subjects:
  - Sign-in → **"RhirePro Login OTP: 123456"**
  - Forgot password → **"RhirePro Password Reset OTP: 789012"**

#### 🔐 OTP-Based Password Reset (New Flow)
- Forgot password no longer sends a Supabase email link
- New in-app flow:
  1. User enters their email → OTP is sent to their inbox
  2. User enters the 6-digit OTP + new password directly in the app
  3. Password is reset instantly — no redirect, no external links
- Works for both **Job Seekers** and **Recruiters**

#### 🛠 Local Dev Setup
- `npm run dev` now starts **two servers together**:
  - Vite (frontend) on port `5173`
  - Email server (Brevo proxy) on port `3001`
- No need for `netlify dev` or separate terminals
- Vite proxies all `/api/*` requests to the local email server automatically

#### ☁ Production (Netlify)
- Three Netlify Functions handle all email/reset operations:
  - `POST /api/send-otp` — sends Login OTP email
  - `POST /api/send-reset-otp` — generates reset OTP server-side, stores in DB, sends email
  - `POST /api/reset-password` — verifies OTP, resets password via Supabase admin API

---

### Setup for New Developers

```bash
git pull origin feature/testimonials-ui
cp .env.example .env        # all dev credentials are pre-filled
npm install
npm run dev
```

Open **http://localhost:5173**

> `.env.example` already contains all working dev credentials for Supabase and Brevo. No manual key setup needed.

---

### Environment Variables (Netlify — Production)

Add these in **Netlify → Site configuration → Environment variables**:

| Variable | Where to find |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role |
| `BREVO_API_KEY` | brevo.com → avatar → SMTP & API → **API Keys** tab |
| `BREVO_SENDER_EMAIL` | Must be a verified sender in Brevo |
| `BREVO_SENDER_NAME` | Display name (e.g. `RhirePro`) |

---

### Files Changed

| File | Change |
|---|---|
| `src/lib/email.ts` | Added `sendPasswordResetOTP`, `resetPasswordWithOTP` |
| `src/app/pages/SignInPage.tsx` | OTP-based forgot password flow |
| `src/app/pages/JobSeekerSignIn.tsx` | OTP-based forgot password flow |
| `src/app/pages/RecruiterSignIn.tsx` | OTP-based forgot password flow |
| `scripts/email-server.mjs` | Local dev email server (Brevo + reset endpoints) |
| `netlify/functions/send-otp.mjs` | Production — Login OTP |
| `netlify/functions/send-reset-otp.mjs` | Production — Password Reset OTP (new) |
| `netlify/functions/reset-password.mjs` | Production — Password Reset handler (new) |
| `package.json` | `npm run dev` starts Vite + email server via concurrently |
| `vite.config.ts` | Added `/api` proxy to local email server |
| `.env.example` | Updated with all current dev credentials |

---

### Notes
- The `SUPABASE_SERVICE_ROLE_KEY` is used **server-side only** (Netlify Functions / local email server). It is never sent to the browser.
- The `BREVO_API_KEY` is also server-side only. Never prefix these with `VITE_`.
- Brevo free tier: **3,000 emails/month**, 300/day — sufficient for dev and small-scale production.
