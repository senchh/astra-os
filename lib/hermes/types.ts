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
  startedAt: number | null;
  priority: number;
  lastFailureError: string | null;
  consecutiveFailures: number;
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

// ── Control Room ────────────────────────────────────────────────
export type CredStatus = "ok" | "exhausted" | "error" | "unknown";

export interface Credential {
  id: string;
  label: string;
  authType: string; // oauth | api_key
  source: string; // env:GOOGLE_API_KEY | gh_cli | device_code | manual | loopback_pkce
  priority: number;
  status: CredStatus;
  errorCode: number | null;
  errorReason: string | null;
  errorMessage: string | null;
  errorResetAt: number | null; // epoch seconds
  baseUrl: string;
  fingerprint: string | null; // sha256:… — safe; never the raw secret
  requestCount: number;
}

export interface ProviderInfo {
  id: string; // provider key, e.g. "xai-oauth"
  status: CredStatus; // rolled up across credentials
  credentials: Credential[];
  modelCount: number;
  isActive: boolean; // == auth.active_provider
  isDefault: boolean; // == config model.provider
}

export interface GatewayPlatform {
  name: string;
  state: string; // connected | …
  error: string | null;
}

export interface GatewayInfo {
  state: string; // running | stopped | unknown
  pid: number | null;
  updatedAt: string | null;
  platforms: GatewayPlatform[];
}

export interface ControlRoom {
  providers: ProviderInfo[];
  activeProvider: string | null;
  defaultModel: string;
  defaultProvider: string;
  gateway: GatewayInfo;
  voice: { tts: string | null; stt: string | null; sttEnabled: boolean };
  updatedAt: string | null;
}

// ── Tools (toolsets, from `hermes tools list`) ──────────────────
export interface Toolset {
  id: string;
  label: string; // emoji + human label, e.g. "🔍 Web Search & Scraping"
  enabled: boolean;
}

// ── Live performance (parsed from agent.log API-call lines) ──────
export interface ProviderPerf {
  provider: string;
  topModel: string; // most-used model for this provider in the window
  calls: number;
  p50: number; // seconds
  p95: number; // seconds
  cacheHitPct: number | null;
  lastCallAt: string | null; // ISO
}

export interface PerfMetrics {
  totalCalls: number; // sample size (recent window)
  p50: number;
  p95: number;
  lastCallAt: string | null;
  byProvider: Record<string, ProviderPerf>;
}
