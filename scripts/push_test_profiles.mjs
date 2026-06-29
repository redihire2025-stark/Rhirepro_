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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Domain definitions for dynamic field generation
const domains = [
  {
    name: "Frontend Developer",
    skills: ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS", "Redux", "Vite", "Next.js", "Angular", "Vue.js"],
    titles: ["Frontend Engineer", "React Developer", "UI Engineer", "Software Engineer (Frontend)", "Senior Frontend Developer"],
    headline: "Frontend Developer | React | TypeScript | UI Specialist",
    descriptionTemplate: "Frontend engineer with a passion for building pixel-perfect, responsive user interfaces and robust web applications."
  },
  {
    name: "Backend Developer",
    skills: ["Node.js", "Express.js", "PostgreSQL", "MongoDB", "Redis", "REST API", "Docker", "AWS", "FastAPI", "Python", "Microservices"],
    titles: ["Backend Engineer", "Node.js Developer", "Software Engineer (Backend)", "API Engineer", "Senior Backend Architect"],
    headline: "Backend Engineer | Node.js | Microservices | Cloud Databases",
    descriptionTemplate: "Backend developer specializing in designing scalable APIs, database schema optimizations, and server side architectures."
  },
  {
    name: "Full Stack Developer",
    skills: ["React", "Node.js", "TypeScript", "Express.js", "PostgreSQL", "MongoDB", "REST API", "Git", "Next.js", "Docker", "AWS"],
    titles: ["Full Stack Engineer", "Software Developer", "Full Stack Developer", "Lead Software Engineer"],
    headline: "Full Stack Engineer | MERN | Next.js | Cloud Deployment",
    descriptionTemplate: "Versatile Full Stack developer with extensive hands-on experience building end-to-end web applications and managing databases."
  },
  {
    name: "DevOps Engineer",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Jenkins", "Terraform", "Linux", "Ansible", "Nginx", "Shell Scripting", "Prometheus"],
    titles: ["DevOps Engineer", "Cloud Infrastructure Engineer", "Site Reliability Engineer", "SRE"],
    headline: "DevOps Engineer | Infrastructure as Code | Kubernetes | AWS Architect",
    descriptionTemplate: "DevOps engineer focused on automation, infrastructure orchestration, streamlining deployments, and improving system uptime."
  },
  {
    name: "Mobile Developer",
    skills: ["React Native", "Flutter", "iOS Development", "Android Development", "Swift", "Kotlin", "Firebase", "Mobile UI Testing"],
    titles: ["Mobile App Developer", "Android Developer", "iOS Developer", "React Native Engineer"],
    headline: "Mobile Engineer | React Native | Flutter | Android & iOS Apps",
    descriptionTemplate: "App developer passionate about creating fluid native and cross-platform mobile experiences for iOS and Android devices."
  },
  {
    name: "Data Scientist",
    skills: ["Python", "SQL", "Pandas", "NumPy", "Machine Learning", "Power BI", "Tableau", "Data Analysis", "TensorFlow", "Deep Learning", "NLP"],
    titles: ["Data Analyst", "Data Scientist", "Business Intelligence Analyst", "Machine Learning Engineer"],
    headline: "Data Scientist | ML Engineer | Advanced Analytics | Python",
    descriptionTemplate: "Data enthusiast with strong analytical background, building predictive ML models and designing interactive BI dashboards."
  },
  {
    name: "QA Automation Engineer",
    skills: ["Selenium", "Cypress", "Playwright", "Jest", "API Testing", "Postman", "Manual Testing", "Jira", "Automation Testing"],
    titles: ["QA Engineer", "Automation Test Engineer", "SDET", "Quality Assurance Analyst"],
    headline: "QA Automation Engineer | SDET | API Testing | Selenium & Cypress",
    descriptionTemplate: "Quality assurance engineer specialized in building robust automated test frameworks, writing detailed test cases, and CI integration."
  },
  {
    name: "UI/UX Designer",
    skills: ["Figma", "Adobe XD", "Prototyping", "User Research", "Design Systems", "Wireframing", "UI Design", "Usability Testing"],
    titles: ["UI/UX Designer", "Product Designer", "Interaction Designer", "Visual Designer"],
    headline: "UI/UX Designer | Product Design | Figma | Design Systems Specialist",
    descriptionTemplate: "Product designer committed to user-centered design, building scalable design systems, and converting complex workflows into intuitive screens."
  },
  {
    name: "HR Recruiter",
    skills: ["Recruitment", "Talent Acquisition", "Onboarding", "Employee Engagement", "HR Operations", "ATS Management", "Sourcing", "HR Management"],
    titles: ["HR Executive", "Talent Acquisition Specialist", "HR Generalist", "Recruitment Lead"],
    headline: "Talent Acquisition | HR Recruiter | Technical Hiring | Employee Relations",
    descriptionTemplate: "HR professional with expertise in technical candidate sourcing, end-to-end recruitment pipelines, and building strong organizational cultures."
  },
  {
    name: "Financial Analyst",
    skills: ["Financial Analysis", "Tally", "GST", "TDS", "Excel", "Auditing", "Bookkeeping", "Accounting", "Taxation", "Financial Modeling"],
    titles: ["Financial Analyst", "Accountant", "Finance Associate", "Accounts Manager"],
    headline: "Financial Analyst | Accountant | Tax Compliance | Corporate Finance",
    descriptionTemplate: "Detail-oriented financial professional with experience in corporate accounting, GST/TDS tax compliance, and auditing."
  }
];

