'use server';

// CHAT-02 Step 1 — homepage AI assistant (general, pre-login FAQ front door).
//
// Scope, deliberately narrow for this step:
// - Lives on the public homepage only, NOT inside a specific booking.
// - No database access, no tool-calling, no booking/invoice lookup yet.
//   It answers general questions about SafarBuddy (how booking works,
//   what SafarBuddy offers, how to find a hotel/package) and — when a
//   customer asks about a specific booking, invoice, or a problem that
//   needs their actual data — tells them to log in and use "My
//   Bookings", where the existing per-booking chat (CHAT-01,
//   booking-chat.actions.ts) already exists.
// - The AI-as-mediator behaviour discussed for the post-booking chat
//   (looking up a real booking, fetching the invoice PDF, relaying to
//   the hotel) is a SEPARATE, later CHAT-02 step scoped to
//   booking-chat.actions.ts / BookingChatThread.tsx, not this file.
//   Keeping the two apart avoids widening this public, unauthenticated
//   surface with tools that can read booking data.
//
// RULE 30 pattern (see ADMIN_NOTIFICATION_EMAIL in env.ts): missing
// ANTHROPIC_API_KEY is not a hard failure. The widget still renders;
// this action returns a friendly "not configured yet" reply instead
// of throwing, so a missing key never breaks the homepage.

import { runAction, type ActionResult } from '@/lib/actions/action-result';

// Read directly from process.env rather than the `env` export from
// @/lib/config/env — matches the existing pattern for optional
// server-only secrets in this codebase (see GMAIL_USER/CASHFREE_APP_ID/
// ADMIN_NOTIFICATION_EMAIL), which all bypass `env` the same way
// because validateEnv()'s return type is a server/client union that
// TS can't narrow at the call site even in server-only files.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 12; // keeps token/cost bounded per turn

const SYSTEM_PROMPT = `You are the SafarBuddy homepage assistant — a friendly, concise travel-booking helper for SafarBuddy, a hotel/package booking platform.

You can help with:
- Explaining how searching and booking works on SafarBuddy
- General questions about hotels, packages, and travel planning
- Pointing people to the right page (hotel search, packages, "My Bookings")

You do NOT have access to any specific customer's booking, invoice, or account data. If someone asks about their own booking status, invoice, payment, or a problem with a specific stay, tell them to log in and open "My Bookings" — from there each booking has its own support chat with the hotel and SafarBuddy team.

Never invent prices, policies, refund rules, or hotel details you don't actually know. Keep replies short (2-4 sentences). Reply in the same language/style the user writes in (Hindi, Hinglish, or English).`;

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function askHomeAssistant(
  history: AiChatTurn[],
  message: string
): Promise<ActionResult<string>> {
  return runAction(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty.');
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message is too long (${MAX_MESSAGE_LENGTH} characters max).`);
    }

    if (!ANTHROPIC_API_KEY) {
      // RULE 30 — gated off, not broken, when the key isn't set yet.
      return "SafarBuddy's AI assistant isn't fully set up yet — please reach us via the contact page for now, or check back soon!";
    }

    const boundedHistory = history.slice(-MAX_HISTORY_MESSAGES);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          ...boundedHistory.map((turn) => ({ role: turn.role, content: turn.content })),
          { role: 'user', content: trimmed },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[AI ASSISTANT] Anthropic API error', response.status, await response.text());
      throw new Error('The assistant is having trouble responding right now. Please try again in a moment.');
    }

    const data = await response.json();
    const textBlock = (data.content ?? []).find(
      (block: { type: string; text?: string }) => block.type === 'text'
    );

    return textBlock?.text?.trim() || "Sorry, I couldn't come up with a reply — could you try rephrasing?";
  });
}
