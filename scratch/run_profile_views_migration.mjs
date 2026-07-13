import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://juvrnftgsxxvnitwtkun.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJuZnRnc3h4dm5pdHd0a3VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMDQzMCwiZXhwIjoyMDg4NDg2NDMwfQ.IsTyTMATNCjeyCnwOhna1Eug_FQ5Zxixcn9Gp0AfioE";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const sqlFile = path.resolve(__dirname, "../supabase/add_recruiter_profile_views.sql");
  const sql = fs.readFileSync(sqlFile, "utf8");

  console.log("Running migration via execute_sql RPC...");
  const { data, error } = await supabase.rpc("execute_sql", { query_text: sql });

  if (error) {
    console.error("RPC execution failed:", error);
  } else {
    console.log("Migration executed successfully:", data);
  }
}

main().catch(console.error);
