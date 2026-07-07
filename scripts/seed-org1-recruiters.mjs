import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://juvrnftgsxxvnitwtkun.supabase.co";
const SERVICE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJuZnRnc3h4dm5pdHd0a3VuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjkxMDQzMCwiZXhwIjoyMDg4NDg2NDMwfQ.IsTyTMATNCjeyCnwOhna1Eug_FQ5Zxixcn9Gp0AfioE";
const RECRUITER_PASSWORD = "AdminRhire@2025";
const ORG1_ADMIN_ID = "25308395-e13c-46cc-ae67-ba30d1d12c81";
const COMPANY_NAME = "TechCorp Solutions Pvt Ltd";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RECRUITERS = [
  {
    email: "recruiter_org1_rec2@redhire.dev",
    name: "Sarah Jenkins",
    title: "Senior Technical Recruiter",
    phone: "+91 99887 76655",
    location: "Hyderabad, Telangana",
    resumes_viewed: 15,
    keywords: ["react", "node", "typescript", "aws", "kubernetes"],
    jobs: [
      {
        title: "Senior Backend Engineer (Node.js)",
        description: "We are seeking a Senior Backend Engineer to join our core services team. You will design, build, and optimize scalable APIs and microservices using Node.js, NestJS, and PostgreSQL.",
        work_mode: "Hybrid",
        salary_min: 18,
        salary_max: 28,
        experience_min: 5,
        experience_max: 8,
        employment_type: "Full-time",
        skills: ["Node.js", "TypeScript", "NestJS", "PostgreSQL", "Redis"],
        perks: ["Health Insurance", "Flexible Hours", "Stock Options", "Free Meals"],
        openings: 2,
        interview_mode: "Video Call",
      },
      {
        title: "Cloud Systems & DevOps Architect",
        description: "We are looking for a DevOps Architect to lead our cloud infrastructure engineering. You will manage Kubernetes clusters, build automation pipelines, and drive architectural choices for high availability.",
        work_mode: "Work from Office",
        salary_min: 25,
        salary_max: 40,
        experience_min: 7,
        experience_max: 12,
        employment_type: "Full-time",
        skills: ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD"],
        perks: ["Health Insurance", "Stock Options", "Annual Bonus", "Gym Membership"],
        openings: 1,
        interview_mode: "In-Person",
      }
    ]
  },
  {
    email: "recruiter_org1_rec3@redhire.dev",
    name: "David Miller",
    title: "Talent Acquisition Manager",
    phone: "+91 88776 65544",
    location: "Hyderabad, Telangana",
    resumes_viewed: 24,
    keywords: ["java", "springboot", "testing", "selenium", "cypress"],
    jobs: [
      {
        title: "React Frontend Engineer",
        description: "Join our user experience team to design and build highly interactive, responsive web applications using React, Next.js, and modern CSS frameworks like Tailwind.",
        work_mode: "Remote",
        salary_min: 12,
        salary_max: 20,
        experience_min: 3,
        experience_max: 6,
        employment_type: "Full-time",
        skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux"],
        perks: ["Work from Home", "Flexible Hours", "Internet Allowance", "Annual Bonus"],
        openings: 3,
        interview_mode: "Video Call",
      },
      {
        title: "QA Automation Lead",
        description: "Lead our software quality assurance team. Responsible for designing, implementing, and maintaining automated testing frameworks for frontend, backend APIs, and mobile applications.",
        work_mode: "Hybrid",
        salary_min: 15,
        salary_max: 25,
        experience_min: 5,
        experience_max: 9,
        employment_type: "Full-time",
        skills: ["Selenium", "Cypress", "Playwright", "Java", "API Testing"],
        perks: ["Health Insurance", "Stock Options", "5 Days a Week", "Flexible Hours"],
        openings: 1,
        interview_mode: "Video Call",
      }
    ]
  },
  {
    email: "recruiter_org1_rec4@redhire.dev",
    name: "Emily Chen",
    title: "Technical Recruiter",
    phone: "+91 77665 54433",
    location: "Hyderabad, Telangana",
    resumes_viewed: 8,
    keywords: ["python", "pandas", "spark", "data engineer", "snowflake"],
    jobs: [
      {
        title: "Data Pipeline & Analytics Engineer",
        description: "Build robust, highly scalable data pipelines to process millions of transactions daily. You will work on data warehouse architecture and ETL designs utilizing Spark, Python, and Snowflake.",
        work_mode: "Hybrid",
        salary_min: 16,
        salary_max: 26,
        experience_min: 4,
        experience_max: 8,
        employment_type: "Full-time",
        skills: ["Python", "Spark", "SQL", "Snowflake", "ETL Pipelines"],
        perks: ["Health Insurance", "Free Meals", "Flexible Hours", "5 Days a Week"],
        openings: 2,
        interview_mode: "Video Call",
      },
      {
        title: "AI/ML Product Manager",
        description: "Define the roadmap and drive lifecycle delivery of our enterprise AI tools. Collaborate closely with data scientists, ML engineers, and customer stakeholders to ship high-impact features.",
        work_mode: "Work from Office",
        salary_min: 22,
        salary_max: 35,
        experience_min: 5,
        experience_max: 10,
        employment_type: "Full-time",
        skills: ["Product Management", "Machine Learning", "Agile", "Jira", "Analytics"],
        perks: ["Stock Options", "Annual Bonus", "Health Insurance", "Gym Membership"],
        openings: 1,
        interview_mode: "In-Person",
      }
    ]
  },
  {
    email: "recruiter_org1_rec5@redhire.dev",
    name: "Marcus Johnson",
    title: "Executive Recruiter",
    phone: "+91 66554 43322",
    location: "Hyderabad, Telangana",
    resumes_viewed: 19,
    keywords: ["cybersecurity", "leadership", "manager", "iso27001"],
    jobs: [
      {
        title: "Software Engineering Manager",
        description: "Provide technical leadership, mentoring, and strategic direction to two cross-functional engineering pods. Own design choices, roadmap velocity, and career growth for engineers.",
        work_mode: "Work from Office",
        salary_min: 35,
        salary_max: 50,
        experience_min: 8,
        experience_max: 12,
        employment_type: "Full-time",
        skills: ["Engineering Management", "System Design", "Agile", "Leadership", "Architecture"],
        perks: ["Car Allowance", "Stock Options", "Health Insurance", "Annual Bonus"],
        openings: 1,
        interview_mode: "In-Person",
      },
      {
        title: "Cybersecurity Analyst",
        description: "Implement security controls, perform vulnerability scanning, and secure our production cloud workloads. Monitor threat metrics and establish compliance models against industry standards.",
        work_mode: "Hybrid",
        salary_min: 14,
        salary_max: 24,
        experience_min: 3,
        experience_max: 6,
        employment_type: "Full-time",
        skills: ["Cybersecurity", "AWS Security", "Penetration Testing", "SIEM", "ISO 27001"],
        perks: ["Certification Reimbursement", "Flexible Hours", "Health Insurance", "5 Days a Week"],
        openings: 2,
        interview_mode: "Video Call",
      }
    ]
  },
  {
    email: "recruiter_org1_rec6@redhire.dev",
    name: "Priya Nair",
    title: "HR Specialist",
    phone: "+91 55443 32211",
    location: "Hyderabad, Telangana",
    resumes_viewed: 4,
    keywords: ["figma", "uiux", "design", "wireframing", "technical writing"],
    jobs: [
      {
        title: "Senior UI/UX Designer",
        description: "Lead user research, prototype responsive web applications, and refine our core design systems to create highly intuitive SaaS user experiences.",
        work_mode: "Remote",
        salary_min: 14,
        salary_max: 24,
        experience_min: 4,
        experience_max: 8,
        employment_type: "Full-time",
        skills: ["Figma", "User Research", "Prototyping", "Design Systems", "Wireframing"],
        perks: ["Work from Home", "Internet Allowance", "Flexible Hours", "Learning Budget"],
        openings: 2,
        interview_mode: "Video Call",
      },
      {
        title: "Technical Writer & Documentation Specialist",
        description: "Author comprehensive documentation for our public APIs, developer platforms, and customer-facing guides. Build unified markdown references.",
        work_mode: "Hybrid",
        salary_min: 8,
        salary_max: 14,
        experience_min: 2,
        experience_max: 6,
        employment_type: "Full-time",
        skills: ["Markdown", "Git", "API Documentation", "Technical Writing", "Confluence"],
        perks: ["Flexible Hours", "Health Insurance", "Learning Budget", "Free Snacks"],
        openings: 1,
        interview_mode: "Video Call",
      }
    ]
  },
  {
    email: "recruiter_org1_rec7@redhire.dev",
    name: "Alex Mercer",
    title: "Lead Talent Scout",
    phone: "+91 44332 21100",
    location: "Hyderabad, Telangana",
    resumes_viewed: 11,
    keywords: ["flutter", "dart", "ios", "android", "postgres", "dba"],
    jobs: [
      {
        title: "Mobile App Developer (Flutter)",
        description: "Build beautiful, native cross-platform mobile apps for iOS and Android using Flutter and Dart. Work on offline storage caching and push notification APIs.",
        work_mode: "Hybrid",
        salary_min: 12,
        salary_max: 22,
        experience_min: 3,
        experience_max: 6,
        employment_type: "Full-time",
        skills: ["Flutter", "Dart", "State Management", "Mobile API", "Git"],
        perks: ["Health Insurance", "Flexible Hours", "Gym Membership", "5 Days a Week"],
        openings: 2,
        interview_mode: "Video Call",
      },
      {
        title: "Database Administrator (PostgreSQL)",
        description: "Ensure maximum uptime and performance tuning for our PostgreSQL databases. Manage database replication, perform query profiling, and build robust disaster recovery pipelines.",
        work_mode: "Work from Office",
        salary_min: 16,
        salary_max: 25,
        experience_min: 4,
        experience_max: 8,
        employment_type: "Full-time",
        skills: ["PostgreSQL", "SQL Tuning", "Database Replication", "Linux", "AWS RDS"],
        perks: ["Health Insurance", "Annual Bonus", "5 Days a Week", "Stock Options"],
        openings: 1,
        interview_mode: "In-Person",
      }
    ]
  }
];

