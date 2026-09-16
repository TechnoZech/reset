"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  asMinutes,
  asPlayerCount,
  calculatePrice,
  quoteExtendedPackage,
  type ExtensionQuote,
} from "@/lib/pricing";
import { addMinutesToTime } from "@/lib/utils";
import { parseExtension, writeExtension } from "@/lib/extensions";
import { guestBookingSchema, requestExtensionSchema } from "@/lib/validations";
import { CAFE_NAME } from "@/lib/constants";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { ActionResult } from "@/lib/actions/auth";
import type { ConsoleType, PricingRule } from "@/lib/types/database";

type QuoteRule = Pick<
  PricingRule,
  | "console_type"
  | "duration_minutes"
  | "price"
  | "start_time"
  | "end_time"
  | "day_type"
  | "is_active"
>;

async function loadQuoteContext(
  db: Awaited<ReturnType<typeof createClient>>,
  booking: {
    screen_id: string | null;
    booking_date: string;
    start_time: string;
    duration_minutes: number;
    players: number | null;
    total_amount: number | string | null;
  },
  sessionDuration?: number | null
) {
  const { data: rules } = await db
    .from("pricing_rules")
    .select(
      "console_type, duration_minutes, price, start_time, end_time, day_type, is_active"
    )
    .eq("is_active", true);

  let consoleType: ConsoleType = "PS5";
  let hourly = 89;
  if (booking.screen_id) {
    const { data: screen } = await db
      .from("screens")
      .select("console_type, hourly_rate")
      .eq("id", booking.screen_id)
      .maybeSingle();
    if (screen) {
      consoleType = screen.console_type as ConsoleType;
      hourly = Number(screen.hourly_rate);
    }
  }

  return {
    consoleType,
    fallbackHourlyRate: hourly,
    date: booking.booking_date,
    startTime: booking.start_time,
    durationMinutes: asMinutes(sessionDuration ?? booking.duration_minutes),
    players: asPlayerCount(booking.players),
    paidAmount: Number(booking.total_amount) || 0,
    rules: (rules ?? []) as QuoteRule[],
  };
}

