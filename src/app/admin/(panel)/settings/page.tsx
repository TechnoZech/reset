import { requireAdmin } from "@/lib/auth";
import { getCachedSettings } from "@/lib/data/admin-cache";
import { SettingsForm } from "@/components/admin/settings-form";
import type { CafeSettings } from "@/lib/types/database";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin("settings");

  let settings: CafeSettings | null = null;
  let loadError: string | null = null;

  try {
    settings = await getCachedSettings();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load settings";
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Cafe
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Settings
        </h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load settings. Form still works once connected.{" "}
          {loadError}
        </div>
      )}

      <SettingsForm settings={settings} />
    </div>
  );
}
