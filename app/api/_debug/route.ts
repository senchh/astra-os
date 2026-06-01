import { NextResponse } from "next/server";
import { readCronJobs } from "@/lib/hermes/jobs";
import { summarizeActivity } from "@/lib/hermes/sessions";
import { readKanban } from "@/lib/hermes/kanban";
import { readDreams } from "@/lib/hermes/dreams";
import { readGoals } from "@/lib/hermes/goals";
import { getAgents } from "@/lib/hermes/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = readCronJobs();
  const activity = summarizeActivity();
  const kanban = readKanban();
  const dreams = readDreams();
  const goals = readGoals();
  const agents = getAgents();

  return NextResponse.json({
    counts: {
      jobs: jobs.length,
      sessions: activity.totalSessions,
      messages: activity.totalMessages,
      kanbanTotal: kanban.total,
      kanbanOpen: kanban.open,
      dreams: dreams.length,
      goals: goals.length,
    },
    agents,
    activityDays: activity.days,
    topModels: activity.models.slice(0, 8),
    sampleJob: jobs[0] ?? null,
    sampleDream: dreams[0] ? { ...dreams[0], body: dreams[0].body.slice(0, 100) } : null,
  });
}