export async function createGuestBookingAction(
  input: unknown
): Promise<ActionResult<{ bookingId: string }>> {
  const parsed = guestBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid booking" };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // Validate game supports player count
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, min_players, max_players, is_active")
    .eq("id", data.game_id)
    .eq("is_active", true)
    .maybeSingle();

  if (gameError || !game) {
    return { success: false, error: "Selected game is unavailable" };
  }

  if (data.players < game.min_players || data.players > game.max_players) {
    return {
      success: false,
      error: `${game.name} supports ${game.min_players}–${game.max_players} players`,
    };
  }

  // Server-side price — never trust client
  const { data: rawRules } = await supabase
    .from("pricing_rules")
    .select(
      "console_type, duration_minutes, price, start_time, end_time, day_type, is_active"
    )
    .eq("is_active", true);

  const rules = (rawRules ?? []) as Pick<
    PricingRule,
    | "console_type"
    | "duration_minutes"
    | "price"
    | "start_time"
    | "end_time"
    | "day_type"
    | "is_active"
  >[];

  const allowedDurations = new Set(
    rules.filter((r) => r.console_type === "PS5").map((r) => r.duration_minutes)
  );
  if (!allowedDurations.has(data.duration_minutes)) {
    return { success: false, error: "Selected duration is not available" };
  }

  const totalAmount = calculatePrice({
    consoleType: "PS5",
    durationMinutes: data.duration_minutes,
    date: data.booking_date,
    startTime: data.start_time,
    players: data.players,
    rules,
  });

  const endTime = addMinutesToTime(data.start_time, data.duration_minutes);

  // Prefer service role for reliable customer upsert; fall back to anon + RLS
  type DbClient = Awaited<ReturnType<typeof createClient>>;
  let db: DbClient = supabase;
  try {
    db = createServiceClient() as unknown as DbClient;
  } catch {
    db = supabase;
  }

  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("mobile", data.mobile)
    .maybeSingle();

  let customerId = existing?.id;
  if (!customerId) {
    const { data: created, error: custError } = await db
      .from("customers")
      .insert({ name: data.name, mobile: data.mobile })
      .select("id")
      .single();

    if (custError || !created) {
      return { success: false, error: custError?.message ?? "Could not create customer" };
    }
    customerId = created.id;
  } else {
    await db.from("customers").update({ name: data.name }).eq("id", customerId);
  }

  // Assign first available screen without conflict (optional — may be null for pending)
  const { data: screens } = await db
    .from("screens")
    .select("id")
    .eq("is_active", true)
    .neq("status", "maintenance")
    .order("name");

  let screenId: string | null = null;
  for (const screen of screens ?? []) {
    const { data: conflicts } = await db
      .from("bookings")
      .select("id")
      .eq("screen_id", screen.id)
      .eq("booking_date", data.booking_date)
      .in("status", ["pending", "confirmed"])
      .lt("start_time", endTime)
      .gt("end_time", data.start_time);

    if (!conflicts || conflicts.length === 0) {
      screenId = screen.id;
      break;
    }
  }

  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .insert({
      customer_id: customerId,
      screen_id: screenId,
      game_id: data.game_id,
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: endTime,
      duration_minutes: data.duration_minutes,
      players: data.players,
      status: "pending",
      notes: data.notes ?? null,
      total_amount: totalAmount,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return {
      success: false,
      error: bookingError?.message ?? "Could not create booking. Slot may be full.",
    };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  updateTag(CACHE_TAGS.ops);
  updateTag(CACHE_TAGS.charts);

  return { success: true, data: { bookingId: booking.id }, message: "Booking submitted" };
}

export async function getPublicPricing(consoleType: ConsoleType = "PS5") {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select(
      "id, name, console_type, duration_minutes, price, day_type, is_active, start_time, end_time"
    )
    .eq("is_active", true)
    .eq("console_type", consoleType)
    .order("duration_minutes");

  const rows = data ?? [];
  const byDuration = new Map<number, (typeof rows)[number]>();

  const score = (r: (typeof rows)[number]) => {
    let s = 0;
    if (r.day_type === "all") s += 4;
    if (!r.start_time && !r.end_time) s += 3;
    return s;
  };

  const ranked = [...rows].sort(
    (a, b) => score(b) - score(a) || Number(a.price) - Number(b.price)
  );

  for (const row of ranked) {
    if (!byDuration.has(row.duration_minutes)) {
      byDuration.set(row.duration_minutes, row);
    }
  }

  return Array.from(byDuration.values()).sort(
    (a, b) => a.duration_minutes - b.duration_minutes
  );
}

export async function getPublicGames(players?: number) {
  const supabase = await createClient();
  let query = supabase
    .from("games")
    .select(
      "id, name, description, image_url, category, min_players, max_players, multiplayer, local_multiplayer, online_multiplayer, is_active"
    )
    .eq("is_active", true)
    .order("name");

  const { data } = await query;
  const games = data ?? [];

  if (players) {
    return games.filter((g) => g.min_players <= players && g.max_players >= players);
  }

  return games;
}

const BOOKING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPublicBookingLive(bookingId: string) {
  if (!BOOKING_ID_RE.test(bookingId)) return null;

  let db: Awaited<ReturnType<typeof createClient>>;
  try {
    db = createServiceClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  } catch {
    db = await createClient();
  }

  const [bookingRes, sessionRes] = await Promise.all([
    db
      .from("bookings")
      .select(
        "id, booking_date, start_time, end_time, duration_minutes, players, status, total_amount, notes, game_id, screen_id, games(name), screens(name)"
      )
      .eq("id", bookingId)
      .maybeSingle(),
    db
      .from("sessions")
      .select(
        "id, status, started_at, ended_at, paused_at, total_paused_ms, duration_minutes, players, rate, total_amount"
      )
      .eq("booking_id", bookingId)
      .in("status", ["active", "paused", "completed"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!bookingRes.data) return null;
  const booking = bookingRes.data;
  const session = sessionRes.data;
  let payment: { id: string; amount: number; payment_status: string } | null = null;
  if (session?.id) {
    const { data: pay } = await db
      .from("payments")
      .select("id, amount, payment_status")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    payment = pay;
  }
  const ctx = await loadQuoteContext(db, booking, session?.duration_minutes);
  const extraDurations = [
    ...new Set(
      ctx.rules
        .filter((r) => r.console_type === ctx.consoleType)
        .map((r) => asMinutes(r.duration_minutes))
        .filter((n) => n > 0)
    ),
  ].sort((a, b) => a - b);
  const extras: ExtensionQuote[] = extraDurations.map((extraMinutes) =>
    quoteExtendedPackage({
      ...ctx,
      extraMinutes,
    })
  );
  const currentQuote = quoteExtendedPackage({
    ...ctx,
    extraMinutes: 0,
  });
  const cafe = await db
    .from("cafe_settings")
    .select("cafe_name, upi_vpa, upi_payee_name")
    .limit(1)
    .maybeSingle();
  const upi = cafe.error
    ? { vpa: null as string | null, payeeName: CAFE_NAME }
    : {
        vpa: cafe.data?.upi_vpa ?? null,
        payeeName: cafe.data?.upi_payee_name || cafe.data?.cafe_name || CAFE_NAME,
      };
  return {
    booking,
    session,
    payment,
    upi,
    extension: parseExtension(booking.notes),
    currentMinutes: ctx.durationMinutes,
    currentQuote,
    extras,
  };
}

export async function requestExtensionAction(
  input: unknown
): Promise<ActionResult<{ quotedTotal: number; extraCharge: number; totalMinutes: number }>> {
  const parsed = requestExtensionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const { booking_id, extra_minutes } = parsed.data;
  let db: Awaited<ReturnType<typeof createClient>>;
  try {
    db = createServiceClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  } catch {
    db = await createClient();
  }

  const { data: booking } = await db
    .from("bookings")
    .select("id, notes, duration_minutes, total_amount, players, booking_date, start_time, screen_id, status")
    .eq("id", booking_id)
    .maybeSingle();

  if (!booking) return { success: false, error: "Booking not found" };
  if (["cancelled", "no_show"].includes(booking.status)) {
    return { success: false, error: "Booking is no longer active" };
  }

  const existing = parseExtension(booking.notes);
  if (existing.status === "pending") {
    return { success: false, error: "Staff are already reviewing extra time" };
  }

  const { data: session } = await db
    .from("sessions")
    .select("id, status, duration_minutes")
    .eq("booking_id", booking_id)
    .in("status", ["active", "paused", "completed"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return { success: false, error: "Session has not started yet" };
  }

  const ctx = await loadQuoteContext(db, booking, session.duration_minutes);
  const extraMinutes = asMinutes(extra_minutes);
  const quote = quoteExtendedPackage({
    ...ctx,
    extraMinutes,
  });

  const { error } = await db
    .from("bookings")
    .update({
      notes: writeExtension(booking.notes, "pending", extraMinutes, quote.quotedTotal),
    })
    .eq("id", booking_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  updateTag(CACHE_TAGS.ops);
  updateTag(CACHE_TAGS.charts);

  return {
    success: true,
    data: quote,
    message: "Extra time requested — waiting for staff",
  };
}

export async function getCafeSettingsPublic() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cafe_settings")
    .select("cafe_name, address, phone, email, opening_time, closing_time")
    .limit(1)
    .maybeSingle();

  if (error || !data) return data ?? null;

  const upi = await supabase
    .from("cafe_settings")
    .select("upi_vpa, upi_payee_name")
    .limit(1)
    .maybeSingle();

  return {
    ...data,
    upi_vpa: upi.error ? null : (upi.data?.upi_vpa ?? null),
    upi_payee_name: upi.error ? null : (upi.data?.upi_payee_name ?? null),
  };
}
