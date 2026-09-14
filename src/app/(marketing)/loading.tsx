import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-20">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-6 w-96 max-w-full" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
