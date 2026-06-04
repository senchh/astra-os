import Link from "next/link";
import { Activity } from "lucide-react";
import { Sparkline } from "./sparkline";
import type { CredStatus } from "@/lib/hermes/types";

export interface ProviderHealthRow {
  id: string;
  status: CredStatus;
  p50: number | null; // seconds, null when no calls in window
  series: number[];
}

const META: Record<CredStatus, string> = {
  ok: "var(--color-green)",
  exhausted: "var(--color-amber)",
  error: "var(--color-red)",
  unknown: "var(--color-faint)",
};

// Right-side glass panel — real per-provider latency + key health (the moat).
export function ProviderHealthPanel({ rows }: { rows: ProviderHealthRow[] }) {
  return (
    <div className="w-[280px] overflow-hidden rounded-2xl border border-edge/80 bg-panel/55 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-edge/70 px-4 py-3">
        <Activity className="h-3.5 w-3.5 text-cyan" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          provider health
        </span>
        <Link
          href="/control"
          className="ml-auto rounded-md border border-edge px-2 py-0.5 text-[10px] text-muted transition-colors hover:border-cyan/40 hover:text-fg"
        >
          tümü
        </Link>
      </div>
      <div className="divide-y divide-edge/50">
        {rows.map((r) => {
          const color = META[r.status];
          const broken = r.status === "error" || r.status === "exhausted";
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg">{r.id}</span>
              {r.series.length >= 2 && (
                <Sparkline data={r.series} color={broken ? color : "var(--color-muted)"} w={56} h={18} strokeWidth={1.3} />
              )}
              <span
                className="w-12 shrink-0 text-right font-mono text-[11.5px] tabular-nums"
                style={{ color: broken ? color : "var(--color-fg)" }}
              >
                {r.p50 != null ? `${r.p50}s` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
