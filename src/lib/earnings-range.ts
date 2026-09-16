import { toDateString } from "@/lib/utils";

export const EARNINGS_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "this_month", label: "This month" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom" },
] as const;

export type EarningsPreset = (typeof EARNINGS_PRESETS)[number]["key"];

export function eachDateInclusive(from: string, to: string) {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    const [y, m, d] = cur.split("-").map(Number);
    cur = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }
  return dates;
}

export function resolveEarningsRange(
  preset: string,
  fromParam?: string,
  toParam?: string
) {
  const today = new Date();
  const todayStr = toDateString(today);

  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const s = toDateString(y);
    return { from: s, to: s, days: 1, preset };
  }
  if (preset === "week") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toDateString(from), to: todayStr, days: 7, preset };
  }
  if (preset === "month") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toDateString(from), to: todayStr, days: 30, preset };
  }
  if (preset === "this_month") {
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const days = eachDateInclusive(from, todayStr).length;
    return { from, to: todayStr, days, preset };
  }
  if (preset === "this_year") {
    const from = `${today.getFullYear()}-01-01`;
    const days = eachDateInclusive(from, todayStr).length;
    return { from, to: todayStr, days, preset };
  }
  if (preset === "custom" && fromParam && toParam) {
    const from = fromParam <= toParam ? fromParam : toParam;
    const to = fromParam <= toParam ? toParam : fromParam;
    return { from, to, days: eachDateInclusive(from, to).length, preset: "custom" };
  }
  return { from: todayStr, to: todayStr, days: 1, preset: "today" };
}
