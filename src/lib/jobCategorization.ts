import type { Job as DBJob } from "./supabase";

export type JobCategory =
  | "DESIGN & CREATIVE"
  | "ADMIN/BPO"
  | "FINANCE & LEGAL"
  | "TECH & IT"
  | "SALES & MARKETING"
  | "HR & RECRUITMENT"
  | "OPERATIONS & SUPPORT";

export const JOB_CATEGORIES: JobCategory[] = [
  "DESIGN & CREATIVE",
  "ADMIN/BPO",
  "FINANCE & LEGAL",
  "TECH & IT",
  "SALES & MARKETING",
  "HR & RECRUITMENT",
  "OPERATIONS & SUPPORT",
];

type ScoredCategory = {
  category: JobCategory;
  score: number;
};

const CATEGORY_TERMS: Record<JobCategory, Array<{ term: string; weight: number }>> = {
  "DESIGN & CREATIVE": [
    { term: "design", weight: 4 },
    { term: "designer", weight: 5 },
    { term: "creative", weight: 4 },
    { term: "ui", weight: 4 },
    { term: "ux", weight: 4 },
    { term: "graphic", weight: 5 },
    { term: "brand", weight: 3 },
    { term: "visual", weight: 3 },
    { term: "figma", weight: 4 },
    { term: "photoshop", weight: 4 },
    { term: "illustrator", weight: 4 },
    { term: "indesign", weight: 4 },
    { term: "motion", weight: 3 },
    { term: "video editing", weight: 3 },
    { term: "content creator", weight: 3 },
  ],
  "ADMIN/BPO": [
    { term: "admin", weight: 4 },
    { term: "administrator", weight: 5 },
    { term: "administration", weight: 5 },
    { term: "bpo", weight: 5 },
    { term: "operations", weight: 4 },
    { term: "operation", weight: 4 },
    { term: "back office", weight: 5 },
    { term: "customer support", weight: 5 },
    { term: "customer service", weight: 5 },
    { term: "client support", weight: 4 },
    { term: "call center", weight: 5 },
    { term: "voice process", weight: 5 },
    { term: "non voice", weight: 5 },
    { term: "telecaller", weight: 5 },
    { term: "process associate", weight: 5 },
    { term: "coordinator", weight: 4 },
    { term: "executive", weight: 3 },
    { term: "assistant", weight: 3 },
    { term: "office", weight: 3 },
    { term: "reception", weight: 4 },
    { term: "front desk", weight: 4 },
    { term: "hr", weight: 3 },
    { term: "human resources", weight: 4 },
    { term: "recruit", weight: 4 },
    { term: "talent acquisition", weight: 5 },
    { term: "sales", weight: 3 },
    { term: "business development", weight: 4 },
    { term: "marketing", weight: 3 },
    { term: "seo", weight: 3 },
    { term: "content", weight: 2 },
    { term: "crm", weight: 3 },
    { term: "data entry", weight: 5 },
    { term: "mis", weight: 4 },
    { term: "analyst", weight: 2 },
    { term: "specialist", weight: 2 },
    { term: "manager", weight: 2 },
  ],
  "FINANCE & LEGAL": [
    { term: "finance", weight: 5 },
    { term: "financial", weight: 5 },
    { term: "fintech", weight: 4 },
    { term: "account", weight: 4 },
    { term: "accountant", weight: 5 },
    { term: "accounting", weight: 5 },
    { term: "accounts payable", weight: 5 },
    { term: "accounts receivable", weight: 5 },
    { term: "tax", weight: 5 },
    { term: "taxation", weight: 5 },
    { term: "gst", weight: 4 },
    { term: "tds", weight: 4 },
    { term: "audit", weight: 5 },
    { term: "auditor", weight: 5 },
    { term: "bookkeeping", weight: 5 },
    { term: "payroll", weight: 4 },
    { term: "treasury", weight: 5 },
    { term: "controller", weight: 4 },
    { term: "investment", weight: 4 },
    { term: "credit", weight: 4 },
    { term: "risk", weight: 4 },
    { term: "insurance", weight: 4 },
    { term: "bank", weight: 4 },
    { term: "banking", weight: 5 },
    { term: "loan", weight: 4 },
    { term: "underwriting", weight: 5 },
    { term: "compliance", weight: 5 },
    { term: "regulatory", weight: 5 },
    { term: "legal", weight: 5 },
    { term: "law", weight: 5 },
    { term: "lawyer", weight: 5 },
    { term: "advocate", weight: 5 },
    { term: "attorney", weight: 5 },
    { term: "contract", weight: 4 },
    { term: "contracts", weight: 4 },
    { term: "corporate law", weight: 5 },
    { term: "litigation", weight: 5 },
    { term: "paralegal", weight: 5 },
    { term: "company secretary", weight: 5 },
    { term: "cs", weight: 3 },
  ],
  "TECH & IT": [
    { term: "software", weight: 5 },
    { term: "developer", weight: 5 },
    { term: "engineer", weight: 5 },
    { term: "frontend", weight: 5 },
    { term: "backend", weight: 5 },
    { term: "full stack", weight: 5 },
    { term: "fullstack", weight: 5 },
    { term: "react", weight: 5 },
    { term: "angular", weight: 4 },
    { term: "vue", weight: 4 },
    { term: "node", weight: 4 },
    { term: "java", weight: 4 },
    { term: "python", weight: 4 },
    { term: "php", weight: 4 },
    { term: "dotnet", weight: 4 },
    { term: ".net", weight: 4 },
    { term: "qa", weight: 4 },
    { term: "testing", weight: 4 },
    { term: "devops", weight: 5 },
    { term: "cloud", weight: 4 },
    { term: "aws", weight: 4 },
    { term: "azure", weight: 4 },
    { term: "cybersecurity", weight: 5 },
    { term: "security", weight: 3 },
    { term: "data analyst", weight: 4 },
    { term: "data science", weight: 5 },
    { term: "data engineer", weight: 5 },
    { term: "machine learning", weight: 5 },
    { term: "ai", weight: 3 },
    { term: "database", weight: 4 },
    { term: "sql", weight: 4 },
    { term: "it support", weight: 4 },
    { term: "system admin", weight: 4 },
  ],
  "SALES & MARKETING": [
    { term: "sales", weight: 5 },
    { term: "business development", weight: 5 },
    { term: "bdm", weight: 4 },
    { term: "marketing", weight: 5 },
    { term: "digital marketing", weight: 5 },
    { term: "seo", weight: 5 },
    { term: "sem", weight: 4 },
    { term: "social media", weight: 5 },
    { term: "performance marketing", weight: 5 },
    { term: "lead generation", weight: 5 },
    { term: "inside sales", weight: 5 },
    { term: "field sales", weight: 5 },
    { term: "account manager", weight: 4 },
    { term: "growth", weight: 4 },
    { term: "brand marketing", weight: 4 },
    { term: "campaign", weight: 4 },
    { term: "market research", weight: 4 },
    { term: "customer success", weight: 4 },
  ],
  "HR & RECRUITMENT": [
    { term: "hr", weight: 5 },
    { term: "human resources", weight: 5 },
    { term: "recruiter", weight: 5 },
    { term: "recruitment", weight: 5 },
    { term: "talent acquisition", weight: 5 },
    { term: "talent specialist", weight: 4 },
    { term: "sourcing", weight: 4 },
    { term: "people operations", weight: 5 },
    { term: "hrbp", weight: 5 },
    { term: "payroll", weight: 3 },
    { term: "l&d", weight: 4 },
    { term: "learning and development", weight: 5 },
    { term: "employee engagement", weight: 4 },
    { term: "onboarding", weight: 4 },
  ],
  "OPERATIONS & SUPPORT": [
    { term: "operations manager", weight: 5 },
    { term: "process manager", weight: 5 },
    { term: "supply chain", weight: 5 },
    { term: "logistics", weight: 5 },
    { term: "procurement", weight: 5 },
    { term: "inventory", weight: 4 },
    { term: "warehouse", weight: 5 },
    { term: "vendor", weight: 3 },
    { term: "service delivery", weight: 5 },
    { term: "program manager", weight: 4 },
    { term: "project manager", weight: 4 },
    { term: "project coordinator", weight: 4 },
    { term: "support engineer", weight: 4 },
    { term: "technical support", weight: 5 },
    { term: "help desk", weight: 5 },
    { term: "customer success manager", weight: 4 },
    { term: "facility", weight: 4 },
    { term: "dispatch", weight: 4 },
  ],
};

