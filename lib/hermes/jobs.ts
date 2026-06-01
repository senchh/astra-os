import fs from "node:fs";
import { JOBS_FILE } from "./paths";
import type { CronJob } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function readCronJobs(): CronJob[] {
  try {
    const raw = fs.readFileSync(JOBS_FILE, "utf8");
    const data = JSON.parse(raw);
    const jobs: any[] = Array.isArray(data) ? data : data?.jobs ?? [];
    return jobs.map(
      (j): CronJob => ({
        id: String(j.id ?? ""),
        name: j.name ?? "(isimsiz)",
        scheduleDisplay: j.schedule_display ?? j.schedule?.display ?? j.schedule ?? "—",
        schedule:
          j.schedule_display ??
          j.schedule?.expr ??
          (typeof j.schedule === "string" ? j.schedule : "") ??
          "",
        prompt: j.prompt ?? "",
        deliver: j.deliver ?? "origin",
        model: j.model ?? "—",
        provider: j.provider ?? "—",
        enabled: Boolean(j.enabled),
        state: j.state ?? "",
        lastStatus: j.last_status ?? null,
        lastError: j.last_error ?? null,
        nextRunAt: j.next_run_at ?? null,
        lastRunAt: j.last_run_at ?? null,
        profile: j.profile ?? null,
        skills: Array.isArray(j.skills) ? j.skills : j.skill ? [j.skill] : [],
      })
    );
  } catch {
    return [];
  }
}
