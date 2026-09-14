"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Gamepad2,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Monitor,
  Settings,
  TrendingUp,
  Users,
  Menu,
} from "lucide-react";
import { ADMIN_NAV, CAFE_NAME } from "@/lib/constants";
import { canAccess } from "@/lib/auth-client";
import type { UserRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/lib/actions/auth";
import { useState } from "react";

const ICONS = {
  LayoutDashboard,
  Calendar,
  Monitor,
  Gamepad2,
  IndianRupee,
  Users,
  TrendingUp,
  Settings,
} as const;

function NavLinks({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {ADMIN_NAV.filter((item) => canAccess(role, item.permission)).map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS];
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({
  role,
  name,
}: {
  role: UserRole;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await logoutAction();
    router.push("/admin/login");
    router.refresh();
  };

  const brand = (
    <div className="px-6 py-5">
      <Link href="/admin/dashboard" className="font-display text-lg font-bold tracking-tight">
        <span className="text-primary">{CAFE_NAME}</span>
        <span className="ml-2 text-xs font-normal text-muted-foreground">Admin</span>
      </Link>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-border p-4">
      <p className="truncate px-2 text-sm font-medium">{name}</p>
      <p className="truncate px-2 text-xs capitalize text-muted-foreground">{role}</p>
      <Button
        variant="ghost"
        className="mt-2 w-full justify-start gap-2 text-muted-foreground"
        onClick={logout}
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        {brand}
        <NavLinks role={role} />
        {footer}
      </aside>

      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-64 flex-col p-0">
            {brand}
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
            {footer}
          </SheetContent>
        </Sheet>
        <span className="font-display font-semibold text-primary">{CAFE_NAME}</span>
      </div>
    </>
  );
}
