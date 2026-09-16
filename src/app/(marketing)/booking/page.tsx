import { BookingForm } from "@/components/booking/booking-form";
import { getPublicGames, getPublicPricing } from "@/lib/actions/bookings";
import type { Game } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Session",
};

async function loadGames() {
  try {
    return (await getPublicGames()) as Game[];
  } catch {
    return [];
  }
}

async function loadPricing() {
  try {
    return await getPublicPricing("PS5");
  } catch {
    return [];
  }
}

export default async function BookingPage() {
  const [games, pricing] = await Promise.all([loadGames(), loadPricing()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
      <div className="mb-6 max-w-2xl sm:mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Book a session
        </h1>
        <p className="mt-3 text-muted-foreground">
          Guest checkout — no account needed. Pick your party size and we&apos;ll
          show matching games.
        </p>
      </div>
      <BookingForm games={games} pricing={pricing} />
    </div>
  );
}
