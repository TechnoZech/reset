import { resolveGameCover } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function GameCover({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const src = resolveGameCover(name, imageUrl);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground",
          className
        )}
      >
        {name}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={cn("object-cover", className)}
    />
  );
}
