import { CAFE_NAME } from "@/lib/constants";

export type UpiPayInput = {
  vpa: string;
  payeeName?: string | null;
  amount: number;
  note?: string | null;
};

/** UPI deep link. Keep `pa` unencoded — many apps reject %40 in the VPA. */
export function buildUpiPaymentUrl(input: UpiPayInput) {
  const vpa = input.vpa.trim();
  const amount = Math.max(1, Math.round(Number(input.amount) || 0));
  const name = (input.payeeName?.trim() || CAFE_NAME).slice(0, 50);
  const note = (input.note?.trim() || `Pay ${CAFE_NAME}`).slice(0, 50);
  return `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

export function isValidUpiVpa(vpa: string | null | undefined) {
  return Boolean(vpa && /^[\w.\-]{2,}@[\w.\-]{2,}$/i.test(vpa.trim()));
}
