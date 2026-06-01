import { readCronJobs } from "@/lib/hermes/jobs";
import { StatCard } from "@/components/overview/stat-card";
import { CronManager } from "@/components/cron/cron-manager";
import type { CronJob } from "@/lib/hermes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isError(j: CronJob): boolean {
  return j.enabled && j.lastStatus === "error";
}

export default function Page() {
  const jobs = readCronJobs();
  const active = jobs.filter((j) => j.enabled).length;
  const errored = jobs.filter(isError).length;
  const okCount = jobs.filter((j) => j.enabled && j.lastStatus === "ok").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cron</h1>
        <p className="mt-1 text-sm text-muted">
          Zamanlanmış görevler — oluştur, duraklat, çalıştır, sil. Değişiklikler{" "}
          <code className="font-mono text-cyan">hermes cron</code> ile yazılır.
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

      <CronManager jobs={jobs} />
    </div>
  );
}
