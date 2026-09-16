"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicBookingLive } from "@/lib/actions/bookings";
import { CAFE_NAME } from "@/lib/constants";
import { UpiCollect } from "@/components/payment/upi-collect";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function GuestPayPage({
  bookingId,
  vpa,
  payeeName,
}: {
  bookingId: string;
  vpa: string | null;
  payeeName: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const live = await getPublicBookingLive(bookingId);
      if (cancelled) return;
      if (!live) {
        setMissing(true);
        return;
      }
      const due = Math.round(
        Number(
          live.session?.total_amount ??
            live.session?.rate ??
            live.booking.total_amount ??
            0
        )
      );
      setAmount(due);
      setStatus(live.session?.status ?? live.booking.status);
      if (live.payment?.payment_status === "paid") {
        setPaid(true);
        router.replace(`/booking/${bookingId}/thanks`);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [bookingId, router]);

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Booking not found</h1>
        <Button asChild className="mt-8">
          <Link href="/booking">Book a session</Link>
        </Button>
      </div>
    );
  }

  if (amount == null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted-foreground">
        Loading payment…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
        Pay {CAFE_NAME}
      </p>
      <h1 className="mt-2 text-center font-display text-3xl font-bold">
        Collect payment
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {status === "completed"
          ? "Scan the QR or open your UPI app. Staff will confirm once the payment lands."
          : "This amount is due when staff end your session."}
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <UpiCollect
          amount={amount}
          vpa={vpa}
          payeeName={payeeName}
          note={`USA GAMING ${bookingId.slice(0, 8)}`}
        />
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {!paid ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => router.push(`/booking/${bookingId}/thanks`)}
          >
            Payment done
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={`/booking/${bookingId}`}>Back to timer</Link>
        </Button>
      </div>
      {paid ? (
        <p className="mt-3 text-center text-sm text-emerald-400">Payment received…</p>
      ) : null}
    </div>
  );
}
