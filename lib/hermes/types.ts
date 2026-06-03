export type Health = "live" | "degraded" | "offline";

export interface CronJob {
  id: string;
  name: string;
  scheduleDisplay: string;
  schedule: string; // raw editable expression (e.g. "0 6 * * *", "30m")
  prompt: string;
  deliver: string;
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

// One agent run, from state.db `sessions` (the canonical token/cost ledger).
export interface Run {
  id: string;
  source: string; // cli | cron | telegram | webui …
  model: string;
  startedAt: number; // epoch seconds
  durationSec: number | null; // null while running
  status: string; // end_reason, or "running" when not ended
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number; // input + output + reasoning
  costLabel: string; // "abonelik" (included) | "—" (unknown/unmetered) | "$x" if ever metered
  title: string | null;
}

export interface SourceUsage {
  source: string;
  runs: number;
  tokens: number;
}

// ── Sessions browser (/sessions — state.db + FTS5 search) ────────
export interface SessionListItem {
  id: string;
  source: string; // cli | cron | telegram | webui
  model: string;
  title: string | null;
  startedAt: number; // epoch seconds
  endedAt: number | null;
  messageCount: number;
  totalTokens: number; // input + output + reasoning
  costLabel: string;
}

// A search result: a session whose messages matched the FTS query.
export interface SessionSearchHit extends SessionListItem {
  matchCount: number; // matching messages in the fetched window
  snippet: string; // FTS snippet() with [match] markers
}

export interface SessionMessage {
  id: number;
  role: string; // user | assistant | tool | system
  content: string;
  toolName: string | null;
  timestamp: number; // epoch seconds
  tokenCount: number;
}

export interface SessionDetail {
  meta: SessionListItem & {
    provider: string;
    endReason: string | null;
    toolCalls: number;
  };
  messages: SessionMessage[];
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

// ── Skills (from ~/.hermes/skills/<…>/SKILL.md + .usage.json) ────
export interface Skill {
  id: string; // skill name (frontmatter `name`, else its dir)
  description: string;
  category: string;
  version: string | null;
  tags: string[];
  source: "builtin" | "local"; // membership in .bundled_manifest
  enabled: boolean; // not listed in config.yaml skills.disabled
  bytes: number; // SKILL.md size — a token-cost proxy when the skill loads
  useCount: number; // .usage.json — times the agent invoked it
  viewCount: number;
  lastUsedAt: string | null;
  createdBy: string | null; // agent | user | null
}

export interface SkillCategory {
  name: string;
  skills: Skill[];
}

export interface SkillsCatalog {
  skills: Skill[];
  categories: SkillCategory[];
  total: number;
  enabled: number;
  used: number; // skills with useCount > 0
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
  models: string[]; // cached model ids for this provider (provider_models_cache.json)
  isActive: boolean; // == auth.active_provider
  isDefault: boolean; // == config model.provider
}

/**
 * A selectable "agent" on /chat — one per authed provider. Picking one routes a
 * single conversation through that provider+model transiently (CLI -m/--provider),
 * never touching the sticky config default (that's /control's job).
 */
export interface AgentOption {
  provider: string; // credential-pool id, e.g. "xai-oauth"
  label: string; // friendly name, e.g. "Grok"
  status: CredStatus; // rolled-up key health — the observability touch on each pill
  models: string[]; // selectable models for this provider
  defaultModel: string; // preselected model for the pill
  isDefault: boolean; // the sticky config default provider (its pill = no override)
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

// ── Send (action trigger: push a message to a platform) ─────────
export interface SendTarget {
  platform: string; // telegram | discord | slack …
  id: string; // chat_id, or chat_id:thread_id for a group topic
  name: string; // human label, e.g. "Senchh" or "Hermes Control Center / topic 1"
  type: string; // dm | group | channel …
  target: string; // the `--to` value, e.g. "telegram:-1004294152788:3"
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
