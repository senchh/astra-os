"use client";

/**
 * Astra-local run history. One-shot task runs (/run) are kept in the browser's
 * localStorage — local-first, no server/Hermes coupling (same pattern as
 * chat-history). A run's image artifacts live on disk under ~/.hermes/images and
 * are re-fetched through the guarded outputs route, so re-opening a past run still
 * shows them as long as the files exist.
 */

import type { TaskRunResult } from "@/lib/hermes/types";

export interface StoredRun {
  id: string;
  createdAt: number;
  presetId: string;
  presetLabel: string;
  input: string;
  result: TaskRunResult;
}

const KEY = "astra.run.history.v1";
const MAX = 50; // personal scale

function read(): StoredRun[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? (v as StoredRun[]) : [];
  } catch {
    return [];
  }
}

function write(list: StoredRun[]): StoredRun[] {
  const sorted = list.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX);
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(sorted));
  }
  return sorted;
}

export function loadRuns(): StoredRun[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function addRun(run: StoredRun): StoredRun[] {
  return write([run, ...read().filter((r) => r.id !== run.id)]);
}

export function removeRun(id: string): StoredRun[] {
  return write(read().filter((r) => r.id !== id));
}

export function clearRuns(): StoredRun[] {
  return write([]);
}

export function newRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
