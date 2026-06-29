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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { count, error } = await supabase
    .from("recruiter_profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching count:", error);
  } else {
    console.log("Total recruiter profiles in database:", count);
  }

  // Let's print the last 5 recruiter profiles
  const { data, error: fetchErr } = await supabase
    .from("recruiter_profiles")
    .select("id, email, recruiter_name, company_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (fetchErr) {
    console.error("Error fetching recent profiles:", fetchErr);
  } else {
    console.log("Recent recruiter profiles in database:", data);
  }
}

check();
