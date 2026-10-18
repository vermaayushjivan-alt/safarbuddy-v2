// Virtual Team — pure parsing/validation helpers (no I/O, unit-tested in verify/team-parse.test.ts).
// LLM output is untrusted: every field is validated, clipped and filtered here.

import {
  TEAM_LIMITS,
  isTeamAgentId,
  type PlanTask,
  type ReviewResult,
  type TeamAgentId,
  type WorkOutput,
} from './team-types';

export function clip(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Pulls the first JSON object out of a model reply (handles ```json fences and chatter around it). */
export function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const unfenced = text.replace(/```(?:json)?/gi, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(unfenced.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Manager plan -> safe task list. Dependencies may only point at EARLIER tasks, so order is always valid. */
export function normalizePlan(raw: Record<string, unknown> | null): { approach: string; tasks: PlanTask[] } {
  const list = raw && Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks: PlanTask[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    if (tasks.length >= TEAM_LIMITS.MAX_TASKS) break;
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    if (!isTeamAgentId(t.agent)) continue;
    const instruction = clip(t.instruction, 1500);
    if (!instruction) continue;

    let id = clip(t.id, 20).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!id || seen.has(id)) id = `t${tasks.length + 1}`;
    if (seen.has(id)) continue;

    const dependsOn = (Array.isArray(t.dependsOn) ? t.dependsOn : [])
      .filter((d): d is string => typeof d === 'string' && seen.has(d))
      .slice(0, 5);

    seen.add(id);
    tasks.push({
      id,
      agent: t.agent,
      title: clip(t.title, 120) || `${t.agent} task`,
      instruction,
      dependsOn,
    });
  }

  if (!tasks.length) throw new Error('Manager plan nahi bana paya. Goal thoda aur clear likh ke dobara try karo.');
  return { approach: clip(raw?.approach, 600), tasks };
}

const SECTION = /^={3}\s*(SUMMARY|DELIVERABLE|HANDOFFS|ASKS)\s*={3}\s*$/gim;

/** Parses the delimiter format workers answer in. Falls back to "whole reply = deliverable". */
export function parseWork(text: string, self: TeamAgentId): WorkOutput {
  const reply = (text ?? '').trim();
  const marks: { name: string; from: number; bodyFrom: number }[] = [];
  SECTION.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SECTION.exec(reply)) !== null) {
    marks.push({ name: m[1].toUpperCase(), from: m.index, bodyFrom: m.index + m[0].length });
  }

  const sections: Record<string, string> = {};
  marks.forEach((mk, i) => {
    sections[mk.name] = reply.slice(mk.bodyFrom, i + 1 < marks.length ? marks[i + 1].from : undefined).trim();
  });

  const deliverable = sections.DELIVERABLE ?? reply;
  const summary = sections.SUMMARY || clip(deliverable.replace(/\s+/g, ' '), 280);

  const lines = (block?: string) =>
    (block ?? '')
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);

  const toPairs = (block?: string) => {
    const out: { to: TeamAgentId; text: string }[] = [];
    for (const line of lines(block)) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const to = line.slice(0, idx).trim().toLowerCase();
      const text = clip(line.slice(idx + 1), 600);
      if (isTeamAgentId(to) && to !== self && text) out.push({ to, text });
    }
    return out.slice(0, 3);
  };

  return {
    summary: clip(summary, 400),
    deliverable: clip(deliverable, 12000),
    handoffs: toPairs(sections.HANDOFFS).map((p) => ({ to: p.to, note: p.text })),
    asks: toPairs(sections.ASKS).map((p) => ({ to: p.to, question: p.text })),
  };
}

/** Reviewer JSON -> safe result. Unparseable review never blocks the run (treated as approved with a note). */
export function normalizeReview(raw: Record<string, unknown> | null, taskAgents: Record<string, TeamAgentId>): ReviewResult {
  if (!raw) {
    return { approved: true, overall: 'QA review parse nahi ho paya, isliye output as-is diya gaya. Khud ek baar check kar lena.', issues: [] };
  }
  const issues = (Array.isArray(raw.issues) ? raw.issues : [])
    .map((i) => {
      if (!i || typeof i !== 'object') return null;
      const r = i as Record<string, unknown>;
      const taskId = typeof r.taskId === 'string' ? r.taskId : '';
      const agent = taskAgents[taskId];
      const problem = clip(r.problem, 600);
      return agent && problem ? { taskId, agent, problem } : null;
    })
    .filter((i): i is { taskId: string; agent: TeamAgentId; problem: string } => i !== null)
    .slice(0, TEAM_LIMITS.MAX_REVISIONS);

  return {
    approved: raw.approved === true && issues.length === 0,
    overall: clip(raw.overall, 800),
    issues,
  };
}
