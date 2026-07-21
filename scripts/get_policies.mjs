import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

global.WebSocket = ws;

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

async function run() {
  const { data, error } = await supabase.rpc("execute_sql", {
    query_text: `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('recruiter_profiles', 'jobs', 'applications');
    `
  });

  if (error) {
    // If execute_sql RPC doesn't exist, we can query it using a normal SELECT or inspect error
    console.log("RPC Error (checking if execute_sql exists):", error);
    // Let's try standard raw query via REST API or try calling information schema.
    // If not, we will query via a custom function or postgres endpoint.
  } else {
    console.log("POLICIES:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
