import type { ExtensionQuote } from "@/lib/pricing";
import { asMinutes, asPlayerCount } from "@/lib/pricing";

export const EXT_MARKER =
  /\[EXT:(pending|accepted|rejected):(\d+):(\d+(?:\.\d+)?)\]/;

export type ExtensionStatus = "pending" | "accepted" | "rejected";

export type ExtensionState = {
  status: ExtensionStatus | null;
  extraMinutes: number;
  quotedTotal: number;
  cleanNotes: string;
};

export function parseExtension(notes: string | null | undefined): ExtensionState {
  const text = notes ?? "";
  const match = text.match(EXT_MARKER);
  const cleanNotes = text.replace(EXT_MARKER, "").trim();
  if (!match) {
    return { status: null, extraMinutes: 0, quotedTotal: 0, cleanNotes };
  }
  return {
    status: match[1] as ExtensionStatus,
    extraMinutes: asMinutes(match[2]),
    quotedTotal: Number(match[3]),
    cleanNotes,
  };
}

export function writeExtension(
  notes: string | null | undefined,
  status: ExtensionStatus | null,
  extraMinutes = 0,
  quotedTotal = 0
) {
  const clean = parseExtension(notes).cleanNotes;
  if (!status) return clean || null;
  const marker = `[EXT:${status}:${asMinutes(extraMinutes)}:${quotedTotal}]`;
  return clean ? `${clean}\n${marker}` : marker;
}

export function extensionChargeQuote(params: {
  durationMinutes: number;
  players: number;
  currentAmount: number;
  extraMinutes: number;
  quotedTotal: number;
}): ExtensionQuote {
  const players = asPlayerCount(params.players);
  const currentAmount = Math.round(Number(params.currentAmount) || 0);
  const extraMinutes = asMinutes(params.extraMinutes);
  const quotedTotal = Math.round(Number(params.quotedTotal) || 0);
  return {
    extraMinutes,
    totalMinutes: asMinutes(params.durationMinutes) + extraMinutes,
    players,
    currentAmount,
    quotedTotal,
    extraCharge: Math.max(0, quotedTotal - currentAmount),
    currentPerPlayer: Math.round(currentAmount / players),
    newPerPlayer: Math.round(quotedTotal / players),
  };
}
