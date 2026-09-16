import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toDateString } from "@/lib/utils";
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
    const today = toDateString(new Date());

    const [bookingsRes, screensRes] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "*, customers(id, name, mobile), screens(id, name, console_type), games(id, name)"
        )
        .gte("booking_date", today)
        .order("created_at", { ascending: false }),
      supabase.from("screens").select("*").order("name"),
    ]);

    if (bookingsRes.error) throw bookingsRes.error;
    if (screensRes.error) throw screensRes.error;

    bookings = (bookingsRes.data ?? []) as unknown as BookingWithRelations[];
    screens = (screensRes.data ?? []) as Screen[];
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
