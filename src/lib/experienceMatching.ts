import type { Job } from "./supabase";

export interface SkillExperienceRequirement {
  skill: string;
  min_years: number;
}

export interface SkillMatrixEvaluationItem {
  skill: string;
  requiredYears: number;
  candidateYears: number;
  match: boolean;
  status: "exceeds" | "met" | "partial" | "missing";
}

export interface CandidateExperienceMatchResult {
  matchScore: number; // 0 to 100
  overallExperienceScore: number; // 0 to 100
  skillMatrixScore: number; // 0 to 100
  overallFitStatus: "ideal" | "underqualified" | "overqualified" | "met";
  overallFitLabel: string;
  candidateTotalExpYears: number;
  skillMatrix: SkillMatrixEvaluationItem[];
}

/**
 * Normalizes skill experiences payload from DB/Form into a standard Record<string, number> mapping skill name (lowercase) to required years.
 */
export function parseSkillExperiences(val: unknown): Record<string, number> {
  if (!val) return {};
  const result: Record<string, number> = {};

  if (Array.isArray(val)) {
    val.forEach((item) => {
      if (item && typeof item === "object" && "skill" in item && "min_years" in item) {
        const skillName = String(item.skill).trim().toLowerCase();
        const years = Number(item.min_years) || 0;
        if (skillName) result[skillName] = years;
      }
    });
  } else if (typeof val === "object") {
    Object.entries(val as Record<string, unknown>).forEach(([skill, years]) => {
      const skillName = skill.trim().toLowerCase();
      const numYears = Number(years) || 0;
      if (skillName) result[skillName] = numYears;
    });
  }

  return result;
}

/**
 * Calculates total candidate experience in years based on total_experience string or work_experience entries.
 */
export function parseCandidateTotalExperienceYears(candidate: {
  total_experience?: string | null;
  work_experience?: Array<{
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean | null;
  }> | null;
}): number {
  if (candidate.total_experience) {
    const m = candidate.total_experience.match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
  }

  const exps = candidate.work_experience || [];
  if (exps.length === 0) return 0;

  let totalMonths = 0;
  const now = new Date();

  exps.forEach((exp) => {
    const parseDate = (s: string | null | undefined): Date => {
      if (!s || s.toLowerCase() === "present") return now;
      const d = new Date(s);
      return isNaN(d.getTime()) ? now : d;
    };
    const start = parseDate(exp.start_date);
    const end = exp.is_current ? now : parseDate(exp.end_date);
    totalMonths += Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
  });

  return Math.floor(totalMonths / 12);
}

/**
 * Evaluates candidate total experience against job min & max experience bounds.
 */
export function evaluateOverallExperience(
  candidateExpYears: number,
  minExp?: number | null,
  maxExp?: number | null
): {
  score: number;
  status: "ideal" | "underqualified" | "overqualified" | "met";
  label: string;
} {
  const min = minExp != null && !isNaN(Number(minExp)) ? Number(minExp) : null;
  const max = maxExp != null && !isNaN(Number(maxExp)) ? Number(maxExp) : null;

  if (min == null && max == null) {
    return { score: 100, status: "met", label: "No experience bounds set" };
  }

  if (min != null && max != null) {
    if (candidateExpYears >= min && candidateExpYears <= max) {
      return { score: 100, status: "ideal", label: `Ideal fit (${candidateExpYears} yrs within ${min}–${max} yrs requirement)` };
    }
    if (candidateExpYears < min) {
      const gap = min - candidateExpYears;
      const penalty = Math.min(80, gap * 25);
      return {
        score: Math.max(10, 100 - penalty),
        status: "underqualified",
        label: `Underqualified (${candidateExpYears} yrs vs min ${min} yrs req)`,
      };
    }
    // candidateExpYears > max
    const excess = candidateExpYears - max;
    const penalty = Math.min(30, excess * 10);
    return {
      score: Math.max(70, 100 - penalty),
      status: "overqualified",
      label: `Overqualified (${candidateExpYears} yrs vs max ${max} yrs req)`,
    };
  }

  if (min != null) {
    if (candidateExpYears >= min) {
      return { score: 100, status: "ideal", label: `Meets requirement (${candidateExpYears} yrs >= ${min} yrs min)` };
    }
    const gap = min - candidateExpYears;
    const penalty = Math.min(80, gap * 25);
    return {
      score: Math.max(10, 100 - penalty),
      status: "underqualified",
      label: `Below minimum (${candidateExpYears} yrs vs ${min} yrs min)`,
    };
  }

  if (max != null) {
    if (candidateExpYears <= max) {
      return { score: 100, status: "ideal", label: `Meets requirement (${candidateExpYears} yrs <= ${max} yrs max)` };
    }
    return {
      score: 80,
      status: "overqualified",
      label: `Exceeds max requirement (${candidateExpYears} yrs vs ${max} yrs max)`,
    };
  }

  return { score: 100, status: "met", label: "Meets requirements" };
}

/**
 * Estimates candidate years of experience for a specific skill based on candidate profile details & work history.
 */
