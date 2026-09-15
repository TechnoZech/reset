"use client";

import { useEffect, useState } from "react";
import { isSessionOvertime } from "@/hooks/use-session-overtime-alarm";
import { cn, formatTimer, getSessionElapsedMs } from "@/lib/utils";

export function LiveTimer({
  startedAt,
  pausedAt,
  totalPausedMs,
  status,
  durationMinutes,
}: {
  startedAt: string;
  pausedAt?: string | null;
  totalPausedMs?: number;
  status: string;
  durationMinutes?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "paused") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const ms = getSessionElapsedMs({
    startedAt,
    pausedAt,
    totalPausedMs,
    nowMs: now,
  });
  const overtime = isSessionOvertime({
    status,
    duration_minutes: durationMinutes,
    started_at: startedAt,
    paused_at: pausedAt,
    total_paused_ms: totalPausedMs,
    nowMs: now,
  });
  const remaining = durationMinutes
    ? Math.max(0, durationMinutes * 60_000 - ms)
    : null;

  return (
    <div className="space-y-1">
      <span
        className={cn(
          "font-mono text-lg tabular-nums tracking-tight",
          overtime && "animate-pulse text-primary"
        )}
      >
        {formatTimer(ms)}
      </span>
      {durationMinutes ? (
        <p className={cn("text-xs", overtime ? "font-medium text-primary" : "text-muted-foreground")}>
          {overtime
            ? "Time up — pause or end to stop the chime"
            : `${formatTimer(remaining ?? 0)} left of ${durationMinutes} min`}
        </p>
      ) : null}
    </div>
  );
}
