"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { upsertScreenAction } from "@/lib/actions/admin";
import { screenSchema } from "@/lib/validations";
import { CONSOLE_TYPES, SCREEN_STATUSES } from "@/lib/constants";
import type { Screen } from "@/lib/types/database";
import { formatCurrency, cn } from "@/lib/utils";
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

type ScreenForm = z.infer<typeof screenSchema>;

const defaults: ScreenForm = {
  name: "",
  console_type: "PS5",
  display_name: "",
  hourly_rate: 89,
  status: "available",
  is_active: true,
};

export function ScreensManager({ screens }: { screens: Screen[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Screen | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ScreenForm>({
    resolver: zodResolver(screenSchema),
    defaultValues: defaults,
  });

  const sorted = useMemo(
    () => [...screens].sort((a, b) => a.name.localeCompare(b.name)),
    [screens]
  );

  function openCreate() {
    setEditing(null);
    form.reset(defaults);
    setOpen(true);
  }

  function openEdit(screen: Screen) {
    setEditing(screen);
    form.reset({
      name: screen.name,
      console_type: screen.console_type,
      display_name: screen.display_name ?? "",
      hourly_rate: Number(screen.hourly_rate),
      status: screen.status,
      is_active: screen.is_active,
    });
    setOpen(true);
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await upsertScreenAction(values, editing?.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
    });
  });

  function toggleActive(screen: Screen) {
    startTransition(async () => {
      const result = await upsertScreenAction(
        {
          name: screen.name,
          console_type: screen.console_type,
          display_name: screen.display_name,
          hourly_rate: Number(screen.hourly_rate),
          status: screen.status,
          is_active: !screen.is_active,
        },
        screen.id
      );
      if (!result.success) toast.error(result.error);
      else toast.success(screen.is_active ? "Screen disabled" : "Screen enabled");
    });
  }

  function setStatus(screen: Screen, status: Screen["status"]) {
    startTransition(async () => {
      const result = await upsertScreenAction(
        {
          name: screen.name,
          console_type: screen.console_type,
          display_name: screen.display_name,
          hourly_rate: Number(screen.hourly_rate),
          status,
          is_active: screen.is_active,
        },
        screen.id
      );
      if (!result.success) toast.error(result.error);
      else toast.success(`Status → ${status}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sorted.length} screen{sorted.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add screen
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No screens yet. Add your first console.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Screen</TableHead>
                <TableHead>Console</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((screen) => (
                <TableRow key={screen.id} className={cn(!screen.is_active && "opacity-60")}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{screen.name}</p>
                      {screen.display_name && (
                        <p className="text-xs text-muted-foreground">{screen.display_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{screen.console_type}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(screen.hourly_rate))}/hr</TableCell>
                  <TableCell>
                    <Select
                      value={screen.status}
                      onValueChange={(v) => setStatus(screen, v as Screen["status"])}
                    >
                      <SelectTrigger className="w-[140px]" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCREEN_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={screen.is_active}
                      onCheckedChange={() => toggleActive(screen)}
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(screen)}>
                      <Pencil className="size-4" />
                      Edit
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
            <DialogTitle>{editing ? "Edit screen" : "Add screen"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="PS5-01" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                {...form.register("display_name")}
                placeholder="Optional label"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Console</Label>
                <Select
                  value={form.watch("console_type")}
                  onValueChange={(v) =>
                    form.setValue("console_type", v as ScreenForm["console_type"])
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
                <Label htmlFor="hourly_rate">Hourly rate (₹)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min={0}
                  {...form.register("hourly_rate")}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status") ?? "available"}
                  onValueChange={(v) =>
                    form.setValue("status", v as ScreenForm["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCREEN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Show in operations</p>
                </div>
                <Switch
                  checked={form.watch("is_active") ?? true}
                  onCheckedChange={(v) => form.setValue("is_active", v)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create screen"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
