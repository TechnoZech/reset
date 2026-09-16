import { unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import {
  CustomersList,
  type CustomerRow,
} from "@/components/admin/customers-list";

export const metadata = { title: "Customers" };

const getCachedCustomerRows = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const [customersRes, sessionsRes] = await Promise.all([
      supabase.from("customers").select("id, name, mobile").order("name"),
      supabase
        .from("sessions")
        .select("customer_id, started_at, ended_at, total_amount, status"),
    ]);

    if (customersRes.error) throw customersRes.error;

    const sessionByCustomer = new Map<
      string,
      { count: number; spent: number; last: string | null }
    >();
    for (const s of sessionsRes.data ?? []) {
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

    return ((customersRes.data ?? []) as { id: string; name: string; mobile: string }[])
      .filter((c) => c.mobile !== "0000000000")
      .map((c) => {
        const s = sessionByCustomer.get(c.id);
        return {
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          bookingsCount: s?.count ?? 0,
          sessionsCount: s?.count ?? 0,
          totalSpent: Math.round(s?.spent ?? 0),
          lastVisit: s?.last ?? null,
        } satisfies CustomerRow;
      })
      .sort((a, b) => b.totalSpent - a.totalSpent || a.name.localeCompare(b.name));
  },
  ["admin-customer-rows-v1"],
  { revalidate: 20, tags: [CACHE_TAGS.customers] }
);

export default async function CustomersPage() {
  await requireAdmin("customers");

  let customers: CustomerRow[] = [];
  let loadError: string | null = null;

  try {
    customers = await getCachedCustomerRows();
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
