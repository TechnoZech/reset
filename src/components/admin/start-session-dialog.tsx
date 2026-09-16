"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { startSessionAction } from "@/lib/actions/sessions";
import { unlockSessionAudio } from "@/lib/session-sounds";
import { startSessionSchema, type StartSessionInput } from "@/lib/validations";
import { GameCover } from "@/components/game-cover";
import { DURATION_OPTIONS, PLAYER_OPTIONS, durationLabel } from "@/lib/constants";
import type { Customer, Game } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

export function StartSessionDialog({
  open,
  onOpenChange,
  screenId,
  screenName,
  games,
  customers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string;
  screenName: string;
  games: Game[];
  customers: Customer[];
}) {
  const [pending, startTransition] = useTransition();
  const [customerQuery, setCustomerQuery] = useState("");
  const [gameQuery, setGameQuery] = useState("");

  const form = useForm<StartSessionInput>({
    resolver: zodResolver(startSessionSchema),
    defaultValues: {
      screen_id: screenId,
      customer_mode: "walkin",
      players: 1,
      duration_minutes: 60,
      payment_method: "cash",
      game_id: null,
    },
  });

  useEffect(() => {
    form.setValue("screen_id", screenId);
  }, [screenId, form]);

  const mode = form.watch("customer_mode");
  const players = form.watch("players");
  const selectedGame = form.watch("game_id");

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.mobile.includes(q)
      )
      .slice(0, 8);
  }, [customers, customerQuery]);

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (!g.is_active) return false;
      if (g.min_players > players || g.max_players < players) return false;
      if (gameQuery && !g.name.toLowerCase().includes(gameQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [games, players, gameQuery]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await startSessionAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      unlockSessionAudio();
      toast.success(result.message || "Session started");
      onOpenChange(false);
      form.reset({
        screen_id: screenId,
        customer_mode: "walkin",
        players: 1,
        duration_minutes: 60,
        payment_method: "cash",
        game_id: null,
      });
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start session · {screenName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Customer</Label>
            <div className="flex flex-wrap gap-2">
              {(["walkin", "existing", "new"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={mode === m ? "default" : "outline"}
                  onClick={() => form.setValue("customer_mode", m)}
                >
                  {m === "walkin" ? "Walk-in" : m === "existing" ? "Existing" : "New"}
                </Button>
              ))}
            </div>
          </div>

          {mode === "existing" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name or mobile"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                      form.watch("customer_id") === c.id
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => form.setValue("customer_id", c.id)}
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.mobile}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "new" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...form.register("customer_name")} />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input {...form.register("customer_mobile")} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Players</Label>
            <div className="flex gap-2">
              {PLAYER_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={players === n ? "default" : "outline"}
                  onClick={() => {
                    form.setValue("players", n);
                    form.setValue("game_id", null);
                  }}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Game</Label>
            <Input
              placeholder="Search games"
              value={gameQuery}
              onChange={(e) => setGameQuery(e.target.value)}
            />
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {filteredGames.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                    selectedGame === g.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
                  )}
                  onClick={() => form.setValue("game_id", g.id)}
                >
                  <GameCover
                    name={g.name}
                    imageUrl={g.image_url}
                    className="size-10 shrink-0 rounded-md"
                  />
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{g.category}</span>
                </button>
              ))}
              {filteredGames.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">No matching games</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(form.watch("duration_minutes"))}
                onValueChange={(v) => form.setValue("duration_minutes", Number(v))}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select
                value={form.watch("payment_method")}
                onValueChange={(v) =>
                  form.setValue("payment_method", v as StartSessionInput["payment_method"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Start Session
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
