"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { revalidateAdminOps } from "@/lib/admin-revalidate";
import { getCachedPricing } from "@/lib/data/admin-cache";
import { createClient } from "@/lib/supabase/server";
import {
  asMinutes,
  asPlayerCount,
  calculatePrice,
  quoteExtendedPackage,
} from "@/lib/pricing";
import { addMinutesToTime, getSessionElapsedMs } from "@/lib/utils";
import { parseExtension, writeExtension } from "@/lib/extensions";
import {
  bookingStatusSchema,
  confirmPaymentSchema,
  endSessionSchema,
  rescheduleBookingSchema,
  resolveExtensionSchema,
  startSessionSchema,
} from "@/lib/validations";
import type { ActionResult } from "@/lib/actions/auth";
import type { ConsoleType } from "@/lib/types/database";

function revalidateOps() {
  revalidateAdminOps();
}

async function loadPricingRules() {
  const rules = await getCachedPricing();
  return rules.filter((r) => r.is_active);
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
      booking_id: data.booking_id ?? null,
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

  if (data.booking_id) {
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", data.booking_id)
      .in("status", ["pending", "confirmed"]);
  }

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

export async function endSessionAction(
  input: unknown
): Promise<ActionResult<{ amount: number; sessionId: string }>> {
  await requireAdmin("sessions");
  const parsed = endSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, status, screen_id, started_at, paused_at, total_paused_ms, booking_id, rate, duration_minutes, players"
    )
    .eq("id", parsed.data.session_id)
    .maybeSingle();

  if (!session || !["active", "paused"].includes(session.status)) {
    return { success: false, error: "Session cannot be ended" };
  }

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
  const elapsedMinutes = Math.max(1, Math.ceil(elapsedMs / 60000));
  const amount = Math.round(Number(session.rate) || 0);
  const method = parsed.data.payment_method ?? "upi";

  const sessionUpdate = supabase
    .from("sessions")
    .update({
      status: "completed",
      ended_at: endedAt.toISOString(),
      paused_at: null,
      total_paused_ms: totalPaused,
      duration_minutes: elapsedMinutes,
      total_amount: amount,
    })
    .eq("id", session.id);

  const screenUpdate = supabase
    .from("screens")
    .update({ status: "available" })
    .eq("id", session.screen_id);

  const bookingUpdate = session.booking_id
    ? supabase
        .from("bookings")
        .update({ status: "completed", total_amount: amount })
        .eq("id", session.booking_id)
    : Promise.resolve({ error: null });

  const existingPaysQuery = supabase
    .from("payments")
    .select("id")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const [sessionRes, , , paysRes] = await Promise.all([
    sessionUpdate,
    screenUpdate,
    bookingUpdate,
    existingPaysQuery,
  ]);

  if (sessionRes.error) {
    return { success: false, error: sessionRes.error.message };
  }

  const existingPays = paysRes.data ?? [];
  const keepId = existingPays[0]?.id;
  if (keepId) {
    const extraIds = existingPays.slice(1).map((row) => row.id);
    await Promise.all([
      supabase
        .from("payments")
        .update({
          amount,
          booking_id: session.booking_id,
          payment_method: method,
          payment_status: "pending",
          paid_at: null,
        })
        .eq("id", keepId),
      extraIds.length
        ? supabase.from("payments").delete().in("id", extraIds)
        : Promise.resolve(null),
    ]);
  } else {
    await supabase.from("payments").insert({
      session_id: session.id,
      booking_id: session.booking_id,
      amount,
      payment_method: method,
      payment_status: "pending",
      paid_at: null,
    });
  }

  return {
    success: true,
    data: { amount, sessionId: session.id },
    message: `Session ended · collect ₹${amount}`,
  };
}

