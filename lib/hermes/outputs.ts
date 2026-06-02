import fs from "node:fs";
import path from "node:path";
import { IMAGES_DIR } from "./paths";

export type OutputImage = {
  name: string; // basename, e.g. clip_20260531_120651_1.png
  bytes: number;
  modified: number; // epoch seconds
};

const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

// Generated images the agent produced (image_gen / vision clips), newest first.
export function readImages(): OutputImage[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(IMAGES_DIR).filter((f) => IMG_RE.test(f));
  } catch {
    return [];
  }
  const out: OutputImage[] = [];
  for (const name of names) {
    try {
      const st = fs.statSync(path.join(IMAGES_DIR, name));
      out.push({ name, bytes: st.size, modified: Math.round(st.mtimeMs / 1000) });
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => b.modified - a.modified);
}

// Resolve a requested basename to a real file inside IMAGES_DIR (no traversal).
export function resolveImage(name: string): string | null {
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) return null;
  if (!IMG_RE.test(name)) return null;
  const full = path.join(IMAGES_DIR, name);
  // Ensure the resolved path stays within IMAGES_DIR.
  if (path.dirname(full) !== IMAGES_DIR) return null;
  return fs.existsSync(full) ? full : null;
}
