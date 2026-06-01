import { getAgents } from "@/lib/hermes/health";
import { readCronJobs } from "@/lib/hermes/jobs";
import { summarizeActivity } from "@/lib/hermes/sessions";
import { readKanban } from "@/lib/hermes/kanban";
import { Orrery } from "@/components/orrery";
import { AgentChips } from "@/components/overview/agent-chips";
import { StatCard } from "@/components/overview/stat-card";
import { relTime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const agents = getAgents();
  const jobs = readCronJobs();
  const activity = summarizeActivity(7);
  const kanban = readKanban();

  const activeCron = jobs.filter((j) => j.enabled).length;
  const sessions7d = activity.days.reduce((a, b) => a + b.sessions, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
          <p className="mt-1 text-sm text-muted">
            Tüm agent yığının, tek yörüngede.
          </p>
        </div>
        <div className="text-right">
          <div className="label">son sinyal</div>
          <div className="mt-1 text-sm text-fg">{relTime(activity.lastActivity)}</div>
        </div>
      </header>

      {/* The Orrery — signature centerpiece */}
      <section className="panel relative h-[440px] overflow-hidden">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <span className="label">the orrery · canlı sistem haritası</span>
        </div>
        <Orrery agents={agents} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-bg-2/90 to-transparent p-4">
          <AgentChips agents={agents} />
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="aktif cron"
          value={activeCron}
          sub={`${jobs.length} job tanımlı`}
          accent="var(--color-cyan)"
        />
        <StatCard
          label="açık görev"
          value={kanban.open}
          sub={`${kanban.total} kanban kaydı`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="session · 7g"
          value={sessions7d}
          sub={`${activity.totalSessions} toplam`}
          accent="var(--color-green)"
        />
        <StatCard
          label="mesaj · 7g"
          value={activity.days.reduce((a, b) => a + b.messages, 0).toLocaleString("tr-TR")}
          sub={`${activity.totalMessages.toLocaleString("tr-TR")} toplam`}
          accent="var(--color-violet)"
        />
      </section>
    </div>
  );
}
