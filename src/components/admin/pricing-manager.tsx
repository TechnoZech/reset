"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  deletePricingRuleAction,
  upsertPricingRuleAction,
} from "@/lib/actions/admin";
import { pricingRuleSchema } from "@/lib/validations";
import { CONSOLE_TYPES, DAY_TYPES, DURATION_OPTIONS } from "@/lib/constants";
import type { PricingRule } from "@/lib/types/database";
import { formatCurrency, formatDuration, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PricingForm = z.infer<typeof pricingRuleSchema>;

const defaults: PricingForm = {
  name: "",
  console_type: "PS5",
  duration_minutes: 60,
  price: 89,
  start_time: "",
  end_time: "",
  day_type: "all",
  is_active: true,
};

export function PricingManager({ rules }: { rules: PricingRule[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<PricingForm>({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: defaults,
  });

  const sorted = useMemo(
    () =>
      [...rules].sort((a, b) => {
        const byConsole = a.console_type.localeCompare(b.console_type);
        return byConsole !== 0
          ? byConsole
          : a.duration_minutes - b.duration_minutes;
      }),
    [rules]
  );

  function openCreate() {
    setEditing(null);
    form.reset(defaults);
    setOpen(true);
  }

  function openEdit(rule: PricingRule) {
    setEditing(rule);
    form.reset({
      name: rule.name,
      console_type: rule.console_type,
      duration_minutes: rule.duration_minutes,
      price: Number(rule.price),
      start_time: rule.start_time?.slice(0, 5) ?? "",
      end_time: rule.end_time?.slice(0, 5) ?? "",
      day_type: rule.day_type,
      is_active: rule.is_active,
    });
    setOpen(true);
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await upsertPricingRuleAction(
        {
          ...values,
          start_time: values.start_time || null,
          end_time: values.end_time || null,
        },
        editing?.id
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
    });
  });

  function toggleActive(rule: PricingRule) {
    startTransition(async () => {
      const result = await upsertPricingRuleAction(
        {
          name: rule.name,
          console_type: rule.console_type,
          duration_minutes: rule.duration_minutes,
          price: Number(rule.price),
          start_time: rule.start_time,
          end_time: rule.end_time,
          day_type: rule.day_type,
          is_active: !rule.is_active,
        },
        rule.id
      );
      if (!result.success) toast.error(result.error);
      else toast.success(rule.is_active ? "Rule disabled" : "Rule enabled");
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deletePricingRuleAction(deleteId);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      setDeleteId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sorted.length} pricing rule{sorted.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add rule
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No pricing rules yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Console</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Peak window</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((rule) => (
                <TableRow key={rule.id} className={cn(!rule.is_active && "opacity-60")}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.console_type}</Badge>
                  </TableCell>
                  <TableCell>{formatDuration(rule.duration_minutes)}</TableCell>
                  <TableCell>{formatCurrency(Number(rule.price))}</TableCell>
                  <TableCell className="capitalize">{rule.day_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.start_time && rule.end_time
                      ? `${String(rule.start_time).slice(0, 5)} – ${String(rule.end_time).slice(0, 5)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleActive(rule)}
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteId(rule.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit pricing rule" : "Add pricing rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input id="rule-name" {...form.register("name")} placeholder="Weekend 1hr" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Console</Label>
                <Select
                  value={form.watch("console_type")}
                  onValueChange={(v) =>
                    form.setValue("console_type", v as PricingForm["console_type"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSOLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Day type</Label>
                <Select
                  value={form.watch("day_type")}
                  onValueChange={(v) =>
                    form.setValue("day_type", v as PricingForm["day_type"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_TYPES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(form.watch("duration_minutes"))}
                  onValueChange={(v) => form.setValue("duration_minutes", Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} minutes
                      </SelectItem>
                    ))}
                    <SelectItem value="180">180 minutes</SelectItem>
                    <SelectItem value="240">240 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input id="price" type="number" min={0} {...form.register("price")} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_time">Peak start (optional)</Label>
                <Input id="start_time" type="time" {...form.register("start_time")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Peak end (optional)</Label>
                <Input id="end_time" type="time" {...form.register("end_time")} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Used in price calculation</p>
              </div>
              <Switch
                checked={form.watch("is_active") ?? true}
                onCheckedChange={(v) => form.setValue("is_active", v)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pricing rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the rule from pricing calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={pending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
