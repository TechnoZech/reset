import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import {
  getBookingsSeries,
  getEarningsAnalytics,
  getRevenueSeries,
  getScreenUtilization,
  getTopGames,
} from "@/lib/data/dashboard";
import { formatCurrency, formatHours, toDateString } from "@/lib/utils";
import {
  BookingsChart,
  RevenueChart,
  UtilizationChart,
} from "@/components/admin/charts";
import { EarningsFilters } from "@/components/admin/earnings-filters";
import { resolveEarningsRange } from "@/lib/earnings-range";

export const metadata = { title: "Earnings" };

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireAdmin("earnings");
  const sp = await searchParams;
  const preset = sp.preset || "today";
  const range = resolveEarningsRange(preset, sp.from, sp.to);

  let analytics = {
    revenue: 0,
    sessions: 0,
    hoursPlayed: 0,
    averageSessionValue: 0,
    averageSessionDuration: 0,
    uniqueCustomers: 0,
    repeatCustomers: 0,
    totalCustomers: 0,
  };
  let revenueSeries: { date: string; revenue: number }[] = [];
  let bookingsSeries: { date: string; bookings: number }[] = [];
  let topGames: { name: string; count: number }[] = [];
  let utilization: { name: string; hours: number }[] = [];
  let loadError: string | null = null;

  try {
    const endsToday = range.to === toDateString(new Date());
    [
      analytics,
      revenueSeries,
      bookingsSeries,
      topGames,
      utilization,
    ] = await Promise.all([
      getEarningsAnalytics(range.from, range.to),
      endsToday
        ? getRevenueSeries(range.days)
        : getRevenueSeries(Math.min(90, range.days + 30)).then((rows) =>
            rows.filter((r) => r.date >= range.from && r.date <= range.to)
          ),
      endsToday
        ? getBookingsSeries(range.days)
        : getBookingsSeries(Math.min(90, range.days + 30)).then((rows) =>
            rows.filter((r) => r.date >= range.from && r.date <= range.to)
          ),
      getTopGames(),
      getScreenUtilization(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load earnings";
  }

  const kpis = [
    { label: "Revenue", value: formatCurrency(analytics.revenue) },
    { label: "Sessions", value: String(analytics.sessions) },
    { label: "Hours played", value: formatHours(analytics.hoursPlayed) },
    {
      label: "Avg session value",
      value: formatCurrency(analytics.averageSessionValue),
    },
    {
      label: "Avg duration",
      value: `${analytics.averageSessionDuration}m`,
    },
    { label: "Unique players", value: String(analytics.uniqueCustomers) },
    { label: "Repeat players", value: String(analytics.repeatCustomers) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Analytics
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {range.from === range.to
            ? range.from
            : `${range.from} → ${range.to}`}
        </p>
      </div>

      <Suspense fallback={null}>
        <EarningsFilters preset={preset} from={range.from} to={range.to} />
      </Suspense>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load earnings. {loadError}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Revenue</h3>
          <RevenueChart data={revenueSeries} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Bookings</h3>
          <BookingsChart data={bookingsSeries} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium">Top games</h3>
          {topGames.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No session data yet
            </p>
          ) : (
            <ul className="space-y-3">
              {topGames.map((g, i) => (
                <li
                  key={g.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {g.name}
                  </span>
                  <span className="text-muted-foreground">
                    {g.count} sessions
                  </span>
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
    </div>
  );
}
