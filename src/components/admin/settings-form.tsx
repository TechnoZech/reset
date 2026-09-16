"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { updateCafeSettingsAction } from "@/lib/actions/admin";
import { cafeSettingsSchema } from "@/lib/validations";
import type { CafeSettings } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingsForm = z.infer<typeof cafeSettingsSchema>;

export function SettingsForm({ settings }: { settings: CafeSettings | null }) {
  const [pending, startTransition] = useTransition();

  const form = useForm<SettingsForm>({
    resolver: zodResolver(cafeSettingsSchema),
    defaultValues: {
      cafe_name: settings?.cafe_name ?? "USA GAMING",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      email: settings?.email ?? "",
      opening_time: settings?.opening_time?.slice(0, 5) ?? "10:00",
      closing_time: settings?.closing_time?.slice(0, 5) ?? "23:00",
      timezone: settings?.timezone ?? "Asia/Kolkata",
      currency: settings?.currency ?? "INR",
      upi_vpa: settings?.upi_vpa ?? "",
      upi_payee_name: settings?.upi_payee_name ?? settings?.cafe_name ?? "USA GAMING",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateCafeSettingsAction(values);
      if (!result.success) {
        toast.error(result.error, { duration: 12000 });
        return;
      }
      toast.success(result.message);
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="cafe_name">Cafe name</Label>
        <Input id="cafe_name" {...form.register("cafe_name")} />
        {form.formState.errors.cafe_name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.cafe_name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" rows={3} {...form.register("address")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="opening_time">Opening time</Label>
          <Input id="opening_time" type="time" {...form.register("opening_time")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closing_time">Closing time</Label>
          <Input id="closing_time" type="time" {...form.register("closing_time")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" {...form.register("timezone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" {...form.register("currency")} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium">UPI collect</p>
          <p className="text-xs text-muted-foreground">
            Customers scan this QR or tap Pay with UPI. Amount is filled
            automatically when a session ends. If save fails with a missing-column
            error, run this in the Supabase SQL editor first:
          </p>
          <pre className="overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {`alter table public.cafe_settings
  add column if not exists upi_vpa text,
  add column if not exists upi_payee_name text;`}
          </pre>
        </div>
        <div className="space-y-2">
          <Label htmlFor="upi_vpa">UPI ID</Label>
          <Input
            id="upi_vpa"
            placeholder="upi_id@bank_name"
            {...form.register("upi_vpa")}
          />
          {form.formState.errors.upi_vpa && (
            <p className="text-xs text-destructive">
              {form.formState.errors.upi_vpa.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="upi_payee_name">Payee name</Label>
          <Input
            id="upi_payee_name"
            placeholder="USA GAMING"
            {...form.register("upi_payee_name")}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
