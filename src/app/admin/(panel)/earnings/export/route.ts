import { requireAdmin } from "@/lib/auth";
import { getEarningsExportData } from "@/lib/data/dashboard";
import { resolveEarningsRange } from "@/lib/earnings-range";
import { buildExcelXml, type ExcelCell } from "@/lib/excel";
import { formatCurrency, formatHours } from "@/lib/utils";

const ACTIVITY_HEADERS = [
  "Date",
  "Time",
  "Type",
  "Customer",
  "Mobile",
  "Game",
  "Screen",
  "Players",
  "Duration (min)",
  "Amount",
  "Payment",
  "Status",
];

function activityRow(row: {
  date: string;
  time: string;
  type: string;
  customer: string;
  mobile: string;
  game: string;
  screen: string;
  players: number;
  duration: number | null;
  amount: number;
  paymentMethod: string;
  status: string;
}): ExcelCell[] {
  return [
    row.date,
    row.time,
    row.type,
    row.customer,
    row.mobile,
    row.game,
    row.screen,
    row.players,
    row.duration,
    Number(row.amount) || 0,
    row.paymentMethod,
    row.status,
  ];
}

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

  const dayByDayRows: ExcelCell[][] = [ACTIVITY_HEADERS];
  for (const date of data.dates) {
    const rows = data.activity.filter((r) => r.date === date);
    if (rows.length === 0) {
      dayByDayRows.push([date, "", "", "No activity", "", "", "", "", "", 0, "", ""]);
      continue;
    }
    for (const row of rows) dayByDayRows.push(activityRow(row));
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    dayByDayRows.push(["", "", "", "", "", "", "", "", `${date} total`, total, "", ""]);
    dayByDayRows.push([]);
  }

  const sheets: { name: string; rows: ExcelCell[][] }[] = [
    {
      name: "Summary",
      rows: [
        ["USA GAMING — Day-by-day earnings"],
        ["Period", period],
        ["Preset", range.preset],
        ["Days", data.dates.length],
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
        [],
        ["Date", "Visits", "Players", "Amount"],
        ...data.dayTotals.map((d) => [d.date, d.visits, d.players, d.revenue]),
      ],
    },
    {
      name: "Day by day",
      rows: dayByDayRows,
    },
  ];

  // One worksheet per calendar day (7 days → 7 day sheets).
  if (data.dates.length <= 31) {
    for (const date of data.dates) {
      const rows = data.activity.filter((r) => r.date === date);
      const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      sheets.push({
        name: date,
        rows: [
          [`USA GAMING — ${date}`],
          ["Visits", rows.length],
          ["Day total", total],
          [],
          ACTIVITY_HEADERS,
          ...(rows.length
            ? rows.map(activityRow)
            : [["", "", "", "No activity", "", "", "", "", "", "", "", ""]]),
          [],
          ["", "", "", "", "", "", "", "", "Day total", total, "", ""],
        ],
      });
    }
  }

  sheets.push(
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
    }
  );

  const xml = buildExcelXml(sheets);
  const filename = `usa-gaming-earnings-${range.from}-to-${range.to}.xls`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
