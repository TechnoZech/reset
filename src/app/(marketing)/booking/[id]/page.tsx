import { notFound } from "next/navigation";
import { BookingTimer } from "@/components/booking/booking-timer";

export const metadata = {
  title: "Your Session",
};

export default async function BookingLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <BookingTimer bookingId={id} />;
}
