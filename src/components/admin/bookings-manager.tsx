"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  Loader2,
  Play,
  Search,
  UserX,
  X,
} from "lucide-react";
import {
  rescheduleBookingAction,
  resolveExtensionAction,
  startSessionFromBookingAction,
  updateBookingStatusAction,
} from "@/lib/actions/sessions";
import { BOOKING_STATUSES, DURATION_OPTIONS, durationLabel } from "@/lib/constants";
import { parseExtension, extensionChargeQuote } from "@/lib/extensions";
import { unlockSessionAudio } from "@/lib/session-sounds";
import type {
  BookingStatus,
  BookingWithRelations,
  Screen,
} from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChargeBreakdown } from "@/components/charge-breakdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusVariant: Record<BookingStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
  no_show: "destructive",
};

export function BookingsManager({
  bookings,
  screens,
}: {
  bookings: BookingWithRelations[];
  screens: Screen[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [reschedule, setReschedule] = useState<BookingWithRelations | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [screenId, setScreenId] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-bookings-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (status: string) =>
      status === "pending" ? 0 : status === "confirmed" ? 1 : 2;
    return bookings
      .filter((b) => {
        if (status !== "all" && b.status !== status) return false;
        if (!q) return true;
        const name = b.customers?.name?.toLowerCase() ?? "";
        const mobile = b.customers?.mobile ?? "";
        const game = b.games?.name?.toLowerCase() ?? "";
        return name.includes(q) || mobile.includes(q) || game.includes(q);
      })
      .sort((a, b) => {
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [bookings, query, status]);

  function runStatus(bookingId: string, next: BookingStatus) {
    startTransition(async () => {
      const result = await updateBookingStatusAction({
        booking_id: bookingId,
        status: next,
      });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
    });
  }

  function startSession(bookingId: string) {
    startTransition(async () => {
      const result = await startSessionFromBookingAction(bookingId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      unlockSessionAudio();
      toast.success(result.message || "Session started");
      router.push("/admin/dashboard");
    });
  }

  function openReschedule(b: BookingWithRelations) {
    setReschedule(b);
    setDate(b.booking_date);
    setTime(String(b.start_time).slice(0, 5));
    setDuration(b.duration_minutes);
    setScreenId(b.screen_id ?? "");
  }

  function submitReschedule() {
    if (!reschedule) return;
    startTransition(async () => {
      const result = await rescheduleBookingAction({
        booking_id: reschedule.id,
        booking_date: date,
        start_time: time,
        duration_minutes: duration,
        screen_id: screenId || null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setReschedule(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, mobile, game"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {bookings.length === 0
              ? "No upcoming bookings."
              : "No bookings match your filters."}
          </p>
        </div>
      ) : (
        <div className="relative space-y-3">
          {pending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg">
                <Loader2 className="size-4 animate-spin" />
                Updating bookings…
              </div>
            </div>
          )}
          <ul className="space-y-3">
          {filtered.map((b) => {
            const actionable = ["pending", "confirmed"].includes(b.status);
            const extension = parseExtension(b.notes);
            const isNew =
              b.status === "pending" &&
              Date.now() - new Date(b.created_at).getTime() < 15 * 60 * 1000;
            return (
              <li
                key={b.id}
                className={`rounded-xl border bg-card p-4 ${pending ? "opacity-50" : ""} ${
                  isNew ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{b.customers?.name || "Guest"}</p>
                      {isNew ? <Badge>New</Badge> : null}
                      <Badge variant={statusVariant[b.status]}>
                        {b.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {b.customers?.mobile} · {b.players} player
                      {b.players === 1 ? "" : "s"}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">When · </span>
                      {b.booking_date} · {String(b.start_time).slice(0, 5)}–
                      {String(b.end_time).slice(0, 5)} ({b.duration_minutes}m)
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Screen · </span>
                      {b.screens?.name || "Unassigned"}
                      <span className="text-muted-foreground"> · Game · </span>
                      {b.games?.name || "TBD"}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(Number(b.total_amount))}
                    </p>
                    {extension.status === "pending" ? (
                      <ChargeBreakdown
                        className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                        currentMinutes={b.duration_minutes}
                        quote={extensionChargeQuote({
                          durationMinutes: b.duration_minutes,
                          players: b.players,
                          currentAmount: Number(b.total_amount),
                          extraMinutes: extension.extraMinutes,
                          quotedTotal: extension.quotedTotal,
                        })}
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {extension.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await resolveExtensionAction({
                                booking_id: b.id,
                                accept: true,
                              });
                              if (!result.success) toast.error(result.error);
                              else toast.success(result.message);
                            })
                          }
                        >
                          Accept +{durationLabel(extension.extraMinutes)} · due{" "}
                          {formatCurrency(extension.quotedTotal)}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await resolveExtensionAction({
                                booking_id: b.id,
                                accept: false,
                              });
                              if (!result.success) toast.error(result.error);
                              else toast.success(result.message);
                            })
                          }
                        >
                          Decline extra
                        </Button>
                      </>
                    )}
                    {b.status === "pending" && (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => runStatus(b.id, "confirmed")}
                      >
                        <Check className="size-3.5" />
                        Confirm
                      </Button>
                    )}
                    {actionable && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending || !b.screen_id}
                          onClick={() => startSession(b.id)}
                        >
                          <Play className="size-3.5" />
                          Start
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => openReschedule(b)}
                        >
                          <CalendarClock className="size-3.5" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => runStatus(b.id, "completed")}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => runStatus(b.id, "no_show")}
                        >
                          <UserX className="size-3.5" />
                          No-show
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={pending}
                          onClick={() => runStatus(b.id, "cancelled")}
                        >
                          <X className="size-3.5" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          </ul>
        </div>
      )}

      <Dialog open={!!reschedule} onOpenChange={(v) => !v && setReschedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rs-date">Date</Label>
              <Input
                id="rs-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rs-time">Start time</Label>
                <Input
                  id="rs-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d === 1 ? "1 minute (test)" : durationLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Screen</Label>
              <Select
                value={screenId || "none"}
                onValueChange={(v) => setScreenId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Assign screen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {screens
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.console_type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={pending} onClick={submitReschedule}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save reschedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
