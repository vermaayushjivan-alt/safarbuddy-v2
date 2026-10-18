'use server';

// Virtual Team (multi-agent) — ONE step of a team run per call.
// The browser (TeamRunner) drives the loop, so every call stays well inside Vercel's 60 s limit
// (one Gemini call per step). Stateless: nothing is stored in the DB; the client holds the run state.
// Auth: requireRole(['admin','super_admin']) on EVERY call, same rule as /admin/layout.tsx.
// Nothing here sends email/WhatsApp/posts: agents only produce drafts for the owner.

import { z } from 'zod';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { requireRole } from '@/lib/auth/session';
import { getSiteKnowledge } from '@/lib/ai/site-knowledge';
import { getBusinessSnapshot } from '@/lib/ai/business-snapshot';
import { callGemini } from '@/lib/ai/gemini-admin';
import { extractJson, normalizePlan, normalizeReview, parseWork, clip } from '@/lib/ai/team-parse';
import {
  TEAM_AGENT_IDS,
  TEAM_LIMITS,
  type TeamStepResult,
} from '@/lib/ai/team-types';
import {
  TEAM_AGENTS_WITH_SNAPSHOT,
  consultSystem,
  consultUser,
  managerFinalSystem,
  managerFinalUser,
  managerPlanSystem,
  reviewerSystem,
  reviewerUser,
  reviseUser,
  workerSystem,
  workerUser,
} from '@/lib/ai/team-roster';

const agentId = z.enum(TEAM_AGENT_IDS);
const speaker = z.union([agentId, z.literal('manager'), z.literal('reviewer')]);
const goal = z.string().trim().min(5, 'Goal thoda detail me likho.').max(TEAM_LIMITS.MAX_GOAL, `Goal max ${TEAM_LIMITS.MAX_GOAL} characters.`);

const taskSchema = z.object({
  id: z.string().max(20),
  agent: agentId,
  title: z.string().max(200),
  instruction: z.string().max(1600),
  dependsOn: z.array(z.string().max(20)).max(5),
});
const entrySchema = z.object({
  taskId: z.string().max(20),
  agent: agentId,
  title: z.string().max(200),
  summary: z.string().max(800),
  deliverable: z.string().max(13000),
});
const messageSchema = z.object({
  from: speaker,
  to: z.union([agentId, z.literal('manager')]),
  kind: z.enum(['handoff', 'ask', 'answer']),
  text: z.string().max(2000),
});
const reviewSchema = z.object({
  approved: z.boolean(),
  overall: z.string().max(1000),
  issues: z.array(z.object({ taskId: z.string().max(20), agent: agentId, problem: z.string().max(800) })).max(5),
});
const board = z.array(entrySchema).max(TEAM_LIMITS.MAX_TASKS + 1);
const chat = z.array(messageSchema).max(40);

const inputSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('plan'), goal }),
  z.object({ step: z.literal('work'), goal, task: taskSchema, board, inbox: chat }),
  z.object({
    step: z.literal('consult'),
    goal,
    from: agentId,
    to: agentId,
    question: z.string().trim().min(3).max(800),
    context: z.string().max(2000),
  }),
  z.object({
    step: z.literal('revise'),
    goal,
    task: taskSchema,
    previous: z.string().max(13000),
    feedback: z.string().min(1).max(1500),
    feedbackFrom: speaker,
    board,
  }),
  z.object({ step: z.literal('review'), goal, tasks: z.array(taskSchema).max(TEAM_LIMITS.MAX_TASKS), board, chat }),
  z.object({ step: z.literal('final'), goal, board, chat, review: reviewSchema.nullable() }),
]);

export async function teamStep(raw: unknown): Promise<ActionResult<TeamStepResult>> {
  return runAction<TeamStepResult>(async () => {
    await requireRole(['admin', 'super_admin']);
    const input = inputSchema.parse(raw);
    const knowledge = await getSiteKnowledge();

    switch (input.step) {
      case 'plan': {
        const text = await callGemini(managerPlanSystem(knowledge), [{ role: 'user', parts: [{ text: `OWNER GOAL:\n${input.goal}` }] }]);
        const plan = normalizePlan(extractJson(text));
        return { step: 'plan', ...plan };
      }

      case 'work': {
        const snapshot = TEAM_AGENTS_WITH_SNAPSHOT.includes(input.task.agent) ? await getBusinessSnapshot() : '';
        const text = await callGemini(workerSystem(input.task.agent, knowledge, snapshot), [
          { role: 'user', parts: [{ text: workerUser(input.goal, input.task, input.board, input.inbox) }] },
        ]);
        return { step: 'work', ...parseWork(text, input.task.agent) };
      }

      case 'consult': {
        const text = await callGemini(consultSystem(input.to, knowledge), [
          { role: 'user', parts: [{ text: consultUser(input.goal, input.from, input.question, input.context) }] },
        ]);
        return { step: 'consult', answer: clip(text, 2500) };
      }

      case 'revise': {
        const snapshot = TEAM_AGENTS_WITH_SNAPSHOT.includes(input.task.agent) ? await getBusinessSnapshot() : '';
        const text = await callGemini(workerSystem(input.task.agent, knowledge, snapshot), [
          {
            role: 'user',
            parts: [{ text: reviseUser(input.goal, input.task, input.previous, input.feedback, input.feedbackFrom, input.board) }],
          },
        ]);
        const out = parseWork(text, input.task.agent);
        return { step: 'revise', summary: out.summary, deliverable: out.deliverable };
      }

      case 'review': {
        const text = await callGemini(reviewerSystem(knowledge), [
          { role: 'user', parts: [{ text: reviewerUser(input.goal, input.tasks, input.board, input.chat) }] },
        ]);
        const taskAgents = Object.fromEntries(input.tasks.map((t) => [t.id, t.agent]));
        return { step: 'review', ...normalizeReview(extractJson(text), taskAgents) };
      }

      case 'final': {
        const text = await callGemini(managerFinalSystem(knowledge), [
          { role: 'user', parts: [{ text: managerFinalUser(input.goal, input.board, input.chat, input.review) }] },
        ]);
        return { step: 'final', text: clip(text, 20000) };
      }
    }
  });
}
