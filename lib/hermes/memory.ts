import fs from "node:fs";
import path from "node:path";
import { MEMORIES_DIR, SOUL_FILE } from "./paths";

// The "Personal Memory" workspace edits three markdown docs the agent reads.
// All are plain markdown written directly (no Hermes CLI command exists for them).
export type MemoryDocId = "notes" | "profile" | "soul";

// "persona" → injected into every agent call (token cost matters).
// "memory"  → §-separated learned facts (entry count matters).
export type MemoryKind = "persona" | "memory";

type DocSpec = {
  id: MemoryDocId;
  label: string;
  file: string;
  kind: MemoryKind;
  hint: string;
};

const SPECS: Record<MemoryDocId, DocSpec> = {
  notes: {
    id: "notes",
    label: "My Notes",
    file: path.join(MEMORIES_DIR, "MEMORY.md"),
    kind: "memory",
    hint: "Hermes'in öğrendiği notlar",
  },
  profile: {
    id: "profile",
    label: "User Profile",
    file: path.join(MEMORIES_DIR, "USER.md"),
    kind: "memory",
    hint: "Senin profilin",
  },
  soul: {
    id: "soul",
    label: "Agent Soul",
    file: SOUL_FILE,
    kind: "persona",
    hint: "Persona — her çağrıya enjekte",
  },
};

export const DOC_ORDER: MemoryDocId[] = ["notes", "profile", "soul"];

export type MemoryDoc = {
  id: MemoryDocId;
  label: string;
  kind: MemoryKind;
  hint: string;
  content: string;
  bytes: number;
  modified: string | null; // ISO mtime, null if file absent
};

export function isDocId(v: unknown): v is MemoryDocId {
  return v === "notes" || v === "profile" || v === "soul";
}

export function readDoc(id: MemoryDocId): MemoryDoc {
  const spec = SPECS[id];
  try {
    const content = fs.readFileSync(spec.file, "utf-8");
    const stat = fs.statSync(spec.file);
    return { ...specMeta(spec), content, bytes: stat.size, modified: stat.mtime.toISOString() };
  } catch {
    return { ...specMeta(spec), content: "", bytes: 0, modified: null };
  }
}

export function readAllDocs(): MemoryDoc[] {
  return DOC_ORDER.map(readDoc);
}

export function writeDoc(id: MemoryDocId, content: string): void {
  fs.writeFileSync(SPECS[id].file, content, "utf-8");
}

function specMeta(spec: DocSpec) {
  return { id: spec.id, label: spec.label, kind: spec.kind, hint: spec.hint };
}
