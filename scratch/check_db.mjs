import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://juvrnftgsxxvnitwtkun.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJuZnRnc3h4dm5pdHd0a3VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMDQzMCwiZXhwIjoyMDg4NDg2NDMwfQ.IsTyTMATNCjeyCnwOhna1Eug_FQ5Zxixcn9Gp0AfioE"
);

async function run() {
  const { data: apps, error } = await supabase
    .from("applications")
    .select("*, profile:profiles(email), job:jobs(title, company_name, recruiter_id)");
    
  if (error) {
    console.error("Error fetching applications:", error);
    return;
  }
  
  console.log("All Applications:");
  for (const app of apps) {
    console.log(`- Candidate: ${app.profile?.email}, Job: ${app.job?.title}, Company: ${app.job?.company_name}, Recruiter ID: ${app.job?.recruiter_id}`);
  }
}

run();
