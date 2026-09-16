import { GameCover } from "@/components/game-cover";
import type { Game } from "@/lib/types/database";

export function GamesSection({ games }: { games: Game[] }) {
  return (
    <section id="games" className="border-t border-border py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
            Available games
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
            Filter by player count when you book — we only show titles that fit your party.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-2 sm:mt-12 sm:gap-4 lg:grid-cols-4">
          {games.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              Games will appear here once Supabase is connected and seeded.
            </p>
          )}
          {games.map((game) => (
            <article
              key={game.id}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40 sm:rounded-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-muted sm:aspect-[4/5]">
                <GameCover
                  name={game.name}
                  imageUrl={game.image_url}
                  className="size-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5 pt-10 sm:p-4 sm:pt-16">
                  <p className="hidden text-[10px] font-medium tracking-[0.16em] text-white/70 uppercase sm:block">
                    {game.category}
                  </p>
                  <h3 className="font-display text-sm font-semibold text-white sm:mt-1 sm:text-lg">
                    {game.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-white/70 sm:text-xs">
                    {game.min_players === game.max_players
                      ? `${game.max_players}p`
                      : `${game.min_players}–${game.max_players}p`}
                    {game.local_multiplayer ? " · Local" : ""}
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
