// ROOT PATH: src/lib/payments/refund-summary.ts
// GOLIVE-13b — pure helper (no I/O, no imports) that turns money facts about a
// booking into the single refund message a CUSTOMER sees. Unit-tested in
// verify/refund-summary.test.ts.

export type RefundNoteKind =
  | "review" // cancelled + paid, team has not decided/started a refund yet
  | "processing" // a refund has been started and is not finished
  | "partial" // part of the payment has been refunded
  | "refunded" // the whole payment has been refunded
  | "none"; // cancelled + paid but nothing refunded and nothing pending

export interface RefundNote {
  kind: RefundNoteKind;
  paid: number;
  refunded: number;
  pending: number;
}

const EPSILON = 0.005;

/** Returns null when there is nothing to tell the customer. */
export function summarizeRefund(input: {
  paid: number; // total successfully paid (rupees)
  refunded: number; // total already refunded
  pending: number; // refunds started but not finished
  refundDue: boolean; // bookings.refund_due
  cancelled: boolean; // booking status is cancelled
}): RefundNote | null {
  const paid = Math.max(0, input.paid);
  const refunded = Math.max(0, input.refunded);
  const pending = Math.max(0, input.pending);

  if (paid <= EPSILON) return null;

  const base = { paid, refunded, pending };

  if (pending > EPSILON) return { kind: "processing", ...base };

  if (refunded > EPSILON) {
    return { kind: refunded >= paid - EPSILON ? "refunded" : "partial", ...base };
  }

  if (!input.cancelled) return null;

  return { kind: input.refundDue ? "review" : "none", ...base };
}
