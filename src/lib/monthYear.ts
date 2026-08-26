export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthYearIndex(month: string, year: string): number {
  return Number(year) * 12 + MONTH_NAMES.indexOf(month);
}

/** For fields stored as separate month + year values (work history, education, projects). */
export function formatMonthYear(month?: string | null, year?: string | null): string {
  if (!year) return "";
  return month ? `${month} ${year}` : year;
}

/** For fields stored as a single "YYYY-MM" string (certifications). */
export function formatYearMonthString(value?: string | null): string {
  if (!value) return "";
  const [year, monthNum] = value.split("-");
  const idx = Number(monthNum) - 1;
  if (!year || Number.isNaN(idx) || idx < 0 || idx > 11) return value;
  return `${MONTH_NAMES[idx]} ${year}`;
}

/** Splits a "YYYY-MM" string into separate month-name + year for the MonthYearPicker. */
export function parseYearMonthString(value?: string | null): { month: string; year: string } {
  if (!value) return { month: "", year: "" };
  const [year, monthNum] = value.split("-");
  const idx = Number(monthNum) - 1;
  if (!year || Number.isNaN(idx) || idx < 0 || idx > 11) return { month: "", year: "" };
  return { month: MONTH_NAMES[idx], year };
}

/** Combines a month name + year back into the "YYYY-MM" string these fields are stored as. */
export function toYearMonthString(month: string, year: string): string {
  const idx = MONTH_NAMES.indexOf(month);
  if (idx < 0 || !year) return "";
  return `${year}-${String(idx + 1).padStart(2, "0")}`;
}
