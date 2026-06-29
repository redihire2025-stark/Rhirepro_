/**
 * Creates 10 dedicated org-admin accounts (one per seeded org)
 * and reassigns all existing org members to point to the new admin.
 *
 * Run: node scripts/seed-org-admins.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://juvrnftgsxxvnitwtkun.supabase.co";
const SERVICE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJuZnRnc3h4dm5pdHd0a3VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMDQzMCwiZXhwIjoyMDg4NDg2NDMwfQ.IsTyTMATNCjeyCnwOhna1Eug_FQ5Zxixcn9Gp0AfioE";
const ADMIN_PASSWORD = "AdminRhire@2025";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORGS = [
  { num: 1,  email: "admin_org1@redhire.dev",  name: "TechCorp Admin",        company: "TechCorp Solutions Pvt Ltd",          industry: "IT / Software",              location: "Bengaluru, Karnataka",  size: "1001-5000" },
  { num: 2,  email: "admin_org2@redhire.dev",  name: "Finova Admin",           company: "Finova Digital Logistics",            industry: "Logistics & Supply Chain",   location: "Mumbai, Maharashtra",   size: "501-1000"  },
  { num: 3,  email: "admin_org3@redhire.dev",  name: "Acuity Admin",           company: "Acuity Life Sciences & Healthcare",   industry: "Healthcare / Pharmaceuticals", location: "Hyderabad, Telangana", size: "1001-5000" },
  { num: 4,  email: "admin_org4@redhire.dev",  name: "EdSpark Admin",          company: "EdSpark Learning Platforms",          industry: "Education / EdTech",         location: "Pune, Maharashtra",     size: "201-500"   },
  { num: 5,  email: "admin_org5@redhire.dev",  name: "Apex Admin",             company: "Apex Global Consulting",             industry: "Management Consulting",      location: "Chennai, Tamil Nadu",   size: "501-1000"  },
  { num: 6,  email: "admin_org6@redhire.dev",  name: "RetailMart Admin",       company: "RetailMart Supermarkets",            industry: "Retail / FMCG",              location: "New Delhi, NCR",        size: "5001+"     },
  { num: 7,  email: "admin_org7@redhire.dev",  name: "GreenEnergy Admin",      company: "GreenEnergy Renewables India",        industry: "Energy / Renewables",        location: "Ahmedabad, Gujarat",    size: "1001-5000" },
  { num: 8,  email: "admin_org8@redhire.dev",  name: "Foodies Admin",          company: "Foodies App Deliveries",             industry: "E-commerce / Food Delivery", location: "Gurugram, Haryana",     size: "1001-5000" },
  { num: 9,  email: "admin_org9@redhire.dev",  name: "StarMedia Admin",        company: "StarMedia Digital Network",          industry: "Media & Entertainment",      location: "Noida, Uttar Pradesh",  size: "501-1000"  },
  { num: 10, email: "admin_org10@redhire.dev", name: "BuildWell Admin",        company: "BuildWell Infrastructure & Housing", industry: "Real Estate / Construction", location: "Kolkata, West Bengal",  size: "1001-5000" },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log("=".repeat(60));
  console.log("RhirePro — Seeding 10 Org Admin Accounts");
  console.log("=".repeat(60));

  const results = [];

  for (const org of ORGS) {
    process.stdout.write(`\n[Org ${org.num}] ${org.company}...`);

    // ── 1. Create auth user ──────────────────────────────────
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: org.email,
      password: ADMIN_PASSWORD,
      email_confirm: true,   // auto-confirm, no email needed
      user_metadata: {
        role: "recruiter",
        recruiter_name: org.name,
        company_name: org.company,
        industry: org.industry,
        company_size: org.size,
        phone: "",
      },
    });

    if (authErr) {
      if (authErr.message?.includes("already been registered")) {
        console.log(` already exists, skipping auth creation.`);
        // Still need to fetch the existing user id
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users.find(u => u.email === org.email);
        if (!existing) { console.log(" ERROR: could not find existing user"); continue; }
        authData.user = existing;
      } else {
        console.log(` AUTH ERROR: ${authErr.message}`);
        continue;
      }
    }

    const adminId = authData.user.id;
    process.stdout.write(` auth created (${adminId.slice(0, 8)}…)`);

    // ── 2. Wait for trigger to create recruiter_profile ──────
    let profile = null;
    for (let i = 0; i < 8; i++) {
      await sleep(700);
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("id", adminId)
        .maybeSingle();
      if (data) { profile = data; break; }
    }

    if (!profile) {
      // Trigger may not have fired — insert manually
      await supabase.from("recruiter_profiles").upsert({
        id: adminId,
        email: org.email,
        recruiter_name: org.name,
        company_name: org.company,
        industry: org.industry,
        company_size: org.size,
      }, { onConflict: "id" });
      process.stdout.write(` profile inserted manually`);
    }

    // ── 3. Set admin fields on the profile ───────────────────
    const { error: profileErr } = await supabase
      .from("recruiter_profiles")
      .update({
        recruiter_name: org.name,
        company_name:   org.company,
        industry:       org.industry,
        company_size:   org.size,
        location:       org.location,
        org_role:       "admin",
        org_admin_id:   null,
        is_active:      true,
        max_seats:      10,
      })
      .eq("id", adminId);

    if (profileErr) {
      console.log(` PROFILE ERR: ${profileErr.message}`);
      continue;
    }
    process.stdout.write(` profile updated`);

    // ── 4. Demote existing _rec1 back to member ──────────────
    // Find _rec1 for this org (was previously set as admin by migration)
    const rec1Email = `recruiter_org${org.num}_rec1@redhire.dev`;
    const { data: rec1 } = await supabase
      .from("recruiter_profiles")
      .select("id")
      .eq("email", rec1Email)
      .maybeSingle();

    if (rec1) {
      await supabase.from("recruiter_profiles").update({
        org_role: "member",
        org_admin_id: adminId,
      }).eq("id", rec1.id);
    }

    // ── 5. Reassign ALL existing org members to new admin ────
    const memberEmailPattern = `recruiter_org${org.num}_%@redhire.dev`;
    const { error: memberErr } = await supabase
      .from("recruiter_profiles")
      .update({ org_role: "member", org_admin_id: adminId })
      .like("email", `recruiter_org${org.num}_%@redhire.dev`)
      .neq("id", adminId);

    if (memberErr) {
      console.log(` MEMBER UPDATE ERR: ${memberErr.message}`);
    } else {
      process.stdout.write(` → all org${org.num} members reassigned ✓`);
    }

    results.push({ ...org, adminId });
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n\n" + "=".repeat(60));
  console.log("ADMIN ACCOUNTS CREATED");
  console.log("=".repeat(60));
  console.log(`Password (all): ${ADMIN_PASSWORD}\n`);

  const table = results.map(r => ({
    "Org": `Org ${r.num}`,
    "Email": r.email,
    "Company": r.company,
    "Admin ID (first 8)": r.adminId?.slice(0, 8) + "…",
  }));
  console.table(table);

  console.log("\n✅ Done! Run the SQL migration first if you haven't already.");
  console.log(`   Sign in at: https://rhirepro.netlify.app/recruiter/signin`);
}

main().catch(err => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
