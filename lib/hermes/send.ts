import { execFileSync } from "node:child_process";
import { HERMES_BIN, LOCAL_BIN } from "./paths";
import type { SendTarget } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * `hermes send` action trigger: the configured messaging targets. `send` reuses
 * the gateway's platform credentials with no LLM / agent loop and (for bot-token
 * platforms like Telegram) no running gateway — so this is a safe, scriptable
 * action, distinct from the config-writes. `--list --json` is read-only.
 */
export function readSendTargets(): SendTarget[] {
  try {
    const out = execFileSync(HERMES_BIN, ["send", "--list", "--json"], {
      env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
      timeout: 10_000,
      maxBuffer: 2 * 1024 * 1024,
    }).toString();
    const platforms = JSON.parse(out)?.platforms ?? {};
    const targets: SendTarget[] = [];
    for (const [platform, list] of Object.entries(platforms)) {
      if (!Array.isArray(list)) continue;
      for (const t of list as any[]) {
        const id = String(t?.id ?? "");
        if (!id) continue;
        targets.push({
          platform,
          id,
          name: String(t?.name ?? id),
          type: String(t?.type ?? ""),
          target: `${platform}:${id}`,
        });
      }
    }
    return targets;
  } catch {
    return [];
  }
}
