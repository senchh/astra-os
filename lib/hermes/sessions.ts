import fs from "node:fs";
import path from "node:path";
import { SESSIONS_DIR } from "./paths";
import type { ActivitySummary, DayBucket, ModelUsage, SessionMeta } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function readSessions(): SessionMeta[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: SessionMeta[] = [];
  for (const f of files) {
    try {
      const d: any = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf8"));
      out.push({
        sessionId: d.session_id ?? f.replace(/\.json$/, ""),
        model: d.model ?? "unknown",
        provider: d.provider ?? "unknown",
        platform: d.platform ?? "unknown",
        start: d.session_start ?? d.last_updated ?? "",
        lastUpdated: d.last_updated ?? d.session_start ?? "",
        messageCount: Number(d.message_count ?? (Array.isArray(d.messages) ? d.messages.length : 0)) || 0,
        totalTokens: Number(d.total_tokens ?? 0) || 0,
      });
    } catch {
      /* skip malformed */
    }
  }
  return out;
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
