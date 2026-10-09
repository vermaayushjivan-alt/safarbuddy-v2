'use client';

// ROOT PATH: src/components/support/TicketStatusControls.tsx
// SUPPORT-01 — admin-only: change a ticket's status and priority.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTicketAdmin } from '@/app/actions/support.actions';
import {
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/repositories/help-ticket.repository';

export function TicketStatusControls({
  ticketId,
  status,
  priority,
}: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(patch: { status?: TicketStatus; priority?: TicketPriority }) {
    setError(null);
    startTransition(async () => {
      const result = await updateTicketAdmin({ ticketId, ...patch });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <label className="block text-[12px] font-semibold text-ink/60">
        Status
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => apply({ status: e.target.value as TicketStatus })}
          className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px] text-deep"
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-[12px] font-semibold text-ink/60">
        Priority
        <select
          value={priority}
          disabled={isPending}
          onChange={(e) => apply({ priority: e.target.value as TicketPriority })}
          className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[14px] capitalize text-deep"
        >
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
