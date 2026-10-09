'use client';

// ROOT PATH: src/components/support/TicketChatThread.tsx
// SUPPORT-01 — chat box for a support ticket. Used by the customer page and the
// admin page; only `viewerRole` differs. New messages appear live (Supabase
// Realtime, allowed by the select policy in 036_support01_help_tickets.sql).
// Messages are only ever written through sendTicketMessage() on the server.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  sendTicketMessage,
  markMyTicketResolved,
} from '@/app/actions/support.actions';
import type {
  HelpTicketMessageRecord,
  TicketSenderRole,
} from '@/lib/repositories/help-ticket.repository';

const ROLE_LABELS: Record<TicketSenderRole, string> = {
  customer: 'Customer',
  support: 'SafarBuddy Support',
};

function formatTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TicketChatThread({
  ticketId,
  viewerRole,
  initialMessages,
  isClosed,
  canMarkResolved,
}: {
  ticketId: string;
  viewerRole: TicketSenderRole;
  initialMessages: HelpTicketMessageRecord[];
  isClosed: boolean;
  canMarkResolved: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`help-ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'help_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const incoming = payload.new as HelpTicketMessageRecord;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;

    setError(null);
    setDraft('');

    startTransition(async () => {
      const result = await sendTicketMessage(ticketId, text);
      if (!result.success) {
        setError(result.error);
        setDraft(text);
        return;
      }
      setMessages((prev) =>
        prev.some((m) => m.id === result.data.id) ? prev : [...prev, result.data]
      );
      router.refresh();
    });
  }

  function handleResolved() {
    setError(null);
    startTransition(async () => {
      const result = await markMyTicketResolved(ticketId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-deep/15 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMine = m.sender_role === viewerRole;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] ${
                  isMine ? 'bg-sky text-white' : 'bg-cream text-ink'
                }`}
              >
                <p className={`mb-0.5 text-[11px] font-medium ${isMine ? 'text-white/70' : 'text-ink/50'}`}>
                  {isMine ? 'You' : ROLE_LABELS[m.sender_role]} · {formatTime(m.created_at)}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-[12px] text-red-600">{error}</p>}

      {isClosed ? (
        <p className="border-t border-deep/10 p-4 text-center text-[13px] text-ink/60">
          This request is closed. If you still need help, please start a new request.
        </p>
      ) : (
        <div className="border-t border-deep/10 p-3">
          {canMarkResolved && (
            <button
              type="button"
              onClick={handleResolved}
              disabled={isPending}
              className="focus-ring mb-2 text-[12px] font-semibold text-deep underline disabled:opacity-50"
            >
              My problem is solved
            </button>
          )}
          <div className="flex gap-2">
            <input
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message"
              className="flex-1 rounded-full border border-deep/15 px-4 py-2.5 text-[14px] outline-none focus:border-sky"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !draft.trim()}
              className="rounded-full bg-sky px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
