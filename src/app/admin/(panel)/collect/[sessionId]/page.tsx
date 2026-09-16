import { notFound, redirect } from "next/navigation";
import { getAdminCollectSession } from "@/lib/actions/sessions";
import { getCafeSettingsPublic } from "@/lib/actions/bookings";
import { AdminCollectPage } from "@/components/payment/admin-collect-page";
import { CAFE_NAME } from "@/lib/constants";

export const metadata = { title: "Collect payment" };
export const dynamic = "force-dynamic";

function relationName(rel: unknown) {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return (rel[0] as { name?: string } | undefined)?.name;
  return (rel as { name?: string }).name;
}

export default async function AdminCollectPaymentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const data = await getAdminCollectSession(sessionId);
  if (!data) notFound();

  if (data.payment?.payment_status === "paid") {
    redirect(`/admin/collect/${sessionId}/thanks`);
  }

  const settings = await getCafeSettingsPublic();
  const amount = Math.round(
    Number(data.payment?.amount ?? data.session.total_amount ?? data.session.rate ?? 0)
  );
  const customer = relationName(data.session.customers);
  const screen = relationName(data.session.screens);
  const game = relationName(data.session.games);

  return (
    <AdminCollectPage
      sessionId={sessionId}
      amount={amount}
      vpa={settings && "upi_vpa" in settings ? settings.upi_vpa : null}
      payeeName={
        (settings && "upi_payee_name" in settings && settings.upi_payee_name) ||
        settings?.cafe_name ||
        CAFE_NAME
      }
      note={`USA GAMING ${sessionId.slice(0, 8)}`}
      customerName={customer}
      detail={[screen, game].filter(Boolean).join(" · ")}
    />
  );
}
