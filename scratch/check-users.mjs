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
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Supabase auth error:", error);
    } else {
      console.log("Total users found:", users.length);
      console.log("Users in DB:");
      users.forEach(u => console.log(`- ${u.email} (${u.id})`));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
