import { BookingTimerEntry } from "@/components/booking/booking-timer";

export const metadata = {
  title: "Your Session",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <BookingTimerEntry bookingId={id} />;
}
