'use server';

// GOLIVE-07 — admin-initiated refunds (owner decision D4: never automatic).
// Thin wrapper: role check + input validation, then lib/payments/refund.ts.
// The refund screen (GOLIVE-07b) calls requestRefundAdmin / getRefundsForPaymentAdmin.

import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requestRefund, type RequestRefundResult } from '@/lib/payments/refund';
import {
  PaymentRefundRepository,
  RefundRequestError,
  type PaymentRefundRecord,
  type RefundRequestErrorCode,
} from '@/lib/repositories/payment-refund.repository';
import { runAction, type ActionResult } from '@/lib/actions/action-result';

const refundSchema = z.object({
  payment_id: z.string().uuid(),
  amount: z.coerce.number().positive('Enter an amount greater than 0.'),
  reason: z.string().trim().min(3, 'Please give a reason.').max(300),
});

export type RequestRefundInput = z.infer<typeof refundSchema>;

const MESSAGES: Record<RefundRequestErrorCode, string> = {
  INVALID_AMOUNT: 'Enter a valid amount (at most 2 decimal places).',
  REASON_REQUIRED: 'Please give a reason.',
  PAYMENT_NOT_FOUND: 'Payment not found.',
  NOT_REFUNDABLE: 'Only a successful (or partly refunded) payment can be refunded.',
  AMOUNT_EXCEEDS_REMAINING:
    'That is more than what is left to refund on this payment (including refunds still in progress).',
};

export async function requestRefundAdmin(
  input: RequestRefundInput
): Promise<ActionResult<RequestRefundResult>> {
  return runAction(async () => {
    const current = await requireRole(['admin', 'super_admin']);
    const parsed = refundSchema.parse(input);

    try {
      // payment_refunds is service-role only; the admin check is above.
      return await requestRefund(createServiceRoleClient(), {
        paymentId: parsed.payment_id,
        amount: parsed.amount,
        reason: parsed.reason,
        requestedBy: current.id,
      });
    } catch (error) {
      if (error instanceof RefundRequestError) {
        throw new Error(MESSAGES[error.code]);
      }
      throw error;
    }
  });
}

export async function getRefundsForPaymentAdmin(
  paymentId: string
): Promise<PaymentRefundRecord[]> {
  await requireRole(['admin', 'super_admin']);
  return new PaymentRefundRepository(createServiceRoleClient()).listByPayment(
    z.string().uuid().parse(paymentId)
  );
}
