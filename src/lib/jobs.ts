import type { Job } from "./supabase";

const IST_TIME_ZONE = "Asia/Kolkata";

export const SALARY_AMOUNT_OPTIONS = [
  { value: 0, label: "₹0" },
  { value: 50000, label: "₹50,000" },
  { value: 100000, label: "₹1,00,000" },
  { value: 200000, label: "₹2,00,000" },
  { value: 300000, label: "₹3,00,000" },
  { value: 400000, label: "₹4,00,000" },
  { value: 500000, label: "₹5,00,000" },
  { value: 600000, label: "₹6,00,000" },
  { value: 800000, label: "₹8,00,000" },
  { value: 1000000, label: "₹10,00,000" },
  { value: 1200000, label: "₹12,00,000" },
  { value: 1500000, label: "₹15,00,000" },
  { value: 2000000, label: "₹20,00,000" },
  { value: 2500000, label: "₹25,00,000" },
  { value: 3000000, label: "₹30,00,000" },
  { value: 4000000, label: "₹40,00,000" },
  { value: 5000000, label: "₹50,00,000+" },
] as const;

function formatLpaValue(value: number): string {
  const lpa = value >= 1000 ? value / 100000 : value;
  return Number.isInteger(lpa) ? String(lpa) : lpa.toFixed(1).replace(/\.0$/, "");
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
    if (min === max) return `₹${formatLpaValue(min)} LPA`;
    return `₹${formatLpaValue(min)}–${formatLpaValue(max)} LPA${max >= 5000000 ? "+" : ""}`;
  }

  if (max != null) return `Below ₹${formatLpaValue(max)} LPA${max >= 5000000 ? "+" : ""}`;
  return `Above ₹${formatLpaValue(min!)} LPA`;
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
