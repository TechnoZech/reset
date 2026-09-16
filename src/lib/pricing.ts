import type { ConsoleType, DayType, PricingRule } from "@/lib/types/database";
import { isWeekend, timeToMinutes } from "@/lib/utils";

export interface PriceQuoteInput {
  consoleType: ConsoleType;
  durationMinutes: number;
  date: Date | string;
  startTime?: string | null;
  rules: Pick<
    PricingRule,
    | "console_type"
    | "duration_minutes"
    | "price"
    | "start_time"
    | "end_time"
    | "day_type"
    | "is_active"
  >[];
  /** Fallback hourly rate from screen if no rule matches */
  fallbackHourlyRate?: number;
  /** Per-player multiplier. 2 players = 2× base rate. */
  players?: number;
}

function dayTypeMatches(ruleDay: DayType, date: Date) {
  if (ruleDay === "all") return true;
  const weekend = isWeekend(date);
  return ruleDay === "weekend" ? weekend : !weekend;
}

function timeWindowMatches(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  sessionStart?: string | null
) {
  if (!startTime || !endTime || !sessionStart) return true;
  const s = timeToMinutes(sessionStart);
  const a = timeToMinutes(startTime.slice(0, 5));
  const b = timeToMinutes(endTime.slice(0, 5));
  if (a <= b) return s >= a && s < b;
  // overnight window
  return s >= a || s < b;
}

/**
 * Server-side price calculation.
 * Prefer specific day_type + time-window rules, then generic duration rules.
 * Never trust client-provided totals.
 */
export function calculatePrice(input: PriceQuoteInput): number {
  const date = typeof input.date === "string" ? new Date(input.date) : input.date;
  const durationMinutes = asMinutes(input.durationMinutes);
  const players = asPlayerCount(input.players);
  const active = input.rules.filter(
    (r) =>
      r.is_active &&
      r.console_type === input.consoleType &&
      Number(r.duration_minutes) === durationMinutes &&
      dayTypeMatches(r.day_type, date) &&
      timeWindowMatches(r.start_time, r.end_time, input.startTime)
  );

  if (active.length > 0) {
    // Prefer narrowest match: timed window > weekend/weekday > all
    const scored = active
      .map((r) => {
        let score = 0;
        if (r.day_type !== "all") score += 2;
        if (r.start_time && r.end_time) score += 3;
        return { r, score };
      })
      .sort((a, b) => b.score - a.score || Number(a.r.price) - Number(b.r.price));

    return applyPlayerMultiplier(Number(scored[0].r.price), players);
  }

  // Pro-rate from nearest longer rule or hourly fallback
  const sameConsole = input.rules.filter(
    (r) =>
      r.is_active &&
      r.console_type === input.consoleType &&
      dayTypeMatches(r.day_type, date)
  );

  const hourly =
    Number(sameConsole.find((r) => r.duration_minutes === 60)?.price) ||
    input.fallbackHourlyRate ||
    89;

  return applyPlayerMultiplier(
    Math.ceil((Number(hourly) * durationMinutes) / 60),
    players
  );
}

export function asPlayerCount(players?: number | null) {
  const count = Math.round(Number(players));
  return Number.isFinite(count) && count > 0 ? count : 1;
}

export function asMinutes(value?: number | string | null) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function applyPlayerMultiplier(basePrice: number, players = 1) {
  return Math.round(basePrice * asPlayerCount(players));
}

export type ExtensionQuote = {
  extraMinutes: number;
  totalMinutes: number;
  players: number;
  currentAmount: number;
  quotedTotal: number;
  extraCharge: number;
  currentPerPlayer: number;
  newPerPlayer: number;
};

/**
 * Extra minutes are added once for the screen — never × player count.
 * Players only multiply the package price (30+30 → 60-min rate × players).
 */
export function quoteExtendedPackage(
  input: PriceQuoteInput & { extraMinutes: number; paidAmount?: number | null }
): ExtensionQuote {
  const durationMinutes = asMinutes(input.durationMinutes);
  const extraMinutes = asMinutes(input.extraMinutes);
  const players = asPlayerCount(input.players);
  const totalMinutes = durationMinutes + extraMinutes;

  const rawQuotedTotal = calculatePrice({
    consoleType: input.consoleType,
    durationMinutes: totalMinutes,
    date: input.date,
    startTime: input.startTime,
    rules: input.rules,
    fallbackHourlyRate: input.fallbackHourlyRate,
    players,
  });

  const calculatedCurrent = calculatePrice({
    consoleType: input.consoleType,
    durationMinutes,
    date: input.date,
    startTime: input.startTime,
    rules: input.rules,
    fallbackHourlyRate: input.fallbackHourlyRate,
    players,
  });

  const paid = Number(input.paidAmount);
  const currentAmount =
    Number.isFinite(paid) && paid >= 0 ? Math.round(paid) : calculatedCurrent;
  const quotedTotal = Math.max(rawQuotedTotal, currentAmount);

  return {
    extraMinutes,
    totalMinutes,
    players,
    currentAmount,
    quotedTotal,
    extraCharge: Math.max(0, quotedTotal - currentAmount),
    currentPerPlayer: Math.round(currentAmount / players),
    newPerPlayer: Math.round(quotedTotal / players),
  };
}

/** Bill actual play time using 15-minute rounding up against pricing rules. */
export function calculateSessionCharge(params: {
  elapsedMs: number;
  consoleType: ConsoleType;
  date: Date | string;
  startTime?: string | null;
  rules: PriceQuoteInput["rules"];
  fallbackHourlyRate?: number;
  players?: number;
}) {
  const minutes = Math.max(1, Math.ceil(params.elapsedMs / 60000));
  const hasExactMinutes = params.rules.some(
    (r) =>
      r.is_active &&
      r.console_type === params.consoleType &&
      r.duration_minutes === minutes
  );
  const billed = hasExactMinutes ? minutes : Math.ceil(minutes / 15) * 15;

  // Try exact duration rule first; otherwise use pro-rated hourly
  const exact = calculatePrice({
    consoleType: params.consoleType,
    durationMinutes: billed,
    date: params.date,
    startTime: params.startTime,
    rules: params.rules,
    fallbackHourlyRate: params.fallbackHourlyRate,
    players: params.players,
  });

  // If no exact rule, calculatePrice already pro-rates via hourly
  // For custom billed durations without a rule, ensure we don't undercharge
  const hasExact = params.rules.some(
    (r) =>
      r.is_active &&
      r.console_type === params.consoleType &&
      r.duration_minutes === billed
  );

  if (hasExact) return { minutes, billedMinutes: billed, amount: exact };

  const amount = calculatePrice({
    consoleType: params.consoleType,
    durationMinutes: 60,
    date: params.date,
    startTime: params.startTime,
    rules: params.rules,
    fallbackHourlyRate: params.fallbackHourlyRate,
    players: params.players,
  });

  return {
    minutes,
    billedMinutes: billed,
    amount: Math.ceil((amount * billed) / 60),
  };
}
