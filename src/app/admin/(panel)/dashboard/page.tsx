import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getBookingsSeries,
  getDashboardStats,
  getRevenueSeries,
  getScreenUtilization,
  getScreensLive,
  getTopGames,
} from "@/lib/data/dashboard";
import { formatCurrency, formatHours } from "@/lib/utils";
import { ScreenGrid } from "@/components/admin/screen-grid";
import {
  BookingsChart,
  RevenueChart,
  UtilizationChart,
} from "@/components/admin/charts";
import type { Customer, Game, ScreenWithSession } from "@/lib/types/database";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin("dashboard");

  let stats;
  let screens: ScreenWithSession[] = [];
  let revenueSeries: { date: string; revenue: number }[] = [];
  let bookingsSeries: { date: string; bookings: number }[] = [];
  let topGames: { name: string; count: number }[] = [];
  let utilization: { name: string; hours: number }[] = [];
  let games: Game[] = [];
  let customers: Customer[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    [
      stats,
      screens,
      revenueSeries,
      bookingsSeries,
      topGames,
      utilization,
    ] = await Promise.all([
      getDashboardStats(),
      getScreensLive(),
      getRevenueSeries(14),
      getBookingsSeries(14),
      getTopGames(),
      getScreenUtilization(),
    ]);

    const [gamesRes, customersRes] = await Promise.all([
      supabase.from("games").select("*").eq("is_active", true).order("name"),
      supabase.from("customers").select("*").order("name").limit(200),
    ]);
    games = (gamesRes.data ?? []) as Game[];
    customers = (customersRes.data ?? []) as Customer[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load dashboard";
    stats = {
      revenue: 0,
      bookingsCount: 0,
      players: 0,
      hoursPlayed: 0,
      activeSessions: 0,
      availableScreens: 0,
      occupiedScreens: 0,
      upcoming: [],
      recentPayments: [],
    };
  }

  const kpis = [
    { label: "Revenue", value: formatCurrency(stats.revenue) },
    { label: "Bookings", value: String(stats.bookingsCount) },
    { label: "Players", value: String(stats.players) },
    { label: "Hours Played", value: formatHours(stats.hoursPlayed) },
    { label: "Active Sessions", value: String(stats.activeSessions) },
    { label: "Available", value: String(stats.availableScreens) },
    { label: "Occupied", value: String(stats.occupiedScreens) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Today
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load live data. {loadError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Live screens</h2>
          <p className="text-xs text-muted-foreground">Realtime via Supabase</p>
        </div>
        <ScreenGrid
          initialScreens={screens}
          games={games}
          customers={customers}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Revenue (14 days)</h3>
          <RevenueChart data={revenueSeries} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Bookings (14 days)</h3>
          <BookingsChart data={bookingsSeries} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Top games</h3>
          {topGames.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No session data yet</p>
          ) : (
            <ul className="space-y-3">
              {topGames.map((g, i) => (
                <li key={g.name} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {g.name}
                  </span>
                  <span className="text-muted-foreground">{g.count} sessions</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Screen utilization (7 days)</h3>
          <UtilizationChart data={utilization} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Upcoming bookings</h3>
          {stats.upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No upcoming bookings</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{b.customers?.name || "Guest"}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(b.start_time).slice(0, 5)} · {b.screens?.name || "Unassigned"} ·{" "}
                      {b.games?.name || "Game TBD"}
                    </p>
                  </div>
                  <span className="capitalize text-muted-foreground">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Recent payments</h3>
          {stats.recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payments yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatCurrency(Number(p.amount))}</p>
                    <p className="text-xs uppercase text-muted-foreground">
                      {p.payment_method} · {p.payment_status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.paid_at || p.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
