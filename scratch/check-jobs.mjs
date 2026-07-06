import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
  override: true,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

async function check() {
  try {
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, title, recruiter_id, company_name");
      
    if (error) {
      console.error("Error fetching jobs:", error.message);
      return;
    }

    console.log(`Total jobs in DB: ${jobs?.length}`);
    console.log("Jobs detail:");
    jobs?.forEach(j => {
      console.log(`- Title: "${j.title}" | Recruiter ID: ${j.recruiter_id} | Company: "${j.company_name}"`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
