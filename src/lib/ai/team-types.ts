// Virtual Team (multi-agent) — shared types + display metadata.
// CLIENT-SAFE: no prompts, no secrets, no 'server-only'. Prompts live in team-roster.ts.

export const TEAM_AGENT_IDS = [
  'research',
  'planner',
  'seo',
  'content',
  'social',
  'ads',
  'growth',
  'sales',
  'partnerships',
  'support',
  'finance',
  'compliance',
  'ux',
  'tech',
] as const;
export type TeamAgentId = (typeof TEAM_AGENT_IDS)[number];

export function isTeamAgentId(v: unknown): v is TeamAgentId {
  return typeof v === 'string' && (TEAM_AGENT_IDS as readonly string[]).includes(v);
}

export const TEAM_META: Record<TeamAgentId, { label: string; emoji: string }> = {
  research: { label: 'Market Research', emoji: '🔎' },
  planner: { label: 'Trip Planner', emoji: '🗺️' },
  seo: { label: 'SEO', emoji: '✍️' },
  content: { label: 'Brand & Copy', emoji: '🪶' },
  social: { label: 'Social & Reels', emoji: '🎬' },
  ads: { label: 'Ads Manager', emoji: '📣' },
  growth: { label: 'Growth Head', emoji: '🚀' },
  sales: { label: 'Deal Closer', emoji: '🎯' },
  partnerships: { label: 'Hotel Partnerships', emoji: '🏨' },
  support: { label: 'Customer Support', emoji: '💬' },
  finance: { label: 'Finance & Ops', emoji: '📊' },
  compliance: { label: 'Policy & Compliance', emoji: '📜' },
  ux: { label: 'Product & UX', emoji: '🧭' },
  tech: { label: 'Tech Lead', emoji: '🛠️' },
};

export type Speaker = TeamAgentId | 'manager' | 'reviewer';

export const SPEAKER_META: Record<Speaker, { label: string; emoji: string }> = {
  ...TEAM_META,
  manager: { label: 'Team Manager', emoji: '🧑‍💼' },
  reviewer: { label: 'QA Reviewer', emoji: '🧪' },
};

// Hard limits (cost + Gemini quota + Vercel time protection). Enforced on server AND client.
export const TEAM_LIMITS = {
  MAX_GOAL: 2000,
  MAX_TASKS: 5,
  MAX_CONSULTS: 3,
  MAX_REVISIONS: 2,
  MAX_CALLS: 18,
} as const;

export interface PlanTask {
  id: string;
  agent: TeamAgentId;
  title: string;
  instruction: string;
  dependsOn: string[];
}

export interface TeamMessage {
  from: Speaker;
  to: TeamAgentId | 'manager';
  kind: 'handoff' | 'ask' | 'answer';
  text: string;
}

export interface BoardEntry {
  taskId: string;
  agent: TeamAgentId;
  title: string;
  summary: string;
  deliverable: string;
}

export interface ReviewIssue {
  taskId: string;
  agent: TeamAgentId;
  problem: string;
}

export interface ReviewResult {
  approved: boolean;
  overall: string;
  issues: ReviewIssue[];
}

export interface WorkOutput {
  summary: string;
  deliverable: string;
  handoffs: { to: TeamAgentId; note: string }[];
  asks: { to: TeamAgentId; question: string }[];
}

export type TeamStepInput =
  | { step: 'plan'; goal: string }
  | { step: 'work'; goal: string; task: PlanTask; board: BoardEntry[]; inbox: TeamMessage[] }
  | { step: 'consult'; goal: string; from: TeamAgentId; to: TeamAgentId; question: string; context: string }
  | {
      step: 'revise';
      goal: string;
      task: PlanTask;
      previous: string;
      feedback: string;
      feedbackFrom: Speaker;
      board: BoardEntry[];
    }
  | { step: 'review'; goal: string; tasks: PlanTask[]; board: BoardEntry[]; chat: TeamMessage[] }
  | { step: 'final'; goal: string; board: BoardEntry[]; chat: TeamMessage[]; review: ReviewResult | null };

export type TeamStepResult =
  | { step: 'plan'; approach: string; tasks: PlanTask[] }
  | ({ step: 'work' } & WorkOutput)
  | { step: 'consult'; answer: string }
  | { step: 'revise'; summary: string; deliverable: string }
  | ({ step: 'review' } & ReviewResult)
  | { step: 'final'; text: string };
