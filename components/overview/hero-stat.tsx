import type { ReactNode } from "react";

// Bottom-left glass stat cards on the hero (real data + a chart).
export function HeroStat({
  label,
  value,
  unit,
  sub,
  accent = "var(--color-cyan)",
  chart,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
  accent?: string;
  chart?: ReactNode;
}) {
  return (
    <div className="w-[180px] overflow-hidden rounded-xl border border-edge/80 bg-panel/55 p-4 backdrop-blur-xl">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">{label}</div>
      <div className="mt-2.5 font-display text-[30px] font-semibold leading-none tabular-nums" style={{ color: accent }}>
        {value}
        {unit && <span className="ml-0.5 align-baseline text-sm font-normal text-faint">{unit}</span>}
      </div>
      {chart && <div className="mt-3 h-[26px]">{chart}</div>}
      {sub && <div className="mt-2.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
