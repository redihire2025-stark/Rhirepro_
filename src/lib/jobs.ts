import type { Job } from "./supabase";

const IST_TIME_ZONE = "Asia/Kolkata";
export const JOB_EXPIRY_DAYS = 15;

export const SALARY_AMOUNT_OPTIONS = [
  { value: 0, label: "₹0" },
  { value: 100000, label: "₹100000" },
  { value: 200000, label: "₹200000" },
  { value: 300000, label: "₹300000" },
  { value: 400000, label: "₹400000" },
  { value: 500000, label: "₹500000" },
  { value: 600000, label: "₹600000" },
  { value: 800000, label: "₹800000" },
  { value: 1000000, label: "₹1000000" },
  { value: 1200000, label: "₹1200000" },
  { value: 1500000, label: "₹1500000" },
  { value: 2000000, label: "₹2000000" },
  { value: 2500000, label: "₹2500000" },
  { value: 3000000, label: "₹3000000" },
  { value: 4000000, label: "₹4000000" },
  { value: 5000000, label: "₹5000000" },
] as const;

function formatLpaValue(value: number): string {
  const lpa = value >= 1000 ? value / 100000 : value;
  return Number.isInteger(lpa) ? String(lpa) : lpa.toFixed(1).replace(/\.0$/, "");
}

function isAtLeast50Lpa(value: number): boolean {
  return (value >= 1000 ? value / 100000 : value) >= 50;
}

export function formatSalaryRangeFromValues(
  salaryMin: number | string | null | undefined,
  salaryMax: number | string | null | undefined
): string {
  const min = salaryMin === "" || salaryMin == null ? null : Number(salaryMin);
  const max = salaryMax === "" || salaryMax == null ? null : Number(salaryMax);

  if (min == null && max == null) return "Salary not disclosed";
  if (min != null && Number.isNaN(min)) return "Salary not disclosed";
  if (max != null && Number.isNaN(max)) return "Salary not disclosed";

  if (min != null && max != null) {
    if (min === max) return `${formatLpaValue(min)} LPA`;
    return `${formatLpaValue(min)}-${formatLpaValue(max)} LPA${isAtLeast50Lpa(max) ? "+" : ""}`;
  }

  if (max != null) return `Below ${formatLpaValue(max)} LPA${isAtLeast50Lpa(max) ? "+" : ""}`;
  return `Above ${formatLpaValue(min!)} LPA`;
}

export function formatJobSalary(job: Pick<Job, "salary_min" | "salary_max" | "salary_type">): string {
  if (job.salary_type !== "LPA") return "Salary not disclosed";
  return formatSalaryRangeFromValues(job.salary_min, job.salary_max);
}

function parseNumericValue(value: number | string | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function formatRecruiterCurrencyValue(v: number): string {
  return `₹${v < 1000 ? v * 100000 : v}`;
}

function formatRecruiterSalaryRange(min: number | null, max: number | null): string {
  if (min != null && max != null) {
    if (min === max) return formatRecruiterCurrencyValue(min);
    return `${formatRecruiterCurrencyValue(min)}-${formatRecruiterCurrencyValue(max)}`;
  }

  if (max != null) return `Below ${formatRecruiterCurrencyValue(max)}`;
  return `Above ${formatRecruiterCurrencyValue(min!)}`;
}

export function formatSalaryRangeFromValuesRecruiter(
  salaryMin: number | string | null | undefined,
  salaryMax: number | string | null | undefined
): string {
  const min = parseNumericValue(salaryMin);
  const max = parseNumericValue(salaryMax);

  if (min == null && max == null) return 'Salary not disclosed';

  return formatRecruiterSalaryRange(min, max);
}

export function formatJobSalaryRecruiter(job: Pick<Job, "salary_min" | "salary_max" | "salary_type">): string {
  if (job.salary_type !== "LPA") return "Salary not disclosed";
  return formatSalaryRangeFromValuesRecruiter(job.salary_min, job.salary_max);
}

function getIstDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: IST_TIME_ZONE,
  });
}

function getIstTime(value: Date): string {
  return value.toLocaleTimeString("en-GB", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildJobDeadlineTimestamp(date: string, time?: string): string | null {
  if (!date) return null;
  if (!time) return date;

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  if ([year, month, day, hours, minutes].some(Number.isNaN)) {
    return date;
  }

  const istOffsetMinutes = 5 * 60 + 30;
  const utcTimestamp = Date.UTC(year, month - 1, day, hours, minutes) - istOffsetMinutes * 60 * 1000;
  return new Date(utcTimestamp).toISOString();
}

export function buildJobExpiryTimestamp(daysFromNow = JOB_EXPIRY_DAYS, now = new Date()): string {
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + daysFromNow);
  return expiry.toISOString();
}

export function formatJobDeadline(job: Pick<Job, "deadline" | "deadline_time">): string {
  if (!job.deadline) return "";

  const dateLabel = new Date(job.deadline).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST_TIME_ZONE,
  });

  if (!job.deadline_time) return dateLabel;

  const [hours, minutes] = job.deadline_time.split(":");
  const timeDate = new Date();
  timeDate.setHours(Number(hours), Number(minutes), 0, 0);
  const timeLabel = timeDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateLabel}, ${timeLabel}`;
}

export function isJobExpired(job: Pick<Job, "deadline" | "deadline_time">, now = new Date()): boolean {
  if (!job.deadline) return false;

  if (!job.deadline_time && job.deadline.includes("T")) {
    return new Date(job.deadline).getTime() <= now.getTime();
  }

  const deadlineDate = getIstDate(job.deadline);
  const todayDate = getIstDate(now);

  if (deadlineDate < todayDate) return true;
  if (deadlineDate > todayDate) return false;
  if (!job.deadline_time) return true;

  return getIstTime(now) >= job.deadline_time.slice(0, 5);
}

export function getEffectiveJobStatus(job: Pick<Job, "status" | "deadline" | "deadline_time">, now = new Date()): Job["status"] {
  if ((job.status === "Active" || job.status === "Paused") && isJobExpired(job, now)) {
    return "Expired";
  }

  if (job.status === "Expired" && !isJobExpired(job, now)) {
    return "Active";
  }

  return job.status;
}

export function isJobVisibleToSeekers(job: Pick<Job, "status" | "deadline" | "deadline_time">, now = new Date()): boolean {
  return getEffectiveJobStatus(job, now) === "Active" && !isJobExpired(job, now);
}

export function getJobDaysRemaining(job: Pick<Job, "deadline">, now = new Date()): number {
  if (!job.deadline) return 0;
  const remainingMs = new Date(job.deadline).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remainingMs / 86400000));
}

export function getRepostedDeadline(daysFromNow = JOB_EXPIRY_DAYS, now = new Date()): string {
  return buildJobExpiryTimestamp(daysFromNow, now);
}
