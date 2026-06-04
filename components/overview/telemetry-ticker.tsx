import type { ReactNode } from "react";

export interface TickerCell {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: string; // colors the value
  chart?: ReactNode; // optional sparkline / bars
}

// The thin live-telemetry strip under the top bar (server-rendered, real data).
export function TelemetryTicker({ cells }: { cells: TickerCell[] }) {
  return (
    <div className="flex items-stretch overflow-x-auto border-b border-edge/70 bg-bg/30 backdrop-blur-sm">
      {cells.map((c, i) => (
        <div
          key={i}
          className="flex min-w-[140px] items-center gap-3 whitespace-nowrap border-r border-edge/50 px-5 py-2.5 last:border-r-0"
        >
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
              {c.label}
            </span>
            <span
              className="font-display text-[15px] font-semibold leading-none tabular-nums"
              style={{ color: c.accent ?? "var(--color-fg)" }}
            >
              {c.value}
              {c.unit && <span className="ml-0.5 text-[11px] font-normal text-faint">{c.unit}</span>}
            </span>
          </div>
          {c.chart && <div className="ml-auto opacity-90">{c.chart}</div>}
        </div>
      ))}
    </div>
  );
}
