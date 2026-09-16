import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types/database";

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
});

export async function requireAdmin(permission?: string) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/admin/login");
  }

  if (permission) {
    const allowed = ROLE_PERMISSIONS[profile.role as UserRole] ?? [];
    if (!allowed.includes(permission)) {
      redirect("/admin/dashboard");
    }
  }

  return profile;
}

export function canAccess(role: UserRole, permission: string) {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
