"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pause, Timer } from "lucide-react";
import { getPublicBookingLive } from "@/lib/actions/bookings";
import { BOOKING_TRACKER_KEY, CAFE_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  armSessionAudio,
  startOvertimeAlarm,
  stopOvertimeAlarm,
} from "@/lib/session-sounds";
import { isSessionOvertime } from "@/hooks/use-session-overtime-alarm";
import { formatCurrency, formatTimer, getSessionElapsedMs } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type LiveData = NonNullable<Awaited<ReturnType<typeof getPublicBookingLive>>>;

function relationName(rel: unknown) {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name;
  return (rel as { name?: string }).name;
}

export function BookingTimer({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [missing, setMissing] = useState(false);

  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const live = await getPublicBookingLive(bookingId);
      if (!live) {
        setMissing(true);
        return;
      }
      setMissing(false);
      setData(live);
    } finally {
      inflight.current = false;
    }
  }, [bookingId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BOOKING_TRACKER_KEY, bookingId);
    } catch {
      /* ignore */
    }
  }, [bookingId]);

  useEffect(() => armSessionAudio(), []);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`guest-booking-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `booking_id=eq.${bookingId}`,
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, refresh]);

  const session = data?.session;
  const live = session?.status === "active" || session?.status === "paused";

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!session) {
      stopOvertimeAlarm();
      return;
    }

    const check = () => {
      if (isSessionOvertime({ ...session, nowMs: Date.now() })) {
        startOvertimeAlarm();
      } else {
        stopOvertimeAlarm();
      }
    };

    check();
    const id = window.setInterval(check, 1000);
    return () => {
      window.clearInterval(id);
      stopOvertimeAlarm();
    };
  }, [session]);

  useEffect(() => {
    if (!live || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        lock = null;
      }
    };

    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [live]);

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Booking not found</h1>
        <p className="mt-3 text-muted-foreground">Check the link or book a new session.</p>
        <Button asChild className="mt-8">
          <Link href="/booking">Book a session</Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">
        Loading your booking…
      </div>
    );
  }

  const { booking } = data;
  const durationMs = (session?.duration_minutes || booking.duration_minutes) * 60_000;
  const elapsed = session
    ? getSessionElapsedMs({
        startedAt: session.started_at,
        pausedAt: session.paused_at,
        totalPausedMs: session.total_paused_ms,
        endedAt: session.ended_at,
        nowMs: now,
      })
    : 0;
  const remaining = Math.max(0, durationMs - elapsed);
  const overtime = session ? isSessionOvertime({ ...session, nowMs: now }) : false;
  const gameName = relationName(booking.games);
  const screenName = relationName(booking.screens);

  let heading = "Booking received";
  let detail = `Keep this page open. Your timer starts when staff start the session at ${CAFE_NAME}.`;
  if (booking.status === "cancelled" || booking.status === "no_show") {
    heading = "Booking cancelled";
    detail = "This booking is no longer active.";
  } else if (session?.status === "completed") {
    heading = "Session complete";
    detail = `Thanks for playing at ${CAFE_NAME}.`;
  } else if (session?.status === "paused") {
    heading = "Session paused";
    detail = "Timer is frozen until staff resume.";
  } else if (overtime) {
    heading = "Time up";
    detail = "Please wrap up — staff will end the session.";
  } else if (session?.status === "active") {
    heading = "Session running";
    detail = "Time remaining on this screen.";
  } else if (booking.status === "confirmed") {
    heading = "You're confirmed";
    detail = "Waiting for staff to start your screen. Keep this page open.";
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {overtime ? (
        <Timer className="size-14 animate-pulse text-primary" />
      ) : (
        <CheckCircle2 className="size-14 text-primary" />
      )}
      <h1 className="mt-6 font-display text-3xl font-bold">{heading}</h1>
      <p className="mt-3 text-muted-foreground">{detail}</p>

      <p className="mt-4 font-mono text-xs text-muted-foreground">
        Ref {booking.id.slice(0, 8)}
        {screenName ? ` · ${screenName}` : ""}
        {gameName ? ` · ${gameName}` : ""}
      </p>

      {session && (session.status === "active" || session.status === "paused") ? (
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {overtime ? "Overtime" : session.status === "paused" ? "Paused" : "Remaining"}
          </p>
          <p
            className={`mt-2 font-mono text-5xl font-semibold tabular-nums sm:text-6xl ${
              overtime ? "animate-pulse text-primary" : "text-foreground"
            }`}
          >
            {overtime ? formatTimer(elapsed - durationMs) : formatTimer(remaining)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {booking.duration_minutes} min session · {booking.players} player
            {booking.players > 1 ? "s" : ""} · {formatCurrency(Number(booking.total_amount))}
          </p>
          {session.status === "paused" ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-amber-400">
              <Pause className="size-3.5" /> Paused
            </p>
          ) : null}
        </div>
      ) : !session ? (
        <div className="mt-8 w-full rounded-2xl border border-dashed border-border p-6">
          <p className="font-mono text-4xl tabular-nums text-muted-foreground">
            {formatTimer(durationMs)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Booked for {booking.booking_date} at {String(booking.start_time).slice(0, 5)}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/booking">Book another</Link>
        </Button>
      </div>
    </div>
  );
}

export function BookingTimerEntry({ bookingId }: { bookingId?: string }) {
  const [id, setId] = useState(bookingId);
  const [ready, setReady] = useState(Boolean(bookingId));

  useEffect(() => {
    if (bookingId) {
      setId(bookingId);
      setReady(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(BOOKING_TRACKER_KEY);
      if (stored) setId(stored);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [bookingId]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">
        Loading your booking…
      </div>
    );
  }

  if (!id) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Booking received</h1>
        <p className="mt-3 text-muted-foreground">
          Open the link from your booking confirmation to follow your timer.
        </p>
        <Button asChild className="mt-8">
          <Link href="/booking">Book a session</Link>
        </Button>
      </div>
    );
  }

  return <BookingTimer bookingId={id} />;
}
