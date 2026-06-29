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

// Define 10 dummy organizations
const organizations = [
  {
    company_name: "TechCorp Solutions Pvt Ltd",
    company_size: "501-1000",
    company_type: "Private",
    industry: "IT / Software",
    company_description: "Leading software solutions provider focusing on enterprise SaaS product development and cloud integrations.",
    website: "https://techcorp-solutions.example.com",
    location: "Bengaluru, Karnataka",
    logo_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
    founded: "2012",
    cin: "U72200KA2012PTC065432"
  },
  {
    company_name: "Finova Digital Logistics",
    company_size: "1001-5000",
    company_type: "Public",
    industry: "Logistics & Supply Chain",
    company_description: "Digital supply chain platform driving warehousing solutions and cargo delivery management across India.",
    website: "https://finova-logistics.example.com",
    location: "Mumbai, Maharashtra",
    logo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150",
    founded: "2015",
    cin: "L63090MH2015PLC267890"
  },
  {
    company_name: "Acuity Life Sciences & Healthcare",
    company_size: "501-1000",
    company_type: "Private",
    industry: "Healthcare / Pharmaceuticals",
    company_description: "Next-gen healthcare provider building clinical trials, digital therapeutics, and telemedicine applications.",
    website: "https://acuity-health.example.com",
    location: "Hyderabad, Telangana",
    logo_url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150",
    founded: "2018",
    cin: "U24239TG2018PTC123456"
  },
  {
    company_name: "EdSpark Learning Platforms",
    company_size: "101-500",
    company_type: "Startup",
    industry: "Education / EdTech",
    company_description: "Innovative EdTech building gamified learning apps for school students and professional skill bootcamps.",
    website: "https://edspark.example.com",
    location: "Pune, Maharashtra",
    logo_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150",
    founded: "2020",
    cin: "U80903PN2020PTC189012"
  },
  {
    company_name: "Apex Global Consulting",
    company_size: "101-500",
    company_type: "Private",
    industry: "Management Consulting",
    company_description: "B2B financial advisors, compliance partners, and corporate strategy consultants for global enterprises.",
    website: "https://apex-consulting.example.com",
    location: "Chennai, Tamil Nadu",
    logo_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=150",
    founded: "2010",
    cin: "U74140TN2010PTC076543"
  },
  {
    company_name: "RetailMart Supermarkets",
    company_size: "5001+",
    company_type: "MNC",
    industry: "Retail / FMCG",
    company_description: "One of India's fastest growing hypermarket chains with physical stores in 50+ tier-1 and tier-2 cities.",
    website: "https://retailmart-super.example.com",
    location: "New Delhi, NCR",
    logo_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150",
    founded: "2008",
    cin: "U52110DL2008PTC175432"
  },
  {
    company_name: "GreenEnergy Renewables India",
    company_size: "501-1000",
    company_type: "Public",
    industry: "Energy / Renewables",
    company_description: "Leading clean energy company setting up wind turbines, solar fields, and EV charging grids.",
    website: "https://greenenergy-india.example.com",
    location: "Ahmedabad, Gujarat",
    logo_url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=150",
    founded: "2014",
    cin: "L40106GJ2014PLC078901"
  },
  {
    company_name: "Foodies App Deliveries",
    company_size: "1001-5000",
    company_type: "Startup",
    industry: "E-commerce / Food Delivery",
    company_description: "Hyperlocal on-demand logistics delivering hot restaurant meals, groceries, and pharmacy supplies.",
    website: "https://foodies-deliver.example.com",
    location: "Gurugram, Haryana",
    logo_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150",
    founded: "2017",
    cin: "U55101HR2017PTC068765"
  },
  {
    company_name: "StarMedia Digital Network",
    company_size: "101-500",
    company_type: "Private",
    industry: "Media & Entertainment",
    company_description: "Creative digital agency building viral social campaigns, podcast networks, and short video platforms.",
    website: "https://starmedia-digital.example.com",
    location: "Noida, Uttar Pradesh",
    logo_url: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=150",
    founded: "2016",
    cin: "U22219UP2016PTC085432"
  },
  {
    company_name: "BuildWell Infrastructure & Housing",
    company_size: "501-1000",
    company_type: "Private",
    industry: "Real Estate / Construction",
    company_description: "Award-winning residential architects and builders designing sustainable, smart-home highrise societies.",
    website: "https://buildwell-housing.example.com",
    location: "Kolkata, West Bengal",
    logo_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=150",
    founded: "2011",
    cin: "U45200WB2011PTC054321"
  }
];

