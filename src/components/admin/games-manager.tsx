"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import {
  deleteGameAction,
  uploadGameImageAction,
  upsertGameAction,
} from "@/lib/actions/admin";
import { gameSchema } from "@/lib/validations";
import { GameCover } from "@/components/game-cover";
import { GAME_CATEGORIES } from "@/lib/constants";
import type { Game, GameCategory } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type GameForm = z.infer<typeof gameSchema>;

const defaults: GameForm = {
  name: "",
  description: "",
  image_url: "",
  category: "Action",
  min_players: 1,
  max_players: 4,
  multiplayer: true,
  local_multiplayer: true,
  online_multiplayer: false,
  is_active: true,
};

export function GamesManager({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<GameForm>({
    resolver: zodResolver(gameSchema),
    defaultValues: defaults,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => {
      if (activeOnly && !g.is_active) return false;
      if (category !== "all" && g.category !== category) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [games, query, category, activeOnly]);

  function openCreate() {
    setEditing(null);
    form.reset(defaults);
    setOpen(true);
  }

  function openEdit(game: Game) {
    setEditing(game);
    form.reset({
      name: game.name,
      description: game.description ?? "",
      image_url: game.image_url ?? "",
      category: game.category,
      min_players: game.min_players,
      max_players: game.max_players,
      multiplayer: game.multiplayer,
      local_multiplayer: game.local_multiplayer,
      online_multiplayer: game.online_multiplayer,
      is_active: game.is_active,
    });
    setOpen(true);
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await upsertGameAction(values, editing?.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
    });
  });

  function toggleActive(game: Game) {
    startTransition(async () => {
      const result = await upsertGameAction(
        {
          name: game.name,
          description: game.description,
          image_url: game.image_url ?? "",
          category: game.category,
          min_players: game.min_players,
          max_players: game.max_players,
          multiplayer: game.multiplayer,
          local_multiplayer: game.local_multiplayer,
          online_multiplayer: game.online_multiplayer,
          is_active: !game.is_active,
        },
        game.id
      );
      if (!result.success) toast.error(result.error);
      else toast.success(game.is_active ? "Game disabled" : "Game enabled");
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteGameAction(deleteId);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      setDeleteId(null);
    });
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadGameImageAction(fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      form.setValue("image_url", result.data?.url ?? "");
      toast.success("Image uploaded");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search games"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {GAME_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            Active only
          </label>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add game
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {games.length === 0 ? "No games yet." : "No games match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((game) => (
            <div
              key={game.id}
              className={cn(
                "rounded-xl border border-border bg-card p-4",
                !game.is_active && "opacity-60"
              )}
            >
              <div className="flex gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <GameCover
                    name={game.name}
                    imageUrl={game.image_url}
                    className="size-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate font-medium">{game.name}</p>
                      <Badge variant="outline" className="mt-1">
                        {game.category}
                      </Badge>
                    </div>
                    <Switch
                      checked={game.is_active}
                      onCheckedChange={() => toggleActive(game)}
                      disabled={pending}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {game.min_players}–{game.max_players} players
                    {game.multiplayer ? " · MP" : ""}
                    {game.local_multiplayer ? " · Local" : ""}
                    {game.online_multiplayer ? " · Online" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(game)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteId(game.id)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit game" : "Add game"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="game-name">Name</Label>
              <Input id="game-name" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="game-desc">Description</Label>
              <Textarea id="game-desc" rows={3} {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v as GameCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_players">Min players</Label>
                <Input
                  id="min_players"
                  type="number"
                  min={1}
                  max={8}
                  {...form.register("min_players")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_players">Max players</Label>
                <Input
                  id="max_players"
                  type="number"
                  min={1}
                  max={8}
                  {...form.register("max_players")}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["multiplayer", "Multiplayer"],
                  ["local_multiplayer", "Local"],
                  ["online_multiplayer", "Online"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={form.watch(key)}
                    onCheckedChange={(v) => form.setValue(key, v)}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="image_url"
                  placeholder="https://..."
                  {...form.register("image_url")}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Visible for booking</p>
              </div>
              <Switch
                checked={form.watch("is_active") ?? true}
                onCheckedChange={(v) => form.setValue("is_active", v)}
              />
            </div>
            {form.formState.errors.root && (
              <p className="text-xs text-destructive">{form.formState.errors.root.message}</p>
            )}
            {form.formState.errors.max_players && (
              <p className="text-xs text-destructive">
                {form.formState.errors.max_players.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create game"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete game?</AlertDialogTitle>
            <AlertDialogDescription>
              If the game is referenced by sessions or bookings it will be disabled instead.
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