export function estimateCandidateSkillExperienceYears(
  skill: string,
  candidate: {
    skills?: string[] | null;
    total_experience?: string | null;
    work_experience?: Array<{
      title?: string | null;
      description?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      is_current?: boolean | null;
    }> | null;
  }
): number {
  const normSkill = skill.trim().toLowerCase();
  const cSkills = (candidate.skills || []).map((s) => s.trim().toLowerCase());
  const hasSkill = cSkills.some((s) => s.includes(normSkill) || normSkill.includes(s));

  if (!hasSkill) {
    const exps = candidate.work_experience || [];
    const mentionsInExp = exps.some(
      (e) => (e.title && e.title.toLowerCase().includes(normSkill)) || (e.description && e.description.toLowerCase().includes(normSkill))
    );
    if (!mentionsInExp) return 0;
  }

  const totalYears = parseCandidateTotalExperienceYears(candidate);
  const exps = candidate.work_experience || [];

  if (exps.length === 0) {
    return Math.max(1, totalYears);
  }

  let skillMonths = 0;
  const now = new Date();

  exps.forEach((exp) => {
    const text = `${exp.title || ""} ${exp.description || ""}`.toLowerCase();
    const isRelevant = text.includes(normSkill) || hasSkill;
    if (isRelevant) {
      const parseDate = (s: string | null | undefined): Date => {
        if (!s || s.toLowerCase() === "present") return now;
        const d = new Date(s);
        return isNaN(d.getTime()) ? now : d;
      };
      const start = parseDate(exp.start_date);
      const end = exp.is_current ? now : parseDate(exp.end_date);
      skillMonths += Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    }
  });

  const calculatedYears = Math.floor(skillMonths / 12);
  return calculatedYears > 0 ? calculatedYears : hasSkill ? Math.max(1, totalYears) : 0;
}

/**
 * Evaluates candidate skills & experience against job skill matrix requirements.
 */
export function evaluateJobSkillMatrix(
  job: Pick<Job, "skills"> & { skill_experiences?: unknown },
  candidate: {
    skills?: string[] | null;
    total_experience?: string | null;
    work_experience?: Array<{
      title?: string | null;
      description?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      is_current?: boolean | null;
    }> | null;
  }
): {
  skillMatrixScore: number;
  items: SkillMatrixEvaluationItem[];
} {
  const jobSkills = job.skills || [];
  const reqMap = parseSkillExperiences(job.skill_experiences);

  if (jobSkills.length === 0 && Object.keys(reqMap).length === 0) {
    return { skillMatrixScore: 100, items: [] };
  }

  const rawSkillNames = [...jobSkills.map((s) => s.trim()), ...Object.keys(reqMap).map((s) => s.trim())].filter(Boolean);
  const seenKeys = new Set<string>();
  const allRequiredSkillNames: string[] = [];

  rawSkillNames.forEach((skillName) => {
    const key = skillName.toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      allRequiredSkillNames.push(skillName);
    }
  });

  let totalScoreSum = 0;
  const items: SkillMatrixEvaluationItem[] = allRequiredSkillNames.map((skillName) => {
    const key = skillName.toLowerCase();
    const requiredYears = reqMap[key] !== undefined ? reqMap[key] : 1;
    const candidateYears = estimateCandidateSkillExperienceYears(skillName, candidate);

    let match = false;
    let status: SkillMatrixEvaluationItem["status"] = "missing";

    if (candidateYears >= requiredYears && requiredYears > 0) {
      match = true;
      status = candidateYears > requiredYears ? "exceeds" : "met";
      totalScoreSum += 100;
    } else if (candidateYears > 0) {
      status = "partial";
      const ratio = candidateYears / Math.max(1, requiredYears);
      totalScoreSum += Math.round(ratio * 70);
    } else {
      status = "missing";
      totalScoreSum += 0;
    }

    return {
      skill: skillName,
      requiredYears,
      candidateYears,
      match,
      status,
    };
  });

  const skillMatrixScore = allRequiredSkillNames.length > 0 ? Math.round(totalScoreSum / allRequiredSkillNames.length) : 100;

  return { skillMatrixScore, items };
}

/**
 * Calculates a candidate's comprehensive experience match against a job post.
 */
export function calculateCandidateExperienceMatch(
  candidate: {
    skills?: string[] | null;
    total_experience?: string | null;
    work_experience?: Array<{
      title?: string | null;
      description?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      is_current?: boolean | null;
    }> | null;
  },
  job: Pick<Job, "skills" | "experience_min" | "experience_max"> & { skill_experiences?: unknown }
): CandidateExperienceMatchResult {
  const candidateTotalExpYears = parseCandidateTotalExperienceYears(candidate);
  const overallEval = evaluateOverallExperience(candidateTotalExpYears, job.experience_min, job.experience_max);
  const skillMatrixEval = evaluateJobSkillMatrix(job, candidate);

  const matchScore = Math.round(overallEval.score * 0.4 + skillMatrixEval.skillMatrixScore * 0.6);

  return {
    matchScore,
    overallExperienceScore: overallEval.score,
    skillMatrixScore: skillMatrixEval.skillMatrixScore,
    overallFitStatus: overallEval.status,
    overallFitLabel: overallEval.label,
    candidateTotalExpYears,
    skillMatrix: skillMatrixEval.items,
  };
}
