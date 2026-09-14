import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type PricingItem = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

export function PricingSection({ pricing }: { pricing: PricingItem[] }) {
  const fallback = [
    { id: "1", name: "30 Minutes", duration_minutes: 30, price: 100 },
    { id: "2", name: "60 Minutes", duration_minutes: 60, price: 180 },
    { id: "3", name: "90 Minutes", duration_minutes: 90, price: 250 },
    { id: "4", name: "120 Minutes", duration_minutes: 120, price: 320 },
  ];

  const items = pricing.length > 0 ? pricing : fallback;

  return (
    <section id="pricing" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Simple PS5 pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Transparent rates. Final totals are always calculated server-side at booking.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <p className="text-sm text-muted-foreground">{item.duration_minutes} min</p>
              <p className="mt-2 font-display text-3xl font-bold text-primary">
                {formatCurrency(Number(item.price))}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link href="/booking">Book a Session</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
