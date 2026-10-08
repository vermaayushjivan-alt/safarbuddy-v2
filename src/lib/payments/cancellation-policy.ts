// ROOT PATH: src/lib/payments/cancellation-policy.ts
// GOLIVE-07b — cancellation-policy helper. SUGGESTION ONLY (owner decision D4:
// refunds are admin-initiated). Nothing here refunds anything; the admin
// screen shows the suggested amount and the admin decides.
//
// Rule (from CANCELLATION in src/lib/config/constants.ts):
//   hours before check-in (or travel date) >= FULL_REFUND_WINDOW    -> 100%
//   >= PARTIAL_REFUND_WINDOW but < FULL_REFUND_WINDOW               -> 50%
//   below PARTIAL_REFUND_WINDOW                                     -> 0%
// The hotel's own free-text cancellation_policy is shown next to this on the
// screen; it is NOT parsed.

import { CANCELLATION } from "@/lib/config/constants";
import { roundToPaise } from "@/lib/payments/refund-status";

export const PARTIAL_REFUND_PERCENT = 50;

export interface RefundSuggestion {
  percent: number; // 0 | 50 | 100
  amount: number; // rupees, rounded to paise, never above `refundable`
  hoursBeforeStart: number | null; // null when the booking has no start date
  reason: string; // short plain-language explanation for the admin
}

export function suggestRefund(input: {
  startDate: string | null; // check_in_date or travel_date (YYYY-MM-DD or ISO)
  cancelledAt: string | null; // booking.cancelled_at; falls back to `now`
  refundable: number; // paid - already refunded - refunds in progress
  now?: Date;
}): RefundSuggestion {
  const refundable = Math.max(0, input.refundable);

  if (!input.startDate) {
    return {
      percent: 100,
      amount: roundToPaise(refundable),
      hoursBeforeStart: null,
      reason: "No travel date on this booking, so the policy cannot be applied. Check manually.",
    };
  }

  const start = new Date(input.startDate);
  if (Number.isNaN(start.getTime())) {
    return {
      percent: 100,
      amount: roundToPaise(refundable),
      hoursBeforeStart: null,
      reason: "Travel date could not be read. Check manually.",
    };
  }

  const reference = input.cancelledAt
    ? new Date(input.cancelledAt)
    : input.now ?? new Date();
  const refTime = Number.isNaN(reference.getTime()) ? (input.now ?? new Date()) : reference;

  const hours = Math.floor((start.getTime() - refTime.getTime()) / 3_600_000);

  let percent = 0;
  let reason: string;
  if (hours >= CANCELLATION.FULL_REFUND_WINDOW) {
    percent = 100;
    reason = `Cancelled ${hours}h before start (full-refund window is ${CANCELLATION.FULL_REFUND_WINDOW}h or more).`;
  } else if (hours >= CANCELLATION.PARTIAL_REFUND_WINDOW) {
    percent = PARTIAL_REFUND_PERCENT;
    reason = `Cancelled ${hours}h before start (partial window ${CANCELLATION.PARTIAL_REFUND_WINDOW}h to ${CANCELLATION.FULL_REFUND_WINDOW}h).`;
  } else {
    percent = 0;
    reason =
      hours >= 0
        ? `Cancelled only ${hours}h before start (under ${CANCELLATION.PARTIAL_REFUND_WINDOW}h): no refund by policy.`
        : "Cancelled after the start date: no refund by policy.";
  }

  return {
    percent,
    amount: roundToPaise((refundable * percent) / 100),
    hoursBeforeStart: hours,
    reason,
  };
}
