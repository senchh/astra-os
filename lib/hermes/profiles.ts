import { execFileSync } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "./paths";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Profile = {
  name: string;
  active: boolean; // the sticky default (marked ◆ by the CLI)
  model: string;
  gateway: string; // "running" | "stopped" | …
  alias: string | null;
  distribution: string | null;
};

// `hermes profile list` prints a table:
//   Profile          Model        Gateway   Alias   Distribution
//   ───────────…
//  ◆default          grok-4.3     running   —       —
//   argus            grok-4.3     stopped   argus   —
// The active profile is prefixed with ◆ (U+25C6). Columns are 2+ spaces apart;
// empty cells are an em-dash (—).
const dash = (v: string | undefined) => (v && v !== "—" ? v : null);

export function readProfiles(): Profile[] {
  let out = "";
  try {
    out = execFileSync(HERMES_BIN, ["profile", "list"], {
      cwd: os.homedir(),
      timeout: 15_000,
      encoding: "utf8",
      env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
    });
  } catch (e: any) {
    out = e?.stdout?.toString?.() ?? "";
  }

  const profiles: Profile[] = [];
  for (const raw of out.split("\n")) {
    const trimmed = raw.replace(/^\s+/, "");
    if (!trimmed) continue;
    if (trimmed.startsWith("Profile")) continue; // header
    if (/^[─-]/.test(trimmed)) continue; // separator rule

    const active = trimmed.startsWith("◆");
    const rest = active ? trimmed.slice(1).trim() : trimmed;
    const cols = rest.split(/\s{2,}/).map((s) => s.trim());
    if (cols.length < 2 || !cols[0]) continue;

    profiles.push({
      name: cols[0],
      active,
      model: cols[1] ?? "",
      gateway: cols[2] ?? "",
      alias: dash(cols[3]),
      distribution: dash(cols[4]),
    });
  }
  return profiles;
}
