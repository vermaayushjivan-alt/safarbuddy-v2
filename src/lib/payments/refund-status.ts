// ROOT PATH: src/lib/payments/refund-status.ts
// GOLIVE-07 — pure helpers for refunds (no I/O, no imports), so they can be
// unit-tested (verify/golive07.test.ts) and imported from anywhere.

// Our own refund row states (payment_refunds.status, see migration 033).
export type RefundStatus = "pending" | "success" | "failed" | "cancelled";

// Cashfree refund_status -> our status. ONLY clearly final values are mapped;
// anything in-flight, unknown, empty or new is "pending" so we never close a
// refund (and never release the reserved amount) on a guess.
export function mapCashfreeRefundStatus(
  raw: string | null | undefined
): RefundStatus {
  switch ((raw ?? "").trim().toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "CANCELLED":
    case "FAILED":
      return "cancelled";
    default:
      return "pending";
  }
}

// Snaps float noise (0.1 + 0.2) to whole paise.
export function roundToPaise(value: number): number {
  return Math.round(value * 100) / 100;
}

// Positive, finite, and at most 2 decimal places (after snapping float noise).
export function isValidRefundAmount(value: number): boolean {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return false;
  }
  const paise = value * 100;
  return Math.abs(paise - Math.round(paise)) < 1e-6 && Math.round(paise) >= 1;
}

// Our refund id, sent to Cashfree as the idempotency key: "rf_" + the
// alphanumerics of a UUID, capped at 35 characters total.
export function buildRefundId(uuid: string): string {
  return `rf_${uuid.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 35);
}
