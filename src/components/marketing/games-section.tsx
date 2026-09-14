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
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {game.category}
              </div>
              <h3 className="mt-3 font-medium">{game.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {game.min_players === game.max_players
                  ? `${game.max_players} player${game.max_players > 1 ? "s" : ""}`
                  : `${game.min_players}–${game.max_players} players`}
                {game.local_multiplayer ? " · Local MP" : ""}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
