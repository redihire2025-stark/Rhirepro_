export type SkillKeywordRecord = {
  id: string;
  categoryName: string;
  subcategoryName: string;
  skillName: string;
  relatedKeywords: string[];
  alternativeNames: string[];
  searchSynonyms: string[];
};

type BaseSkill = Omit<SkillKeywordRecord, "id">;

const TECH_FRONTEND = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Angular", "Vue.js", "Svelte", "Tailwind CSS",
  "Bootstrap", "Responsive Design", "Web Accessibility", "Redux", "Webpack", "Vite", "Material UI", "Frontend Testing",
];
const TECH_BACKEND = [
  "Node.js", "Express.js", "NestJS", "Python", "Django", "Flask", "FastAPI", "Java", "Spring Boot", "PHP",
  "Laravel", "Ruby on Rails", ".NET", "C#", "Go", "Rust", "REST API", "GraphQL", "Microservices", "System Design",
];
const TECH_DATA = [
  "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "Database Administration", "Data Analysis",
  "Advanced Excel", "Power BI", "Tableau", "Looker", "Python Pandas", "NumPy", "Statistics", "Machine Learning",
  "Deep Learning", "TensorFlow", "PyTorch", "NLP", "Computer Vision", "Generative AI", "Prompt Engineering",
  "Data Engineering", "ETL", "Apache Spark", "Hadoop", "Kafka", "Airflow", "Snowflake", "BigQuery",
];
const TECH_INFRA = [
  "AWS", "Azure", "Google Cloud", "DevOps", "Docker", "Kubernetes", "Jenkins", "CI/CD", "Terraform", "Ansible",
  "Linux", "Shell Scripting", "Nginx", "Apache", "Networking", "System Administration", "IT Support", "Help Desk",
  "Cyber Security", "Network Security", "Cloud Security", "Penetration Testing", "Ethical Hacking", "SOC", "SIEM",
  "ISO 27001", "ERP", "SAP", "Oracle ERP", "Salesforce Administration",
];

