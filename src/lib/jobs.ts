import type { Job } from "./supabase";

const IST_TIME_ZONE = "Asia/Kolkata";

export const SALARY_AMOUNT_OPTIONS = [
  { value: 0, label: "0 LPA" },
  { value: 1, label: "1 LPA" },
  { value: 2, label: "2 LPA" },
  { value: 3, label: "3 LPA" },
  { value: 4, label: "4 LPA" },
  { value: 5, label: "5 LPA" },
  { value: 6, label: "6 LPA" },
  { value: 8, label: "8 LPA" },
  { value: 10, label: "10 LPA" },
  { value: 12, label: "12 LPA" },
  { value: 15, label: "15 LPA" },
  { value: 20, label: "20 LPA" },
  { value: 25, label: "25 LPA" },
  { value: 30, label: "30 LPA" },
  { value: 40, label: "40 LPA" },
  { value: 50, label: "50 LPA+" },
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

export function getJobDeadlineDateValue(job: Pick<Job, "deadline">): string {
  if (!job.deadline) return "";
  return getIstDate(job.deadline);
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

  const deadlineDate = getIstDate(job.deadline);
  const todayDate = getIstDate(now);

  if (deadlineDate < todayDate) return true;
  if (deadlineDate > todayDate) return false;
  if (!job.deadline_time) return true;

  return getIstTime(now) >= job.deadline_time.slice(0, 5);
}

export function getEffectiveJobStatus(job: Pick<Job, "status" | "deadline" | "deadline_time">, now = new Date()): Job["status"] {
  if (job.status === "Expired" && !isJobExpired(job, now)) {
    return "Active";
  }

  return job.status;
}

export function isJobVisibleToSeekers(job: Pick<Job, "status" | "deadline" | "deadline_time">, now = new Date()): boolean {
  return getEffectiveJobStatus(job, now) === "Active" && !isJobExpired(job, now);
}

export function getRepostedDeadline(daysFromNow = 30, now = new Date()): string {
  const nextDeadline = new Date(now);
  nextDeadline.setDate(nextDeadline.getDate() + daysFromNow);
  return nextDeadline.toISOString().split("T")[0];
}