// Fetch random users from API
async function fetchRandomUsers(count) {
  console.log(`📡 Fetching ${count} profiles from randomuser.me API...`);
  const res = await fetch(`https://randomuser.me/api/?results=${count}&nat=in`);
  if (!res.ok) {
    throw new Error(`Failed to fetch from randomuser.me: ${res.statusText}`);
  }
  const data = await res.json();
  return data.results;
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

async function run() {
  console.log("🚀 Starting database seeding for 100 recruiters and 10 organizations...");

  // Fetch 100 random users to represent recruiters
  let apiUsers = [];
  try {
    apiUsers = await fetchRandomUsers(100);
    console.log("✅ Fetched 100 profiles from randomuser.me API.");
  } catch (err) {
    console.error("❌ Failed to fetch recruiter details from RandomUser API:", err.message);
    process.exit(1);
  }

  // Retrieve existing auth users
  console.log("📡 Fetching existing auth users from Supabase...");
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("❌ Failed to list existing users:", listError.message);
    process.exit(1);
  }
  const existingUsers = usersData.users || [];
  console.log(`ℹ️ Supabase contains ${existingUsers.length} existing auth accounts.`);

  // Map users to recruiters, assigning 10 recruiters per organization
  const recruiters = apiUsers.map((user, index) => {
    const orgIndex = Math.floor(index / 10);
    const org = organizations[orgIndex];
    const email = `recruiter_org${orgIndex + 1}_rec${(index % 10) + 1}@redhire.dev`;
    
    return {
      email,
      password: "RedHire@123",
      recruiter_name: `${user.name.first} ${user.name.last}`,
      phone: user.phone || "+91 99999 88888",
      role: "recruiter",
      org
    };
  });

  // 1. Resolve Auth accounts for recruiters in batches of 15
  console.log("🔐 Creating auth accounts for 100 recruiters...");
  const resolvedRecruiters = [];
  let processedCount = 0;

  await runBatches(recruiters, 15, async (recruiter) => {
    try {
      let userId;
      const existing = existingUsers.find(u => u.email === recruiter.email);

      if (existing) {
        userId = existing.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: recruiter.email,
          password: recruiter.password,
          email_confirm: true,
          user_metadata: {
            role: recruiter.role,
            recruiter_name: recruiter.recruiter_name,
            company_name: recruiter.org.company_name,
            industry: recruiter.org.industry,
            company_size: recruiter.org.company_size,
            phone: recruiter.phone,
          }
        });

        if (authError) {
          console.error(`❌ Create auth user failed for ${recruiter.email}:`, authError.message);
          return null;
        }
        userId = authData.user.id;
      }

      processedCount++;
      if (processedCount % 20 === 0) {
        console.log(`   Processed auth setup for ${processedCount}/100 recruiters...`);
      }

      return {
        ...recruiter,
        id: userId
      };
    } catch (err) {
      console.error(`❌ Unexpected auth processing error for ${recruiter.email}:`, err.message);
      return null;
    }
  }).then(results => {
    resolvedRecruiters.push(...results.filter(Boolean));
  });

  console.log(`✅ Auth accounts resolved for ${resolvedRecruiters.length} recruiters.`);

  // 2. Prepare recruiter profiles upsert payload
  const recruiterProfilesRows = resolvedRecruiters.map(rec => ({
    id: rec.id,
    email: rec.email,
    recruiter_name: rec.recruiter_name,
    phone: rec.phone,
    company_name: rec.org.company_name,
    company_size: rec.org.company_size,
    company_type: rec.org.company_type,
    industry: rec.org.industry,
    company_description: rec.org.company_description,
    website: rec.org.website,
    location: rec.org.location,
    logo_url: rec.org.logo_url,
    founded: rec.org.founded,
    cin: rec.org.cin
  }));

  // 3. Bulk upsert recruiter profiles in chunks of 50
  console.log("💾 Bulk updating recruiter profiles in database...");
  const chunks = [];
  for (let i = 0; i < recruiterProfilesRows.length; i += 50) {
    chunks.push(recruiterProfilesRows.slice(i, i + 50));
  }

  let upsertCount = 0;
  for (const chunk of chunks) {
    const { error } = await supabase.from("recruiter_profiles").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("❌ Recruiter profiles bulk upsert failed:", error.message);
    } else {
      upsertCount += chunk.length;
    }
  }

  console.log(`✅ Pushed ${upsertCount} recruiter profiles successfully to Supabase.`);
  console.log(`\n🎉 Seeding pipeline completed successfully! Created 10 organizations with 10 recruiters each.`);
}

run().catch(console.error);
