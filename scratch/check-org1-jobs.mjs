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
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const IDs = [
  "c7c73ace-1efb-4224-a39e-5a707cbb033b", // rec1
  "c78619b8-3969-4c47-872c-16b7c2ebbdf5", // rec2
  "e51e6151-a889-4376-8a84-f34c5038ab7f", // rec3
  "2fb76a24-625d-4ffa-b817-3cf7585fb106", // rec4
  "4280d062-3863-4032-a795-e864ce2f06b9", // rec5
  "070e8615-02f9-42dd-8000-6b19cf95c08a"  // admin_org1
];

async function check() {
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title, recruiter_id, company_name")
    .in("recruiter_id", IDs);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Jobs matching Org 1 recruiters count: ${jobs?.length}`);
  jobs.forEach(j => {
    console.log(`- Job ID: ${j.id} | Title: "${j.title}" | Recruiter ID: ${j.recruiter_id}`);
  });
}

check();
