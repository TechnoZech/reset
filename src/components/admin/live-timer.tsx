"use client";

import { useEffect, useState } from "react";
import { formatTimer, getSessionElapsedMs } from "@/lib/utils";

export function LiveTimer({
  startedAt,
  pausedAt,
  totalPausedMs,
  status,
}: {
  startedAt: string;
  pausedAt?: string | null;
  totalPausedMs?: number;
  status: string;
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

  return (
    <span className="font-mono text-lg tabular-nums tracking-tight">
      {formatTimer(ms)}
    </span>
  );
}
