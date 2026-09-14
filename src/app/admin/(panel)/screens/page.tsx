import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ScreensManager } from "@/components/admin/screens-manager";
import type { Screen } from "@/lib/types/database";

export const metadata = { title: "Screens" };

export default async function ScreensPage() {
  await requireAdmin("screens");

  let screens: Screen[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("screens")
      .select("*")
      .order("name");
    if (error) throw error;
    screens = (data ?? []) as Screen[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load screens";
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Screens</h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load screens. {loadError}
        </div>
      )}

      <ScreensManager screens={screens} />
    </div>
  );
}
