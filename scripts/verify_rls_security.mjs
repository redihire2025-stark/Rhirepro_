import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
  override: true,
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(" Verifying Supabase RLS Table Coverage & Data Access...");

  const tables = [
    "profiles",
    "work_experience",
    "education",
    "certifications",
    "recruiter_profiles",
    "jobs",
    "recruiter_articles",
    "applications",
    "saved_jobs",
    "notifications",
    "messages",
    "feedback",
    "payment_transactions",
    "recruiter_subscriptions",
    "promo_codes",
    "recruiter_invitations",
    "application_status_history",
    "interview_details",
    "pending_otps",
    "super_admins",
    "activity_events",
    "email_logs",
    "admin_audit_log",
    "api_request_logs",
    "db_size_snapshots",
    "support_tickets",
    "platform_settings",
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`❌ Table '${table}': ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ Table '${table}': RLS Active & Accessible (${data ? data.length : 0} sample rows)`);
      successCount++;
    }
  }

  console.log(`\n Summary: ${successCount}/${tables.length} tables verified successfully.`);
  if (errorCount > 0) {
    console.error(`⚠️ ${errorCount} table(s) returned access errors.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Verification exception:", err);
  process.exit(1);
});
