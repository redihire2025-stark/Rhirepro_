// Centralized Master Data for Job Posting & Configuration

export const INDUSTRY_OPTIONS = [
  "IT / Software / Technology",
  "Banking",
  "Financial Services & FinTech",
  "Insurance",
  "Healthcare & Lifesciences",
  "Pharmaceuticals",
  "Biotechnology",
  "Manufacturing",
  "Industrial Engineering",
  "E-Commerce",
  "Retail",
  "Education",
  "EdTech",
  "Consulting & Advisory",
  "Media & Entertainment",
  "Publishing",
  "Real Estate",
  "Construction & Infrastructure",
  "Telecommunications",
  "Automotive",
  "Electric Vehicles (EV)",
  "Hospitality & Travel",
  "Tourism",
  "Energy & Utilities",
  "Renewable Energy",
  "Oil & Gas",
  "FMCG (Fast Moving Consumer Goods)",
  "Consumer Goods & Durables",
  "Logistics & Supply Chain",
  "Warehousing",
  "Aviation & Aerospace",
  "Defense",
  "Agriculture",
  "AgTech",
  "Legal & Compliance",
  "Advertising & PR",
  "Marketing & Digital Media",
  "Beauty & Wellness",
  "Fitness & Sports",
  "Textiles & Apparel",
  "Fashion & Luxury",
  "Mining & Metals",
  "Materials & Chemicals",
  "Government & Public Sector",
  "Non-Profit & NGO",
  "Architecture & Interior Design",
  "HR & Staffing",
  "Gaming & Animation",
  "Semiconductors & Hardware",
  "Marine & Shipping",
  "Audit, Tax & Accounting",
  "Food & Beverages",
  "Environmental Services & Sustainability",
  "Others",
] as const;

export type IndustryType = typeof INDUSTRY_OPTIONS[number];

export const PERKS_AND_BENEFITS_OPTIONS = [
  "Health & Medical Insurance",
  "Work from Home / Remote Options",
  "Flexible Working Hours",
  "5 Days a Week",
  "Free Meals & Snacks",
  "Stock Options / ESOPs",
  "Annual Performance Bonus",
  "Paid Sick & Casual Leave",
  "Learning & Certification Allowance",
  "Maternity & Paternity Leave",
  "Retirement & Pension Plan (PF/NPS)",
  "Travel / Fuel Reimbursement",
  "Gym & Fitness Allowance",
  "Team Outings & Offsites",
  "Laptop & Internet Allowance",
  "Life & Accidental Insurance",
  "Childcare Support & Daycare",
  "Employee Referral Bonus",
  "Mental Health Counseling",
  "Overtime Compensation",
  "Relocation Allowance",
  "Sabbatical Leave",
  "Tuition Reimbursement",
  "Transport Pick & Drop",
  "Health Checkups",
] as const;

export type PerkType = typeof PERKS_AND_BENEFITS_OPTIONS[number];

export const QUALIFICATION_OPTIONS = [
  "Any Degree / Any Graduate",
  "10th Pass",
  "12th Pass",
  "Diploma",
  "B.Tech / B.E.",
  "B.Sc",
  "B.Com",
  "B.A.",
  "BBA / BCA",
  "B.Pharm",
  "B.Arch / B.Des",
  "LLB / Law",
  "MBBS / BDS / BAMS",
  "M.Tech / M.E.",
  "M.Sc",
  "M.Com",
  "M.A.",
  "MBA / PGDM",
  "MCA / MS",
  "M.Pharm",
  "LLM",
  "MD / MS (Medical)",
  "PhD / Doctorate",
  "Post Graduate Diploma",
  "Others",
] as const;

export type QualificationType = typeof QUALIFICATION_OPTIONS[number];

