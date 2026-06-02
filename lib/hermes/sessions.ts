import { STATE_DB } from "./paths";
import type {
  ActivitySummary,
  DayBucket,
  ModelUsage,
  Run,
  SessionMeta,
  SourceUsage,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// state.db is the canonical token/cost ledger. The old reader parsed
// ~/.hermes/sessions/*.json, whose `total_tokens` was always 0 (the "token 0"
// bug) — the real per-session tokens live here. process.getBuiltinModule reaches
// the real builtin even from a bundled (Turbopack) server module.
function queryState(sql: string): any[] {
  try {
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as {
      DatabaseSync: new (
        path: string,
        opts?: { readOnly?: boolean }
      ) => { prepare(sql: string): { all(): any[] }; close(): void };
    };
    const db = new DatabaseSync(STATE_DB, { readOnly: true });
    const rows = db.prepare(sql).all();
    db.close();
    return rows;
  } catch {
    return [];
  }
}

const toIso = (sec: any): string => {
  const n = Number(sec);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : "";
};

function costLabel(status: any, cost: any): string {
  const c = Number(cost);
  if (Number.isFinite(c) && c > 0) return `$${c.toFixed(2)}`;
  if (status === "included") return "abonelik";
  return "—"; // unknown / unmetered (OAuth subscriptions report no per-token cost)
}

export function readSessions(): SessionMeta[] {
  const rows = queryState(
    "SELECT id, source, model, billing_provider, started_at, ended_at, message_count, input_tokens, output_tokens, reasoning_tokens FROM sessions"
  );
  return rows.map((r) => ({
    sessionId: String(r.id),
    model: r.model ?? "unknown",
    provider: r.billing_provider ?? "unknown",
    platform: r.source ?? "unknown",
    start: toIso(r.started_at),
    lastUpdated: toIso(r.ended_at ?? r.started_at),
    messageCount: Number(r.message_count) || 0,
    totalTokens:
      (Number(r.input_tokens) || 0) +
      (Number(r.output_tokens) || 0) +
      (Number(r.reasoning_tokens) || 0),
  }));
}

// Recent runs for the Activity → Runs table (rich, per-run rows).
export function readRuns(limit = 40): Run[] {
  const rows = queryState(
    `SELECT id, source, model, started_at, ended_at, end_reason, tool_call_count, input_tokens, output_tokens, reasoning_tokens, estimated_cost_usd, cost_status, title FROM sessions ORDER BY started_at DESC LIMIT ${Number(limit) || 40}`
  );
  return rows.map((r) => {
    const started = Number(r.started_at) || 0;
    const ended = r.ended_at != null ? Number(r.ended_at) : null;
    return {
      id: String(r.id),
      source: r.source ?? "—",
      model: r.model ?? "unknown",
      startedAt: started,
      durationSec: ended != null && ended >= started ? Math.round(ended - started) : null,
      status: ended == null ? "running" : (r.end_reason ?? "—"),
      toolCalls: Number(r.tool_call_count) || 0,
      inputTokens: Number(r.input_tokens) || 0,
      outputTokens: Number(r.output_tokens) || 0,
      totalTokens:
        (Number(r.input_tokens) || 0) +
        (Number(r.output_tokens) || 0) +
        (Number(r.reasoning_tokens) || 0),
      costLabel: costLabel(r.cost_status, r.estimated_cost_usd),
      title: r.title ?? null,
    };
  });
}

// Per-source token totals (cli / cron / telegram / webui).
export function readSourceUsage(): SourceUsage[] {
  const rows = queryState(
    "SELECT source, COUNT(*) runs, SUM(input_tokens + output_tokens + reasoning_tokens) tokens FROM sessions GROUP BY source ORDER BY tokens DESC"
  );
  return rows.map((r) => ({
    source: r.source ?? "—",
    runs: Number(r.runs) || 0,
    tokens: Number(r.tokens) || 0,
  }));
}

function dayKey(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

export function summarizeActivity(days = 14): ActivitySummary {
  const sessions = readSessions();

  // last `days` day buckets, oldest → newest
  const buckets = new Map<string, DayBucket>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, sessions: 0, messages: 0 });
  }

  const models = new Map<string, ModelUsage>();
  let totalMessages = 0;
  let totalTokens = 0;
  let lastActivity: string | null = null;

  for (const s of sessions) {
    totalMessages += s.messageCount;
    totalTokens += s.totalTokens;
    if (s.lastUpdated && (!lastActivity || s.lastUpdated > lastActivity)) lastActivity = s.lastUpdated;

    const key = dayKey(s.lastUpdated);
    if (key && buckets.has(key)) {
      const b = buckets.get(key)!;
      b.sessions += 1;
      b.messages += s.messageCount;
    }

    const mk = s.model || "unknown";
    const mu = models.get(mk) ?? { model: mk, provider: s.provider, sessions: 0, messages: 0, tokens: 0 };
    mu.sessions += 1;
    mu.messages += s.messageCount;
    mu.tokens += s.totalTokens;
    models.set(mk, mu);
  }

  return {
    totalSessions: sessions.length,
    totalMessages,
    totalTokens,
    days: [...buckets.values()],
    models: [...models.values()].sort((a, b) => b.sessions - a.sessions),
    lastActivity,
  };
}
