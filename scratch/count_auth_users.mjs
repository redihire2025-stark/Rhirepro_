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
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    console.error("Error listing auth users:", error);
  } else {
    console.log("Total auth users in Supabase:", data.users.length);
    console.log("Last 10 auth users created:");
    const sorted = [...data.users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    console.log(sorted.slice(0, 10).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
  }
}

check();
