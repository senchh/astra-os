import fs from "node:fs";
import { AGENT_LOG } from "./paths";
import type { PerfMetrics, ProviderPerf } from "./types";

// Each successful API call is logged like:
//   2026-06-01 20:01:48,778 INFO [sid] …: API call #8: model=grok-4.3 \
//   provider=xai-oauth in=11518 out=265 total=11783 latency=2.5s cache=11136/11518 (97%)
const LINE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?API call #\d+: model=(\S+) provider=(\S+) in=\d+ out=(\d+) total=\d+ latency=([0-9.]+)s(?:.*?cache=(\d+)\/(\d+))?/;

// Percentiles reflect the most-recent calls so the panel reads "live".
const WINDOW = 1200;

interface Call {
  ts: string;
  model: string;
  provider: string;
  latency: number;
  cacheHit: number | null;
  cacheTotal: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return round1(sorted[i]);
}

function safeISO(ts: string): string | null {
  const d = new Date(ts.replace(" ", "T"));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

const EMPTY: PerfMetrics = {
  totalCalls: 0,
  p50: 0,
  p95: 0,
  cacheHitPct: null,
  lastCallAt: null,
  series: [],
  byProvider: {},
};

// Down-sample a latency list to ~n evenly-spaced points for a compact sparkline.
function sample(values: number[], n = 24): number[] {
  if (values.length <= n) return values.map(round1);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(round1(values[Math.floor((i * values.length) / n)]));
  return out;
}

export function readPerfMetrics(): PerfMetrics {
  let text: string;
  try {
    text = fs.readFileSync(AGENT_LOG, "utf8");
  } catch {
    return EMPTY;
  }

  const calls: Call[] = [];
  for (const line of text.split("\n")) {
    const m = LINE.exec(line);
    if (!m) continue;
    calls.push({
      ts: m[1],
      model: m[2],
      provider: m[3],
      latency: Number(m[5]),
      cacheHit: m[6] ? Number(m[6]) : null,
      cacheTotal: m[7] ? Number(m[7]) : null,
    });
  }
  if (calls.length === 0) return EMPTY;

  const recent = calls.slice(-WINDOW);
  const allLat = recent.map((c) => c.latency).sort((a, b) => a - b);

  const groups = new Map<string, Call[]>();
  for (const c of recent) {
    const g = groups.get(c.provider) ?? [];
    g.push(c);
    groups.set(c.provider, g);
  }

  const byProvider: Record<string, ProviderPerf> = {};
  for (const [provider, cs] of groups) {
    const lat = cs.map((c) => c.latency).sort((a, b) => a - b);

    const freq = new Map<string, number>();
    for (const c of cs) freq.set(c.model, (freq.get(c.model) ?? 0) + 1);
    const topModel = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    const cacheRows = cs.filter((c) => c.cacheTotal);
    const cacheHitPct = cacheRows.length
      ? Math.round(
          (100 *
            cacheRows.reduce((s, c) => s + c.cacheHit! / c.cacheTotal!, 0)) /
            cacheRows.length
        )
      : null;

    byProvider[provider] = {
      provider,
      topModel,
      calls: cs.length,
      p50: pct(lat, 0.5),
      p95: pct(lat, 0.95),
      cacheHitPct,
      lastCallAt: safeISO(cs[cs.length - 1].ts),
      series: sample(cs.map((c) => c.latency)), // chronological (cs is in log order)
    };
  }

  // Overall cache hit, weighted across calls that reported a cache ratio.
  const cacheCalls = recent.filter((c) => c.cacheTotal);
  const overallCache = cacheCalls.length
    ? Math.round(
        (100 * cacheCalls.reduce((s, c) => s + c.cacheHit! / c.cacheTotal!, 0)) / cacheCalls.length
      )
    : null;

  return {
    totalCalls: recent.length,
    p50: pct(allLat, 0.5),
    p95: pct(allLat, 0.95),
    cacheHitPct: overallCache,
    lastCallAt: safeISO(calls[calls.length - 1].ts),
    series: sample(recent.map((c) => c.latency), 48),
    byProvider,
  };
}
