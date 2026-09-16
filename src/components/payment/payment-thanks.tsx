import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CAFE_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PaymentThanks({
  homeHref = "/",
  homeLabel = "Back home",
}: {
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <CheckCircle2 className="size-16 text-primary" />
      <h1 className="mt-6 font-display text-3xl font-bold">Thank you</h1>
      <p className="mt-3 text-muted-foreground">
        Payment received. Hope you had a great session at {CAFE_NAME}. Follow us
        on Instagram for offers, tournament nights, and new games.
      </p>
      <Button asChild size="lg" className="mt-8">
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
          <InstagramIcon className="size-4" />
          Follow {INSTAGRAM_HANDLE}
        </a>
      </Button>
      <div className="mt-4 flex gap-3">
        <Button asChild variant="outline">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/booking">Book another</Link>
        </Button>
      </div>
    </div>
  );
}
