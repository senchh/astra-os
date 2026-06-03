"use client";

/**
 * Astra-local chat history. Conversations live in the browser's localStorage —
 * no server, no Hermes coupling (local-first). This only stores chats made from
 * Astra's /chat; the full agent session ledger (telegram/cron/cli) is a separate
 * Phase-4 /sessions screen reading state.db.
 */

export interface StoredMsg {
  role: "user" | "assistant";
  content: string;
  agent?: string; // which agent produced this answer (provenance)
}

export interface Conversation {
  id: string; // also used as the chat sessionId
  title: string;
  renamed?: boolean; // user set the title → don't re-derive it from messages
  createdAt: number;
  updatedAt: number;
  provider: string | null; // last selected agent (for resume)
  model: string;
  messages: StoredMsg[];
}

const KEY = "astra.chat.history.v1";
const MAX = 100; // cap — personal scale

function read(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? (v as Conversation[]) : [];
  } catch {
    return [];
  }
}

function write(list: Conversation[]): Conversation[] {
  const sorted = list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX);
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(sorted));
  }
  return sorted;
}

export function loadAll(): Conversation[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function upsert(conv: Conversation): Conversation[] {
  return write([conv, ...read().filter((c) => c.id !== conv.id)]);
}

export function remove(id: string): Conversation[] {
  return write(read().filter((c) => c.id !== id));
}

export function rename(id: string, title: string): Conversation[] {
  return write(
    read().map((c) => (c.id === id ? { ...c, title, renamed: true } : c))
  );
}

export function deriveTitle(messages: StoredMsg[]): string {
  const first = messages.find((m) => m.role === "user");
  const t = (first?.content ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "Yeni sohbet";
  return t.length > 48 ? t.slice(0, 48) + "…" : t;
}

export function newId(): string {
  return `astra-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
