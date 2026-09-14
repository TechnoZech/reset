import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Booking Confirmed",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <CheckCircle2 className="size-14 text-primary" />
      <h1 className="mt-6 font-display text-3xl font-bold">Booking received</h1>
      <p className="mt-3 text-muted-foreground">
        We&apos;ve got your request. Our team will confirm your screen shortly.
        {id ? (
          <>
            {" "}
            Reference: <span className="font-mono text-foreground">{id.slice(0, 8)}</span>
          </>
        ) : null}
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/booking">Book another</Link>
        </Button>
      </div>
    </div>
  );
}
