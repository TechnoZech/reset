import {
  Gauge,
  Headphones,
  MonitorPlay,
  Users,
  Zap,
  Trophy,
} from "lucide-react";

const features = [
  {
    icon: MonitorPlay,
    title: "120Hz PS5 Screens",
    body: "OLED displays tuned for competitive play and cinematic single-player.",
  },
  {
    icon: Gauge,
    title: "Racing Simulator",
    body: "Force-feedback wheel, pedals, and bucket seat for F1 and Gran Turismo.",
  },
  {
    icon: Users,
    title: "Local Multiplayer",
    body: "Bring your squad — up to 4 players per screen on select titles.",
  },
  {
    icon: Headphones,
    title: "Pro Audio",
    body: "Headset-ready setups so every session stays immersive and focused.",
  },
  {
    icon: Zap,
    title: "Walk-in Ready",
    body: "No membership required. Book online or start a session on arrival.",
  },
  {
    icon: Trophy,
    title: "Curated Library",
    body: "Sports, fighting, racing, and co-op staples always ready to play.",
  },
];

export function FeaturesSection() {
  return (
    <section id="experience" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Built for serious play
          </h2>
          <p className="mt-3 text-muted-foreground">
            A clean, premium floor designed around comfort, speed, and fair pricing.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/40"
            >
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-4 font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
