import { createClient } from "@/lib/supabase/server";
import { eachDateInclusive } from "@/lib/earnings-range";
import { localDateString, localTimeString, toDateString } from "@/lib/utils";
import type {
  BookingWithRelations,
  Payment,
  SessionWithRelations,
  Screen,
} from "@/lib/types/database";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function getDashboardStats(date = new Date()) {
  const supabase = await createClient();
  const day = toDateString(date);
  const from = startOfDay(date).toISOString();
  const to = endOfDay(date).toISOString();

  const [
    paymentsRes,
    bookingsRes,
    sessionsRes,
    screensRes,
    upcomingRes,
    recentPaymentsRes,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, payment_status, paid_at, created_at")
      .eq("payment_status", "paid")
      .gte("paid_at", from)
      .lte("paid_at", to),
    supabase
      .from("bookings")
      .select("id, players, status")
      .eq("booking_date", day)
      .neq("status", "cancelled"),
    supabase
      .from("sessions")
      .select(
        "id, players, duration_minutes, status, started_at, ended_at, total_paused_ms, paused_at, game_id, games(name)"
      )
      .or(
        `and(started_at.gte.${from},started_at.lte.${to}),and(status.in.(active,paused))`
      ),
    supabase.from("screens").select("id, status, is_active").eq("is_active", true),
    supabase
      .from("bookings")
      .select(
        "id, booking_date, start_time, end_time, players, status, total_amount, customers(name, mobile), screens(name), games(name)"
      )
      .eq("booking_date", day)
      .in("status", ["pending", "confirmed"])
      .order("start_time")
      .limit(8),
    supabase
      .from("payments")
      .select("id, amount, payment_method, payment_status, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const revenue = (paymentsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const bookings = bookingsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const screens = screensRes.data ?? [];

  const activeSessions = sessions.filter((s) =>
    ["active", "paused"].includes(s.status)
  );

  const playersToday =
    bookings.reduce((s, b) => s + (b.players || 0), 0) +
    activeSessions.reduce((s, sss) => s + (sss.players || 0), 0);

  const hoursPlayed =
    sessions.reduce((s, sess) => {
      if (sess.duration_minutes) return s + sess.duration_minutes / 60;
      if (["active", "paused"].includes(sess.status)) {
        const start = new Date(sess.started_at).getTime();
        let paused = sess.total_paused_ms ?? 0;
        if (sess.paused_at) paused += Date.now() - new Date(sess.paused_at).getTime();
        return s + Math.max(0, Date.now() - start - paused) / 3600000;
      }
      return s;
    }, 0) || 0;

  return {
    revenue,
    bookingsCount: bookings.length,
    players: playersToday,
    hoursPlayed: Math.round(hoursPlayed * 10) / 10,
    activeSessions: activeSessions.length,
    availableScreens: screens.filter((s) => s.status === "available").length,
    occupiedScreens: screens.filter((s) =>
      ["playing", "paused", "reserved"].includes(s.status)
    ).length,
    upcoming: (upcomingRes.data ?? []) as unknown as BookingWithRelations[],
    recentPayments: (recentPaymentsRes.data ?? []) as Payment[],
  };
}

export async function getScreensLive() {
  const supabase = await createClient();

  const { data: screens } = await supabase
    .from("screens")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, customers(id, name, mobile), games(id, name), bookings(id, start_time, notes, duration_minutes, total_amount)"
    )
    .in("status", ["active", "paused"]);

  const today = toDateString(new Date());
  const nowTime = new Date().toTimeString().slice(0, 5);

  const { data: upcoming } = await supabase
    .from("bookings")
    .select("*, customers(name, mobile), games(name)")
    .eq("booking_date", today)
    .in("status", ["pending", "confirmed"])
    .gte("start_time", nowTime)
    .order("start_time");

  const sessionByScreen = new Map(
    (sessions ?? []).map((s) => [s.screen_id, s as unknown as SessionWithRelations])
  );
  const bookingByScreen = new Map<string, BookingWithRelations>();
  for (const b of upcoming ?? []) {
    if (b.screen_id && !bookingByScreen.has(b.screen_id)) {
      bookingByScreen.set(b.screen_id, b as unknown as BookingWithRelations);
    }
  }

  return (screens ?? []).map((screen: Screen) => ({
    ...screen,
    active_session: sessionByScreen.get(screen.id) ?? null,
    upcoming_booking: bookingByScreen.get(screen.id) ?? null,
  }));
}

export async function getRevenueSeries(days = 14) {
  const supabase = await createClient();
  const from = startOfDay(new Date(Date.now() - (days - 1) * 86400000)).toISOString();

  const { data } = await supabase
    .from("payments")
    .select("amount, paid_at, created_at")
    .eq("payment_status", "paid")
    .gte("paid_at", from);

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = toDateString(new Date(Date.now() - (days - 1 - i) * 86400000));
    map.set(d, 0);
  }

  for (const p of data ?? []) {
    const key = toDateString(new Date(p.paid_at || p.created_at));
    if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(p.amount));
  }

  return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
}

