import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDuration } from "@/lib/utils";
import type {
  BookingWithRelations,
  Customer,
  SessionWithRelations,
} from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("customers");
  const { id } = await params;

  let customer: Customer | null = null;
  let bookings: BookingWithRelations[] = [];
  let sessions: SessionWithRelations[] = [];
  let favorites: { name: string; count: number }[] = [];
  let loadError: string | null = null;
  let totalSpent = 0;
  let missing = false;

  try {
    const supabase = await createClient();
    const { data: cust, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!cust) {
      missing = true;
    } else {
      customer = cust as Customer;

      const [bookingsRes, sessionsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, screens(name), games(name)")
          .eq("customer_id", id)
          .order("booking_date", { ascending: false })
          .limit(50),
        supabase
          .from("sessions")
          .select("*, screens(name), games(id, name), bookings(id)")
          .eq("customer_id", id)
          .order("started_at", { ascending: false })
          .limit(50),
      ]);

      bookings = (bookingsRes.data ?? []) as unknown as BookingWithRelations[];
      sessions = (sessionsRes.data ?? []) as unknown as SessionWithRelations[];
      totalSpent = sessions.reduce(
        (sum, s) => sum + Number(s.total_amount ?? 0),
        0
      );

      const gameCounts = new Map<string, { name: string; count: number }>();
      for (const s of sessions) {
        if (!s.game_id || !s.games) continue;
        const name = s.games.name;
        const prev = gameCounts.get(s.game_id) ?? { name, count: 0 };
        prev.count += 1;
        gameCounts.set(s.game_id, prev);
      }
      favorites = Array.from(gameCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load customer";
  }

  if (missing) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/customers"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Customers
        </Link>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Customer
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          {customer?.name ?? "Customer"}
        </h1>
        {customer && (
          <p className="mt-1 text-sm text-muted-foreground">{customer.mobile}</p>
        )}
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load customer. {loadError}
        </div>
      )}

      {customer && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Bookings</p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {bookings.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {sessions.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total spent</p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 font-display text-lg font-semibold">
                Favorite games
              </h2>
              {favorites.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No session games yet
                </p>
              ) : (
                <ul className="space-y-3">
                  {favorites.map((g, i) => (
                    <li
                      key={g.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                        {g.name}
                      </span>
                      <span className="text-muted-foreground">{g.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 font-display text-lg font-semibold">
                Recent sessions
              </h2>
              {sessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No sessions yet
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {sessions.slice(0, 10).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {s.games?.name || "No game"} · {s.screens?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.started_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {s.duration_minutes
                            ? ` · ${formatDuration(s.duration_minutes)}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="capitalize">
                          {s.status}
                        </Badge>
                        {s.total_amount != null && (
                          <p className="mt-1 text-xs">
                            {formatCurrency(Number(s.total_amount))}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">
              Booking history
            </h2>
            {bookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No bookings yet
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {bookings.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {b.booking_date} · {String(b.start_time).slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.screens?.name || "Unassigned"} ·{" "}
                        {b.games?.name || "Game TBD"} · {b.players}p
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{formatCurrency(Number(b.total_amount))}</span>
                      <Badge variant="outline" className="capitalize">
                        {b.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
