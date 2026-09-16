"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Pause, Smartphone, Timer, Volume2, VolumeX } from "lucide-react";
import { getPublicBookingLive, requestExtensionAction } from "@/lib/actions/bookings";
import { BOOKING_TRACKER_KEY, CAFE_NAME, durationLabel } from "@/lib/constants";
import { buildUpiPaymentUrl, isValidUpiVpa } from "@/lib/upi";
import { createClient } from "@/lib/supabase/client";
import {
  armSessionAudio,
  startOvertimeAlarm,
  stopOvertimeAlarm,
} from "@/lib/session-sounds";
import { isSessionOvertime } from "@/hooks/use-session-overtime-alarm";
import { formatCurrency, formatTimer, getSessionElapsedMs } from "@/lib/utils";
import { ChargeBreakdown } from "@/components/charge-breakdown";
import { UpiCollect } from "@/components/payment/upi-collect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LiveData = NonNullable<Awaited<ReturnType<typeof getPublicBookingLive>>>;
type TimeUpPanel = "actions" | "pay" | "extend";

const CHIME_MUTE_KEY = "usa-gaming-chime-muted";

function relationName(rel: unknown) {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name;
  return (rel as { name?: string }).name;
}

export function BookingTimer({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [data, setData] = useState<LiveData | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [missing, setMissing] = useState(false);
  const [chimeMuted, setChimeMuted] = useState(false);
  const [overtimeAck, setOvertimeAck] = useState(false);
  const [panel, setPanel] = useState<TimeUpPanel | null>(null);
  const [extraMinutes, setExtraMinutes] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

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
      setChimeMuted(window.localStorage.getItem(CHIME_MUTE_KEY) === "1");
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
  const durationMs = (session?.duration_minutes || data?.booking.duration_minutes || 0) * 60_000;
  const elapsed = session
    ? getSessionElapsedMs({
        startedAt: session.started_at,
        pausedAt: session.paused_at,
        totalPausedMs: session.total_paused_ms,
        endedAt: session.ended_at,
        nowMs: now,
      })
    : 0;
  const overtime = session ? isSessionOvertime({ ...session, nowMs: now }) : false;
  const timeUp = overtime || session?.status === "completed";

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    const runningWithTimeLeft = live && !overtime;
    if (runningWithTimeLeft) {
      setOvertimeAck(false);
      setPanel((current) => (current === "actions" ? null : current));
      stopOvertimeAlarm();
      return;
    }
    if (!timeUp) {
      setPanel((current) => (current === "actions" ? null : current));
      stopOvertimeAlarm();
      return;
    }
    if (!overtimeAck) {
      setPanel((current) => current ?? "actions");
    }
    if (chimeMuted || overtimeAck) {
      stopOvertimeAlarm();
      return;
    }
    startOvertimeAlarm();
    return () => stopOvertimeAlarm();
  }, [live, overtime, timeUp, chimeMuted, overtimeAck, session?.id]);

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

  function closePanel(ack = timeUp) {
    setPanel(null);
    stopOvertimeAlarm();
    if (ack) setOvertimeAck(true);
  }

  function openPanel(next: TimeUpPanel) {
    setPanel(next);
    if (next !== "actions") stopOvertimeAlarm();
  }

  function toggleMute() {
    const next = !chimeMuted;
    setChimeMuted(next);
    try {
      window.localStorage.setItem(CHIME_MUTE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (next) stopOvertimeAlarm();
  }

  function requestExtra(minutes: number) {
    startTransition(async () => {
      const result = await requestExtensionAction({
        booking_id: bookingId,
        extra_minutes: minutes,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      closePanel(timeUp);
      void refresh();
    });
  }

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

  const { booking, extension, extras, currentQuote, currentMinutes, upi } = data;
  const remaining = Math.max(0, durationMs - elapsed);
  const gameName = relationName(booking.games);
  const screenName = relationName(booking.screens);
  const currentDuration = currentMinutes || session?.duration_minutes || booking.duration_minutes;
  const dueAmount = Math.round(
    Number(
      session?.total_amount ??
        session?.rate ??
        booking.total_amount ??
        currentQuote.quotedTotal ??
        currentQuote.currentAmount ??
        0
    )
  );
  const selectedExtra =
    extras.find((p) => p.extraMinutes === extraMinutes) ?? extras[0];
  const pendingQuote =
    extension.status === "pending"
      ? extras.find((p) => p.extraMinutes === extension.extraMinutes) ?? {
          ...currentQuote,
          extraMinutes: extension.extraMinutes,
          totalMinutes: currentDuration + extension.extraMinutes,
          quotedTotal: extension.quotedTotal,
          extraCharge: Math.max(0, extension.quotedTotal - currentQuote.currentAmount),
          newPerPlayer: Math.round(
            extension.quotedTotal / Math.max(1, currentQuote.players)
          ),
        }
      : null;
  const canExtend =
    Boolean(session) &&
    !["cancelled", "no_show"].includes(booking.status) &&
    extension.status !== "pending";
  const paid = data.payment?.payment_status === "paid";
  const showPay = timeUp && !paid && dueAmount > 0;
  const upiUrl =
    isValidUpiVpa(upi?.vpa) && dueAmount > 0
      ? buildUpiPaymentUrl({
          vpa: upi!.vpa!,
          payeeName: upi?.payeeName,
          amount: dueAmount,
          note: `${CAFE_NAME} ${booking.id.slice(0, 8)}`,
        })
      : "";

  let heading = "Booking received";
  let detail = `Keep this page open. Your timer starts when staff start the session at ${CAFE_NAME}.`;
  if (booking.status === "cancelled" || booking.status === "no_show") {
    heading = "Booking cancelled";
    detail = "This booking is no longer active.";
  } else if (session?.status === "completed" && !overtime) {
    heading = "Session complete";
    detail = `Thanks for playing at ${CAFE_NAME}.`;
  } else if (session?.status === "paused") {
    heading = "Session paused";
    detail = "Timer is frozen until staff resume.";
  } else if (overtime) {
    heading = "Time up";
    detail = "Please wrap up or request extra time.";
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
            {durationLabel(currentDuration)} session · {booking.players} player
            {booking.players > 1 ? "s" : ""}
          </p>
          <ChargeBreakdown
            className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3"
            quote={currentQuote}
            currentMinutes={currentDuration}
          />
          {session.status === "paused" ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-amber-400">
              <Pause className="size-3.5" /> Paused
            </p>
          ) : null}
        </div>
      ) : session ? (
        <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {paid ? "Paid" : "Amount due"}
          </p>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums">
            {formatCurrency(dueAmount)}
          </p>
          <ChargeBreakdown
            className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3"
            quote={currentQuote}
            currentMinutes={currentDuration}
          />
        </div>
      ) : (
        <div className="mt-8 w-full rounded-2xl border border-dashed border-border p-6">
          <p className="font-mono text-4xl tabular-nums text-muted-foreground">
            {formatTimer(durationMs)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Booked for {booking.booking_date} at {String(booking.start_time).slice(0, 5)}
          </p>
          <ChargeBreakdown
            className="mt-4 text-left"
            quote={currentQuote}
            currentMinutes={currentDuration}
          />
        </div>
      )}

      {extension.status === "pending" && pendingQuote ? (
        <div className="mt-4 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-200">
            Extra {durationLabel(extension.extraMinutes)} requested. Waiting for staff.
          </p>
          <ChargeBreakdown
            className="mt-3"
            quote={pendingQuote}
            currentMinutes={currentDuration}
          />
        </div>
      ) : null}
      {extension.status === "accepted" && live ? (
        <p className="mt-4 text-sm text-emerald-400">Extra time approved. Timer updated.</p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {session ? (
          <Button type="button" variant="outline" onClick={toggleMute}>
            {chimeMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            {chimeMuted ? "Chime off" : "Mute chime"}
          </Button>
        ) : null}
        {canExtend ? (
          <Button type="button" variant="outline" onClick={() => openPanel("extend")}>
            Request extra time
          </Button>
        ) : null}
        {showPay ? (
          <Button type="button" onClick={() => openPanel("pay")}>
            Pay now
          </Button>
        ) : null}
        {paid ? (
          <Button asChild>
            <Link href={`/booking/${bookingId}/thanks`}>Thank you</Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/booking">Book another</Link>
        </Button>
      </div>

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto sm:max-w-md">
          {panel === "pay" ? (
            <>
              <DialogHeader>
                <DialogTitle>Pay now</DialogTitle>
                <DialogDescription>
                  Scan the QR or tap Pay with UPI, then tap Payment done.
                </DialogDescription>
              </DialogHeader>
              <UpiCollect
                compact
                showPayButton={false}
                amount={dueAmount}
                vpa={upi?.vpa}
                payeeName={upi?.payeeName}
                note={`${CAFE_NAME} ${booking.id.slice(0, 8)}`}
              />
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                {upiUrl ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={upiUrl}>
                      <Smartphone className="size-4" />
                      Pay with UPI
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    closePanel(true);
                    router.push(`/booking/${bookingId}/thanks`);
                  }}
                >
                  Payment done
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => (timeUp ? openPanel("actions") : closePanel(false))}
                >
                  Back
                </Button>
              </DialogFooter>
            </>
          ) : panel === "extend" ? (
            <>
              <DialogHeader>
                <DialogTitle>Request extra time</DialogTitle>
                <DialogDescription>
                  Extra minutes are added once for the screen, not per player.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {extras.map((pack) => (
                  <Button
                    key={pack.extraMinutes}
                    type="button"
                    size="sm"
                    variant={
                      (extraMinutes ?? extras[0]?.extraMinutes) === pack.extraMinutes
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setExtraMinutes(pack.extraMinutes)}
                  >
                    Add {durationLabel(pack.extraMinutes)}
                  </Button>
                ))}
              </div>
              {selectedExtra ? (
                <ChargeBreakdown
                  className="rounded-xl border border-border px-4 py-3"
                  quote={selectedExtra}
                  currentMinutes={currentDuration}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No packages available.</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (timeUp ? openPanel("actions") : closePanel(false))}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={pending || !selectedExtra}
                  onClick={() => selectedExtra && requestExtra(selectedExtra.extraMinutes)}
                >
                  {pending
                    ? "Sending…"
                    : selectedExtra
                      ? `Ask staff · ${formatCurrency(selectedExtra.quotedTotal)}`
                      : "Ask staff"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Time is over</DialogTitle>
                <DialogDescription>
                  Pay now, add extra time, or mute the chime. This stays closed after
                  you dismiss it.
                </DialogDescription>
              </DialogHeader>
              <ChargeBreakdown quote={currentQuote} currentMinutes={currentDuration} />
              <div className="grid gap-2">
                {showPay ? (
                  <Button type="button" onClick={() => openPanel("pay")}>
                    Pay now
                  </Button>
                ) : null}
                {canExtend ? (
                  <Button type="button" variant="outline" onClick={() => openPanel("extend")}>
                    Request extra time
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={toggleMute}>
                  {chimeMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  {chimeMuted ? "Chime off" : "Mute chime"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => closePanel(true)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
