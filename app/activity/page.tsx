import { summarizeActivity } from "@/lib/hermes/sessions";
import { StatCard } from "@/components/overview/stat-card";
import { compactNum, relTime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const a = summarizeActivity(14);
  const maxSessions = Math.max(1, ...a.days.map((d) => d.sessions));
  const maxModelSessions = Math.max(1, ...a.models.map((m) => m.sessions));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted">
          Her session ve model dağılımı — son 14 gün.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="toplam session" value={a.totalSessions} accent="var(--color-cyan)" />
        <StatCard
          label="toplam mesaj"
          value={a.totalMessages.toLocaleString("tr-TR")}
          accent="var(--color-green)"
        />
        <StatCard label="toplam token" value={compactNum(a.totalTokens)} accent="var(--color-violet)" />
        <StatCard label="son aktivite" value={relTime(a.lastActivity)} accent="var(--color-amber)" />
      </section>

      {/* Sessions per day */}
      <section className="panel p-5">
        <div className="label">session · gün</div>
        <div className="mt-5 flex h-40 items-end gap-1.5">
          {a.days.map((d) => {
            const h = (d.sessions / maxSessions) * 100;
            return (
              <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[0.625rem] tabular-nums text-faint opacity-0 transition-opacity group-hover:opacity-100">
                  {d.sessions}
                </span>
                <div
                  className="w-full rounded-t bg-cyan/70 transition-colors group-hover:bg-cyan"
                  style={{ height: `${Math.max(h, d.sessions ? 4 : 0)}%`, minHeight: d.sessions ? 3 : 0 }}
                  title={`${d.date}: ${d.sessions} session · ${d.messages} mesaj`}
                />
                <span className="text-[0.625rem] tabular-nums text-faint">
                  {d.date.slice(8, 10)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Models */}
      <section className="panel overflow-hidden">
        <div className="border-b border-edge px-5 py-3">
          <span className="label">model dağılımı</span>
        </div>
        <div className="divide-y divide-edge">
          {a.models.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">Session verisi yok.</div>
          )}
          {a.models.map((m) => {
            const pct = (m.sessions / maxModelSessions) * 100;
            return (
              <div key={m.model} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-fg">
                    {m.model}
                    {m.provider !== "unknown" && (
                      <span className="text-faint"> · {m.provider}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {m.sessions} session
                    <span className="text-faint"> · {compactNum(m.tokens)} tok</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-2">
                  <div className="h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