const CATEGORY_SEEDS: Array<{
  categoryName: string;
  subcategories: Array<{ name: string; skills: string[]; aliases?: Record<string, string[]> }>;
}> = [
  {
    categoryName: "IT & Software Development",
    subcategories: [
      { name: "Frontend", skills: TECH_FRONTEND, aliases: { "JavaScript": ["JS", "ECMAScript"], "TypeScript": ["TS"], "Web Accessibility": ["WCAG", "a11y"], "Responsive Design": ["mobile responsive", "adaptive design"] } },
      { name: "Backend", skills: TECH_BACKEND, aliases: { ".NET": ["dotnet", "asp.net"], "REST API": ["RESTful API", "API development"] } },
      { name: "Data Science & AI", skills: TECH_DATA, aliases: { "Machine Learning": ["ML"], "Artificial Intelligence": ["AI"], "NLP": ["natural language processing"] } },
      { name: "Cloud, DevOps & Security", skills: TECH_INFRA, aliases: { "Google Cloud": ["GCP", "Google Cloud Platform"], "Cyber Security": ["cybersecurity"], "System Administration": ["sysadmin"] } },
      { name: "QA Testing", skills: ["Manual Testing", "Automation Testing", "Selenium", "Cypress", "Playwright", "Jest", "Postman", "API Testing", "Performance Testing", "Security Testing", "UAT", "Test Case Design"] },
      { name: "Mobile Development", skills: ["Android Development", "iOS Development", "React Native", "Flutter", "Kotlin", "Swift", "Objective-C", "Mobile UI Testing", "App Store Deployment", "Firebase"] },
    ],
  },
  {
    categoryName: "Engineering",
    subcategories: [
      { name: "Mechanical", skills: ["Mechanical Design", "AutoCAD", "SolidWorks", "CATIA", "HVAC", "Thermodynamics", "Piping Design", "GD&T", "CNC Programming", "Preventive Maintenance"] },
      { name: "Civil", skills: ["Civil Engineering", "Site Engineering", "Quantity Surveying", "Bar Bending Schedule", "Estimation", "Billing Engineering", "Structural Design", "Surveying", "Road Construction", "Concrete Technology"] },
      { name: "Electrical", skills: ["Electrical Engineering", "Electrical Design", "Panel Wiring", "PLC", "SCADA", "VFD", "Transformer Maintenance", "HT LT Panels", "Electrical Safety", "Power Distribution"] },
      { name: "Electronics", skills: ["Electronics Engineering", "PCB Design", "Embedded Systems", "Microcontrollers", "IoT", "Instrumentation", "Circuit Testing", "Soldering", "VLSI", "Signal Processing"] },
      { name: "Automobile & Aerospace", skills: ["Automobile Engineering", "Vehicle Diagnostics", "Engine Maintenance", "EV Maintenance", "Aerospace Engineering", "Aircraft Maintenance", "Aerodynamics", "Flight Testing", "Quality Inspection", "Lean Manufacturing"] },
    ],
  },
  {
    categoryName: "Healthcare",
    subcategories: [
      { name: "Doctors", skills: ["General Medicine", "Emergency Medicine", "Pediatrics", "Gynecology", "Cardiology", "Dermatology", "Anesthesia", "Surgery Assistance", "OPD Management", "Patient Diagnosis"] },
      { name: "Nurses", skills: ["Staff Nurse", "ICU Nursing", "OT Nursing", "Ward Nursing", "Patient Care", "Medication Administration", "BLS", "ACLS", "Nursing Documentation", "Infection Control"] },
      { name: "Allied Health", skills: ["Pharmacy", "Clinical Pharmacology", "Lab Technician", "Phlebotomy", "Radiology", "X-Ray Technician", "Physiotherapy", "Dialysis Technician", "Medical Coding", "Healthcare Administration"] },
    ],
  },
  {
    categoryName: "Education",
    subcategories: [
      { name: "Teaching", skills: ["Primary Teaching", "Secondary Teaching", "Mathematics Teaching", "Science Teaching", "English Teaching", "Social Studies Teaching", "Special Education", "Lesson Planning", "Classroom Management", "Student Assessment"] },
      { name: "Higher Education & Training", skills: ["Lecturing", "Professor", "Curriculum Development", "Academic Coordination", "Corporate Training", "Technical Training", "Soft Skills Training", "E-Learning", "LMS Administration", "Exam Coordination"] },
    ],
  },
  {
    categoryName: "Human Resources",
    subcategories: [
      { name: "Recruitment", skills: ["Recruitment", "Talent Acquisition", "Boolean Search", "Candidate Sourcing", "Campus Hiring", "IT Recruitment", "Non IT Recruitment", "Interview Coordination", "Offer Negotiation", "ATS Management"], aliases: { "Talent Acquisition": ["TA"], "Applicant Tracking System": ["ATS"] } },
      { name: "HR Operations", skills: ["HR Management", "HR Operations", "Payroll", "Statutory Compliance", "PF ESI", "Employee Relations", "Onboarding", "Exit Formalities", "HRIS", "Learning and Development", "Employee Engagement", "Performance Management"], aliases: { "Learning and Development": ["L&D"], "Human Resource Information System": ["HRIS"] } },
    ],
  },
  {
    categoryName: "Finance & Accounting",
    subcategories: [
      { name: "Accounting", skills: ["Accounting", "Bookkeeping", "Accounts Payable", "Accounts Receivable", "Tally", "Tally Prime", "GST", "TDS", "Bank Reconciliation", "Journal Entries", "MIS Reporting", "Finalization of Accounts"] },
      { name: "Finance", skills: ["Financial Analysis", "Financial Modeling", "Budgeting", "Forecasting", "Auditing", "Internal Audit", "Taxation", "Income Tax", "Cost Accounting", "Banking Operations", "Loan Processing", "Credit Analysis", "Investment Analysis"] },
    ],
  },
  {
    categoryName: "Sales",
    subcategories: [
      { name: "Sales Channels", skills: ["Sales", "B2B Sales", "B2C Sales", "Retail Sales", "Inside Sales", "Field Sales", "Channel Sales", "Corporate Sales", "Direct Sales", "Tele Sales", "Lead Generation", "Sales Closing"] },
      { name: "Business Development", skills: ["Business Development", "BDM", "Key Account Management", "Account Management", "Client Acquisition", "Negotiation", "CRM", "Salesforce", "HubSpot", "Pipeline Management", "Distributor Management", "Dealer Management"] },
    ],
  },
  {
    categoryName: "Marketing",
    subcategories: [
      { name: "Digital Marketing", skills: ["Digital Marketing", "SEO", "SEM", "Google Ads", "Meta Ads", "Social Media Marketing", "Content Marketing", "Email Marketing", "Marketing Automation", "Google Analytics", "Performance Marketing", "Growth Marketing"] },
      { name: "Brand & Content", skills: ["Brand Management", "Brand Strategy", "Market Research", "Campaign Management", "Copywriting", "Content Strategy", "Public Relations", "Event Marketing", "Influencer Marketing", "Product Marketing", "Trade Marketing"] },
    ],
  },
  {
    categoryName: "Manufacturing",
    subcategories: [
      { name: "Production", skills: ["Production Planning", "Production Supervision", "Machine Operation", "CNC Operation", "Lathe Operation", "Milling Machine", "Assembly Line", "Packaging", "Material Handling", "Shop Floor Management"] },
      { name: "Quality & Maintenance", skills: ["Quality Control", "Quality Assurance", "Inspection", "Six Sigma", "Kaizen", "5S", "Lean Manufacturing", "Maintenance Technician", "Breakdown Maintenance", "Preventive Maintenance", "Welding Inspection"] },
    ],
  },
  {
    categoryName: "Construction",
    subcategories: [
      { name: "Site Work", skills: ["Site Supervision", "Construction Supervision", "Welding", "Fabrication", "Masonry", "Carpentry", "Plumbing", "Painting", "Scaffolding", "Rebar Fixing", "Shuttering", "Tile Laying"] },
      { name: "Project Controls", skills: ["Construction Safety", "BOQ", "Project Scheduling", "Material Estimation", "Vendor Coordination", "MEP Coordination", "Interior Fitout", "Waterproofing", "Concrete Work", "Site Billing"] },
    ],
  },
  {
    categoryName: "Electrical & Maintenance",
    subcategories: [
      { name: "Electrical Trades", skills: ["Electrician", "Industrial Electrician", "House Wiring", "Panel Installation", "Motor Rewinding", "Cable Laying", "Solar Installation", "Solar Technician", "Inverter Maintenance", "Generator Maintenance"] },
      { name: "Facility Maintenance", skills: ["Facility Maintenance", "HVAC Maintenance", "Lift Maintenance", "Fire Alarm Systems", "CCTV Installation", "Access Control", "DG Set Maintenance", "Plumbing Maintenance", "Electrical Troubleshooting", "AMC Coordination"] },
    ],
  },
  {
    categoryName: "Transportation & Logistics",
    subcategories: [
      { name: "Transport", skills: ["Driver", "Light Vehicle Driving", "Heavy Vehicle Driving", "Commercial Driving", "Delivery Executive", "Route Planning", "Fleet Management", "Vehicle Maintenance", "Defensive Driving", "Transport Coordination"] },
      { name: "Logistics", skills: ["Warehouse Operations", "Inventory Management", "Supply Chain Management", "Dispatch", "Last Mile Delivery", "Courier Operations", "Procurement", "Vendor Management", "Import Export Documentation", "Logistics Coordination"] },
    ],
  },
  {
    categoryName: "Hospitality",
    subcategories: [
      { name: "Hotel Operations", skills: ["Front Office", "Reception", "Guest Relations", "Housekeeping", "Room Service", "Hotel Operations", "Reservation Management", "Concierge", "Banquet Operations", "Property Management System"] },
      { name: "Food & Beverage", skills: ["Chef", "Commis Chef", "Continental Cooking", "Indian Cooking", "Bakery", "Restaurant Management", "F&B Service", "Barista", "Food Safety", "Kitchen Stewarding"] },
    ],
  },
  {
    categoryName: "Retail",
    subcategories: [
      { name: "Store Operations", skills: ["Store Management", "Cashier", "Billing", "POS", "Merchandising", "Inventory Control", "Stock Replenishment", "Visual Merchandising", "Customer Handling", "Shrinkage Control"] },
      { name: "Retail Sales", skills: ["Counter Sales", "Fashion Retail", "Grocery Retail", "Electronics Retail", "Jewellery Sales", "Store Opening", "Store Closing", "Sales Promotion", "Product Demonstration", "Retail Audit"] },
    ],
  },
  {
    categoryName: "Customer Support & BPO",
    subcategories: [
      { name: "BPO", skills: ["Voice Process", "Non Voice Process", "Inbound Calling", "Outbound Calling", "Chat Support", "Email Support", "Customer Service", "Call Center Operations", "Telecalling", "Process Associate"] },
      { name: "Support", skills: ["Technical Support", "Helpdesk Support", "Ticketing Tools", "SLA Management", "Customer Success", "Client Support", "Escalation Handling", "CRM Support", "Remote Support", "Troubleshooting"] },
    ],
  },
  {
    categoryName: "Legal",
    subcategories: [
      { name: "Legal Services", skills: ["Advocate", "Legal Advisor", "Corporate Law", "Litigation", "Contract Drafting", "Legal Research", "Compliance", "Regulatory Compliance", "Due Diligence", "Paralegal", "Company Secretary", "Labour Law"] },
    ],
  },
  {
    categoryName: "Agriculture",
    subcategories: [
      { name: "Agriculture & Dairy", skills: ["Farming", "Organic Farming", "Crop Management", "Irrigation Management", "Agricultural Officer", "Dairy Farming", "Dairy Operations", "Livestock Management", "Farm Equipment Operation", "Agri Sales", "Poultry Farming", "Fisheries", "Horticulture", "Soil Testing", "Seed Production", "Fertilizer Sales", "Pesticide Application", "Greenhouse Management", "Tractor Operation", "Agronomy"] },
    ],
  },
  {
    categoryName: "Banking, Insurance & Financial Services",
    subcategories: [
      { name: "Banking", skills: ["Branch Banking", "Retail Banking", "CASA Sales", "Relationship Management", "KYC Verification", "AML Compliance", "Loan Disbursement", "Mortgage Loans", "Gold Loans", "Personal Loans", "Credit Card Sales", "Bank Teller", "Cash Handling", "Trade Finance", "Wealth Management"] },
      { name: "Insurance", skills: ["Insurance Sales", "Life Insurance", "Health Insurance", "General Insurance", "Claims Processing", "Claims Settlement", "Underwriting", "Actuarial Analysis", "Policy Issuance", "Bancassurance", "Agency Channel", "Insurance Operations", "Risk Assessment", "Motor Insurance", "Reinsurance"] },
    ],
  },
  {
    categoryName: "Telecom",
    subcategories: [
      { name: "Telecom Operations", skills: ["Telecom Installation", "Fiber Optic Splicing", "FTTH", "RF Engineering", "Tower Maintenance", "Network Rollout", "Drive Testing", "BTS Installation", "Microwave Link", "Telecom Sales", "Broadband Installation", "ISP Support", "Optical Fiber Cable", "NOC Monitoring", "Telecom Billing"] },
    ],
  },
  {
    categoryName: "Pharmaceuticals & Life Sciences",
    subcategories: [
      { name: "Pharma", skills: ["Pharmaceutical Sales", "Medical Representative", "MR", "Clinical Research", "Clinical Data Management", "Pharmacovigilance", "Drug Safety", "Regulatory Affairs", "Quality Assurance Pharma", "Quality Control Pharma", "GMP", "GLP", "HPLC", "Dissolution Testing", "Tablet Manufacturing", "Capsule Manufacturing"] },
      { name: "Biotech", skills: ["Biotechnology", "Microbiology", "Molecular Biology", "Cell Culture", "PCR", "ELISA", "Bioinformatics", "Laboratory Research", "Sample Preparation", "Sterility Testing"] },
    ],
  },
  {
    categoryName: "Real Estate",
    subcategories: [
      { name: "Real Estate Sales & Operations", skills: ["Real Estate Sales", "Property Sales", "Channel Partner Management", "Site Visits", "RERA Compliance", "Property Valuation", "Leasing", "Facility Leasing", "CRM Real Estate", "Broker Coordination", "Land Acquisition", "Property Management", "Tenant Management", "Real Estate Documentation"] },
    ],
  },
  {
    categoryName: "Aviation & Travel",
    subcategories: [
      { name: "Aviation", skills: ["Cabin Crew", "Ground Staff", "Airport Operations", "Air Ticketing", "Reservation Systems", "Amadeus", "Galileo", "Passenger Handling", "Baggage Handling", "Ramp Operations", "Aviation Security", "Load and Trim", "Flight Dispatch"] },
      { name: "Travel & Tourism", skills: ["Travel Consultant", "Tour Operations", "Visa Processing", "Holiday Packages", "Itinerary Planning", "Hotel Booking", "Corporate Travel", "Travel Desk", "GDS", "Forex Assistance"] },
    ],
  },
  {
    categoryName: "Beauty, Wellness & Fitness",
    subcategories: [
      { name: "Beauty", skills: ["Beautician", "Hair Styling", "Makeup Artist", "Skin Care", "Facial Treatment", "Manicure", "Pedicure", "Nail Art", "Salon Management", "Spa Therapy", "Massage Therapy", "Ayurveda Therapy"] },
      { name: "Fitness", skills: ["Fitness Training", "Personal Training", "Yoga Instruction", "Zumba Training", "Nutrition Counseling", "Gym Management", "Strength Training", "Pilates", "Sports Coaching", "Physique Assessment"] },
    ],
  },
  {
    categoryName: "Domestic, Caregiving & Facility Services",
    subcategories: [
      { name: "Caregiving", skills: ["Caregiver", "Elder Care", "Baby Care", "Nanny", "Home Nursing", "Patient Attendant", "Disability Support", "Home Care", "Medication Reminder", "Basic First Aid"] },
      { name: "Facility Services", skills: ["Housekeeping Staff", "Janitor", "Office Boy", "Pantry Staff", "Cook", "Domestic Helper", "Laundry", "Pest Control", "Gardening", "Sanitation Work", "Waste Management"] },
    ],
  },
  {
    categoryName: "Energy, Oil, Gas & Mining",
    subcategories: [
      { name: "Energy", skills: ["Solar EPC", "Wind Energy", "Renewable Energy", "Power Plant Operations", "Boiler Operation", "Turbine Operation", "Substation Maintenance", "Energy Audit", "Battery Maintenance", "EV Charging Station"] },
      { name: "Oil, Gas & Mining", skills: ["Oil and Gas Operations", "Pipeline Maintenance", "Rigging", "Drilling", "HSE", "Mining Operations", "Heavy Equipment Operation", "Excavator Operation", "Crane Operation", "Forklift Operation", "Earthmoving Equipment", "Safety Permit"] },
    ],
  },
  {
    categoryName: "Textile, Apparel & Gems",
    subcategories: [
      { name: "Textile & Apparel", skills: ["Tailoring", "Sewing Machine Operation", "Pattern Making", "Garment Production", "Textile Testing", "Dyeing", "Embroidery", "Merchandising Apparel", "Fashion Designing", "Boutique Management", "Quality Checking Garments"] },
      { name: "Gems & Jewellery", skills: ["Jewellery Design", "Goldsmith", "Diamond Grading", "Gemstone Identification", "Jewellery Sales", "CAD Jewellery Design", "Stone Setting", "Polishing", "Valuation", "Inventory Jewellery"] },
    ],
  },
  {
    categoryName: "NGO, Social Work & Community Services",
    subcategories: [
      { name: "Social Impact", skills: ["Social Work", "Community Mobilization", "Field Coordination", "Fundraising", "Grant Writing", "CSR", "Monitoring and Evaluation", "Program Coordination", "Livelihood Training", "Counseling", "Case Management", "Volunteer Management"] },
    ],
  },
  {
    categoryName: "Sports & Recreation",
    subcategories: [
      { name: "Sports", skills: ["Sports Coaching", "Cricket Coaching", "Football Coaching", "Badminton Coaching", "Swimming Coaching", "Lifeguard", "Sports Management", "Refereeing", "Physical Education", "Athlete Training"] },
    ],
  },
  {
    categoryName: "Government & Public Sector",
    subcategories: [
      { name: "Administration", skills: ["Clerical Work", "Data Entry", "Office Administration", "File Management", "Public Administration", "Administrative Officer", "Record Keeping", "Document Verification", "Government Liaison", "Tender Documentation", "E Governance", "Public Grievance Handling", "RTI Processing", "Court Clerk", "Panchayat Administration"] },
    ],
  },
  {
    categoryName: "Creative & Design",
    subcategories: [
      { name: "Design", skills: ["Graphic Design", "UI Design", "UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator", "Canva", "Wireframing", "Prototyping", "Design Systems", "User Research"] },
      { name: "Media Production", skills: ["Video Editing", "Premiere Pro", "After Effects", "Motion Graphics", "Animation", "2D Animation", "3D Animation", "Storyboarding", "Photography", "Photo Editing"] },
    ],
  },
  {
    categoryName: "Media & Communication",
    subcategories: [
      { name: "Content & Journalism", skills: ["Content Writing", "Technical Writing", "Copy Editing", "Journalism", "News Reporting", "Anchoring", "Script Writing", "Proofreading", "Sub Editing", "Public Relations"] },
    ],
  },
  {
    categoryName: "Security Services",
    subcategories: [
      { name: "Physical Security", skills: ["Security Guard", "Security Supervisor", "Access Control", "Patrolling", "CCTV Monitoring", "Visitor Management", "Fire Safety", "Emergency Response", "Crowd Control", "Loss Prevention"] },
    ],
  },
];

