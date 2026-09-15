"use client";

import { useEffect } from "react";
import {
  startOvertimeAlarm,
  stopOvertimeAlarm,
} from "@/lib/session-sounds";
import { getSessionElapsedMs } from "@/lib/utils";
import type { ScreenWithSession } from "@/lib/types/database";

export function isSessionOvertime(session: {
  status: string;
  duration_minutes?: number | null;
  started_at: string;
  paused_at?: string | null;
  total_paused_ms?: number;
  nowMs?: number;
}) {
  if (session.status !== "active" || !session.duration_minutes) return false;
  const elapsed = getSessionElapsedMs({
    startedAt: session.started_at,
    pausedAt: session.paused_at,
    totalPausedMs: session.total_paused_ms,
    nowMs: session.nowMs,
  });
  return elapsed >= session.duration_minutes * 60_000;
}

export function useSessionOvertimeAlarm(screens: ScreenWithSession[]) {
  useEffect(() => {
    const check = () => {
      const overtime = screens.some((screen) => {
        const session = screen.active_session;
        return session ? isSessionOvertime(session) : false;
      });

      if (overtime) startOvertimeAlarm();
      else stopOvertimeAlarm();
    };

    check();
    const id = window.setInterval(check, 1000);
    return () => {
      window.clearInterval(id);
      stopOvertimeAlarm();
    };
  }, [screens]);
}
