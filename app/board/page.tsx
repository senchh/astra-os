import { readKanban } from "@/lib/hermes/kanban";
import { StatCard } from "@/components/overview/stat-card";
import { relTime } from "@/lib/utils";
import type { KanbanTask } from "@/lib/hermes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Raw Hermes statuses collapse into these display columns, in flow order.
const COLUMNS: { key: string; label: string; match: string[]; color: string }[] = [
  { key: "triage", label: "Triage", match: ["triage", "new"], color: "var(--color-amber)" },
  { key: "todo", label: "Todo", match: ["todo", "backlog", "open", "pending", "queued"], color: "var(--color-cyan)" },
  { key: "running", label: "Running", match: ["doing", "in_progress", "running", "claimed", "active"], color: "var(--color-violet)" },
  { key: "blocked", label: "Blocked", match: ["blocked", "failed", "error"], color: "var(--color-red)" },
  { key: "done", label: "Done", match: ["done", "completed"], color: "var(--color-green)" },
  { key: "archived", label: "Archived", match: ["archived", "cancelled", "closed"], color: "var(--color-faint)" },
];

function Card({ t, colKey }: { t: KanbanTask; colKey: string }) {
  const failed = t.consecutiveFailures > 0 || !!t.lastFailureError;
  const stamp =
    colKey === "running" && t.startedAt
      ? `başladı ${relTime(t.startedAt)}`
      : t.completedAt
        ? relTime(t.completedAt)
        : relTime(t.createdAt);

  return (
    <div className="panel panel-hover rounded-lg p-3">
      <div className="line-clamp-2 text-sm text-fg">{t.title || "(başlıksız)"}</div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
        {t.assignee && t.assignee !== "default" && (
          <span className="rounded-md border border-edge px-1.5 py-0.5 text-[0.625rem] text-muted">
            {t.assignee}
          </span>
        )}
        {t.priority > 0 && (
          <span className="text-amber">P{t.priority}</span>
        )}
        <span className="ml-auto text-faint">{stamp}</span>
      </div>

      {failed && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red">
          <span className="truncate" title={t.lastFailureError ?? undefined}>
            {t.lastFailureError ?? "başarısız"}
          </span>
          {t.consecutiveFailures > 0 && (
            <span className="shrink-0 text-faint">×{t.consecutiveFailures}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const board = readKanban();
  const tasks = board.columns.flatMap((c) => c.tasks);

  const matched = new Set<string>();
  const cols = COLUMNS.map((col) => {
    const items = tasks.filter((t) => col.match.includes(t.status));
    items.forEach((t) => matched.add(t.id));
    return { ...col, items };
  });

  // Any status that didn't map to a canonical column gets its own trailing column.
  const extras = new Map<string, KanbanTask[]>();
  for (const t of tasks) {
    if (matched.has(t.id)) continue;
    if (!extras.has(t.status)) extras.set(t.status, []);
    extras.get(t.status)!.push(t);
  }
  const extraCols = [...extras.entries()].map(([status, items]) => ({
    key: status,
    label: status,
    color: "var(--color-faint)",
    items,
  }));

  const allCols = [...cols, ...extraCols];
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Board</h1>
        <p className="mt-1 text-sm text-muted">
          Hermes çok-ajanlı görev panosu — orkestratör görevi alt görevlere böler ve profillere
          atar.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="toplam görev" value={board.total} accent="var(--color-cyan)" />
        <StatCard
          label="açık"
          value={board.open}
          accent={board.open ? "var(--color-violet)" : "var(--color-faint)"}
        />
        <StatCard label="tamamlanan" value={doneCount} accent="var(--color-green)" />
      </section>

      {board.total === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Henüz görev yok.{" "}
          <span className="text-faint">(~/.hermes/kanban.db)</span>
        </div>
      ) : (
        <section className="flex gap-3 overflow-x-auto pb-3">
          {allCols.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col gap-2.5">
              <div className="flex items-center gap-2 px-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }}
                />
                <span className="text-sm font-medium capitalize text-fg">{col.label}</span>
                <span className="text-xs text-faint">{col.items.length}</span>
              </div>

              <div className="flex flex-col gap-2 rounded-xl bg-bg-2/40 p-2">
                {col.items.length === 0 ? (
                  <div className="px-2 py-6 text-center text-xs text-faint">—</div>
                ) : (
                  col.items.map((t) => <Card key={t.id} t={t} colKey={col.key} />)
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
