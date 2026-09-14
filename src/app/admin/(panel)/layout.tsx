import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { UserRole } from "@/lib/types/database";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <AdminSidebar
        role={profile.role as UserRole}
        name={profile.full_name || profile.email}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