const ROLE_VARIANTS = [
  "", "Executive", "Associate", "Assistant", "Specialist", "Coordinator", "Officer", "Supervisor", "Manager", "Lead",
  "Senior", "Junior", "Trainee", "Technician", "Operator", "Consultant", "Analyst", "Trainer", "Engineer", "Administrator",
  "Quality", "Maintenance", "Operations", "Compliance",
];

const CERTIFIED_PREFIXES = ["Certified", "Experienced", "Skilled", "Entry Level", "Senior Level"];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildBaseSkills(): BaseSkill[] {
  return CATEGORY_SEEDS.flatMap(({ categoryName, subcategories }) =>
    subcategories.flatMap(({ name, skills, aliases = {} }) =>
      skills.map((skillName) => ({
        categoryName,
        subcategoryName: name,
        skillName,
        relatedKeywords: [
          skillName,
          `${skillName} jobs`,
          `${skillName} resume`,
          `${skillName} candidate`,
          `${skillName} experience`,
          `${skillName} hiring`,
        ],
        alternativeNames: aliases[skillName] || [],
        searchSynonyms: [
          skillName,
          ...skillName.split(/[&/,-]/).map((value) => value.trim()).filter((value) => value.length > 2),
          ...(aliases[skillName] || []),
        ],
      }))
    )
  );
}

