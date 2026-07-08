import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://juvrnftgsxxvnitwtkun.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJuZnRnc3h4dm5pdHd0a3VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMDQzMCwiZXhwIjoyMDg4NDg2NDMwfQ.IsTyTMATNCjeyCnwOhna1Eug_FQ5Zxixcn9Gp0AfioE";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "aishwarya.shenoy@techcorpsolutions.com";
  console.log(`Checking OTP for: ${email}`);

  // Check profiles table
  const { data: profile, error: profError } = await supabase
    .from("profiles")
    .select("id, email, first_name, otp_code, otp_expires_at")
    .eq("email", email)
    .maybeSingle();

  if (profError) {
    console.error("Error checking profiles:", profError);
  } else if (profile) {
    console.log("Found in profiles (jobseeker):");
    console.log(profile);
  }

  // Check recruiter_profiles table
  const { data: recruiter, error: recError } = await supabase
    .from("recruiter_profiles")
    .select("id, email, recruiter_name, otp_code, otp_expires_at")
    .eq("email", email)
    .maybeSingle();

  if (recError) {
    console.error("Error checking recruiter_profiles:", recError);
  } else if (recruiter) {
    console.log("Found in recruiter_profiles:");
    console.log(recruiter);
  }
}

main().catch(console.error);
