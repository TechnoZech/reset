"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAFE_NAME } from "@/lib/constants";

const initial: ActionResult = { success: false, error: "" };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin/dashboard";
  const [state, formAction, pending] = useActionState(loginAction, initial);

  useEffect(() => {
    if (state.success) {
      router.push(redirect);
      router.refresh();
    }
  }, [state, router, redirect]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
      <div className="mb-8 text-center">
        <p className="font-display text-2xl font-bold text-primary">{CAFE_NAME}</p>
        <p className="mt-1 text-sm text-muted-foreground">Staff sign in</p>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="owner@reset.cafe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        {!state.success && state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}
