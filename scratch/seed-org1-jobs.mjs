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

const RECRUITERS = [
  { id: "070e8615-02f9-42dd-8000-6b19cf95c08a", email: "admin_org1@redhire.dev", name: "TechCorp Admin" },
  { id: "c7c73ace-1efb-4224-a39e-5a707cbb033b", email: "recruiter_org1_rec1@redhire.dev", name: "Alice Smith" },
  { id: "c78619b8-3969-4c47-872c-16b7c2ebbdf5", email: "recruiter_org1_rec2@redhire.dev", name: "Bob Johnson" },
  { id: "e51e6151-a889-4376-8a84-f34c5038ab7f", email: "recruiter_org1_rec3@redhire.dev", name: "Charlie Brown" },
  { id: "2fb76a24-625d-4ffa-b817-3cf7585fb106", email: "recruiter_org1_rec4@redhire.dev", name: "Diana Prince" },
  { id: "4280d062-3863-4032-a795-e864ce2f06b9", email: "recruiter_org1_rec5@redhire.dev", name: "Ethan Hunt" },
];

const JOB_TEMPLATES = [
  {
    title: "Senior Full Stack Engineer",
    description: "We are seeking an experienced Full Stack Engineer proficient in React, Node.js, and PostgreSQL to design and build scalable applications.",
    work_mode: "Hybrid",
    salary_min: 15,
    salary_max: 28,
    experience_min: 4,
    experience_max: 8,
    employment_type: "Full-time",
    skills: ["React", "Node.js", "PostgreSQL", "TypeScript", "AWS"],
    perks: ["Health Insurance", "Stock Options", "Flexible Hours"],
  },
  {
    title: "DevOps Engineer",
    description: "Looking for a DevOps Engineer to automate and streamline our operations, deployment, and infrastructure processes.",
    work_mode: "Hybrid",
    salary_min: 12,
    salary_max: 22,
    experience_min: 3,
    experience_max: 6,
    employment_type: "Full-time",
    skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
    perks: ["Health Insurance", "Stock Options", "Remote Work Allowance"],
  },
  {
    title: "QA Automation Engineer",
    description: "We are looking for a QA Automation Engineer to lead automated testing of our mobile and web applications.",
    work_mode: "Work from Office",
    salary_min: 8,
    salary_max: 15,
    experience_min: 2,
    experience_max: 5,
    employment_type: "Full-time",
    skills: ["Selenium", "Cypress", "JavaScript", "API Testing"],
    perks: ["Health Insurance", "Annual Bonus", "Gym Membership"],
  },
  {
    title: "UI/UX Designer",
    description: "Join us to shape the visual identity and user experience of our product. You will own user research and high-fidelity wireframing.",
    work_mode: "Hybrid",
    salary_min: 10,
    salary_max: 18,
    experience_min: 2,
    experience_max: 5,
    employment_type: "Full-time",
    skills: ["Figma", "Adobe XD", "Wireframing", "User Research"],
    perks: ["Health Insurance", "Work from Home Allowance", "Learning Stipend"],
  },
  {
    title: "Product Manager",
    description: "Looking for a PM to lead cross-functional teams to define, develop, and deploy new product features.",
    work_mode: "Work from Office",
    salary_min: 18,
    salary_max: 30,
    experience_min: 3,
    experience_max: 7,
    employment_type: "Full-time",
    skills: ["Agile", "Product Strategy", "Jira", "User Stories"],
    perks: ["Health Insurance", "Performance Bonus", "Flexible Leave"],
  },
  {
    title: "Python Backend Developer",
    description: "We need a Python developer experienced in FastAPI or Django to build high-performance backend microservices.",
    work_mode: "Hybrid",
    salary_min: 11,
    salary_max: 20,
    experience_min: 3,
    experience_max: 6,
    employment_type: "Full-time",
    skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
    perks: ["Health Insurance", "Flexible Working Hours", "Annual Bonus"],
  },
];

async function seed() {
  console.log("Seeding 2 jobs for each of the 6 recruiters of Org 1...");
  
  let jobCount = 0;
  for (let idx = 0; idx < RECRUITERS.length; idx++) {
    const rec = RECRUITERS[idx];
    console.log(`\nAdding jobs for recruiter ${rec.email} (ID: ${rec.id})...`);
    
    // Choose 2 templates based on recruiter index
    const t1 = JOB_TEMPLATES[(idx * 2) % JOB_TEMPLATES.length];
    const t2 = JOB_TEMPLATES[(idx * 2 + 1) % JOB_TEMPLATES.length];
    
    const jobsToInsert = [
      {
        recruiter_id: rec.id,
        title: t1.title,
        description: t1.description,
        company_name: "TechCorp Solutions Pvt Ltd",
        location: "Bengaluru, Karnataka",
        work_mode: t1.work_mode,
        salary_min: t1.salary_min,
        salary_max: t1.salary_max,
        salary_type: "LPA",
        experience_min: t1.experience_min,
        experience_max: t1.experience_max,
        employment_type: t1.employment_type,
        industry: "IT / Software",
        skills: t1.skills,
        perks: t1.perks,
        openings: 1,
        status: "Active",
      },
      {
        recruiter_id: rec.id,
        title: t2.title,
        description: t2.description,
        company_name: "TechCorp Solutions Pvt Ltd",
        location: "Bengaluru, Karnataka",
        work_mode: t2.work_mode,
        salary_min: t2.salary_min,
        salary_max: t2.salary_max,
        salary_type: "LPA",
        experience_min: t2.experience_min,
        experience_max: t2.experience_max,
        employment_type: t2.employment_type,
        industry: "IT / Software",
        skills: t2.skills,
        perks: t2.perks,
        openings: 2,
        status: "Active",
      }
    ];

    const { data, error } = await supabase
      .from("jobs")
      .insert(jobsToInsert)
      .select();

    if (error) {
      console.error(`Failed to insert jobs for ${rec.email}:`, error.message);
    } else {
      console.log(`Successfully added 2 jobs: "${t1.title}" and "${t2.title}"`);
      jobCount += data.length;
    }
  }

  console.log(`\nAll done! Successfully inserted ${jobCount} total jobs for Org 1.`);
}

seed();