export async function getBookingsSeries(days = 14) {
  const supabase = await createClient();
  const from = toDateString(new Date(Date.now() - (days - 1) * 86400000));

  const { data } = await supabase
    .from("bookings")
    .select("booking_date, status")
    .gte("booking_date", from)
    .neq("status", "cancelled");

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = toDateString(new Date(Date.now() - (days - 1 - i) * 86400000));
    map.set(d, 0);
  }

  for (const b of data ?? []) {
    if (map.has(b.booking_date)) {
      map.set(b.booking_date, (map.get(b.booking_date) || 0) + 1);
    }
  }

  return Array.from(map.entries()).map(([date, bookings]) => ({ date, bookings }));
}

export async function getTopGames(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("game_id, games(name)")
    .not("game_id", "is", null)
    .limit(500);

  const counts = new Map<string, { name: string; count: number }>();
  for (const s of data ?? []) {
    const id = s.game_id as string;
    const name = (s.games as { name?: string } | null)?.name ?? "Unknown";
    const prev = counts.get(id) || { name, count: 0 };
    prev.count += 1;
    counts.set(id, prev);
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getScreenUtilization() {
  const supabase = await createClient();
  const { data: screens } = await supabase
    .from("screens")
    .select("id, name")
    .eq("is_active", true);

  const from = startOfDay(new Date(Date.now() - 6 * 86400000)).toISOString();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("screen_id, duration_minutes, started_at, ended_at, status, total_paused_ms, paused_at")
    .gte("started_at", from);

  return (screens ?? []).map((screen) => {
    const mins = (sessions ?? [])
      .filter((s) => s.screen_id === screen.id)
      .reduce((sum, s) => {
        if (s.duration_minutes) return sum + s.duration_minutes;
        return sum;
      }, 0);
    return { name: screen.name, hours: Math.round((mins / 60) * 10) / 10 };
  });
}

export async function getEarningsAnalytics(from: string, to: string) {
  const supabase = await createClient();
  const fromIso = startOfDay(new Date(from)).toISOString();
  const toIso = endOfDay(new Date(to)).toISOString();

  const [payments, sessions, customers] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at, payment_status")
      .eq("payment_status", "paid")
      .gte("paid_at", fromIso)
      .lte("paid_at", toIso),
    supabase
      .from("sessions")
      .select("id, duration_minutes, total_amount, customer_id, status")
      .gte("started_at", fromIso)
      .lte("started_at", toIso)
      .eq("status", "completed"),
    supabase.from("customers").select("id, created_at"),
  ]);

  const revenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const sess = sessions.data ?? [];
  const hours = sess.reduce((s, x) => s + (x.duration_minutes || 0) / 60, 0);
  const avgValue = sess.length ? revenue / sess.length : 0;
  const avgDuration = sess.length
    ? sess.reduce((s, x) => s + (x.duration_minutes || 0), 0) / sess.length
    : 0;

  const customerIds = new Set(sess.map((s) => s.customer_id));
  const visitCounts = new Map<string, number>();
  for (const s of sess) {
    visitCounts.set(s.customer_id, (visitCounts.get(s.customer_id) || 0) + 1);
  }
  const repeat = Array.from(visitCounts.values()).filter((c) => c > 1).length;

  return {
    revenue,
    sessions: sess.length,
    hoursPlayed: Math.round(hours * 10) / 10,
    averageSessionValue: Math.round(avgValue),
    averageSessionDuration: Math.round(avgDuration),
    uniqueCustomers: customerIds.size,
    repeatCustomers: repeat,
    totalCustomers: customers.data?.length ?? 0,
  };
}

function relationName(rel: unknown) {
  if (!rel) return "";
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name ?? "";
  return (rel as { name?: string }).name ?? "";
}

function relationField(rel: unknown, field: string) {
  if (!rel) return "";
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return String((obj as Record<string, unknown> | undefined)?.[field] ?? "");
}

