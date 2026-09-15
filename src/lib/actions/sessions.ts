"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calculatePrice, calculateSessionCharge } from "@/lib/pricing";
import { getSessionElapsedMs } from "@/lib/utils";
import {
  bookingStatusSchema,
  endSessionSchema,
  rescheduleBookingSchema,
  startSessionSchema,
} from "@/lib/validations";
import type { ActionResult } from "@/lib/actions/auth";
import type { ConsoleType, PricingRule } from "@/lib/types/database";
import { addMinutesToTime } from "@/lib/utils";

function revalidateOps() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/screens");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/earnings");
  revalidatePath("/admin/customers");
}

async function loadPricingRules() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select(
      "console_type, duration_minutes, price, start_time, end_time, day_type, is_active"
    )
    .eq("is_active", true);
  return (data ?? []) as Pick<
    PricingRule,
    | "console_type"
    | "duration_minutes"
    | "price"
    | "start_time"
    | "end_time"
    | "day_type"
    | "is_active"
  >[];
}

export async function startSessionAction(
  input: unknown
): Promise<ActionResult<{ sessionId: string }>> {
  await requireAdmin("sessions");
  const parsed = startSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: screen } = await supabase
    .from("screens")
    .select("id, status, console_type, hourly_rate, is_active")
    .eq("id", data.screen_id)
    .maybeSingle();

  if (!screen || !screen.is_active) {
    return { success: false, error: "Screen not available" };
  }

  if (screen.status === "maintenance") {
    return { success: false, error: "Screen is under maintenance" };
  }

  if (screen.status === "playing" || screen.status === "paused") {
    return { success: false, error: "Screen already has an active session" };
  }

  let customerId = data.customer_id;

  if (data.customer_mode === "walkin") {
    const { data: walkin } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", "0000000000")
      .maybeSingle();

    if (walkin) {
      customerId = walkin.id;
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert({ name: "Walk-in Customer", mobile: "0000000000" })
        .select("id")
        .single();
      if (error || !created) return { success: false, error: error?.message ?? "Customer error" };
      customerId = created.id;
    }
  } else if (data.customer_mode === "new") {
    if (!data.customer_name || !data.customer_mobile) {
      return { success: false, error: "Name and mobile required" };
    }
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", data.customer_mobile)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
      await supabase
        .from("customers")
        .update({ name: data.customer_name })
        .eq("id", existing.id);
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert({ name: data.customer_name, mobile: data.customer_mobile })
        .select("id")
        .single();
      if (error || !created) return { success: false, error: error?.message ?? "Customer error" };
      customerId = created.id;
    }
  }

  if (!customerId) {
    return { success: false, error: "Select or create a customer" };
  }

  const rules = await loadPricingRules();
  const rate = calculatePrice({
    consoleType: screen.console_type as ConsoleType,
    durationMinutes: data.duration_minutes,
    date: new Date(),
    rules,
    fallbackHourlyRate: Number(screen.hourly_rate),
    players: data.players,
  });

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      customer_id: customerId,
      screen_id: data.screen_id,
      game_id: data.game_id || null,
      players: data.players,
      rate,
      duration_minutes: data.duration_minutes,
      status: "active",
      started_at: new Date().toISOString(),
      total_paused_ms: 0,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { success: false, error: sessionError?.message ?? "Could not start session" };
  }

  await supabase
    .from("screens")
    .update({ status: "playing" })
    .eq("id", data.screen_id);

  // Record initial payment intent / deposit as paid for walk-in packages
  await supabase.from("payments").insert({
    session_id: session.id,
    amount: rate,
    payment_method: data.payment_method,
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  });

  revalidateOps();
  return { success: true, data: { sessionId: session.id }, message: "Session started" };
}

export async function pauseSessionAction(sessionId: string): Promise<ActionResult> {
  await requireAdmin("sessions");
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, screen_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.status !== "active") {
    return { success: false, error: "Session is not active" };
  }

  const now = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({ status: "paused", paused_at: now })
    .eq("id", sessionId);

  await supabase.from("screens").update({ status: "paused" }).eq("id", session.screen_id);

  revalidateOps();
  return { success: true, message: "Session paused" };
}

export async function resumeSessionAction(sessionId: string): Promise<ActionResult> {
  await requireAdmin("sessions");
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, screen_id, paused_at, total_paused_ms")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.status !== "paused" || !session.paused_at) {
    return { success: false, error: "Session is not paused" };
  }

  const extra = Date.now() - new Date(session.paused_at).getTime();
  await supabase
    .from("sessions")
    .update({
      status: "active",
      paused_at: null,
      total_paused_ms: (session.total_paused_ms ?? 0) + extra,
    })
    .eq("id", sessionId);

  await supabase.from("screens").update({ status: "playing" }).eq("id", session.screen_id);

  revalidateOps();
  return { success: true, message: "Session resumed" };
}

export async function changeSessionGameAction(
  sessionId: string,
  gameId: string
): Promise<ActionResult> {
  await requireAdmin("sessions");
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .update({ game_id: gameId })
    .eq("id", sessionId)
    .in("status", ["active", "paused"]);

  if (error) return { success: false, error: error.message };

  revalidateOps();
  return { success: true, message: "Game updated" };
}