export async function confirmPaymentCollectedAction(
  input: unknown
): Promise<ActionResult<{ amount: number; bookingId: string | null }>> {
  await requireAdmin("sessions");
  const parsed = confirmPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid payment" };
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, booking_id, total_amount, rate")
    .eq("id", parsed.data.session_id)
    .maybeSingle();

  if (!session) return { success: false, error: "Session not found" };

  const amount = Math.round(Number(session.total_amount) || Number(session.rate) || 0);
  const paidAt = new Date().toISOString();
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("payments")
      .update({
        amount,
        booking_id: session.booking_id,
        payment_method: parsed.data.payment_method,
        payment_status: "paid",
        paid_at: paidAt,
      })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("payments").insert({
      session_id: session.id,
      booking_id: session.booking_id,
      amount,
      payment_method: parsed.data.payment_method,
      payment_status: "paid",
      paid_at: paidAt,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidateOps();
  revalidatePath(`/admin/collect/${session.id}`);
  if (session.booking_id) {
    revalidatePath(`/booking/${session.booking_id}/pay`);
    revalidatePath(`/booking/${session.booking_id}/thanks`);
  }
  return {
    success: true,
    data: { amount, bookingId: session.booking_id },
    message: "Payment collected",
  };
}

export async function getAdminCollectSession(sessionId: string) {
  await requireAdmin("sessions");
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, status, total_amount, rate, duration_minutes, players, booking_id, customers(name, mobile), games(name), screens(name)"
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount, payment_status, payment_method")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { session, payment };
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

  const { data: existingSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("booking_id", booking.id)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (existingSession) {
    return { success: false, error: "Session already running for this booking" };
  }

  return startSessionAction({
    screen_id: booking.screen_id,
    customer_mode: "existing",
    customer_id: booking.customer_id,
    players: booking.players,
    game_id: booking.game_id,
    duration_minutes: booking.duration_minutes,
    payment_method: "cash",
    booking_id: booking.id,
  });
}

export async function resolveExtensionAction(
  input: unknown
): Promise<ActionResult<{ totalMinutes: number; quotedTotal: number }>> {
  await requireAdmin("sessions");
  const parsed = resolveExtensionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();

  if (!booking) return { success: false, error: "Booking not found" };

  const extension = parseExtension(booking.notes);
  if (extension.status !== "pending") {
    return { success: false, error: "No pending extra-time request" };
  }

  if (!parsed.data.accept) {
    const { error } = await supabase
      .from("bookings")
      .update({ notes: writeExtension(booking.notes, "rejected", extension.extraMinutes, extension.quotedTotal) })
      .eq("id", booking.id);
    if (error) return { success: false, error: error.message };
    revalidateOps();
    return { success: true, message: "Extra time declined" };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("booking_id", booking.id)
    .in("status", ["active", "paused", "completed"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { success: false, error: "Session not found" };

  const extraMinutes = asMinutes(extension.extraMinutes);
  const currentDuration = asMinutes(session.duration_minutes || booking.duration_minutes);
  const elapsedMs = getSessionElapsedMs({
    startedAt: session.started_at,
    pausedAt: session.paused_at,
    totalPausedMs: session.total_paused_ms,
    endedAt: session.ended_at,
  });
  const elapsedMin = Math.max(0, Math.ceil(elapsedMs / 60000));
  const newDuration =
    elapsedMin >= currentDuration
      ? elapsedMin + extraMinutes
      : currentDuration + extraMinutes;

  const rules = await loadPricingRules();
  let consoleType: ConsoleType = "PS5";
  let hourly = 89;
  if (session.screen_id) {
    const { data: screen } = await supabase
      .from("screens")
      .select("console_type, hourly_rate")
      .eq("id", session.screen_id)
      .maybeSingle();
    if (screen) {
      consoleType = screen.console_type as ConsoleType;
      hourly = Number(screen.hourly_rate);
    }
  }

  const players = asPlayerCount(booking.players ?? session.players);
  const previousAmount = Number(booking.total_amount) || Number(session.rate) || 0;
  const quote = quoteExtendedPackage({
    consoleType,
    durationMinutes: currentDuration,
    extraMinutes,
    date: booking.booking_date,
    startTime: booking.start_time,
    rules,
    fallbackHourlyRate: hourly,
    players,
    paidAmount: previousAmount,
  });

  const endTime = addMinutesToTime(booking.start_time, newDuration);

  const sessionPatch: Record<string, unknown> = {
    duration_minutes: newDuration,
    rate: quote.quotedTotal,
  };
  if (session.status === "completed") {
    sessionPatch.status = "active";
    sessionPatch.ended_at = null;
    sessionPatch.total_amount = null;
  }

  const { error: sessionError } = await supabase
    .from("sessions")
    .update(sessionPatch)
    .eq("id", session.id);
  if (sessionError) return { success: false, error: sessionError.message };

  if (session.status === "completed") {
    await supabase.from("screens").update({ status: "playing" }).eq("id", session.screen_id);
  }

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      duration_minutes: newDuration,
      end_time: endTime,
      total_amount: quote.quotedTotal,
      status: "confirmed",
      notes: writeExtension(booking.notes, "accepted", extraMinutes, quote.quotedTotal),
    })
    .eq("id", booking.id);
  if (bookingError) return { success: false, error: bookingError.message };

  revalidateOps();
  return {
    success: true,
    data: { totalMinutes: newDuration, quotedTotal: quote.quotedTotal },
    message: `Extra time approved · total due at end ₹${quote.quotedTotal}`,
  };
}
