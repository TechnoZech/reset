import { PaymentThanks } from "@/components/payment/payment-thanks";

export const metadata = { title: "Thank you" };

export default function AdminCollectThanksPage() {
  return (
    <PaymentThanks homeHref="/admin/dashboard" homeLabel="Back to dashboard" />
  );
}
