const screens = [
  { name: "SCREEN 01–04", detail: "PS5 · 120Hz OLED · DualSense" },
  { name: "SCREEN 05", detail: "PS5 Racing Rig · Wheel + Pedals" },
];

export function ScreensSection() {
  return (
    <section id="screens" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            PS5 screens & racing sim
          </h2>
          <p className="mt-3 text-muted-foreground">
            Five dedicated stations. Private enough to focus, close enough for
            co-op nights with friends.
          </p>
          <ul className="mt-8 space-y-4">
            {screens.map((s) => (
              <li
                key={s.name}
                className="flex items-start justify-between gap-4 border-b border-border pb-4"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1a0a0c] via-[#0f0f12] to-[#070708]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-6xl font-bold text-primary/90">PS5</p>
              <p className="mt-2 text-sm tracking-widest text-muted-foreground uppercase">
                120Hz · HDR · DualSense
              </p>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      </div>
    </section>
  );
}
