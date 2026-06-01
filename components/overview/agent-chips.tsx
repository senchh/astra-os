import { StatusDot, HEALTH_LABEL, HEALTH_TEXT } from "@/components/ui/status-dot";
import { relTime } from "@/lib/utils";
import type { AgentHealth } from "@/lib/hermes/types";

export function AgentChips({ agents }: { agents: AgentHealth[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {agents.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-full border border-edge bg-bg-2/70 px-3 py-1.5 backdrop-blur"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: a.color, boxShadow: `0 0 8px ${a.color}` }}
          />
          <span className="text-xs font-medium text-fg">{a.name}</span>
          <StatusDot health={a.health} />
          <span
            className="text-[10px] font-semibold tracking-wider"
            style={{ color: HEALTH_TEXT[a.health] }}
          >
            {HEALTH_LABEL[a.health]}
          </span>
          <span className="text-[10px] text-faint">· {relTime(a.lastSeen)}</span>
        </div>
      ))}
    </div>
  );
}
