import { durationLabel } from "@/lib/constants";
import type { ExtensionQuote } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export function ChargeBreakdown({
  quote,
  currentMinutes,
  className,
}: {
  quote: ExtensionQuote;
  currentMinutes: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="space-y-2 text-left text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">Current</dt>
          <dd className="text-right">
            {durationLabel(currentMinutes)}
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {quote.players} player{quote.players === 1 ? "" : "s"} ×{" "}
              {formatCurrency(quote.currentPerPlayer)} ={" "}
              {formatCurrency(quote.currentAmount)}
            </span>
          </dd>
        </div>
        {quote.extraMinutes > 0 ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Extra time</dt>
              <dd className="text-right">
                + {durationLabel(quote.extraMinutes)}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Added once for the screen, not per player
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">New package</dt>
              <dd className="text-right">
                {durationLabel(quote.totalMinutes)}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {quote.players} player{quote.players === 1 ? "" : "s"} ×{" "}
                  {formatCurrency(quote.newPerPlayer)} ={" "}
                  {formatCurrency(quote.quotedTotal)}
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Added to bill</dt>
              <dd className="text-right">{formatCurrency(quote.extraCharge)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-border pt-2 font-medium">
              <dt>Pay at the end</dt>
              <dd>{formatCurrency(quote.quotedTotal)}</dd>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-3 border-t border-border pt-2 font-medium">
            <dt>Pay at the end</dt>
            <dd>{formatCurrency(quote.currentAmount)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
