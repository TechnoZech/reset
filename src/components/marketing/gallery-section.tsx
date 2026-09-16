import { INSTAGRAM_HANDLE, INSTAGRAM_URL, CAFE_GALLERY } from "@/lib/constants";

export function GallerySection() {
  return (
    <section id="gallery" className="border-t border-border py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
              Inside the arena
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
              Private rooms, LED lighting, and PS5 screens ready to play.
            </p>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            {INSTAGRAM_HANDLE}
          </a>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:mt-12 sm:gap-3 md:grid-cols-3">
          {CAFE_GALLERY.map((photo, index) => (
            <figure
              key={photo.src}
              className={
                index === 0
                  ? "overflow-hidden rounded-lg border border-border bg-muted sm:rounded-xl md:col-span-2 md:row-span-2"
                  : "overflow-hidden rounded-lg border border-border bg-muted sm:rounded-xl"
              }
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className={`w-full object-cover transition-transform duration-700 hover:scale-[1.03] ${
                  index === 0
                    ? "aspect-[4/3] sm:aspect-[4/3] md:h-full md:min-h-[360px] md:aspect-auto"
                    : "aspect-square sm:aspect-[4/5]"
                }`}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
