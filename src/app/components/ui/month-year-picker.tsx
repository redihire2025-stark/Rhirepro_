"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "./utils";
import { buttonVariants } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { MONTH_NAMES } from "../../../lib/monthYear";

interface MonthYearBound {
  month: string;
  year: string;
}

interface MonthYearPickerProps {
  /** Full month name abbreviation, e.g. "Jan". Empty string means unset. */
  month: string;
  /** Four-digit year as a string, e.g. "2022". Empty string means unset. */
  year: string;
  onChange: (month: string, year: string) => void;
  minYear: number;
  maxYear: number;
  /**
   * Tighter bound than minYear/maxYear, at month granularity — e.g. tying an
   * End field to whatever the paired Start field currently holds, or capping
   * a field at today so it can't be set in the future. Both the dropdown
   * options and the nav arrows respect this, so an out-of-range value can
   * never be selected in the first place.
   */
  minMonthYear?: MonthYearBound;
  maxMonthYear?: MonthYearBound;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function toIndex(month: string, year: string): number {
  return Number(year) * 12 + MONTH_NAMES.indexOf(month);
}

/**
 * Popover-based Month + Year picker, styled to match the Date of Birth
 * calendar (same dropdown/nav-button classes as ui/calendar.tsx) but without
 * a day grid, since none of its callers (work history, education, projects,
 * certifications) track a specific day.
 */
function MonthYearPicker({
  month, year, onChange, minYear, maxYear, minMonthYear, maxMonthYear,
  placeholder = "Select month & year", disabled, className,
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false);

  const lowIndex = Math.max(minYear * 12, minMonthYear ? toIndex(minMonthYear.month, minMonthYear.year) : -Infinity);
  const highIndex = Math.min(maxYear * 12 + 11, maxMonthYear ? toIndex(maxMonthYear.month, maxMonthYear.year) : Infinity);
  const effectiveMinYear = Math.floor(lowIndex / 12);
  const effectiveMaxYear = Math.floor(highIndex / 12);

  const clamp = (idx: number) => Math.min(highIndex, Math.max(lowIndex, idx));

  const years = React.useMemo(() => {
    const list: string[] = [];
    for (let y = effectiveMinYear; y <= effectiveMaxYear; y++) list.push(String(y));
    return list;
  }, [effectiveMinYear, effectiveMaxYear]);

  const monthIndex = month ? MONTH_NAMES.indexOf(month) : -1;
  const yearValue = year || String(effectiveMaxYear);

  const monthOptions = React.useMemo(() => {
    return MONTH_NAMES.filter((_, idx) => {
      const candidate = Number(yearValue) * 12 + idx;
      return candidate >= lowIndex && candidate <= highIndex;
    });
  }, [yearValue, lowIndex, highIndex]);

  const commit = (idx: number) => {
    const clamped = clamp(idx);
    const y = Math.floor(clamped / 12);
    const m = clamped % 12;
    onChange(MONTH_NAMES[m], String(y));
  };

  const displayValue = month && year ? `${month} ${year}` : "";

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={displayValue}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={cn("cursor-pointer", className)}
        />
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-auto p-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => commit((monthIndex >= 0 ? Number(yearValue) * 12 + monthIndex : Number(yearValue) * 12) - 1)}
            className={cn(buttonVariants({ variant: "outline" }), "size-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <select
            value={monthIndex >= 0 ? month : ""}
            onChange={(e) => commit(Number(yearValue) * 12 + MONTH_NAMES.indexOf(e.target.value))}
            className="appearance-none bg-background border border-input rounded-md text-sm font-medium px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {monthIndex < 0 && <option value="" disabled>Month</option>}
            {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={yearValue}
            onChange={(e) => commit(Number(e.target.value) * 12 + (monthIndex >= 0 ? monthIndex : 0))}
            className="appearance-none bg-background border border-input rounded-md text-sm font-medium px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            type="button"
            onClick={() => commit((monthIndex >= 0 ? Number(yearValue) * 12 + monthIndex : Number(yearValue) * 12) + 1)}
            className={cn(buttonVariants({ variant: "outline" }), "size-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { MonthYearPicker };