export async function endSessionAction(input: unknown): Promise<ActionResult<{ amount: number }>> {
  await requireAdmin("sessions");
  const parsed = endSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, status, screen_id, started_at, paused_at, total_paused_ms, booking_id, rate, players"
    )
    .eq("id", parsed.data.session_id)
    .maybeSingle();

  if (!session || !["active", "paused"].includes(session.status)) {
    return { success: false, error: "Session cannot be ended" };
  }

  const { data: screen } = await supabase
    .from("screens")
    .select("console_type, hourly_rate")
    .eq("id", session.screen_id)
    .single();

  const endedAt = new Date();
  let totalPaused = session.total_paused_ms ?? 0;
  if (session.status === "paused" && session.paused_at) {
    totalPaused += endedAt.getTime() - new Date(session.paused_at).getTime();
  }

  const elapsedMs = getSessionElapsedMs({
    startedAt: session.started_at,
    endedAt: endedAt.toISOString(),
    totalPausedMs: totalPaused,
    nowMs: endedAt.getTime(),
  });

  const rules = await loadPricingRules();
  const charge = calculateSessionCharge({
    elapsedMs,
    consoleType: (screen?.console_type as ConsoleType) ?? "PS5",
    date: endedAt,
    rules,
    fallbackHourlyRate: Number(screen?.hourly_rate ?? 89),
    players: session.players ?? 1,
  });

  await supabase
    .from("sessions")
    .update({
      status: "completed",
      ended_at: endedAt.toISOString(),
      paused_at: null,
      total_paused_ms: totalPaused,
      duration_minutes: charge.minutes,
      total_amount: charge.amount,
    })
    .eq("id", session.id);

  await supabase
    .from("screens")
    .update({ status: "available" })
    .eq("id", session.screen_id);

  if (session.booking_id) {
    await supabase
      .from("bookings")
      .update({ status: "completed", total_amount: charge.amount })
      .eq("id", session.booking_id);
  }

  // Adjust payment to final server-calculated amount
  const { data: existingPay } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("session_id", session.id)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPay) {
    await supabase
      .from("payments")
      .update({ amount: charge.amount })
      .eq("id", existingPay.id);
  } else {
    await supabase.from("payments").insert({
      session_id: session.id,
      booking_id: session.booking_id,
      amount: charge.amount,
      payment_method: parsed.data.payment_method ?? "cash",
      payment_status: "paid",
      paid_at: endedAt.toISOString(),
    });
  }

  revalidateOps();
  return {
    success: true,
    data: { amount: charge.amount },
    message: `Session ended · ₹${charge.amount}`,
  };
}

export async function updateBookingStatusAction(input: unknown): Promise<ActionResult> {
  await requireAdmin("bookings");
  const parsed = bookingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, screen_id, status")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();

  if (!booking) return { success: false, error: "Booking not found" };

  const { error } = await supabase
    .from("bookings")
    .update({ status: parsed.data.status })
    .eq("id", booking.id);

  if (error) return { success: false, error: error.message };

  if (
    booking.screen_id &&
    parsed.data.status === "confirmed" &&
    booking.status === "pending"
  ) {
    // Soft reserve if screen is free
    const { data: screen } = await supabase
      .from("screens")
      .select("status")
      .eq("id", booking.screen_id)
      .single();
    if (screen?.status === "available") {
      await supabase
        .from("screens")
        .update({ status: "reserved" })
        .eq("id", booking.screen_id);
    }
  }

  if (
    booking.screen_id &&
    ["cancelled", "no_show"].includes(parsed.data.status)
  ) {
    const { data: screen } = await supabase
      .from("screens")
      .select("status")
      .eq("id", booking.screen_id)
      .single();
    if (screen?.status === "reserved") {
      await supabase
        .from("screens")
        .update({ status: "available" })
        .eq("id", booking.screen_id);
    }
  }

  revalidateOps();
  return { success: true, message: `Booking ${parsed.data.status.replace("_", " ")}` };
}

export async function rescheduleBookingAction(input: unknown): Promise<ActionResult> {
  await requireAdmin("bookings");
  const parsed = rescheduleBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const endTime = addMinutesToTime(data.start_time, data.duration_minutes);
  const supabase = await createClient();

  const rules = await loadPricingRules();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, screen_id, players")
    .eq("id", data.booking_id)
    .single();

  if (!booking) return { success: false, error: "Booking not found" };

  const screenId = data.screen_id ?? booking.screen_id;
  let consoleType: ConsoleType = "PS5";
  let hourly = 89;

  if (screenId) {
    const { data: screen } = await supabase
      .from("screens")
      .select("console_type, hourly_rate")
      .eq("id", screenId)
      .single();
    if (screen) {
      consoleType = screen.console_type as ConsoleType;
      hourly = Number(screen.hourly_rate);
    }
  }

  const totalAmount = calculatePrice({
    consoleType,
    durationMinutes: data.duration_minutes,
    date: data.booking_date,
    startTime: data.start_time,
    rules,
    fallbackHourlyRate: hourly,
    players: booking.players ?? 1,
  });

  const { error } = await supabase
    .from("bookings")
    .update({
      booking_date: data.booking_date,
      start_time: data.start_time,
      end_time: endTime,
      duration_minutes: data.duration_minutes,
      screen_id: screenId,
      total_amount: totalAmount,
      status: "confirmed",
    })
    .eq("id", data.booking_id);

  if (error) return { success: false, error: error.message };

  revalidateOps();
  return { success: true, message: "Booking rescheduled" };
}

export async function startSessionFromBookingAction(
  bookingId: string
): Promise<ActionResult<{ sessionId: string }>> {
  await requireAdmin("sessions");
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Booking not found" };
  if (!booking.screen_id) return { success: false, error: "Assign a screen first" };
  if (!["pending", "confirmed"].includes(booking.status)) {
    return { success: false, error: "Booking cannot be started" };
  }

  return startSessionAction({
    screen_id: booking.screen_id,
    customer_mode: "existing",
    customer_id: booking.customer_id,
    players: booking.players,
    game_id: booking.game_id,
    duration_minutes: booking.duration_minutes,
    payment_method: "cash",
  });
}
