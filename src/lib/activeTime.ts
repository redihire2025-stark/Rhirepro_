/**
 * Utility for parsing and formatting candidate active time across RhirePro 2.0.
 */

export function parseActiveDate(c: {
  last_active_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
} | null | undefined): Date | null {
  if (!c) return null;
  const dateStr = c.last_active_at || c.updated_at || c.created_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats active time for display.
 * - Within 24 hours: "Active Today"
 * - Greater than 24 hours up to 48 hours: "Active 1 day ago"
 * - Greater than 48 hours: "Active N days ago" (e.g. Active 3 days ago)
 * - Missing or dummy candidate: "Active 6 months ago"
 */
export function formatActiveTime(
  dateInput?: Date | string | null,
  nowMs: number = Date.now()
): string {
  if (!dateInput) return "Active 6 months ago";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return "Active 6 months ago";

  const diffMs = nowMs - d.getTime();

  // Future timestamps or within 24 hours
  if (diffMs <= 24 * 60 * 60 * 1000) {
    return "Active Today";
  }

  const hours = diffMs / (1000 * 60 * 60);

  // Greater than 24 hours up to 48 hours
  if (hours <= 48) {
    return "Active 1 day ago";
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `Active ${days} days ago`;
  }

  const months = Math.floor(days / 30);
  if (months <= 1) {
    return "Active 1 month ago";
  }

  if (months < 12) {
    return `Active ${months} months ago`;
  }

  const years = Math.floor(days / 365);
  if (years <= 1) {
    return "Active 1 year ago";
  }

  return `Active ${years} years ago`;
}