function buildContent(job: DBJob): string {
  return [
    job.title,
    job.title,
    job.industry,
    job.department,
    job.department,
    job.description,
    job.roles_responsibilities,
    job.requirements,
    job.education,
    job.employment_type,
    ...(job.skills || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getJobCategoryScores(job: DBJob): ScoredCategory[] {
  const content = buildContent(job);

  return (Object.entries(CATEGORY_TERMS) as Array<[JobCategory, Array<{ term: string; weight: number }>]>)
    .map(([category, terms]) => ({
      category,
      score: terms.reduce((total, { term, weight }) => total + (content.includes(term) ? weight : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
}

export function inferJobCategory(job: DBJob): JobCategory | null {
  const [best] = getJobCategoryScores(job);
  return best && best.score > 0 ? best.category : null;
}

export function assignBalancedCategories<T extends { category: JobCategory | null; dbJob?: DBJob }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    category: item.dbJob ? inferJobCategory(item.dbJob) : item.category,
  }));
}

export function getAvailableJobCategories<T extends { category: JobCategory | null }>(items: T[]): JobCategory[] {
  return JOB_CATEGORIES.filter((category) => items.some((item) => item.category === category));
}

export function getRandomJobCategories(categories: JobCategory[], count: number): JobCategory[] {
  const next = [...categories];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next.slice(0, Math.max(count, 0));
}
