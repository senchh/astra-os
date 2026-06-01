export type Health = "live" | "degraded" | "offline";

export interface CronJob {
  id: string;
  name: string;
  scheduleDisplay: string;
  model: string;
  provider: string;
  enabled: boolean;
  state: string;
  lastStatus: string | null;
  lastError: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  profile: string | null;
  skills: string[];
}

export interface SessionMeta {
  sessionId: string;
  model: string;
  provider: string;
  platform: string;
  start: string;
  lastUpdated: string;
  messageCount: number;
  totalTokens: number;
}

export interface DayBucket {
  date: string; // YYYY-MM-DD
  sessions: number;
  messages: number;
}

export interface ModelUsage {
  model: string;
  provider: string;
  sessions: number;
  messages: number;
  tokens: number;
}

export interface ActivitySummary {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  days: DayBucket[];
  models: ModelUsage[];
  lastActivity: string | null;
}

export interface KanbanTask {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface KanbanColumn {
  status: string;
  count: number;
  tasks: KanbanTask[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  total: number;
  open: number;
}

export interface DreamReport {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  body: string;
}

export interface Goal {
  id: string;
  title: string;
  done: boolean;
}

export interface AgentHealth {
  id: string;
  name: string;
  health: Health;
  detail: string;
  lastSeen: string | null;
  color: string;
}
