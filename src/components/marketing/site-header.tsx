"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAFE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#experience", label: "Experience" },
  { href: "/#screens", label: "Screens" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#games", label: "Games" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#location", label: "Location" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
          <img
            src="/usa-gaming-logo.jpg"
            alt=""
            className="size-8 rounded-full object-cover ring-1 ring-white/10"
          />
          <span className="text-primary">{CAFE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/booking">Book a Session</Link>
          </Button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Button asChild className="mt-2">
            <Link href="/booking" onClick={() => setOpen(false)}>
              Book a Session
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
