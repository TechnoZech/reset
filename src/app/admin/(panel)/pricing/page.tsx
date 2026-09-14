import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PricingManager } from "@/components/admin/pricing-manager";
import type { PricingRule } from "@/lib/types/database";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  await requireAdmin("pricing");

  let rules: PricingRule[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pricing_rules")
      .select("*")
      .order("console_type")
      .order("duration_minutes");
    if (error) throw error;
    rules = (data ?? []) as PricingRule[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load pricing";
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Rates
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Pricing</h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load pricing. {loadError}
        </div>
      )}

      <PricingManager rules={rules} />
    </div>
  );
}