const locations = [
  "Bengaluru, Karnataka", "Mumbai, Maharashtra", "Pune, Maharashtra", "Hyderabad, Telangana",
  "Chennai, Tamil Nadu", "New Delhi, NCR", "Gurugram, Haryana", "Noida, Uttar Pradesh",
  "Kolkata, West Bengal", "Ahmedabad, Gujarat"
];

const companies = [
  "TCS", "Infosys Ltd.", "Wipro Technologies", "Cognizant", "Accenture India",
  "Google India Pvt. Ltd.", "Microsoft IDC", "Amazon India", "Flipkart", "Zomato",
  "Swiggy", "Paytm", "Ola Cabs", "PhonePe", "Reliance Jio", "HDFC Bank", "ICICI Bank",
  "Dell Technologies", "Capgemini", "Tech Mahindra"
];

const colleges = [
  "IIT Bombay", "IIT Delhi", "IIT Madras", "NIT Warangal", "BITS Pilani", "Delhi University",
  "BITS Goa", "VIT Vellore", "SRM University", "Pune University", "Mumbai University",
  "Anna University", "RV College of Engineering", "PES University", "IIM Ahmedabad",
  "IIM Bangalore", "IIM Lucknow"
];

// Helper functions for dynamic details
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNotice() {
  const options = ["immediate", "15 days", "30 days", "45 days", "60 days", "90 days"];
  const weights = [0.25, 0.15, 0.35, 0.10, 0.10, 0.05];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < options.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return options[i];
  }
  return "30 days";
}

// Fetch random users in chunks to ensure API reliability
async function fetchRandomUsers(totalCount) {
  const users = [];
  const chunkSize = 200;
  
  for (let i = 0; i < totalCount; i += chunkSize) {
    const currentFetch = Math.min(chunkSize, totalCount - i);
    console.log(`📡 Fetching ${currentFetch} profiles from randomuser.me API (${users.length}/${totalCount})...`);
    
    const res = await fetch(`https://randomuser.me/api/?results=${currentFetch}&nat=in`);
    if (!res.ok) {
      throw new Error(`Failed to fetch from randomuser.me: ${res.statusText}`);
    }
    
    const data = await res.json();
    users.push(...data.results);
  }
  
  return users;
}

// Process batches of requests concurrently
async function runBatches(items, batchSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(item => processFn(item)));
    results.push(...batchResults);
  }
  return results;
}