function buildVariantName(skillName: string, variant: string): string {
  if (!variant) return skillName;
  if (["Senior", "Junior", "Entry Level", "Senior Level", "Certified", "Experienced", "Skilled"].includes(variant)) {
    return `${variant} ${skillName}`;
  }
  return `${skillName} ${variant}`;
}

function makeRecord(base: BaseSkill, skillName: string, suffix: string): SkillKeywordRecord {
  const normalizedSkill = skillName.trim();
  const variantKeywords = [
    normalizedSkill,
    `${normalizedSkill} job`,
    `${normalizedSkill} jobs`,
    `${normalizedSkill} resume`,
    `${normalizedSkill} profile`,
    `${normalizedSkill} candidate`,
    `${normalizedSkill} hiring`,
    `${normalizedSkill} vacancy`,
    `${normalizedSkill} experience`,
    `${normalizedSkill} near me`,
  ];
  return {
    ...base,
    id: `${slug(base.categoryName)}-${slug(base.subcategoryName)}-${slug(base.skillName)}${suffix}`,
    skillName: normalizedSkill,
    relatedKeywords: [...new Set([...base.relatedKeywords, ...variantKeywords])],
    alternativeNames: [...new Set(base.alternativeNames)],
    searchSynonyms: [...new Set([...base.searchSynonyms, normalizedSkill, compact(normalizedSkill)])],
  };
}

