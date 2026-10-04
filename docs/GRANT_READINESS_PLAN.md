# RhirePro — Readiness Plan for Google for Startups & NVIDIA Inception

Week: Mon–Fri (5 days). Replaces the earlier PDF analysis, which described an older Express/Mongo prototype. Everything below is based on the code in `main`.

## 1. Where the product actually stands

**Already built (don't rebuild):** React/Vite/Tailwind frontend; Supabase (Postgres + RLS, ~60 migrations); jobs, applications, status workflows, saved jobs, compare; seeker + recruiter + org-admin + super-admin areas; Razorpay payments and plans; OTP auth, invites; blog/articles/newsletter/support tickets; Elasticsearch-style master search, Boolean search; Gemini match scoring (`/api/match-score`) and skill/cert insights (`/api/ai-insights`); Terms, Privacy and Refund pages; 342 passing tests.

**Genuine gaps for these two programs:**
1. No *semantic* AI (embeddings/vector search) and no resume parsing — the "AI-matched" claim rests on an LLM prompt only.
2. Auth endpoints had no rate limiting.
3. AI features are not yet wired into the UI end-to-end.
4. Credibility items that only the founders can supply (below).

## 2. Everything to build — status

### Track A — Product/security
| # | Item | Status |
|---|---|---|
| A1 | Rate limiting on send-otp, verify-otp, reset flows, super-admin login | **Built Mon** (`supabase/rate_limits.sql`, `netlify/shared/rateLimit.mjs`) — run the SQL |
| A2 | Baseline security headers (nosniff, HSTS, frame, referrer) | **Built Mon** (`netlify.toml`) |
| A3 | Content-Security-Policy (Report-Only first) | Wed |
| A4 | Privacy Policy/ToS updated to disclose AI processing of resumes & profiles (Gemini) | Wed |

### Track B — AI differentiators (the NVIDIA pitch)
| # | Item | Status |
|---|---|---|
| B1 | Embeddings backend: pgvector, `/api/embed-sync` | **Built Mon** (`supabase/ai_embeddings.sql`) — run the SQL |
| B2 | Semantic job search + applicant ranking: `/api/semantic-search` | **Built Mon** |
| B3 | Resume parsing (PDF → structured profile), `/api/resume-parse` | **Built Mon** (PDF only) |
| B4 | UI: "Parse my resume" + review/confirm prefill in Profile | Tue |
| B5 | UI: call embed-sync after profile save / job post; semantic search bar; "Best match" sort for applicants | Tue |
| B6 | DOCX resume support | Wed |
| B7 | Backfill embeddings for existing profiles/jobs (one-off script) | Wed |
| B8 | AI job-description generator for recruiters | Thu (stretch) |
| B9 | Video-interview analysis (NVIDIA Riva/NIM) | **Roadmap only** — do not claim as built |

### Track C — Credibility (founders only; I can draft but not do these)
- Redihire incorporation: entity type, registration no., founding date (decides eligibility: Google Start ≤24 months per the program; NVIDIA under 10 years — verify on the official pages).
- Live site on your own domain + an email on that domain (Google checks this match; Gmail will not work).
- Google Cloud billing account (18-character ID) created *before* applying.
- Founder/team list; a few real pilot users or a waitlist number for traction.

## 3. Day-by-day (Mon–Fri)

| Day | Goal | Deliverable |
|---|---|---|
| **Mon (today)** | Backend foundation | A1, A2, B1–B3 built and tested (done). You: run the 2 SQL files, set `OPENAI_API_KEY` in Netlify; start Track C (incorporation date, domain/email, GCP billing). |
| **Tue** | AI visible in the product | B4, B5. Seeker uploads resume → fields prefilled; "AI match %" and semantic search work in the UI. |
| **Wed** | Hardening + coverage | B6, B7, A3, A4. Production deploy of everything so far. |
| **Thu** | Story & materials | Pitch deck (outline §5), finalize application answers (§4), landing-page copy honest about AI features, B8 if time. Founders add traction numbers. |
| **Fri** | Ship & apply | Final QA on production with a real resume + real job; **submit Google for Startups (Start tier) first, NVIDIA Inception second.** |

Honest risk: Tue is the heaviest day (the seeker dashboard is a ~5,000-line file). If B5 slips, ship B4 + semantic search and defer applicant sorting. Applications don't require a finished product — the demo path above is enough to be truthful.

## 4. Application content (drafts — edit with real numbers)

**One-liner:** RhirePro is an AI-driven recruitment platform that matches candidates and jobs by meaning, not keywords, and parses resumes into structured profiles.

**Problem:** Job boards rely on keyword filters; recruiters drown in unranked applicants and seekers miss roles described in different words.

**Solution / AI use (state only what is live):** LLM fit scoring with strengths and gaps; embedding-based semantic search and applicant ranking (pgvector); automated resume parsing; AI skill/certification insights.

**Why GPU/NVIDIA (honest roadmap framing):** Today inference runs on Gemini APIs. Planned: self-hosted embedding/rerank models and video-interview analysis (speech via NVIDIA Riva, NIM microservices) — this is the reason for the request; present it as roadmap.

**Why Google Cloud:** Move AI inference to Vertex AI (Gemini/embeddings) — note: today the new AI endpoints run on OpenAI, so the Google pitch must be honest about migrating, Cloud Run for services, credits to cover embedding and scoring costs as usage grows.

**Traction (fill in):** pilot recruiters __, job seekers __, jobs posted __, paying plans __.

**Do not claim:** funding, revenue, or features that are not shipped. Reviewers verify the website and domain.

## 5. Pitch deck outline (one page / 6 slides)
1. Problem  2. Solution (screens: semantic search, AI match %, resume parse)  3. How the AI works (diagram: resume → parse → embed → rank → explain)  4. Market (India hiring, recruiter-pay model — plans ₹1,000–3,000/mo)  5. Traction + team  6. The ask (credits/GPU access and what they fund)

## 6. Your checklist this week (things only you can do)
- [ ] Run `supabase/rate_limits.sql` and `supabase/ai_embeddings.sql` in the Supabase SQL editor
- [ ] Confirm `OPENAI_API_KEY` (optional `OPENAI_MODEL`, default gpt-4o-mini), `SUPABASE_SERVICE_ROLE_KEY` are set in Netlify
- [ ] Confirm Redihire incorporation date/type/registration number
- [ ] Domain site + domain email live; Google Cloud billing account created
- [ ] Provide founder bios + any traction numbers by Wed
- [ ] Verify program terms on the official NVIDIA and Google pages before Friday (they change)
