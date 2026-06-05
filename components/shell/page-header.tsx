import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface HeaderStat {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: string;
}

// Shared cinematic header for interior screens — carries the home's visual
// language (glass icon chip + tracked eyebrow + display title) plus an optional
// right-side telemetry strip, so every ops screen keeps an observability touch.
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  accent = "var(--color-cyan)",
  stats,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  accent?: string;
  stats?: HeaderStat[];
  children?: ReactNode; // description (may include inline <code>/<span>)
}) {
  return (
    <header className="relative">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3.5">
          {/* glass icon chip with accent glow */}
          <span
            className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-panel/60 backdrop-blur-md"
            style={{
              borderColor: `color-mix(in oklab, ${accent} 38%, var(--color-edge))`,
              boxShadow: `0 0 22px -6px ${accent}, inset 0 0 12px -9px ${accent}`,
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} style={{ color: accent }} />
          </span>

          <div className="min-w-0">
            <div
              className="font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: `color-mix(in oklab, ${accent} 68%, var(--color-muted))` }}
            >
              {eyebrow}
            </div>
            <h1 className="mt-1.5 font-display text-[28px] font-semibold leading-none tracking-tight">
              {title}
            </h1>
            {children && (
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted">{children}</p>
            )}
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div className="hidden shrink-0 items-stretch gap-2.5 sm:flex">
            {stats.map((s, i) => (
              <div
                key={i}
                className="min-w-[92px] overflow-hidden rounded-xl border border-edge/80 bg-panel/50 px-3.5 py-2.5 backdrop-blur-md"
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                  {s.label}
                </div>
                <div
                  className="mt-1.5 font-display text-[19px] font-semibold leading-none tabular-nums"
                  style={{ color: s.accent ?? "var(--color-fg)" }}
                >
                  {s.value}
                  {s.unit && <span className="ml-0.5 text-[11px] font-normal text-faint">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* instrument-panel hairline — bright accent fading into the edge */}
      <div
        className="hairline-draw mt-5 h-px w-full"
        style={{
          background: `linear-gradient(to right, color-mix(in oklab, ${accent} 50%, transparent) 0%, var(--color-edge) 16%, transparent 64%)`,
        }}
      />
    </header>
  );
}