export const BASE_SKILL_KEYWORDS: SkillKeywordRecord[] = buildBaseSkills().map((base) => makeRecord(base, base.skillName, ""));

export const SKILL_KEYWORD_DATABASE: SkillKeywordRecord[] = buildBaseSkills().flatMap((base) => {
  const roleRecords = ROLE_VARIANTS.map((variant) => makeRecord(base, buildVariantName(base.skillName, variant), variant ? `-${slug(variant)}` : ""));
  const certifiedRecords = CERTIFIED_PREFIXES.map((prefix) => makeRecord(base, buildVariantName(base.skillName, prefix), `-${slug(prefix)}`));
  return [...roleRecords, ...certifiedRecords];
});

export const SKILL_DATABASE_STATS = {
  categories: CATEGORY_SEEDS.length,
  baseSkills: BASE_SKILL_KEYWORDS.length,
  generatedSkills: SKILL_KEYWORD_DATABASE.length,
};

export const SKILL_OPTIONS = [...new Set(BASE_SKILL_KEYWORDS.map((record) => record.skillName))].sort((a, b) =>
  a.localeCompare(b)
);

const VALID_SUGGESTION_KEYS = new Set(
  BASE_SKILL_KEYWORDS.flatMap((record) => [
    record.skillName.toLowerCase(),
    ...record.alternativeNames.map((alt) => alt.toLowerCase()),
  ])
);

