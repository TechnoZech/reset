"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { createGuestBookingAction } from "@/lib/actions/bookings";
import { guestBookingSchema, type GuestBookingInput } from "@/lib/validations";
import { GameCover } from "@/components/game-cover";
import { BOOKING_TRACKER_KEY, GAME_CATEGORIES, PLAYER_OPTIONS, durationLabel } from "@/lib/constants";
import { applyPlayerMultiplier } from "@/lib/pricing";
import { cn, formatCurrency, toDateString } from "@/lib/utils";
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
  const [gameQuery, setGameQuery] = useState("");

  const durations = useMemo(() => {
    const seen = new Set<number>();
    return pricing
      .filter((p) => {
        if (seen.has(p.duration_minutes)) return false;
        seen.add(p.duration_minutes);
        return true;
      })
      .sort((a, b) => a.duration_minutes - b.duration_minutes);
  }, [pricing]);

  const form = useForm<GuestBookingInput>({
    resolver: zodResolver(guestBookingSchema),
    defaultValues: {
      name: "",
      mobile: "",
      players: 1,
      booking_date: toDateString(new Date()),
      start_time: "18:00",
      duration_minutes:
        durations.find((d) => d.duration_minutes === 60)?.duration_minutes ??
        durations[0]?.duration_minutes ??
        60,
      game_id: "",
      notes: "",
    },
  });

  const players = form.watch("players");
  const duration = form.watch("duration_minutes");
  const selectedGame = form.watch("game_id");

  useEffect(() => {
    if (!durations.length) return;
    if (!durations.some((d) => d.duration_minutes === duration)) {
      form.setValue("duration_minutes", durations[0].duration_minutes);
    }
  }, [durations, duration, form]);

  const filteredGames = useMemo(() => {
    const q = gameQuery.trim().toLowerCase();
    return games.filter((g) => {
      if (g.min_players > players || g.max_players < players) return false;
      if (category !== "all" && g.category !== category) return false;
      if (localOnly && !g.local_multiplayer) return false;
      if (multiplayerOnly && !g.multiplayer) return false;
      if (q && !g.name.toLowerCase().includes(q) && !g.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [games, players, category, localOnly, multiplayerOnly, gameQuery]);

  const selectedGameData = games.find((g) => g.id === selectedGame);

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
      toast.success("Booking submitted — keep this page open for your timer");
      if (result.data?.bookingId) {
        try {
          window.localStorage.setItem(BOOKING_TRACKER_KEY, result.data.bookingId);
        } catch {
          /* ignore */
        }
        router.push(`/booking/success?id=${result.data.bookingId}`);
        return;
      }
      router.push("/booking/success");
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:space-y-6 sm:p-8">
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
                {durations.map((d) => (
                  <SelectItem key={d.duration_minutes} value={String(d.duration_minutes)}>
                    {durationLabel(d.duration_minutes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Game</Label>
            <span className="text-xs text-muted-foreground">
              {filteredGames.length} title{filteredGames.length === 1 ? "" : "s"}
            </span>
          </div>

          {selectedGameData ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5">
              <GameCover
                name={selectedGameData.name}
                imageUrl={selectedGameData.image_url}
                className="size-8 shrink-0 rounded-md"
              />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {selectedGameData.name}
              </p>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => form.setValue("game_id", "")}
              >
                Change
              </button>
            </div>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={gameQuery}
              onChange={(e) => setGameQuery(e.target.value)}
              placeholder="Search games"
              className="h-9 pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-[130px]">
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
              MP
            </Button>
            <Button
              type="button"
              size="sm"
              variant={localOnly ? "default" : "outline"}
              onClick={() => setLocalOnly((v) => !v)}
            >
              Local
            </Button>
          </div>

          {filteredGames.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No games available for {players} players
              {category !== "all" ? ` in ${category}` : ""}.
            </div>
          ) : (
            <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-72 sm:grid-cols-4 md:grid-cols-5">
              {filteredGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => form.setValue("game_id", game.id, { shouldValidate: true })}
                  className={cn(
                    "group relative overflow-hidden rounded-md border text-left transition-colors",
                    selectedGame === game.id
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <GameCover
                    name={game.name}
                    imageUrl={game.image_url}
                    className="aspect-square w-full"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/75 px-1 py-0.5 text-[10px] leading-tight text-white">
                    {game.name}
                  </span>
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
