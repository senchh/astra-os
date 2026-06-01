import { KANBAN_DB } from "./paths";
import type { KanbanBoard, KanbanColumn, KanbanTask } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// process.getBuiltinModule reaches the real builtin even from a bundled
// (Turbopack) server module, where createRequire(import.meta.url) breaks.
const CLOSED = new Set(["done", "archived", "cancelled", "closed"]);

// Display order for known statuses; unknown ones appended after.
const ORDER = ["todo", "backlog", "open", "doing", "in_progress", "review", "blocked", "done", "archived"];

export function readKanban(): KanbanBoard {
  let rows: any[] = [];
  try {
    // Node's built-in synchronous SQLite (no native dep needed).
    // @types/node here predates node:sqlite, so type the slice we use.
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as {
      DatabaseSync: new (
        path: string,
        opts?: { readOnly?: boolean }
      ) => {
        prepare(sql: string): { all(): any[] };
        close(): void;
      };
    };
    const db = new DatabaseSync(KANBAN_DB, { readOnly: true });
    rows = db
      .prepare(
        "SELECT id, title, status, assignee, created_at, completed_at, started_at, priority, last_failure_error, consecutive_failures FROM tasks ORDER BY created_at DESC"
      )
      .all();
    db.close();
  } catch {
    return { columns: [], total: 0, open: 0 };
  }

  const tasks: KanbanTask[] = rows.map((r) => ({
    id: String(r.id),
    title: r.title ?? "",
    status: r.status ?? "unknown",
    assignee: r.assignee ?? null,
    createdAt: Number(r.created_at) || 0,
    completedAt: r.completed_at != null ? Number(r.completed_at) : null,
    startedAt: r.started_at != null ? Number(r.started_at) : null,
    priority: Number(r.priority) || 0,
    lastFailureError: r.last_failure_error ?? null,
    consecutiveFailures: Number(r.consecutive_failures) || 0,
  }));

  const byStatus = new Map<string, KanbanTask[]>();
  for (const t of tasks) {
    if (!byStatus.has(t.status)) byStatus.set(t.status, []);
    byStatus.get(t.status)!.push(t);
  }

  const columns: KanbanColumn[] = [...byStatus.entries()]
    .map(([status, ts]) => ({ status, count: ts.length, tasks: ts }))
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.status);
      const ib = ORDER.indexOf(b.status);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  const open = tasks.filter((t) => !CLOSED.has(t.status)).length;
  return { columns, total: tasks.length, open };
}
