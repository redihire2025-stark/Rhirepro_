import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://juvrnftgsxxvnitwtkun.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJuZnRnc3h4dm5pdHd0a3VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMDQzMCwiZXhwIjoyMDg4NDg2NDMwfQ.IsTyTMATNCjeyCnwOhna1Eug_FQ5Zxixcn9Gp0AfioE";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, skills, preferred_interview_mode");

  if (error) {
    console.error(error);
    return;
  }

  console.log("Job Seeker Profiles in DB:");
  console.table(profiles);
}

main().catch(console.error);
