import { GuestPayPage } from "@/components/payment/guest-pay-page";
import { getCafeSettingsPublic } from "@/lib/actions/bookings";
import { CAFE_NAME } from "@/lib/constants";

export const metadata = { title: "Pay" };
export const dynamic = "force-dynamic";

export default async function BookingPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getCafeSettingsPublic();
  return (
    <GuestPayPage
      bookingId={id}
      vpa={settings && "upi_vpa" in settings ? settings.upi_vpa : null}
      payeeName={
        (settings && "upi_payee_name" in settings && settings.upi_payee_name) ||
        settings?.cafe_name ||
        CAFE_NAME
      }
    />
  );
}
