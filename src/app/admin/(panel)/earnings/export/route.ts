import { requireAdmin } from "@/lib/auth";
import { getEarningsExportData } from "@/lib/data/dashboard";
import { resolveEarningsRange } from "@/lib/earnings-range";
import { buildExcelXml } from "@/lib/excel";
import { formatCurrency, formatHours } from "@/lib/utils";

export async function GET(request: Request) {
  await requireAdmin("earnings");

  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "today";
  const range = resolveEarningsRange(
    preset,
    url.searchParams.get("from") ?? undefined,
    url.searchParams.get("to") ?? undefined
  );

  const data = await getEarningsExportData(range.from, range.to);
  const period =
    range.from === range.to ? range.from : `${range.from} to ${range.to}`;

  const xml = buildExcelXml([
    {
      name: "Summary",
      rows: [
        ["USA GAMING — Earnings export"],
        ["Period", period],
        ["Preset", range.preset],
        [],
        ["Metric", "Value"],
        ["Revenue", data.analytics.revenue],
        ["Revenue (display)", formatCurrency(data.analytics.revenue)],
        ["Sessions", data.analytics.sessions],
        ["Hours played", data.analytics.hoursPlayed],
        ["Hours played (display)", formatHours(data.analytics.hoursPlayed)],
        ["Avg session value", data.analytics.averageSessionValue],
        ["Avg duration (min)", data.analytics.averageSessionDuration],
        ["Unique players", data.analytics.uniqueCustomers],
        ["Repeat players", data.analytics.repeatCustomers],
        ["Total customers", data.analytics.totalCustomers],
      ],
    },
    {
      name: "Daily",
      rows: [
        ["Date", "Revenue", "Bookings"],
        ...data.daily.map((row) => [row.date, row.revenue, row.bookings]),
      ],
    },
    {
      name: "Sessions",
      rows: [
        [
          "Started",
          "Ended",
          "Status",
          "Duration (min)",
          "Players",
          "Amount",
          "Rate",
          "Customer",
          "Mobile",
          "Screen",
          "Game",
        ],
        ...data.sessions.map((s) => [
          s.started,
          s.ended,
          s.status,
          s.duration,
          s.players,
          s.amount == null ? "" : Number(s.amount),
          s.rate == null ? "" : Number(s.rate),
          s.customer,
          s.mobile,
          s.screen,
          s.game,
        ]),
      ],
    },
    {
      name: "Payments",
      rows: [
        ["Paid at", "Amount", "Method", "Status"],
        ...data.payments.map((p) => [p.paidAt, p.amount, p.method, p.status]),
      ],
    },
    {
      name: "Bookings",
      rows: [
        [
          "Date",
          "Time",
          "Duration (min)",
          "Players",
          "Status",
          "Amount",
          "Customer",
          "Mobile",
          "Game",
          "Screen",
        ],
        ...data.bookings.map((b) => [
          b.date,
          b.time,
          b.duration,
          b.players,
          b.status,
          b.amount,
          b.customer,
          b.mobile,
          b.game,
          b.screen,
        ]),
      ],
    },
    {
      name: "Games",
      rows: [
        ["Game", "Sessions"],
        ...data.games.map((g) => [g.name, g.count]),
      ],
    },
    {
      name: "Screens",
      rows: [
        ["Screen", "Hours"],
        ...data.screens.map((s) => [s.name, s.hours]),
      ],
    },
  ]);

  const filename = `usa-gaming-earnings-${range.from}-to-${range.to}.xls`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
