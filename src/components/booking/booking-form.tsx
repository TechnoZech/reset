"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createGuestBookingAction } from "@/lib/actions/bookings";
import { guestBookingSchema, type GuestBookingInput } from "@/lib/validations";
import { GameCover } from "@/components/game-cover";
import { DURATION_OPTIONS, GAME_CATEGORIES, PLAYER_OPTIONS } from "@/lib/constants";
import { applyPlayerMultiplier } from "@/lib/pricing";
import { formatCurrency, toDateString } from "@/lib/utils";
import type { Game } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PricingItem = {
  duration_minutes: number;
  price: number;
};

export function BookingForm({
  games,
  pricing,
}: {
  games: Game[];
  pricing: PricingItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>("all");
  const [localOnly, setLocalOnly] = useState(false);
  const [multiplayerOnly, setMultiplayerOnly] = useState(false);

  const form = useForm<GuestBookingInput>({
    resolver: zodResolver(guestBookingSchema),
    defaultValues: {
      name: "",
      mobile: "",
      players: 1,
      booking_date: toDateString(new Date()),
      start_time: "18:00",
      duration_minutes: 60,
      game_id: "",
      notes: "",
    },
  });

  const players = form.watch("players");
  const duration = form.watch("duration_minutes");
  const selectedGame = form.watch("game_id");

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (g.min_players > players || g.max_players < players) return false;
      if (category !== "all" && g.category !== category) return false;
      if (localOnly && !g.local_multiplayer) return false;
      if (multiplayerOnly && !g.multiplayer) return false;
      return true;
    });
  }, [games, players, category, localOnly, multiplayerOnly]);

  const basePrice =
    pricing.find((p) => p.duration_minutes === duration)?.price ??
    Math.ceil(((pricing.find((p) => p.duration_minutes === 60)?.price ?? 89) * duration) / 60);
  const quote = applyPlayerMultiplier(Number(basePrice), players);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createGuestBookingAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking submitted");
      router.push(`/booking/success?id=${result.data?.bookingId}`);
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} placeholder="Your name" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" {...form.register("mobile")} placeholder="9876543210" />
            {form.formState.errors.mobile && (
              <p className="text-xs text-destructive">{form.formState.errors.mobile.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Players</Label>
          <div className="flex flex-wrap gap-2">
            {PLAYER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  form.setValue("players", n);
                  form.setValue("game_id", "");
                }}
                className={cn(
                  "h-10 min-w-12 rounded-md border px-3 text-sm transition-colors",
                  players === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="booking_date">Date</Label>
            <Input id="booking_date" type="date" {...form.register("booking_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_time">Time</Label>
            <Input id="start_time" type="time" {...form.register("start_time")} />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => form.setValue("duration_minutes", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d === 30 ? "30 minutes" : d === 60 ? "1 hour" : "2 hours"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Game</Label>
            <div className="flex flex-wrap gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {GAME_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant={multiplayerOnly ? "default" : "outline"}
                onClick={() => setMultiplayerOnly((v) => !v)}
              >
                Multiplayer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={localOnly ? "default" : "outline"}
                onClick={() => setLocalOnly((v) => !v)}
              >
                Local MP
              </Button>
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No games available for {players} players
              {category !== "all" ? ` in ${category}` : ""}.
            </div>
          ) : (
            <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => form.setValue("game_id", game.id, { shouldValidate: true })}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition-colors",
                    selectedGame === game.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <GameCover
                    name={game.name}
                    imageUrl={game.image_url}
                    className="h-24 w-full"
                  />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{game.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {game.category}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {game.min_players}–{game.max_players} players
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {form.formState.errors.game_id && (
            <p className="text-xs text-destructive">{form.formState.errors.game_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" rows={3} {...form.register("notes")} placeholder="Any preferences?" />
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 sm:sticky sm:top-24">
        <h2 className="font-display text-xl font-semibold">Summary</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Players</dt>
            <dd>{players}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{duration} min</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Per player</dt>
            <dd>{formatCurrency(Number(basePrice))}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <dt className="font-medium">Estimated total</dt>
            <dd className="font-display text-lg font-bold text-primary">
              {formatCurrency(Number(quote))}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Price is per player — {players} player{players > 1 ? "s" : ""} ×{" "}
          {formatCurrency(Number(basePrice))}. Final total is locked on the server.
        </p>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirm booking
        </Button>
      </aside>
    </form>
  );
}
