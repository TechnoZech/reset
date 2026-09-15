import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/constants";

type Settings = {
  cafe_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_time: string;
  closing_time: string;
} | null;

export function LocationSection({ settings }: { settings: Settings }) {
  return (
    <section id="location" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Visit us
              </h2>
              <p className="mt-3 text-muted-foreground">
                Walk in anytime during open hours, or reserve your screen ahead.
              </p>
              <ul className="mt-8 space-y-4 text-sm">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {settings?.address ||
                      "42 Gaming Street, Level 2, Metro Mall, Mumbai 400001"}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{settings?.phone || "+91 78618 20446"}</span>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{settings?.email || "hello@usagaming.com"}</span>
                </li>
                <li className="flex gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                  </svg>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    {INSTAGRAM_HANDLE}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Open {(settings?.opening_time || "10:00").slice(0, 5)} –{" "}
                    {(settings?.closing_time || "23:00").slice(0, 5)} daily
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
              <p className="font-display text-2xl font-semibold">Ready to play?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Guest booking — no account required.
              </p>
              <Button asChild className="mt-6 self-center" size="lg">
                <Link href="/booking">Book a Session</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
