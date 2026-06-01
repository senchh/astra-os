import { createRequire } from "node:module";
import { KANBAN_DB } from "./paths";
import type { KanbanBoard, KanbanColumn, KanbanTask } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const nodeRequire = createRequire(import.meta.url);

const CLOSED = new Set(["done", "archived", "cancelled", "closed"]);

// Display order for known statuses; unknown ones appended after.
const ORDER = ["todo", "backlog", "open", "doing", "in_progress", "review", "blocked", "done", "archived"];

export function readKanban(): KanbanBoard {
  let rows: any[] = [];
  try {
    // Node's built-in synchronous SQLite (no native dep needed).
    const { DatabaseSync } = nodeRequire("node:sqlite");
    const db = new DatabaseSync(KANBAN_DB, { readOnly: true });
    rows = db
      .prepare(
        "SELECT id, title, status, assignee, created_at, completed_at FROM tasks ORDER BY created_at DESC"
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
