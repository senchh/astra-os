import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { SKILLS_DIR, CONFIG_FILE } from "./paths";
import type { Skill, SkillCategory, SkillsCatalog } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const USAGE_FILE = path.join(SKILLS_DIR, ".usage.json");
const BUNDLED_MANIFEST = path.join(SKILLS_DIR, ".bundled_manifest");

interface UsageEntry {
  use_count?: number;
  view_count?: number;
  last_used_at?: string | null;
  created_by?: string | null;
}

// The set of builtin (bundled) skill names — `name:hash` lines.
function readBundledNames(): Set<string> {
  const names = new Set<string>();
  try {
    for (const line of fs.readFileSync(BUNDLED_MANIFEST, "utf8").split("\n")) {
      const name = line.split(":")[0]?.trim();
      if (name) names.add(name);
    }
  } catch {
    /* manifest missing → everything reads as local */
  }
  return names;
}

// Skills the agent has disabled live in config.yaml under skills.disabled.
function readDisabled(): Set<string> {
  try {
    const cfg = yaml.load(fs.readFileSync(CONFIG_FILE, "utf8")) as any;
    const list = cfg?.skills?.disabled;
    if (Array.isArray(list)) return new Set(list.map(String));
  } catch {
    /* config unreadable → treat all as enabled */
  }
  return new Set();
}

function readUsage(): Record<string, UsageEntry> {
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, "utf8"));
    return u && typeof u === "object" ? u : {};
  } catch {
    return {};
  }
}

// Collect every SKILL.md under the skills dir (skipping dot-dirs like .hub).
function findSkillFiles(dir: string, depth = 0, acc: string[] = []): string[] {
  if (depth > 4) return acc;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findSkillFiles(full, depth + 1, acc);
    else if (e.name === "SKILL.md") acc.push(full);
  }
  return acc;
}

function toTags(fm: any): string[] {
  const t = fm?.metadata?.hermes?.tags ?? fm?.tags;
  if (Array.isArray(t)) return t.map(String).filter(Boolean);
  return [];
}

export function readSkills(): SkillsCatalog {
  const bundled = readBundledNames();
  const disabled = readDisabled();
  const usage = readUsage();

  const skills: Skill[] = [];
  for (const file of findSkillFiles(SKILLS_DIR)) {
    let fm: any = {};
    let bytes = 0;
    try {
      const raw = fs.readFileSync(file, "utf8");
      bytes = Buffer.byteLength(raw, "utf8");
      fm = matter(raw).data ?? {};
    } catch {
      continue;
    }

    const dirName = path.basename(path.dirname(file));
    const id = String(fm.name ?? dirName);

    // Category: frontmatter wins; else the first path segment under skills/
    // (nested skills sit in category dirs); else "diğer".
    const rel = path.relative(SKILLS_DIR, file).split(path.sep);
    const fmCategory = fm?.metadata?.hermes?.category ?? fm?.category;
    const category = String(fmCategory ?? (rel.length > 2 ? rel[0] : "diğer"));

    const u = usage[id] ?? {};
    skills.push({
      id,
      description: String(fm.description ?? "").trim(),
      category,
      version: fm.version != null ? String(fm.version) : null,
      tags: toTags(fm),
      source: bundled.has(id) ? "builtin" : "local",
      enabled: !disabled.has(id),
      bytes,
      useCount: Number(u.use_count ?? 0),
      viewCount: Number(u.view_count ?? 0),
      lastUsedAt: u.last_used_at ?? null,
      createdBy: u.created_by ?? null,
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));

  // Group into categories, most-populated first.
  const byCat = new Map<string, Skill[]>();
  for (const s of skills) {
    if (!byCat.has(s.category)) byCat.set(s.category, []);
    byCat.get(s.category)!.push(s);
  }
  const categories: SkillCategory[] = [...byCat.entries()]
    .map(([name, list]) => ({ name, skills: list }))
    .sort((a, b) => b.skills.length - a.skills.length || a.name.localeCompare(b.name));

  return {
    skills,
    categories,
    total: skills.length,
    enabled: skills.filter((s) => s.enabled).length,
    used: skills.filter((s) => s.useCount > 0).length,
  };
}

// Skill names are safe unquoted YAML scalars (lowercase, digits, _ . -).
const SKILL_ID = /^[a-z0-9][a-z0-9_.-]*$/;

export function isSkillId(s: string): boolean {
  return SKILL_ID.test(s);
}

/**
 * Surgically rewrite ONLY the `skills.disabled` value in config.yaml,
 * preserving every comment and the rest of the file byte-for-byte.
 *
 * We deliberately avoid both Hermes paths here: `hermes config set
 * skills.disabled '[…]'` writes the array as a *string* (corrupts skill
 * loading), and `hermes skills config` is interactive (unscriptable). So a
 * targeted one-line text edit is the only safe writer.
 */
export function writeDisabledSkills(ids: string[]): void {
  for (const id of ids) {
    if (!SKILL_ID.test(id)) throw new Error(`unsafe skill id: ${id}`);
  }

  const text = fs.readFileSync(CONFIG_FILE, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);

  // 1. Locate the top-level `skills:` block.
  let skillsIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^skills:\s*$/.test(lines[i])) {
      skillsIdx = i;
      break;
    }
  }
  if (skillsIdx === -1) throw new Error("skills: block not found in config.yaml");

  // 2. Within its indented children, find the `disabled:` key.
  let disabledIdx = -1;
  let indent = "  ";
  for (let i = skillsIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const lead = /^(\s*)/.exec(line)![1];
    if (lead.length === 0) break; // next top-level key → end of block
    const m = /^(\s+)disabled:/.exec(line);
    if (m) {
      disabledIdx = i;
      indent = m[1];
      break;
    }
  }
  if (disabledIdx === -1) throw new Error("skills.disabled key not found");

  // 3. Consume a following block-list form (`  - item`) if present.
  let endIdx = disabledIdx;
  const childIndent = indent + "  ";
  for (let i = disabledIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(childIndent) && line.trim().startsWith("-")) endIdx = i;
    else break;
  }

  // 4. Replace with an inline flow sequence (always one line).
  const value = ids.length ? `[${ids.join(", ")}]` : "[]";
  lines.splice(disabledIdx, endIdx - disabledIdx + 1, `${indent}disabled: ${value}`);
  fs.writeFileSync(CONFIG_FILE, lines.join(eol));
}
