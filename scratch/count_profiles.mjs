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
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching count:", error);
  } else {
    console.log("Total profiles in database:", count);
  }

  // Let's also print the last 5 profiles to see if the candidates are there
  const { data, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (fetchErr) {
    console.error("Error fetching recent profiles:", fetchErr);
  } else {
    console.log("Recent profiles in database:", data);
  }
}

check();
