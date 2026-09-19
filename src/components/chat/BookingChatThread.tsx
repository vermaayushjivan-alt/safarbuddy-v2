'use client';

// CHAT-01 — shared 3-way booking chat component.
//
// Used identically from all three surfaces (customer dashboard,
// hotel-owner, admin) — only `currentRole` and the page around it
// differ. Subscribes to Supabase Realtime directly from the browser
// (see src/lib/supabase/client.ts — anon key + user session), which
// is why migration 023 grants a real SELECT RLS policy for this table
// specifically (every other table this project's sessions have added
// is service-role-only with zero policies — this one is the deliberate
// exception, see that migration's header).

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendBookingMessage } from '@/app/actions/booking-chat.actions';
import type { BookingMessageRecord, SenderRole } from '@/lib/repositories/booking-message.repository';

const ROLE_LABELS: Record<SenderRole, string> = {
  customer: 'Guest',
  hotel: 'Hotel',
  admin: 'SafarBuddy Support',
};

export function BookingChatThread({
  bookingId,
  currentRole,
  initialMessages,
}: {
  bookingId: string;
  currentRole: SenderRole;
  initialMessages: BookingMessageRecord[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    // REALTIME-01: this INSERT event only fires for a subscriber whose
    // session passes migration 023's SELECT RLS policy for this row —
    // Realtime enforces RLS per-subscriber, so this filter is a
    // performance narrowing, not the actual security boundary (that's
    // the DB policy).
    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newMessage = payload.new as BookingMessageRecord;
          setMessages((prev) =>
            // Guards against a duplicate if this browser tab was also
            // the sender (optimistic update below already added it,
            // then Realtime echoes the same insert back).
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;

    setError(null);
    setDraft('');

    startTransition(async () => {
      const result = await sendBookingMessage(bookingId, text);

      if (!result.success) {
        setError(result.error);
        setDraft(text); // give the message back so it isn't lost
        return;
      }

      // Optimistic add — Realtime's own echo of this insert is
      // deduplicated by id in the subscription handler above.
      setMessages((prev) => [...prev, result.data]);
    });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-deep/15 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-[13px] text-ink/45">
            No messages yet — say hello.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_role === currentRole;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] ${
                  isMine ? 'bg-sky text-white' : 'bg-cream text-ink'
                }`}
              >
                <p className={`mb-0.5 text-[11px] font-medium ${isMine ? 'text-white/70' : 'text-ink/50'}`}>
                  {ROLE_LABELS[m.sender_role]}
                </p>
                <p className="whitespace-pre-wrap">{m.message_text}</p>
                {m.was_redacted && (
                  <p className={`mt-1 text-[10px] italic ${isMine ? 'text-white/60' : 'text-ink/40'}`}>
                    Contact details are not allowed in chat and were removed.
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-[12px] text-red-600">{error}</p>}

      <div className="flex gap-2 border-t border-deep/10 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message — phone numbers and emails are automatically removed"
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
  );
}
