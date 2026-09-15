import { GameCover } from "@/components/game-cover";
import type { Game } from "@/lib/types/database";

export function GamesSection({ games }: { games: Game[] }) {
  return (
    <section id="games" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Available games
          </h2>
          <p className="mt-3 text-muted-foreground">
            Filter by player count when you book — we only show titles that fit your party.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {games.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              Games will appear here once Supabase is connected and seeded.
            </p>
          )}
          {games.map((game) => (
            <article
              key={game.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <GameCover
                  name={game.name}
                  imageUrl={game.image_url}
                  className="size-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-16">
                  <p className="text-[10px] font-medium tracking-[0.16em] text-white/70 uppercase">
                    {game.category}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-white">
                    {game.name}
                  </h3>
                  <p className="mt-1 text-xs text-white/70">
                    {game.min_players === game.max_players
                      ? `${game.max_players} player${game.max_players > 1 ? "s" : ""}`
                      : `${game.min_players}–${game.max_players} players`}
                    {game.local_multiplayer ? " · Local MP" : ""}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