export const QUALIFICATION_SPECIALIZATION_MAP: Record<string, string[]> = {
  "Any Degree / Any Graduate": [
    "Any Specialization",
    "Not Applicable",
    "Others",
  ],
  "10th Pass": [
    "Not Applicable",
    "General",
    "Others",
  ],
  "12th Pass": [
    "Science",
    "Commerce",
    "Arts / Humanities",
    "Vocational",
    "Others",
  ],
  "Diploma": [
    "Computer Engineering / IT",
    "Electronics & Communication",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Digital Marketing",
    "Graphic Design",
    "Hotel Management & Catering",
    "Fashion Design",
    "Any Specialization",
    "Others",
  ],
  "B.Tech / B.E.": [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Communication",
    "Electrical & Electronics",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Artificial Intelligence & Data Science",
    "Robotics & Automation",
    "Aerospace Engineering",
    "Biotechnology",
    "Mechatronics",
    "Cyber Security",
    "Any Specialization",
    "Others",
  ],
  "B.Sc": [
    "Computer Science",
    "Information Technology",
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biotechnology",
    "Microbiology",
    "Agriculture",
    "Statistics",
    "Nursing",
    "Electronics",
    "Data Science",
    "Any Specialization",
    "Others",
  ],
  "B.Com": [
    "General",
    "Accounting & Finance",
    "Banking & Insurance",
    "Taxation",
    "Computer Applications",
    "E-Commerce",
    "Honors",
    "Financial Markets",
    "Any Specialization",
    "Others",
  ],
  "B.A.": [
    "English Literature",
    "Economics",
    "Psychology",
    "Political Science",
    "Sociology",
    "History",
    "Journalism & Mass Communication",
    "Fine Arts",
    "Languages",
    "Philosophy",
    "Any Specialization",
    "Others",
  ],
  "BBA / BCA": [
    "Computer Applications (BCA)",
    "Business Administration (BBA)",
    "Marketing Management",
    "Human Resources (HR)",
    "Finance",
    "International Business",
    "Supply Chain & Logistics",
    "Systems & IT",
    "Digital Marketing",
    "Any Specialization",
    "Others",
  ],
  "B.Pharm": [
    "Pharmacy",
    "Pharmaceutical Chemistry",
    "Pharmacology",
    "Pharmaceutics",
    "Pharmacognosy",
    "Any Specialization",
    "Others",
  ],
  "B.Arch / B.Des": [
    "Architecture",
    "Interior Design",
    "Fashion Design",
    "Industrial / Product Design",
    "Graphic Design",
    "UI/UX Design",
    "Any Specialization",
    "Others",
  ],
  "LLB / Law": [
    "General Law",
    "Corporate Law",
    "Criminal Law",
    "Constitutional Law",
    "Cyber Law",
    "Intellectual Property Law",
    "Any Specialization",
    "Others",
  ],
  "MBBS / BDS / BAMS": [
    "General Medicine (MBBS)",
    "Dental Surgery (BDS)",
    "Ayurvedic Medicine (BAMS)",
    "Homeopathy (BHMS)",
    "Physiotherapy (BPT)",
    "Any Specialization",
    "Others",
  ],
  "M.Tech / M.E.": [
    "Computer Science & Engineering",
    "Software Engineering",
    "VLSI & Embedded Systems",
    "Thermal Engineering",
    "Structural Engineering",
    "Power Systems",
    "Artificial Intelligence & Machine Learning",
    "Robotics & Automation",
    "Data Science & Analytics",
    "Cyber Security",
    "Any Specialization",
    "Others",
  ],
  "M.Sc": [
    "Computer Science",
    "Data Science & Analytics",
    "Chemistry",
    "Physics",
    "Mathematics",
    "Biotechnology",
    "Microbiology",
    "Information Technology",
    "Statistics",
    "Environmental Science",
    "Any Specialization",
    "Others",
  ],
  "M.Com": [
    "General",
    "Accounting & Finance",
    "Banking & Financial Services",
    "Taxation",
    "Business Management",
    "Any Specialization",
    "Others",
  ],
  "M.A.": [
    "English",
    "Economics",
    "Psychology & Clinical Psychology",
    "Political Science",
    "Sociology",
    "Journalism & Mass Communication",
    "Public Policy",
    "Any Specialization",
    "Others",
  ],
  "MBA / PGDM": [
    "Human Resources (HR)",
    "Finance",
    "Marketing & Sales",
    "Operations & Supply Chain",
    "Business Analytics & Data Science",
    "Information Technology (IT)",
    "Healthcare & Hospital Management",
    "International Business (IB)",
    "Entrepreneurship & Startups",
    "Digital Marketing",
    "Retail Management",
    "Agri-Business Management",
    "Any Specialization",
    "Others",
  ],
  "MCA / MS": [
    "Computer Applications (MCA)",
    "Software Engineering",
    "Data Science",
    "Cyber Security & Networking",
    "Cloud Computing",
    "Artificial Intelligence",
    "Any Specialization",
    "Others",
  ],
  "M.Pharm": [
    "Pharmaceutics",
    "Pharmacology",
    "Pharmaceutical Analysis",
    "Pharmaceutical Chemistry",
    "Quality Assurance",
    "Any Specialization",
    "Others",
  ],
  "LLM": [
    "Corporate & Commercial Law",
    "Constitutional & Administrative Law",
    "International Law",
    "Cyber & Intellectual Property Law",
    "Criminal Law",
    "Any Specialization",
    "Others",
  ],
  "MD / MS (Medical)": [
    "General Medicine",
    "General Surgery",
    "Pediatrics",
    "Obstetrics & Gynecology",
    "Orthopedics",
    "Dermatology",
    "Anesthesiology",
    "Radiology",
    "Psychiatry",
    "Any Specialization",
    "Others",
  ],
  "PhD / Doctorate": [
    "Computer Science & Engineering",
    "Engineering & Technology",
    "Management & Business Studies",
    "Physical & Life Sciences",
    "Humanities & Social Sciences",
    "Pharmacy & Medicine",
    "Economics & Finance",
    "Any Specialization",
    "Others",
  ],
  "Post Graduate Diploma": [
    "Management (PGDM)",
    "Computer Applications (PGDCA)",
    "Digital Marketing",
    "Data Science & AI",
    "Supply Chain Management",
    "Financial Management",
    "Human Resource Management",
    "Any Specialization",
    "Others",
  ],
  "Others": [
    "Any Specialization",
    "General",
    "Others",
  ],
};

