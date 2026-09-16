"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { confirmPaymentCollectedAction } from "@/lib/actions/sessions";
import { UpiCollect } from "@/components/payment/upi-collect";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminCollectPage({
  sessionId,
  amount,
  vpa,
  payeeName,
  note,
  customerName,
  detail,
}: {
  sessionId: string;
  amount: number;
  vpa: string | null;
  payeeName: string;
  note: string;
  customerName?: string;
  detail?: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<"upi" | "cash" | "card">("upi");
  const [pending, startTransition] = useTransition();

  function collect() {
    startTransition(async () => {
      const result = await confirmPaymentCollectedAction({
        session_id: sessionId,
        payment_method: method,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.push(`/admin/collect/${sessionId}/thanks`);
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Collect
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">Payment</h1>
        {customerName ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {customerName}
            {detail ? ` · ${detail}` : ""}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <UpiCollect amount={amount} vpa={vpa} payeeName={payeeName} note={note} />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Mark collected</p>
        <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
        <Button className="w-full" size="lg" disabled={pending} onClick={collect}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Payment collected
        </Button>
      </div>
    </div>
  );
}
