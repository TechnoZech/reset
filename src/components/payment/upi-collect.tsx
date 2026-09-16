"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { buildUpiPaymentUrl, isValidUpiVpa } from "@/lib/upi";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function UpiCollect({
  amount,
  vpa,
  payeeName,
  note,
  compact = false,
  showPayButton = true,
}: {
  amount: number;
  vpa: string | null | undefined;
  payeeName?: string | null;
  note?: string | null;
  compact?: boolean;
  showPayButton?: boolean;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = isValidUpiVpa(vpa) && amount > 0;
  const upiUrl = ready
    ? buildUpiPaymentUrl({
        vpa: vpa!,
        payeeName,
        amount,
        note,
      })
    : "";

  useEffect(() => {
    if (!upiUrl) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(upiUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#111111", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [upiUrl]);

  function copyVpa() {
    if (!vpa) return;
    void navigator.clipboard.writeText(vpa.trim()).then(() => {
      setCopied(true);
      toast.success("UPI ID copied");
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!ready) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        UPI is not set up yet. Staff can collect cash, or add a UPI ID in Admin →
        Settings.
      </div>
    );
  }

  const qrSize = compact ? "size-36" : "size-56 sm:size-64";

  return (
    <div className={compact ? "space-y-2" : "space-y-5"}>
      <div className={`mx-auto w-fit rounded-2xl bg-white shadow-sm ${compact ? "p-2" : "p-3"}`}>
        {qr ? (
          <img src={qr} alt="UPI payment QR" className={qrSize} />
        ) : (
          <div className={`animate-pulse rounded-lg bg-zinc-200 ${qrSize}`} />
        )}
      </div>
      <div className="text-center">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Scan to pay
        </p>
        <p className={`mt-1 font-display font-bold tabular-nums ${compact ? "text-2xl" : "text-3xl"}`}>
          {formatCurrency(amount)}
        </p>
        {payeeName ? (
          <p className="mt-1 text-sm text-muted-foreground">{payeeName}</p>
        ) : null}
        <button
          type="button"
          onClick={copyVpa}
          className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {vpa}
        </button>
      </div>
      {showPayButton ? (
        <Button asChild size={compact ? "default" : "lg"} className="w-full">
          <a href={upiUrl}>
            <Smartphone className="size-4" />
            Pay with UPI
          </a>
        </Button>
      ) : null}
      {compact ? null : (
        <p className="text-center text-xs text-muted-foreground">
          On your phone this opens GPay, PhonePe, Paytm, or any UPI app with the
          amount filled. On desktop, scan the QR.
        </p>
      )}
    </div>
  );
}
