import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PUBLIC_PRICING } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type PricingItem = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

export function PricingSection({ pricing }: { pricing: PricingItem[] }) {
  const items = PUBLIC_PRICING.map((tier) => {
    const match = pricing.find((p) => p.duration_minutes === tier.duration_minutes);
    return {
      id: match?.id ?? String(tier.duration_minutes),
      name: tier.label,
      duration_minutes: tier.duration_minutes,
      price: tier.price,
    };
  });

  return (
    <section id="pricing" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Simple PS5 pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Rates are per player. Two players = 2× the listed price.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <p className="text-sm text-muted-foreground">{item.name}</p>
              <p className="mt-2 font-display text-3xl font-bold text-primary">
                {formatCurrency(Number(item.price))}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">per player</p>
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
