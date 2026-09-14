import Link from "next/link";
import { CAFE_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[#050506]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-lg font-semibold text-primary">{CAFE_NAME}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Premium PlayStation gaming cafe.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/booking" className="hover:text-foreground">
            Book
          </Link>
          <Link href="/#pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/admin/login" className="hover:text-foreground">
            Staff login
          </Link>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {CAFE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
