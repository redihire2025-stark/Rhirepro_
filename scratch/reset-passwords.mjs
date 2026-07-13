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

const ADMIN_PASSWORD = "AdminRhire@2025";
const ORGS = [
  "admin_org1@redhire.dev",
  "admin_org2@redhire.dev",
  "admin_org3@redhire.dev",
  "admin_org4@redhire.dev",
  "admin_org5@redhire.dev",
  "admin_org6@redhire.dev",
  "admin_org7@redhire.dev",
  "admin_org8@redhire.dev",
  "admin_org9@redhire.dev",
  "admin_org10@redhire.dev",
];

async function reset() {
  console.log("Fetching all auth users...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Failed to list users:", error);
    return;
  }

  for (const email of ORGS) {
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.log(`User not found: ${email}`);
      continue;
    }

    console.log(`Resetting password for ${email} (ID: ${user.id})...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
    });

    if (updateErr) {
      console.error(`Failed to update password for ${email}:`, updateErr.message);
    } else {
      console.log(`Successfully updated password for ${email} to ${ADMIN_PASSWORD}`);
    }
  }
  console.log("All done!");
}

reset();
