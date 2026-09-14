"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pause,
  Play,
  Square,
  Eye,
  Gamepad2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  endSessionAction,
  pauseSessionAction,
  resumeSessionAction,
} from "@/lib/actions/sessions";
import type { Customer, Game, ScreenWithSession } from "@/lib/types/database";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveTimer } from "@/components/admin/live-timer";
import { StartSessionDialog } from "@/components/admin/start-session-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusStyles: Record<string, string> = {
  available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  playing: "border-primary/40 bg-primary/10 text-primary",
  paused: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  reserved: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  maintenance: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
};

export function ScreenGrid({
  initialScreens,
  games,
  customers,
}: {
  initialScreens: ScreenWithSession[];
  games: Game[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [screens, setScreens] = useState(initialScreens);
  const [startScreen, setStartScreen] = useState<ScreenWithSession | null>(null);
  const [viewScreen, setViewScreen] = useState<ScreenWithSession | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setScreens(initialScreens);
  }, [initialScreens]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live-screens")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screens" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const run = (fn: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) toast.error(result.error);
      else toast.success(result.message || "Done");
      refresh();
    });
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {screens.map((screen) => {
          const session = screen.active_session;
          const booking = screen.upcoming_booking;
          const status = screen.status;

          return (
            <div
              key={screen.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-white/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{screen.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {screen.console_type}
                    {screen.display_name ? ` · ${screen.display_name}` : ""}
                  </p>
                </div>
                <Badge className={cn("capitalize", statusStyles[status] || "")}>
                  {status}
                </Badge>
              </div>

              <div className="mt-5 flex-1 space-y-2">
                {session ? (
                  <>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Gamepad2 className="size-3.5 text-primary" />
                      {session.games?.name || "No game selected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.players} player{session.players > 1 ? "s" : ""}
                      {session.customers?.name ? ` · ${session.customers.name}` : ""}
                    </p>
                    <LiveTimer
                      startedAt={session.started_at}
                      pausedAt={session.paused_at}
                      totalPausedMs={session.total_paused_ms}
                      status={session.status}
                    />
                    <p className="text-sm text-muted-foreground">
                      Package {formatCurrency(Number(session.rate))}
                    </p>
                  </>
                ) : status === "reserved" && booking ? (
                  <>
                    <p className="text-sm font-medium">
                      Reserved · {String(booking.start_time).slice(0, 5)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.customers?.name || "Customer"} · {booking.players} players
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.games?.name || "Game TBD"}
                    </p>
                  </>
                ) : status === "available" ? (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(Number(screen.hourly_rate))}/hour
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Unavailable</p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {status === "available" && (
                  <Button size="sm" onClick={() => setStartScreen(screen)}>
                    Start Session
                  </Button>
                )}
                {session && session.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => pauseSessionAction(session.id))}
                  >
                    <Pause className="size-3.5" />
                    Pause
                  </Button>
                )}
                {session && session.status === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => resumeSessionAction(session.id))}
                  >
                    <Play className="size-3.5" />
                    Resume
                  </Button>
                )}
                {session && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      run(() => endSessionAction({ session_id: session.id, payment_method: "cash" }))
                    }
                  >
                    <Square className="size-3.5" />
                    End
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setViewScreen(screen)}>
                  <Eye className="size-3.5" />
                  View
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {screens.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No active screens. Add screens in Screen management.
        </div>
      )}

      {startScreen && (
        <StartSessionDialog
          open={!!startScreen}
          onOpenChange={(o) => !o && setStartScreen(null)}
          screenId={startScreen.id}
          screenName={startScreen.name}
          games={games}
          customers={customers}
        />
      )}

      <Dialog open={!!viewScreen} onOpenChange={(o) => !o && setViewScreen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewScreen?.name}</DialogTitle>
          </DialogHeader>
          {viewScreen && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="capitalize">{viewScreen.status}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Console:</span>{" "}
                {viewScreen.console_type}
              </p>
              {viewScreen.active_session && (
                <>
                  <p>
                    <span className="text-muted-foreground">Customer:</span>{" "}
                    {viewScreen.active_session.customers?.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Mobile:</span>{" "}
                    {viewScreen.active_session.customers?.mobile}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Game:</span>{" "}
                    {viewScreen.active_session.games?.name || "—"}
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
