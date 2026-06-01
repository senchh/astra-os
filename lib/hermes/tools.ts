import { execFileSync } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "./paths";
import type { Toolset } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// `hermes tools list` prints lines like:
//   ✓ enabled  web  🔍 Web Search & Scraping
//   ✗ disabled  video  🎬 Video Analysis
const LINE = /^\s*(✓|✗)\s+(?:enabled|disabled)\s+(\S+)\s+(.+?)\s*$/;

export function readTools(): Toolset[] {
  let out = "";
  try {
    out = execFileSync(HERMES_BIN, ["tools", "list"], {
      cwd: os.homedir(),
      timeout: 15_000,
      encoding: "utf8",
      env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
    });
  } catch (e: any) {
    // Some CLIs exit non-zero yet still print to stdout — salvage it.
    out = e?.stdout?.toString?.() ?? "";
  }

  const tools: Toolset[] = [];
  for (const line of out.split("\n")) {
    const m = LINE.exec(line);
    if (!m) continue;
    tools.push({ enabled: m[1] === "✓", id: m[2], label: m[3] });
  }
  return tools;
}
