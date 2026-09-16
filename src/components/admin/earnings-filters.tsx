"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EARNINGS_PRESETS } from "@/lib/earnings-range";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function exportHref(preset: string, from?: string, to?: string) {
  const params = new URLSearchParams({ preset });
  if (preset === "custom" && from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  return `/admin/earnings/export?${params.toString()}`;
}

export function EarningsFilters({
  preset,
  from,
  to,
}: {
  preset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(nextPreset: string, nextFrom?: string, nextTo?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", nextPreset);
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    startTransition(() => {
      router.push(`/admin/earnings?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {EARNINGS_PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              disabled={pending}
              className={cn(preset === p.key && "pointer-events-none")}
              onClick={() => go(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Download className="size-4" />
              Export Excel
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Time frame</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => window.location.assign(exportHref(preset, from, to))}
            >
              This view
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {EARNINGS_PRESETS.filter((p) => p.key !== "custom").map((p) => (
              <DropdownMenuItem
                key={p.key}
                onSelect={() => window.location.assign(exportHref(p.key))}
              >
                {p.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              disabled={!customFrom || !customTo}
              onSelect={() =>
                window.location.assign(exportHref("custom", customFrom, customTo))
              }
            >
              Custom dates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <Button
            disabled={pending || !customFrom || !customTo}
            onClick={() => go("custom", customFrom, customTo)}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
