"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} />
          <YAxis stroke="#71717a" fontSize={12} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: "#121216",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#e11d2e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BookingsChart({ data }: { data: { date: string; bookings: number }[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} />
          <YAxis stroke="#71717a" fontSize={12} tickLine={false} width={30} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#121216",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="bookings" fill="#e11d2e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UtilizationChart({
  data,
}: {
  data: { name: string; hours: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#71717a"
            fontSize={11}
            width={80}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#121216",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="hours" fill="#f87171" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
