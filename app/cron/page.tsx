import { readCronJobs } from "@/lib/hermes/jobs";
import { StatCard } from "@/components/overview/stat-card";
import { relTime } from "@/lib/utils";
import type { CronJob } from "@/lib/hermes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JobState = "ok" | "error" | "paused" | "pending";

function jobState(j: CronJob): JobState {
  if (!j.enabled) return "paused";
  if (j.lastStatus === "error") return "error";
  if (j.lastStatus === "ok") return "ok";
  return "pending";
}

const STATE_META: Record<JobState, { label: string; color: string }> = {
  ok: { label: "OK", color: "var(--color-green)" },
  error: { label: "HATA", color: "var(--color-red)" },
  paused: { label: "DURAKLADI", color: "var(--color-faint)" },
  pending: { label: "BEKLİYOR", color: "var(--color-amber)" },
};

const SORT_ORDER: Record<JobState, number> = { error: 0, ok: 1, pending: 2, paused: 3 };

export default function Page() {
  const jobs = readCronJobs().sort(
    (a, b) => SORT_ORDER[jobState(a)] - SORT_ORDER[jobState(b)]
  );

  const active = jobs.filter((j) => j.enabled).length;
  const errored = jobs.filter((j) => jobState(j) === "error").length;
  const okCount = jobs.filter((j) => jobState(j) === "ok").length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cron</h1>
        <p className="mt-1 text-sm text-muted">
          Zamanlanmış görevler ve son çalışma durumları.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="toplam job" value={jobs.length} accent="var(--color-cyan)" />
        <StatCard label="aktif" value={active} accent="var(--color-green)" />
        <StatCard label="son durum ok" value={okCount} accent="var(--color-green)" />
        <StatCard
          label="hatalı"
          value={errored}
          accent={errored ? "var(--color-red)" : "var(--color-faint)"}
        />
      </section>

      <section className="panel divide-y divide-edge overflow-hidden">
        {jobs.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">
            Cron job bulunamadı. <span className="text-faint">(~/.hermes/cron/jobs.json)</span>
          </div>
        )}
        {jobs.map((j) => {
          const s = jobState(j);
          const meta = STATE_META[s];
          return (
            <div key={j.id} className="px-4 py-3.5 transition-colors hover:bg-panel-2/50">
              <div className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                  {j.name}
                </span>
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider"
                  style={{ color: meta.color, borderColor: meta.color }}
                >
                  {meta.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-5 text-xs text-muted">
                <span className="font-mono text-faint">{j.scheduleDisplay}</span>
                <span>
                  {j.model}
                  <span className="text-faint"> · {j.provider}</span>
                </span>
                {j.lastRunAt && <span>son: {relTime(j.lastRunAt)}</span>}
                {j.nextRunAt && <span>sıradaki: {relTime(j.nextRunAt)}</span>}
                {j.skills.length > 0 && (
                  <span className="text-faint">{j.skills.length} skill</span>
                )}
              </div>

              {j.lastError && (
                <div className="mt-1.5 truncate pl-5 text-xs text-red" title={j.lastError}>
                  {j.lastError}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
