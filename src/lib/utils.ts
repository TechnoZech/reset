import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHours(hours: number) {
  return `${hours.toFixed(1)}h`;
}

/** Elapsed ms for a session using server timestamps + pause accounting. */
export function getSessionElapsedMs(params: {
  startedAt: string;
  endedAt?: string | null;
  pausedAt?: string | null;
  totalPausedMs?: number;
  nowMs?: number;
}) {
  const now = params.nowMs ?? Date.now();
  const start = new Date(params.startedAt).getTime();
  const end = params.endedAt ? new Date(params.endedAt).getTime() : now;
  let paused = params.totalPausedMs ?? 0;

  if (params.pausedAt && !params.endedAt) {
    paused += now - new Date(params.pausedAt).getTime();
  }

  return Math.max(0, end - start - paused);
}

export function formatTimer(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function isWeekend(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Local calendar date (cafe timezone), not UTC. */
export function localDateString(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localTimeString(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}
