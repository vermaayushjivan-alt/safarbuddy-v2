'use client';

// CHAT-02 Step 1 — homepage AI assistant widget.
//
// Deliberately homepage-only (imported from src/app/page.tsx, not
// RootLayout) per this session's requirement — the logged-in,
// per-booking chat (CHAT-01, BookingChatThread.tsx) is a separate
// surface and is not touched here.
//
// Visual language copied from existing components rather than
// invented: the orange CTA + shadow matches Navbar.tsx's "Book Now"
// button, the message-bubble/panel shape matches BookingChatThread.tsx,
// and `.reveal` / `.focus-ring` are the site's existing globals.css
// utilities.

import { useEffect, useRef, useState, useTransition } from 'react';
import { askHomeAssistant, type AiChatTurn } from '@/app/actions/ai-assistant.actions';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const GREETING: DisplayMessage = {
  id: 'greeting',
  role: 'assistant',
  text: "Hi! I'm the SafarBuddy assistant \u2014 ask me about hotels, packages, or how booking works. For a specific booking, invoice, or issue, log in and open My Bookings for the dedicated support chat.",
};

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.2 3.5a.6.6 0 0 1-.98-.46V16h-.32A2.5 2.5 0 0 1 2 13.5v-8A2.5 2.5 0 0 1 4 5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="16" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M3.5 12 20 4l-6.5 16-2.8-7-7.2-1Z" fill="currentColor" />
    </svg>
  );
}

export default function HomeAiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isPending]);

  function toggleOpen() {
    setIsOpen((prev) => !prev);
    setHasOpenedOnce(true);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || isPending) return;

    setError(null);
    setDraft('');

    const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: 'user', text };
    const history: AiChatTurn[] = messages
      .filter((m) => m.id !== 'greeting')
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, userMessage]);

    startTransition(async () => {
      const result = await askHomeAssistant(history, text);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: result.data },
      ]);
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="reveal mb-3 flex h-[500px] max-h-[70vh] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-deep/15 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-deep px-4 py-3">
            <div>
              <p className="font-heading text-[15px] font-semibold text-white">SafarBuddy Assistant</p>
              <p className="text-[11px] text-white/65">Usually replies instantly</p>
            </div>
            <button
              type="button"
              onClick={toggleOpen}
              aria-label="Close chat"
              className="focus-ring grid h-8 w-8 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-cream/60 p-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                    m.role === 'user' ? 'bg-sky text-white' : 'bg-mist text-ink'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-mist px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {error && <p className="px-4 pb-1 text-[12px] text-red-600">{error}</p>}

          {/* Input */}
          <div className="flex gap-2 border-t border-deep/10 bg-white p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your question..."
              className="focus-ring flex-1 rounded-full border border-deep/15 px-4 py-2.5 text-[13.5px] outline-none focus:border-sky"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !draft.trim()}
              aria-label="Send message"
              className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky text-white transition disabled:opacity-50"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <div className="relative ml-auto w-fit">
        {!hasOpenedOnce && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-orange/60" />
        )}
        <button
          type="button"
          onClick={toggleOpen}
          aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
          className="focus-ring grid h-14 w-14 place-items-center rounded-full bg-orange text-white shadow-[0_8px_20px_-8px_rgba(255,106,43,0.7)] transition hover:bg-orange-2 active:scale-[0.97]"
        >
          {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
        </button>
      </div>
    </div>
  );
}