const MOCK_AISHWARYA_MEMBERS = [
  { email: "tanveer.jain@techcorpsolutions.com", views: 23, keywords: ["java", "spring", "sql", "hibernate", "restapi"] },
  { email: "praneetha.saniel@techcorpsolutions.com", views: 14, keywords: ["figma", "ui", "ux", "wireframing", "adobe"] },
  { email: "neel.dhamdhame@techcorpsolutions.com", views: 9, keywords: ["node", "express", "mongodb", "javascript", "backend"] },
  { email: "ishwar.anchan@techcorpsolutions.com", views: 18, keywords: ["aws", "terraform", "jenkins", "docker", "ansible"] },
  { email: "raghav.gupta@techcorpsolutions.com", views: 32, keywords: ["python", "django", "pandas", "numpy", "matplotlib"] },
  { email: "dhruv.dalvi@techcorpsolutions.com", views: 7, keywords: ["cypress", "selenium", "testing", "automation", "jest"] },
  { email: "jeet.bhoja@techcorpsolutions.com", views: 11, keywords: ["react", "redux", "javascript", "nextjs", "css"] },
  { email: "suraksha.chiplunkar@techcorpsolutions.com", views: 5, keywords: ["technical writing", "markdown", "git", "api"] },
  { email: "kavitha.jain@techcorpsolutions.com", views: 16, keywords: ["product manager", "agile", "scrum", "jira", "roadmap"] }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log("============================================================");
  console.log("RhirePro — Seeding Org 1 Recruiters and Jobs (Resilient Mode)");
  console.log("============================================================\n");

  for (const recruiter of RECRUITERS) {
    console.log(`Processing recruiter: ${recruiter.email}...`);

    // 1. Create/Fetch Auth User
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: recruiter.email,
      password: RECRUITER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "recruiter",
        recruiter_name: recruiter.name,
        company_name: COMPANY_NAME,
        phone: recruiter.phone,
      }
    });

    let recruiterId;
    if (authErr) {
      if (authErr.message?.includes("already been registered")) {
        console.log(`  Auth user already exists, fetching ID...`);
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users.find(u => u.email === recruiter.email);
        if (!existing) {
          console.error(`  ERROR: could not find existing auth user for ${recruiter.email}`);
          continue;
        }
        recruiterId = existing.id;
      } else {
        console.error(`  AUTH ERROR: ${authErr.message}`);
        continue;
      }
    } else {
      recruiterId = authData.user.id;
      console.log(`  Auth user created: ${recruiterId}`);
    }

    // 2. Wait for trigger/insert recruiter_profile
    let profile = null;
    for (let i = 0; i < 5; i++) {
      await sleep(500);
      const { data } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("id", recruiterId)
        .maybeSingle();
      if (data) {
        profile = data;
        break;
      }
    }

    if (!profile) {
      console.log(`  Trigger did not insert profile, creating manually...`);
      const { error: insertErr } = await supabase.from("recruiter_profiles").upsert({
        id: recruiterId,
        email: recruiter.email,
      });
      if (insertErr) {
        console.error(`  PROFILE INSERT ERROR: ${insertErr.message}`);
        continue;
      }
    }

    // 3. Try to update profile with metrics columns
    const updatePayloadFull = {
      recruiter_name: recruiter.name,
      company_name: COMPANY_NAME,
      industry: "IT / Software",
      company_size: "1001-5000",
      phone: recruiter.phone,
      location: recruiter.location,
      org_role: "member",
      org_admin_id: ORG1_ADMIN_ID,
      is_active: true,
      max_seats: 5,
      resumes_viewed_count: recruiter.resumes_viewed,
      keywords_used: recruiter.keywords
    };

    const updatePayloadBase = {
      recruiter_name: recruiter.name,
      company_name: COMPANY_NAME,
      industry: "IT / Software",
      company_size: "1001-5000",
      phone: recruiter.phone,
      location: recruiter.location,
      org_role: "member",
      org_admin_id: ORG1_ADMIN_ID,
      is_active: true,
      max_seats: 5
    };

    let { error: updateErr } = await supabase
      .from("recruiter_profiles")
      .update(updatePayloadFull)
      .eq("id", recruiterId);

    if (updateErr) {
      console.log(`  Could not write tracking columns (database migration pending). Trying base profile update...`);
      const { error: baseUpdateErr } = await supabase
        .from("recruiter_profiles")
        .update(updatePayloadBase)
        .eq("id", recruiterId);

      if (baseUpdateErr) {
        console.error(`  BASE PROFILE UPDATE ERROR: ${baseUpdateErr.message}`);
        continue;
      } else {
        console.log(`  Base profile details seeded successfully.`);
      }
    } else {
      console.log(`  Profile details & metrics seeded successfully.`);
    }

    // 4. Post Jobs
    for (const job of recruiter.jobs) {
      // Check if job already exists to avoid duplicates
      const { data: existingJobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("recruiter_id", recruiterId)
        .eq("title", job.title);

      if (existingJobs && existingJobs.length > 0) {
        console.log(`  Job "${job.title}" already exists, skipping.`);
        continue;
      }

      const { data: jobData, error: jobErr } = await supabase.from("jobs").insert({
        recruiter_id: recruiterId,
        title: job.title,
        description: job.description,
        company_name: COMPANY_NAME,
        location: job.work_mode === "Remote" ? "India" : "Hyderabad",
        work_mode: job.work_mode,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_type: "LPA",
        experience_min: job.experience_min,
        experience_max: job.experience_max,
        employment_type: job.employment_type,
        industry: "IT / Software",
        skills: job.skills,
        perks: job.perks,
        openings: job.openings,
        status: "Active",
        interview_mode: job.interview_mode
      }).select("id").single();

      if (jobErr) {
        console.error(`  JOB INSERT ERROR for "${job.title}": ${jobErr.message}`);
      } else {
        console.log(`  Job posted successfully: "${job.title}" (${jobData.id})`);
      }
    }
    console.log("");
  }

  // 5. Seed Mock Stats for Aishwarya Shenoy's Team (resiliently)
  console.log("Seeding mock stats for existing recruiters of TechCorp...");
  for (const member of MOCK_AISHWARYA_MEMBERS) {
    const { error: updateErr } = await supabase
      .from("recruiter_profiles")
      .update({
        resumes_viewed_count: member.views,
        keywords_used: member.keywords
      })
      .eq("email", member.email);

    if (updateErr) {
      console.log(`  Could not write metrics columns to ${member.email} (migration pending). Base profile remains intact.`);
    } else {
      console.log(`  Seeded views=${member.views}, keywords=[${member.keywords.join(", ")}] for ${member.email}`);
    }
  }

  console.log("\n============================================================");
  console.log("✅ Seeding Complete! Please remember to run the SQL migration.");
  console.log("============================================================");
}

main().catch(console.error);