// Map randomuser.me user to structured job seeker profile
function mapUserToJobseeker(user, index) {
  const firstName = user.name.first;
  const lastName = user.name.last;
  
  // Clean email to be consistent with our testing framework
  const normalizedEmail = `candidate_gen_${index + 1}@redhire.dev`;
  const domain = domains[index % domains.length];
  
  const isFresher = Math.random() < 0.15; // 15% freshers
  const experienceType = isFresher ? "fresher" : "experienced";
  const yearsExp = isFresher ? 0 : getRandomRange(1, 10);
  const monthsExp = isFresher ? getRandomRange(0, 6) : getRandomRange(0, 11);
  const totalExperience = isFresher 
    ? (monthsExp === 0 ? "Fresher" : `${monthsExp} months`)
    : `${yearsExp} years ${monthsExp} months`;

  const skillsCount = getRandomRange(4, 7);
  const selectedSkills = [...domain.skills]
    .sort(() => 0.5 - Math.random())
    .slice(0, skillsCount);

  let currentSalaryVal = 0;
  let expectedSalaryVal = 0;
  if (!isFresher) {
    const base = getRandomRange(2, 4);
    currentSalaryVal = Math.round(yearsExp * base + getRandomRange(0, 3));
    currentSalaryVal = Math.max(3, currentSalaryVal);
    expectedSalaryVal = Math.round(currentSalaryVal * (1 + (getRandomRange(20, 50) / 100)));
  } else {
    expectedSalaryVal = getRandomRange(3, 6);
  }

  const currentSalary = isFresher ? "N/A" : `${currentSalaryVal} LPA`;
  const expectedSalary = `${expectedSalaryVal} LPA`;
  const currentCompany = isFresher ? "None" : getRandom(companies);
  const currentTitle = isFresher ? "Graduate Trainee" : getRandom(domain.titles);

  // Resume URL (Mock pdf stored in Supabase)
  const resumeUrl = "https://juvrnftgsxxvnitwtkun.supabase.co/storage/v1/object/public/resumes/sample_resume.pdf";
  const linkedinUrl = `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  const portfolioUrl = `https://${firstName.toLowerCase()}dev.com`;
  
  // Preferred interview modes (1 to 2 choices)
  const allModes = ["in-person", "video-call", "telephonic"];
  const preferredModes = [...allModes].sort(() => 0.5 - Math.random()).slice(0, getRandomRange(1, 2));

  // Experiences
  const experiences = [];
  const gradYear = 2026 - (isFresher ? 0 : yearsExp);
  if (!isFresher) {
    const jobsCount = yearsExp <= 3 ? 1 : yearsExp <= 6 ? 2 : 3;
    let tempGradYear = gradYear;
    for (let j = 0; j < jobsCount; j++) {
      const isCurrent = j === 0;
      const jobYears = Math.max(1, Math.floor(yearsExp / jobsCount));
      const start = tempGradYear;
      const end = start + jobYears;
      tempGradYear = end;

      experiences.push({
        company: isCurrent ? currentCompany : getRandom(companies.filter(c => c !== currentCompany)),
        title: isCurrent ? currentTitle : getRandom(domain.titles),
        location: getRandom(locations).split(",")[0],
        start_date: `Jul ${start}`,
        end_date: isCurrent ? null : `Jun ${end}`,
        is_current: isCurrent,
        description: `Led feature development and code optimizations. Collaborated with cross-functional product and engineering teams.`,
      });
    }
  } else if (Math.random() > 0.5) {
    experiences.push({
      company: getRandom(companies),
      title: "Intern",
      location: getRandom(locations).split(",")[0],
      start_date: "Jan 2026",
      end_date: "Jun 2026",
      is_current: true,
      description: "Assisted senior developers, optimized code blocks, and prepared tech documentation.",
    });
  }

  // Education
  const edu = [
    {
      institution: getRandom(colleges),
      degree: isFresher || Math.random() > 0.3 ? "B.Tech" : "M.Tech",
      field: domain.name.includes("HR") ? "HR Management" : domain.name.includes("Finance") ? "Commerce" : "Computer Science & Engineering",
      start_year: String(gradYear - 4),
      end_year: String(gradYear),
      score: `${getRandomRange(70, 95)}%`,
    }
  ];

  return {
    rawUser: user,
    email: normalizedEmail,
    password: "RedHire@123",
    first_name: firstName,
    last_name: lastName,
    phone: user.phone || "+91 99999 88888",
    avatar_url: user.picture?.large || null,
    role: "jobseeker",
    headline: domain.headline,
    location: `${user.location?.city || "Bengaluru"}, ${user.location?.state || "Karnataka"}`,
    experience_type: experienceType,
    total_experience: totalExperience,
    current_company: currentCompany,
    current_title: currentTitle,
    current_salary: currentSalary,
    expected_salary: expectedSalary,
    notice_period: generateNotice(),
    skills: selectedSkills,
    about: domain.descriptionTemplate,
    resume_url: resumeUrl,
    linkedin_url: linkedinUrl,
    portfolio_url: portfolioUrl,
    preferred_interview_mode: preferredModes,
    experiences,
    education: edu
  };
}

