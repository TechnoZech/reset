import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

export function revalidateAdminOps() {
  updateTag(CACHE_TAGS.ops);
  updateTag(CACHE_TAGS.charts);
  updateTag(CACHE_TAGS.customers);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/screens");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/earnings");
  revalidatePath("/admin/customers");
}
