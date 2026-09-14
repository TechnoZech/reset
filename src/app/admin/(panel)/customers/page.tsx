import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CustomersList,
  type CustomerRow,
} from "@/components/admin/customers-list";
import type { Booking, Customer, Session } from "@/lib/types/database";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  await requireAdmin("customers");

  let customers: CustomerRow[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    const [customersRes, bookingsRes, sessionsRes] = await Promise.all([
      supabase.from("customers").select("id, name, mobile").order("name"),
      supabase.from("bookings").select("customer_id, booking_date, status"),
      supabase
        .from("sessions")
        .select("customer_id, started_at, ended_at, total_amount, status"),
    ]);

    if (customersRes.error) throw customersRes.error;

    const customerRows = (customersRes.data ?? []) as Pick<
      Customer,
      "id" | "name" | "mobile"
    >[];
    const bookingRows = (bookingsRes.data ?? []) as Pick<
      Booking,
      "customer_id" | "booking_date" | "status"
    >[];
    const sessionRows = (sessionsRes.data ?? []) as Pick<
      Session,
      "customer_id" | "started_at" | "ended_at" | "total_amount" | "status"
    >[];

    const bookingByCustomer = new Map<
      string,
      { count: number; last: string | null }
    >();
    for (const b of bookingRows) {
      if (b.status === "cancelled") continue;
      const prev = bookingByCustomer.get(b.customer_id) ?? {
        count: 0,
        last: null,
      };
      prev.count += 1;
      if (!prev.last || b.booking_date > prev.last) prev.last = b.booking_date;
      bookingByCustomer.set(b.customer_id, prev);
    }

    const sessionByCustomer = new Map<
      string,
      { count: number; spent: number; last: string | null }
    >();
    for (const s of sessionRows) {
      const prev = sessionByCustomer.get(s.customer_id) ?? {
        count: 0,
        spent: 0,
        last: null,
      };
      prev.count += 1;
      if (s.total_amount) prev.spent += Number(s.total_amount);
      const visit = s.ended_at || s.started_at;
      if (!prev.last || visit > prev.last) prev.last = visit;
      sessionByCustomer.set(s.customer_id, prev);
    }

    customers = customerRows
      .filter((c) => c.mobile !== "0000000000")
      .map((c) => {
        const b = bookingByCustomer.get(c.id);
        const s = sessionByCustomer.get(c.id);
        const lastCandidates = [b?.last, s?.last].filter(Boolean) as string[];
        lastCandidates.sort();
        return {
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          bookingsCount: b?.count ?? 0,
          sessionsCount: s?.count ?? 0,
          totalSpent: Math.round(s?.spent ?? 0),
          lastVisit: lastCandidates.at(-1) ?? null,
        };
      })
      .sort(
        (a, b) => b.totalSpent - a.totalSpent || a.name.localeCompare(b.name)
      );
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load customers";
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          CRM
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Customers
        </h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load customers. {loadError}
        </div>
      )}

      <CustomersList customers={customers} />
    </div>
  );
}