async function run() {
  const TOTAL_PROFILES = 1000;
  console.log(`🚀 Seeding pipeline initialized to push ${TOTAL_PROFILES} jobseeker profiles.`);

  // 1. Fetch random users from API
  let apiUsers = [];
  try {
    apiUsers = await fetchRandomUsers(TOTAL_PROFILES);
    console.log(`✅ Retrieved ${apiUsers.length} profiles successfully from randomuser.me.`);
  } catch (err) {
    console.error("❌ Failed to retrieve profiles from RandomUser API:", err.message);
    process.exit(1);
  }

  // Map to structured candidates
  const candidates = apiUsers.map((user, idx) => mapUserToJobseeker(user, idx));

  // 2. Fetch existing auth users to avoid registration collisions
  console.log("📡 Fetching existing auth users from Supabase...");
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("❌ Failed to list existing users:", listError.message);
    process.exit(1);
  }
  const existingUsers = usersData.users || [];
  console.log(`ℹ️ Supabase contains ${existingUsers.length} existing auth accounts.`);

  // 3. Resolve Auth Users (Create if missing) in parallel batches of 15
  console.log("🔐 Registering users in Supabase Auth (creating missing accounts)...");
  
  const authResults = [];
  let processedCount = 0;
  
  await runBatches(candidates, 15, async (candidate) => {
    try {
      let userId;
      const existing = existingUsers.find(u => u.email === candidate.email);

      if (existing) {
        userId = existing.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: candidate.email,
          password: candidate.password,
          email_confirm: true,
          user_metadata: {
            role: candidate.role,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            phone: candidate.phone,
            experience: candidate.experience_type,
          }
        });

        if (authError) {
          console.error(`❌ Create auth user failed for ${candidate.email}:`, authError.message);
          return null;
        }
        userId = authData.user.id;
      }

      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`   Processed auth setup for ${processedCount}/${TOTAL_PROFILES} users...`);
      }

      return {
        ...candidate,
        id: userId
      };
    } catch (err) {
      console.error(`❌ Unexpected auth processing error for ${candidate.email}:`, err.message);
      return null;
    }
  }).then(results => {
    authResults.push(...results.filter(Boolean));
  });

  console.log(`✅ Auth resolution complete. Successfully resolved ${authResults.length} candidate IDs.`);

  if (authResults.length === 0) {
    console.error("❌ No candidate IDs were resolved. Seeding aborted.");
    process.exit(1);
  }

  // Prepare database rows
  const profileRows = [];
  const experienceRows = [];
  const educationRows = [];
  const resolvedIds = [];

  authResults.forEach(seeker => {
    resolvedIds.push(seeker.id);
    
    // Profile
    profileRows.push({
      id: seeker.id,
      email: seeker.email,
      first_name: seeker.first_name,
      last_name: seeker.last_name,
      phone: seeker.phone,
      avatar_url: seeker.avatar_url,
      headline: seeker.headline,
      location: seeker.location,
      experience_type: seeker.experience_type,
      total_experience: seeker.total_experience,
      current_company: seeker.current_company,
      current_title: seeker.current_title,
      current_salary: seeker.current_salary,
      expected_salary: seeker.expected_salary,
      notice_period: seeker.notice_period,
      skills: seeker.skills,
      about: seeker.about,
      resume_url: seeker.resume_url,
      linkedin_url: seeker.linkedin_url,
      portfolio_url: seeker.portfolio_url,
      preferred_interview_mode: seeker.preferred_interview_mode
    });

    // Experience
    seeker.experiences.forEach(exp => {
      experienceRows.push({
        profile_id: seeker.id,
        company: exp.company,
        title: exp.title,
        location: exp.location,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current,
        description: exp.description
      });
    });

    // Education
    seeker.education.forEach(edu => {
      educationRows.push({
        profile_id: seeker.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        start_year: edu.start_year,
        end_year: edu.end_year,
        score: edu.score
      });
    });
  });

  // 4. Bulk Delete existing experiences & educations for resolved IDs
  console.log("🧹 Cleaning old experience and education records in database...");
  
  // Chunk delete ID arrays to prevent Postgres query parameter limits
  const idChunks = [];
  const chunkSize = 100;
  for (let i = 0; i < resolvedIds.length; i += chunkSize) {
    idChunks.push(resolvedIds.slice(i, i + chunkSize));
  }
  
  for (const idChunk of idChunks) {
    await supabase.from("work_experience").delete().in("profile_id", idChunk);
    await supabase.from("education").delete().in("profile_id", idChunk);
  }
  console.log("✅ Cleanup complete.");

  // 5. Bulk insert profiles, experiences, and educations in chunks of 100 to stay within payload limits
  console.log("💾 Bulk inserting job seeker profiles, experience, and education arrays...");
  
  const insertChunks = [];
  for (let i = 0; i < profileRows.length; i += 100) {
    insertChunks.push(profileRows.slice(i, i + 100));
  }

  let profilesInserted = 0;
  for (const chunk of insertChunks) {
    const { error: profileError } = await supabase.from("profiles").upsert(chunk, { onConflict: "id" });
    if (profileError) {
      console.error("❌ Profile bulk upsert failed:", profileError.message);
    } else {
      profilesInserted += chunk.length;
    }
  }
  console.log(`✅ Pushed ${profilesInserted} profiles to Supabase.`);

  // Insert experience in chunks
  let expInserted = 0;
  const expChunks = [];
  for (let i = 0; i < experienceRows.length; i += 100) {
    expChunks.push(experienceRows.slice(i, i + 100));
  }
  for (const chunk of expChunks) {
    const { error: expError } = await supabase.from("work_experience").insert(chunk);
    if (expError) {
      console.error("❌ Work experience bulk insert failed:", expError.message);
    } else {
      expInserted += chunk.length;
    }
  }
  console.log(`✅ Pushed ${expInserted} experience records to Supabase.`);

  // Insert education in chunks
  let eduInserted = 0;
  const eduChunks = [];
  for (let i = 0; i < educationRows.length; i += 100) {
    eduChunks.push(educationRows.slice(i, i + 100));
  }
  for (const chunk of eduChunks) {
    const { error: eduError } = await supabase.from("education").insert(chunk);
    if (eduError) {
      console.error("❌ Education bulk insert failed:", eduError.message);
    } else {
      eduInserted += chunk.length;
    }
  }
  console.log(`✅ Pushed ${eduInserted} education records to Supabase.`);

  console.log("\n🎉 Seeding pipeline of 1000 dynamic job seeker profiles completed successfully!");
}

run().catch(console.error);