export const SEARCH_SUGGESTION_DATASET = (() => {
  const suggestionMap = new Map<string, string>();

  BASE_SKILL_KEYWORDS.forEach((record) => {
    const values = [record.skillName, ...record.alternativeNames, ...record.searchSynonyms];
    values.forEach((value) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const normalized = trimmed.toLowerCase();
      if (/\b(job|jobs|resume|profile|candidate|hiring|vacancy|experience|near me)\b/.test(normalized)) return;
      const compactValue = compact(trimmed);
      if (trimmed === compactValue && !VALID_SUGGESTION_KEYS.has(normalized)) return;
      if (!suggestionMap.has(normalized)) {
        suggestionMap.set(normalized, trimmed);
      }
    });
  });

  return [...suggestionMap.values()].sort((a, b) => a.localeCompare(b));
})();

const NORMALIZED_LOOKUP = new Map<string, string>();
const TERM_RECORD_LOOKUP = new Map<string, SkillKeywordRecord>();
const SEARCH_TERMS_CACHE = new Map<string, string[]>();
const SKILLS_MATCH_CACHE = new Map<string, boolean>();

SKILL_KEYWORD_DATABASE.forEach((record) => {
  const canonical = record.skillName.toLowerCase();
  [record.skillName, ...record.relatedKeywords, ...record.alternativeNames, ...record.searchSynonyms].forEach((value) => {
    const key = compact(value);
    if (!key) return;
    if (!NORMALIZED_LOOKUP.has(key)) NORMALIZED_LOOKUP.set(key, canonical);
    if (!TERM_RECORD_LOOKUP.has(key)) TERM_RECORD_LOOKUP.set(key, record);
  });
});

