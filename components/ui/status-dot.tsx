import { cn } from "@/lib/utils";

export type Health = "live" | "degraded" | "offline";

const COLORS: Record<Health, string> = {
  live: "var(--color-green)",
  degraded: "var(--color-amber)",
  offline: "var(--color-faint)",
};

export const HEALTH_LABEL: Record<Health, string> = {
  live: "LIVE",
  degraded: "DEGRADED",
  offline: "OFFLINE",
};

export const HEALTH_TEXT: Record<Health, string> = {
  live: "var(--color-green)",
  degraded: "var(--color-amber)",
  offline: "var(--color-faint)",
};

export function StatusDot({
  health,
  className,
  pulse = true,
}: {
  health: Health;
  className?: string;
  pulse?: boolean;
}) {
  const color = COLORS[health];
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse && health === "live" && (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  );
}
