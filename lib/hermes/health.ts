import fs from "node:fs";
import path from "node:path";
import { readSessions } from "./sessions";
import { readCronJobs } from "./jobs";
import { DREAMS_DIR, VAULT_DIR } from "./paths";
import type { AgentHealth, Health, SessionMeta } from "./types";

const DAY = 24 * 3600 * 1000;

function classify(iso: string | null): Health {
  if (!iso) return "offline";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "offline";
  const age = Date.now() - t;
  if (age < DAY) return "live";
  if (age < 7 * DAY) return "degraded";
  return "offline";
}

function latestMatching(sessions: SessionMeta[], re: RegExp): string | null {
  return (
    sessions
      .filter((s) => re.test(s.model) || re.test(s.provider) || re.test(s.platform))
      .map((s) => s.lastUpdated)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
  );
}

function newestMtimeISO(dir: string, depth = 1): string | null {
  let newest = 0;
  const walk = (d: string, lvl: number) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      try {
        if (e.isDirectory()) {
          if (lvl > 0) walk(p, lvl - 1);
        } else {
          const m = fs.statSync(p).mtimeMs;
          if (m > newest) newest = m;
        }
      } catch {
        /* skip */
      }
    }
  };
  walk(dir, depth);
  return newest ? new Date(newest).toISOString() : null;
}

export function getAgents(): AgentHealth[] {
  const sessions = readSessions();
  const jobs = readCronJobs();

  const overall =
    [...sessions.map((s) => s.lastUpdated), ...jobs.map((j) => j.lastRunAt)]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const claude = latestMatching(sessions, /claude|anthropic/i);
  const claw = latestMatching(sessions, /claw|openclaw/i);

  // Obsidian vault freshness = newest file under the vault (shallow).
  let vault = newestMtimeISO(VAULT_DIR, 1);
  const dreams = newestMtimeISO(DREAMS_DIR, 0);
  if (dreams && (!vault || dreams > vault)) vault = dreams;

  const activeCron = jobs.filter((j) => j.enabled).length;

  return [
    {
      id: "claude",
      name: "Claude",
      health: classify(claude),
      lastSeen: claude,
      detail: claude ? "claude code" : "veri yok",
      color: "var(--color-claude)",
    },
    {
      id: "hermes",
      name: "Hermes",
      health: classify(overall),
      lastSeen: overall,
      detail: `${sessions.length} session · ${activeCron} cron`,
      color: "var(--color-hermes)",
    },
    {
      id: "openclaw",
      name: "OpenClaw",
      health: classify(claw),
      lastSeen: claw,
      detail: claw ? "gateway" : "kayıt yok",
      color: "var(--color-openclaw)",
    },
    {
      id: "obsidian",
      name: "Obsidian",
      health: classify(vault),
      lastSeen: vault,
      detail: "vault",
      color: "var(--color-obsidian)",
    },
  ];
}