export async function getEarningsExportData(from: string, to: string) {
  const supabase = await createClient();
  const fromIso = startOfDay(new Date(from)).toISOString();
  const toIso = endOfDay(new Date(to)).toISOString();
  const dates = eachDateInclusive(from, to);

  const [paymentsRes, sessionsRes, bookingsRes, screensRes] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "amount, payment_method, payment_status, paid_at, created_at, session_id, booking_id"
      )
      .eq("payment_status", "paid")
      .gte("paid_at", fromIso)
      .lte("paid_at", toIso)
      .order("paid_at")
      .limit(5000),
    supabase
      .from("sessions")
      .select(
        "id, booking_id, screen_id, started_at, ended_at, duration_minutes, players, status, total_amount, rate, customers(name, mobile), screens(name), games(name)"
      )
      .gte("started_at", fromIso)
      .lte("started_at", toIso)
      .order("started_at")
      .limit(5000),
    supabase
      .from("bookings")
      .select(
        "id, booking_date, start_time, duration_minutes, players, status, total_amount, customers(name, mobile), games(name), screens(name)"
      )
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_date")
      .limit(5000),
    supabase.from("screens").select("id, name").eq("is_active", true),
  ]);

  const payments = paymentsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const screens = screensRes.data ?? [];

  const analytics = await getEarningsAnalytics(from, to);

  const revenueByDate = new Map(dates.map((d) => [d, 0]));
  for (const p of payments) {
    const key = toDateString(new Date(p.paid_at || p.created_at));
    if (revenueByDate.has(key)) {
      revenueByDate.set(key, (revenueByDate.get(key) || 0) + Number(p.amount));
    }
  }

  const bookingsByDate = new Map(dates.map((d) => [d, 0]));
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (bookingsByDate.has(b.booking_date)) {
      bookingsByDate.set(b.booking_date, (bookingsByDate.get(b.booking_date) || 0) + 1);
    }
  }

  const gameCounts = new Map<string, number>();
  for (const s of sessions) {
    const name = relationName(s.games) || "Unknown";
    gameCounts.set(name, (gameCounts.get(name) || 0) + 1);
  }

  const screenHours = screens.map((screen) => {
    const mins = sessions
      .filter((s) => s.screen_id === screen.id)
      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return { name: screen.name, hours: Math.round((mins / 60) * 10) / 10 };
  });

  const paymentBySession = new Map<string, { amount: number; method: string }>();
  const paymentByBooking = new Map<string, { amount: number; method: string }>();
  for (const p of payments) {
    const info = { amount: Number(p.amount), method: String(p.payment_method ?? "") };
    if (p.session_id) paymentBySession.set(p.session_id, info);
    if (p.booking_id) paymentByBooking.set(p.booking_id, info);
  }

  const sessionBookingIds = new Set<string>();
  const activity = sessions.map((s) => {
    if (s.booking_id) sessionBookingIds.add(s.booking_id);
    const pay = s.id ? paymentBySession.get(s.id) : undefined;
    const amount =
      s.total_amount != null
        ? Number(s.total_amount)
        : (pay?.amount ?? (Number(s.rate) || 0));
    return {
      date: localDateString(s.started_at),
      time: localTimeString(s.started_at),
      type: "Session" as const,
      customer: relationField(s.customers, "name"),
      mobile: relationField(s.customers, "mobile"),
      game: relationName(s.games),
      screen: relationName(s.screens),
      players: s.players ?? 1,
      duration: s.duration_minutes,
      amount,
      paymentMethod: pay?.method ?? "",
      status: s.status,
    };
  });

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (sessionBookingIds.has(b.id)) continue;
    const pay = paymentByBooking.get(b.id);
    activity.push({
      date: b.booking_date,
      time: String(b.start_time).slice(0, 5),
      type: "Booking" as const,
      customer: relationField(b.customers, "name"),
      mobile: relationField(b.customers, "mobile"),
      game: relationName(b.games),
      screen: relationName(b.screens),
      players: b.players ?? 1,
      duration: b.duration_minutes,
      amount: Number(b.total_amount) || pay?.amount || 0,
      paymentMethod: pay?.method ?? "",
      status: b.status,
    });
  }

  activity.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.time.localeCompare(b.time);
  });

  const dayTotals = dates.map((date) => {
    const rows = activity.filter((r) => r.date === date);
    return {
      date,
      visits: rows.length,
      revenue: rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      players: rows.reduce((s, r) => s + (r.players || 0), 0),
    };
  });

  return {
    analytics,
    dates,
    dayTotals,
    daily: dates.map((date) => ({
      date,
      revenue: revenueByDate.get(date) || 0,
      bookings: bookingsByDate.get(date) || 0,
    })),
    activity,
    sessions: sessions.map((s) => ({
      started: s.started_at,
      ended: s.ended_at,
      status: s.status,
      duration: s.duration_minutes,
      players: s.players,
      amount: s.total_amount,
      rate: s.rate,
      customer: relationField(s.customers, "name"),
      mobile: relationField(s.customers, "mobile"),
      screen: relationName(s.screens),
      game: relationName(s.games),
    })),
    payments: payments.map((p) => ({
      paidAt: p.paid_at || p.created_at,
      amount: Number(p.amount),
      method: p.payment_method,
      status: p.payment_status,
    })),
    bookings: bookings.map((b) => ({
      date: b.booking_date,
      time: String(b.start_time).slice(0, 5),
      duration: b.duration_minutes,
      players: b.players,
      status: b.status,
      amount: Number(b.total_amount),
      customer: relationField(b.customers, "name"),
      mobile: relationField(b.customers, "mobile"),
      game: relationName(b.games),
      screen: relationName(b.screens),
    })),
    games: Array.from(gameCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    screens: screenHours,
  };
}
