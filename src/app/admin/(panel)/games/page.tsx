import { requireAdmin } from "@/lib/auth";
import { getCachedGames } from "@/lib/data/admin-cache";
import { GamesManager } from "@/components/admin/games-manager";
import type { Game } from "@/lib/types/database";

export const metadata = { title: "Games" };

export default async function GamesPage() {
  await requireAdmin("games");

  let games: Game[] = [];
  let loadError: string | null = null;

  try {
    games = await getCachedGames();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load games";
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Catalog
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Games</h1>
      </div>

      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Connect Supabase to load games. {loadError}
        </div>
      )}

      <GamesManager games={games} />
    </div>
  );
}
