import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createCacheClient } from "@/lib/supabase/cache-client";
import type { CafeSettings, Customer, Game, PricingRule, Screen } from "@/lib/types/database";

export const getCachedGames = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data, error } = await supabase.from("games").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Game[];
  },
  ["admin-games-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.games] }
);

export const getCachedActiveGames = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return (data ?? []) as Game[];
  },
  ["admin-active-games-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.games] }
);

export const getCachedScreens = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data, error } = await supabase.from("screens").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Screen[];
  },
  ["admin-screens-v1"],
  { revalidate: 30, tags: [CACHE_TAGS.screens, CACHE_TAGS.ops] }
);

export const getCachedPricing = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from("pricing_rules")
      .select("*")
      .order("console_type")
      .order("duration_minutes");
    if (error) throw error;
    return (data ?? []) as PricingRule[];
  },
  ["admin-pricing-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.pricing] }
);

export const getCachedSettings = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data, error } = await supabase.from("cafe_settings").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return (data as CafeSettings | null) ?? null;
  },
  ["admin-settings-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.settings] }
);

export const getCachedWalkinCustomers = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name")
      .limit(200);
    if (error) throw error;
    return (data ?? []) as Customer[];
  },
  ["admin-walkin-customers-v1"],
  { revalidate: 30, tags: [CACHE_TAGS.customers] }
);
