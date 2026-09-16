import { requireAdmin } from "@/lib/auth";
import { getCachedScreens } from "@/lib/data/admin-cache";
import { createClient } from "@/lib/supabase/server";
import { localDateString } from "@/lib/utils";
import { BookingsManager } from "@/components/admin/bookings-manager";
import type { BookingWithRelations, Screen } from "@/lib/types/database";

export const metadata = { title: "Bookings" };

export default async function BookingsPage() {
  await requireAdmin("bookings");

  let bookings: BookingWithRelations[] = [];
  let screens: Screen[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    const today = localDateString(new Date());

    const [bookingsRes, cachedScreens] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "*, customers(id, name, mobile), screens(id, name, console_type), games(id, name), sessions(id, status)"
        )
        .gte("booking_date", today)
        .order("created_at", { ascending: false }),
      getCachedScreens(),
    ]);

    if (bookingsRes.error) throw bookingsRes.error;

    bookings = (bookingsRes.data ?? []) as unknown as BookingWithRelations[];
    screens = cachedScreens;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load bookings";
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Schedule
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today and upcoming reservations
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load bookings. {loadError}
        </div>
      )}

      <BookingsManager bookings={bookings} screens={screens} />
    </div>
  );
}
