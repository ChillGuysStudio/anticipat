import { format, parse } from "date-fns";

export function getCurrentMonthKey(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function formatMonthKey(month: string) {
  const parsed = parse(month, "yyyy-MM", new Date());
  return format(parsed, "MMMM yyyy");
}

export function formatMonths(months: number) {
  const rounded = Math.max(0, Math.round(months));
  return `${rounded} ${rounded === 1 ? "month" : "months"}`;
}

export function formatYearsAndMonths(months: number) {
  const rounded = Math.max(0, Math.round(months));
  const years = Math.floor(rounded / 12);
  const rest = rounded % 12;
  const yearLabel = years === 1 ? "year" : "years";
  const monthLabel = rest === 1 ? "month" : "months";

  if (years === 0) return `${rest} ${monthLabel}`;
  if (rest === 0) return `${years} ${yearLabel}`;
  return `${years} ${yearLabel} ${rest} ${monthLabel}`;
}
