"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  cafeSettingsSchema,
  gameSchema,
  pricingRuleSchema,
  screenSchema,
} from "@/lib/validations";
import type { ActionResult } from "@/lib/actions/auth";

export async function upsertScreenAction(
  input: unknown,
  id?: string
): Promise<ActionResult> {
  await requireAdmin("screens");
  const parsed = screenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid screen" };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    display_name: parsed.data.display_name || null,
  };

  const { error } = id
    ? await supabase.from("screens").update(payload).eq("id", id)
    : await supabase.from("screens").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/screens");
  revalidatePath("/admin/dashboard");
  return { success: true, message: id ? "Screen updated" : "Screen created" };
}

export async function upsertGameAction(
  input: unknown,
  id?: string
): Promise<ActionResult> {
  await requireAdmin("games");
  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid game" };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    description: parsed.data.description || null,
    image_url: parsed.data.image_url || null,
  };

  const { error } = id
    ? await supabase.from("games").update(payload).eq("id", id)
    : await supabase.from("games").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/games");
  revalidatePath("/");
  revalidatePath("/booking");
  return { success: true, message: id ? "Game updated" : "Game created" };
}

export async function deleteGameAction(id: string): Promise<ActionResult> {
  await requireAdmin("games");
  const supabase = await createClient();
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) {
    // Soft-disable if referenced
    const { error: softError } = await supabase
      .from("games")
      .update({ is_active: false })
      .eq("id", id);
    if (softError) return { success: false, error: softError.message };
    revalidatePath("/admin/games");
    return { success: true, message: "Game disabled (in use)" };
  }
  revalidatePath("/admin/games");
  return { success: true, message: "Game deleted" };
}

export async function upsertPricingRuleAction(
  input: unknown,
  id?: string
): Promise<ActionResult> {
  await requireAdmin("pricing");
  const parsed = pricingRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid pricing" };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    start_time: parsed.data.start_time || null,
    end_time: parsed.data.end_time || null,
  };

  const { error } = id
    ? await supabase.from("pricing_rules").update(payload).eq("id", id)
    : await supabase.from("pricing_rules").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/pricing");
  revalidatePath("/");
  revalidatePath("/booking");
  return { success: true, message: id ? "Pricing updated" : "Pricing created" };
}

export async function deletePricingRuleAction(id: string): Promise<ActionResult> {
  await requireAdmin("pricing");
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/pricing");
  return { success: true, message: "Pricing rule deleted" };
}

export async function updateCafeSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin("settings");
  const parsed = cafeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("cafe_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const payload = {
    ...parsed.data,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    phone: parsed.data.phone || null,
  };

  const { error } = existing
    ? await supabase.from("cafe_settings").update(payload).eq("id", existing.id)
    : await supabase.from("cafe_settings").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: true, message: "Settings saved" };
}

export async function uploadGameImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireAdmin("games");
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("game-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) return { success: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("game-images").getPublicUrl(path);

  return { success: true, data: { url: publicUrl } };
}
