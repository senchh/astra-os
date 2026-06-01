import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { DREAMS_DIR } from "./paths";
import type { DreamReport } from "./types";

export function readDreams(limit = 30): DreamReport[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DREAMS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  files.sort().reverse(); // YYYY-MM-DD.md → newest first

  const out: DreamReport[] = [];
  for (const f of files.slice(0, limit)) {
    try {
      const raw = fs.readFileSync(path.join(DREAMS_DIR, f), "utf8");
      let content = raw;
      try {
        content = matter(raw).content;
      } catch {
        /* non-standard frontmatter → use raw */
      }
      const slug = f.replace(/\.md$/, "");
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const heading =
        lines.find((l) => l.startsWith("#"))?.replace(/^#+\s*/, "").trim() ?? slug;
      const excerpt = lines
        .filter((l) => !l.startsWith("#") && !l.startsWith("---"))
        .slice(0, 3)
        .join(" ")
        .slice(0, 240);
      out.push({ slug, date: slug, title: heading, excerpt, body: content.trim() });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function readDream(slug: string): DreamReport | null {
  return readDreams(9999).find((d) => d.slug === slug) ?? null;
}