export function normalizeSkillKeyword(value: string): string {
  const key = compact(value);
  return NORMALIZED_LOOKUP.get(key) || value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getSkillSearchTerms(value: string): string[] {
  const cacheKey = value.toLowerCase().trim();
  const cached = SEARCH_TERMS_CACHE.get(cacheKey);
  if (cached) return cached;

  const normalized = normalizeSkillKeyword(value);
  const key = compact(value);
  const matched = TERM_RECORD_LOOKUP.get(key);

  const terms = [
    value,
    normalized,
    ...(matched ? [matched.skillName, ...matched.alternativeNames, ...matched.searchSynonyms] : []),
  ]
    .map((term) => term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter((term, index, terms) => term.length > 0 && terms.indexOf(term) === index);

  SEARCH_TERMS_CACHE.set(cacheKey, terms);
  return terms;
}

export function skillsMatch(candidateSkill: string, searchTerm: string): boolean {
  const cacheKey = `${candidateSkill.toLowerCase().trim()}::${searchTerm.toLowerCase().trim()}`;
  const cached = SKILLS_MATCH_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  const candidateTerms = getSkillSearchTerms(candidateSkill);
  const searchTerms = getSkillSearchTerms(searchTerm);
  const matches = searchTerms.some((term) => candidateTerms.some((candidateTerm) => skillPhraseMatches(candidateTerm, term)));
  SKILLS_MATCH_CACHE.set(cacheKey, matches);
  return matches;
}

function skillPhraseMatches(candidateTerm: string, searchTerm: string): boolean {
  if (candidateTerm === searchTerm) return true;

  const candidateTokens = candidateTerm.split(" ").filter(Boolean);
  const searchTokens = searchTerm.split(" ").filter(Boolean);
  if (candidateTokens.length === 0 || searchTokens.length === 0) return false;

  if (searchTokens.length === 1) {
    return candidateTokens.includes(searchTokens[0]);
  }

  const candidateTokenSet = new Set(candidateTokens);
  return searchTokens.every((token) => candidateTokenSet.has(token));
}

export const RECOMMENDATION_KEYWORD_MAPPING: Record<string, string[]> = BASE_SKILL_KEYWORDS.reduce<Record<string, string[]>>(
  (mapping, record) => {
    mapping[record.skillName] = [...new Set([record.categoryName, record.subcategoryName, ...record.searchSynonyms, ...record.alternativeNames])];
    return mapping;
  },
  {}
);

export const JSON_SEED_DATA = {
  version: "2026-06-01",
  stats: SKILL_DATABASE_STATS,
  skills: SKILL_KEYWORD_DATABASE,
  searchSuggestions: SEARCH_SUGGESTION_DATASET,
  recommendationKeywordMapping: RECOMMENDATION_KEYWORD_MAPPING,
};
