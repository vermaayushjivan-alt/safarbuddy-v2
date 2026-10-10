import type { RefundNote } from '@/lib/payments/refund-summary';

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// GOLIVE-13b — one short line telling the customer where their refund stands.
export default function RefundStatusNote({ note }: { note: RefundNote | undefined }) {
  if (!note) return null;

  let text: string;
  let tone = 'text-ink/60';

  switch (note.kind) {
    case 'review':
      text =
        'Refund under review. Our team will confirm your refund amount and send it to your original payment method.';
      tone = 'text-orange';
      break;
    case 'processing':
      text = `Refund of ${rupees(note.pending)} is being processed. It usually reaches your original payment method within 7 days.`;
      tone = 'text-orange';
      break;
    case 'partial':
      text = `${rupees(note.refunded)} of ${rupees(note.paid)} has been refunded to your original payment method.`;
      tone = 'text-green-700';
      break;
    case 'refunded':
      text = `${rupees(note.refunded)} refunded to your original payment method.`;
      tone = 'text-green-700';
      break;
    default:
      text =
        'No refund has been issued for this booking. If you think this is wrong, use "Refund help".';
  }

  return <p className={`mt-1 max-w-[260px] text-[11px] leading-snug ${tone}`}>{text}</p>;
}
