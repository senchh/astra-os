import fs from "node:fs";
import path from "node:path";
import { MEMORIES_DIR, VAULT_DIR } from "./paths";
import type { Goal } from "./types";

// No dedicated goals file exists yet; check the likely spots and parse
// markdown task checkboxes. Returns [] (→ empty state) when none found.
const CANDIDATES = [
  path.join(VAULT_DIR, "Goals.md"),
  path.join(VAULT_DIR, "goals.md"),
  path.join(VAULT_DIR, "Goals", "Goals.md"),
  path.join(MEMORIES_DIR, "GOALS.md"),
];

export function readGoals(): Goal[] {
  for (const file of CANDIDATES) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const goals: Goal[] = [];
      raw.split("\n").forEach((line, i) => {
        const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/);
        if (m) goals.push({ id: String(i), title: m[2].trim(), done: m[1].toLowerCase() === "x" });
      });
      if (goals.length) return goals;
    } catch {
      /* try next candidate */
    }
  }
  return [];
}
