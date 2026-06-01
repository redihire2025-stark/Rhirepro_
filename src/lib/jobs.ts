import type { Job } from "./supabase";

const IST_TIME_ZONE = "Asia/Kolkata";

export const SALARY_RANGE_OPTIONS = [
  "Below ₹2 LPA",
  "₹2-4 LPA",
  "₹4-6 LPA",
  "₹6-10 LPA",
  "₹10-15 LPA",
  "₹15-20 LPA",
  "Above ₹20 LPA",
] as const;

export type SalaryRangeOption = (typeof SALARY_RANGE_OPTIONS)[number];

const SALARY_RANGE_VALUES: Record<SalaryRangeOption, { min: number | null; max: number | null }> = {
  "Below ₹2 LPA": { min: null, max: 2 },
  "₹2-4 LPA": { min: 2, max: 4 },
  "₹4-6 LPA": { min: 4, max: 6 },
  "₹6-10 LPA": { min: 6, max: 10 },
  "₹10-15 LPA": { min: 10, max: 15 },
  "₹15-20 LPA": { min: 15, max: 20 },
  "Above ₹20 LPA": { min: 20, max: null },
};

export function getSalaryRangeValues(range: string): { min: number | null; max: number | null; type: "LPA" } {
  const values = SALARY_RANGE_VALUES[range as SalaryRangeOption] ?? { min: null, max: null };
  return { ...values, type: "LPA" };
}

export function getSalaryRangeFromJob(job: Pick<Job, "salary_min" | "salary_max" | "salary_type">): string {
  if (job.salary_type !== "LPA") return "";

  const match = SALARY_RANGE_OPTIONS.find((range) => {
    const values = SALARY_RANGE_VALUES[range];
    return values.min === job.salary_min && values.max === job.salary_max;
  });

  return match ?? "";
}

export function formatJobSalary(job: Pick<Job, "salary_min" | "salary_max" | "salary_type">): string {
  const selectedRange = getSalaryRangeFromJob(job);
  if (selectedRange) return selectedRange;

  if (job.salary_type === "LPA" && job.salary_max && !job.salary_min) {
    return `Below ₹${job.salary_max} LPA`;
  }

  if (job.salary_type === "LPA" && job.salary_min && !job.salary_max) {
    return `Above ₹${job.salary_min} LPA`;
  }

  if (job.salary_min && job.salary_max && job.salary_type) {
    return `${job.salary_min}-${job.salary_max} ${job.salary_type}`;
  }

  if (job.salary_min && job.salary_type) {
    return `${job.salary_min}+ ${job.salary_type}`;
  }

  return "Salary not disclosed";
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
