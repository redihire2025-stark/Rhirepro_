import type { Job } from "./supabase";

const IST_TIME_ZONE = "Asia/Kolkata";

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
