"use client";

import { useMemo, useState, useTransition } from "react";
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
  startSessionFromBookingAction,
  updateBookingStatusAction,
} from "@/lib/actions/sessions";
import { BOOKING_STATUSES, DURATION_OPTIONS } from "@/lib/constants";
import { unlockSessionAudio } from "@/lib/session-sounds";
import type {
  BookingStatus,
  BookingWithRelations,
  Screen,
} from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [reschedule, setReschedule] = useState<BookingWithRelations | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [screenId, setScreenId] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;
      const name = b.customers?.name?.toLowerCase() ?? "";
      const mobile = b.customers?.mobile ?? "";
      const game = b.games?.name?.toLowerCase() ?? "";
      return name.includes(q) || mobile.includes(q) || game.includes(q);
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
      if (!result.success) toast.error(result.error);
      else {
        unlockSessionAudio();
        toast.success(result.message || "Session started");
      }
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
        <ul className="space-y-3">
          {filtered.map((b) => {
            const actionable = ["pending", "confirmed"].includes(b.status);
            return (
              <li
                key={b.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{b.customers?.name || "Guest"}</p>
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
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                    {pending && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
                        {d} minutes
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
