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

const PASSWORD = "AdminRhire@2025";
const ORG1_ADMIN_EMAIL = "admin_org1@redhire.dev";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log("============================================================");
  console.log("Seeding/Adding 5 recruiters to Org 1 (TechCorp Solutions)");
  console.log("============================================================");

  // 1. Get Org 1 Admin details
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    return;
  }

  const adminUser = users.find(u => u.email?.toLowerCase() === ORG1_ADMIN_EMAIL.toLowerCase());
  if (!adminUser) {
    console.error(`Org 1 Admin (${ORG1_ADMIN_EMAIL}) not found. Please seed the admins first.`);
    return;
  }
  const adminId = adminUser.id;
  console.log(`Found Org 1 Admin: ${ORG1_ADMIN_EMAIL} (ID: ${adminId})`);

  // Fetch admin profile details to copy company info
  const { data: adminProf, error: profErr } = await supabase
    .from("recruiter_profiles")
    .select("*")
    .eq("id", adminId)
    .single();

  if (profErr || !adminProf) {
    console.error("Failed to fetch admin profile:", profErr?.message);
    return;
  }
  console.log(`Admin Profile: Company=${adminProf.company_name}, Industry=${adminProf.industry}, Location=${adminProf.location}`);

  // 2. Prepare recruiter accounts info
  const recruiters = [
    { email: "recruiter_org1_rec1@redhire.dev", name: "Alice Smith (Org 1 Rec1)" },
    { email: "recruiter_org1_rec2@redhire.dev", name: "Bob Johnson (Org 1 Rec2)" },
    { email: "recruiter_org1_rec3@redhire.dev", name: "Charlie Brown (Org 1 Rec3)" },
    { email: "recruiter_org1_rec4@redhire.dev", name: "Diana Prince (Org 1 Rec4)" },
    { email: "recruiter_org1_rec5@redhire.dev", name: "Ethan Hunt (Org 1 Rec5)" },
  ];

  for (const rec of recruiters) {
    console.log(`\nProcessing ${rec.email}...`);

    // Create auth user
    let user = null;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: rec.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "recruiter",
        recruiter_name: rec.name,
        company_name: adminProf.company_name,
        industry: adminProf.industry,
        company_size: adminProf.company_size,
        phone: "",
      },
    });

    if (authErr) {
      if (authErr.message?.includes("already been registered")) {
        console.log(`  User already exists in Auth. Retrieving existing record.`);
        const existing = users.find(u => u.email?.toLowerCase() === rec.email.toLowerCase());
        if (!existing) {
          console.error(`  Could not find existing user in listed users!`);
          continue;
        }
        user = existing;
        
        // Reset password just in case
        await supabase.auth.admin.updateUserById(user.id, { password: PASSWORD });
        console.log(`  Password reset to default.`);
      } else {
        console.error(`  Auth Error: ${authErr.message}`);
        continue;
      }
    } else {
      user = authData.user;
      console.log(`  Auth created successfully (ID: ${user.id})`);
    }

    // Wait for profile trigger or insert manually
    let profile = null;
    for (let i = 0; i < 5; i++) {
      await sleep(500);
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (data) { profile = data; break; }
    }

    // Upsert profile with linking details
    const { error: upsertErr } = await supabase
      .from("recruiter_profiles")
      .upsert({
        id: user.id,
        email: rec.email,
        recruiter_name: rec.name,
        company_name: adminProf.company_name,
        company_size: adminProf.company_size,
        industry: adminProf.industry,
        location: adminProf.location,
        org_role: "member",
        org_admin_id: adminId,
        is_org_admin: false,
        is_disabled: false,
      }, { onConflict: "id" });

    if (upsertErr) {
      console.error(`  Profile update failed: ${upsertErr.message}`);
    } else {
      console.log(`  Profile linked to Org 1 Admin successfully.`);
    }
  }

  console.log("\n============================================================");
  console.log("All 5 recruiters added successfully!");
  console.log("Password for all accounts:", PASSWORD);
  console.log("============================================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
});
