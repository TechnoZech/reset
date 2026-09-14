import type { UserRole } from "@/lib/types/database";
import { ROLE_PERMISSIONS } from "@/lib/constants";

/** Client-safe permission check (mirrors server ROLE_PERMISSIONS). */
export function canAccess(role: UserRole, permission: string) {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