// Aliases for legacy/variant qualification strings
QUALIFICATION_SPECIALIZATION_MAP["B.Tech/B.E."] = QUALIFICATION_SPECIALIZATION_MAP["B.Tech / B.E."];
QUALIFICATION_SPECIALIZATION_MAP["MBA/PGDM"] = QUALIFICATION_SPECIALIZATION_MAP["MBA / PGDM"];
QUALIFICATION_SPECIALIZATION_MAP["M.Tech/ME"] = QUALIFICATION_SPECIALIZATION_MAP["M.Tech / M.E."];
QUALIFICATION_SPECIALIZATION_MAP["B.Com/BA/B.Sc"] = QUALIFICATION_SPECIALIZATION_MAP["B.Sc"];
QUALIFICATION_SPECIALIZATION_MAP["Any Degree"] = QUALIFICATION_SPECIALIZATION_MAP["Any Degree / Any Graduate"];
QUALIFICATION_SPECIALIZATION_MAP["PhD"] = QUALIFICATION_SPECIALIZATION_MAP["PhD / Doctorate"];

export function getSpecializationsForQualification(qualification: string | null | undefined): string[] {
  if (!qualification || !qualification.trim()) {
    return ["Any Specialization", "Others"];
  }

  const raw = qualification.trim();

  // 1. Direct match
  if (QUALIFICATION_SPECIALIZATION_MAP[raw]) {
    return QUALIFICATION_SPECIALIZATION_MAP[raw];
  }

  // 2. Normalized comparison
  const norm = raw.toLowerCase().replace(/[\s\.\/]+/g, "");

  for (const [key, options] of Object.entries(QUALIFICATION_SPECIALIZATION_MAP)) {
    const keyNorm = key.toLowerCase().replace(/[\s\.\/]+/g, "");
    if (norm === keyNorm || norm.includes(keyNorm) || keyNorm.includes(norm)) {
      return options;
    }
  }

  // 3. Fallback keyword checks
  if (norm.includes("btech") || norm.includes("be") || norm.includes("engineer")) {
    return QUALIFICATION_SPECIALIZATION_MAP["B.Tech / B.E."];
  }
  if (norm.includes("mba") || norm.includes("pgdm") || norm.includes("manage")) {
    return QUALIFICATION_SPECIALIZATION_MAP["MBA / PGDM"];
  }
  if (norm.includes("bsc") || norm.includes("science")) {
    return QUALIFICATION_SPECIALIZATION_MAP["B.Sc"];
  }
  if (norm.includes("bcom") || norm.includes("commer")) {
    return QUALIFICATION_SPECIALIZATION_MAP["B.Com"];
  }
  if (norm.includes("ba") || norm.includes("art")) {
    return QUALIFICATION_SPECIALIZATION_MAP["B.A."];
  }
  if (norm.includes("bca") || norm.includes("bba")) {
    return QUALIFICATION_SPECIALIZATION_MAP["BBA / BCA"];
  }
  if (norm.includes("mtech") || norm.includes("me")) {
    return QUALIFICATION_SPECIALIZATION_MAP["M.Tech / M.E."];
  }
  if (norm.includes("msc")) {
    return QUALIFICATION_SPECIALIZATION_MAP["M.Sc"];
  }
  if (norm.includes("mca")) {
    return QUALIFICATION_SPECIALIZATION_MAP["MCA / MS"];
  }
  if (norm.includes("diploma")) {
    return QUALIFICATION_SPECIALIZATION_MAP["Diploma"];
  }

  return ["Any Specialization", "General", "Others"];
}

export function matchQualificationOption(rawQualification: string | null | undefined): string {
  if (!rawQualification || !rawQualification.trim()) return "";
  const raw = rawQualification.trim();

  // Exact match
  if ((QUALIFICATION_OPTIONS as readonly string[]).includes(raw)) {
    return raw;
  }

  // Alias match
  const rawNorm = raw.toLowerCase().replace(/[\s\.\/]+/g, "");
  for (const opt of QUALIFICATION_OPTIONS) {
    const optNorm = opt.toLowerCase().replace(/[\s\.\/]+/g, "");
    if (rawNorm === optNorm) return opt;
  }

  return raw;
}

export const INTERVIEW_MODE_OPTIONS = [
  "In-Person",
  "Video Call",
  "Telephonic",
  "Walk-in",
] as const;

export type InterviewModeType = typeof INTERVIEW_MODE_OPTIONS[number];
