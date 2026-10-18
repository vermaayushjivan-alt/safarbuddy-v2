'use server';

// Admin-only AI agents (Planner / SEO / Sales). The public homepage
// assistant (ai-assistant.actions.ts) is a separate surface and is not
// touched. Auth: requireRole(['admin','super_admin']) on EVERY call, the
// same rule /admin/layout.tsx uses. Stateless: nothing is stored in the DB.

import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { requireRole } from '@/lib/auth/session';
import { getSiteKnowledge } from '@/lib/ai/site-knowledge';
import { buildAdminSystemPrompt, isAdminAgentId } from '@/lib/ai/admin-agents';
import { callGemini, type GeminiContent } from '@/lib/ai/gemini-admin';

const MAX_MESSAGE = 3000;
const MAX_HISTORY = 12;

export interface AdminAgentTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAdminAgent(
  agent: string,
  history: AdminAgentTurn[],
  message: string
): Promise<ActionResult<string>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    if (!isAdminAgentId(agent)) throw new Error('Unknown agent.');
    const text = (message ?? '').trim();
    if (!text) throw new Error('Message cannot be empty.');
    if (text.length > MAX_MESSAGE) throw new Error(`Message too long (${MAX_MESSAGE} characters max).`);

    const knowledge = await getSiteKnowledge();
    const past: GeminiContent[] = (Array.isArray(history) ? history : [])
      .slice(-MAX_HISTORY)
      .filter((t) => (t?.role === 'user' || t?.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
      .map((t) => ({
        role: t.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: t.content.slice(0, 6000) }],
      }));

    return callGemini(buildAdminSystemPrompt(agent, knowledge), [
      ...past,
      { role: 'user', parts: [{ text }] },
    ]);
  });
}
